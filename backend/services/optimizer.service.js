/**
 * Grid-Aware Multi-Tenant EV Fleet Charging Optimization Engine
 *
 * Runs every ~30s (gridScheduler). Hard invariant:
 *   sum(allocatedPowerKw) <= siteCapacityKw
 *
 * Priority stack (when capacity contested):
 *   1. Priority / tenant SLA (Emergency > High > Medium > Low)
 *   2. Earliest departure
 *   3. Lower SoC (needs energy sooner)
 *   4. Fast-complete + FIFO (paid/arrival order)
 *   5. Peak tariff: throttle Low, protect Emergency/High
 *
 * Fault tolerance: last safe allocation per site is kept if a cycle throws.
 * Broadcast: Socket.IO session/site/tenant/dashboard rooms (tenant-isolated).
 *
 * Stack note: this repo uses Express + MongoDB + Socket.IO (hackathon).
 * Nest/FastAPI + Postgres + Redis + OCPP are extension targets — same pure
 * allocatePower() can be wrapped by those adapters without changing scoring.
 */

const PRIORITY_WEIGHT = {
  emergency: 5,
  sla: 5,
  high: 4,
  medium: 3,
  low: 2,
  background: 1,
}

const TYPE_BIAS = {
  truck: 1.04,
  bus: 1.03,
  car: 1.02,
  bike: 1.06,
}

/** Peak hours amplify high priority and dampen low. */
const TARIFF_PRIORITY_MULT = {
  peak: { emergency: 1.35, sla: 1.3, high: 1.25, medium: 0.95, low: 0.55, background: 0.4 },
  normal: { emergency: 1.15, sla: 1.1, high: 1.08, medium: 1, low: 0.9, background: 0.75 },
  'off-peak': { emergency: 1.05, sla: 1.05, high: 1.02, medium: 1, low: 1, background: 0.95 },
}

const TARIFF_FACTOR = {
  'off-peak': 1.0,
  normal: 1.05,
  peak: 1.15,
}

const MIN_ALLOC_KW = 1
const MIN_ALLOC_FRAC = 0.1
const MAX_TENANT_SHARE = 0.6

/** siteId → last successful allocation snapshot (fallback mode) */
const lastSafeBySite = new Map()

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n))
}

function round1(n) {
  return Math.round(n * 10) / 10
}

function round2(n) {
  return Math.round(n * 100) / 100
}

function priorityWeightOf(tier) {
  return PRIORITY_WEIGHT[String(tier || 'medium').toLowerCase()] || PRIORITY_WEIGHT.medium
}

function minThresholdKw(maxPowerKw) {
  return Math.max(MIN_ALLOC_KW, (Number(maxPowerKw) || 0) * MIN_ALLOC_FRAC)
}

function energyNeededKwh(session) {
  const battery = Math.max(1, Number(session.batteryCapacityKwh) || 60)
  const current = clamp(Number(session.currentCharge ?? 20), 0, 100)
  const target = clamp(Number(session.targetCharge ?? 80), 0, 100)
  const delivered = Math.max(0, Number(session.kWhDelivered) || 0)
  const fromSoc = Math.max(0, ((target - current) / 100) * battery)
  if (fromSoc > 0) return fromSoc
  return Math.max(0, battery - delivered)
}

function calculateUrgency(session, now = new Date()) {
  const priorityWeight = priorityWeightOf(session.priority || session.priorityTier)
  const energyNeeded = energyNeededKwh(session)
  const current = clamp(Number(session.currentCharge ?? 20), 0, 100)
  const depart = session.departureTime
    ? new Date(session.departureTime).getTime()
    : now.getTime() + 4 * 3600_000
  const hoursLeft = Math.max(0, (depart - now.getTime()) / 3_600_000)
  const lowSocBoost = 1 + Math.max(0, (40 - current) / 100)
  const urgencyScore = ((priorityWeight * energyNeeded) / (hoursLeft + 1)) * lowSocBoost
  return {
    urgencyScore: round2(urgencyScore),
    energyNeeded: round2(energyNeeded),
    hoursLeft: round2(hoursLeft),
    priorityWeight,
    currentSoc: current,
  }
}

function calculateTenantQuota(sessions, capacityKw) {
  const capacity = Math.max(0, Number(capacityKw) || 0)
  const counts = new Map()
  for (const s of sessions || []) {
    const tid = String(s.tenantId || 'unknown')
    counts.set(tid, (counts.get(tid) || 0) + 1)
  }
  const tenants = [...counts.keys()]
  const n = tenants.length || 1
  const quotas = new Map()

  if (n === 1) {
    quotas.set(tenants[0], capacity)
    return quotas
  }

  const totalSessions = [...counts.values()].reduce((a, b) => a + b, 0) || 1
  for (const tid of tenants) {
    const equal = capacity / n
    const proportional = capacity * (counts.get(tid) / totalSessions)
    let share = 0.5 * equal + 0.5 * proportional
    share = Math.min(share, capacity * MAX_TENANT_SHARE)
    quotas.set(tid, round1(share))
  }

  let sum = [...quotas.values()].reduce((a, b) => a + b, 0)
  if (sum > capacity && sum > 0) {
    for (const tid of tenants) {
      quotas.set(tid, round1((quotas.get(tid) / sum) * capacity))
    }
  }
  return quotas
}

function requestedKwOf(s) {
  const vehicleMax =
    Number(s.maxChargingPowerKw ?? s.vehicleMaxPowerKw) || Number(s.maxPowerKw) || 22
  const chargerMax = Number(s.chargerMaxPowerKw ?? s.maxPowerKw) || vehicleMax
  return Math.max(0, Math.min(vehicleMax, chargerMax))
}

function buildAllocationReasons(row, allocatedPowerKw, band) {
  const reasons = []
  const tier = String(row.priorityTier || 'medium').toLowerCase()
  if (tier === 'emergency' || tier === 'sla') reasons.push('High Priority / SLA')
  else if (tier === 'high') reasons.push('High Priority')
  else if (tier === 'low' || tier === 'background') reasons.push('Low Priority')
  if (row.hoursLeft <= 1.5) reasons.push('Early Departure')
  if (row.currentSoc <= 30) reasons.push('Low Battery')
  if (row.etaHours <= 0.75) reasons.push('Fast Complete')
  if (allocatedPowerKw + 1e-9 < row.requestedKw) reasons.push('Grid Limit')
  if (band === 'peak' && (tier === 'low' || tier === 'background')) {
    reasons.push('Peak Tariff Throttle')
  }
  if (allocatedPowerKw <= 0) reasons.push('No Capacity')
  if (!reasons.length) reasons.push('Fair Share')
  return reasons.join(', ')
}

function allocatePower(activeSessions, siteCapacityKw, tariff = {}, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date()
  const capacity = Math.max(0, Number(siteCapacityKw) || 0)
  const band = tariff?.band || 'normal'
  const tariffFactor = TARIFF_FACTOR[band] ?? TARIFF_FACTOR.normal
  const peakMult = TARIFF_PRIORITY_MULT[band] || TARIFF_PRIORITY_MULT.normal

  const list = activeSessions || []
  const quotas = calculateTenantQuota(list, capacity)
  const tenantRemaining = new Map(quotas)

  const scored = list.map((s) => {
    const id = String(s.id || s._id || s.sessionId)
    const tenantId = String(s.tenantId || 'unknown')
    const vehicleType = String(s.vehicleType || 'car').toLowerCase()
    const priorityTier = String(s.priority || s.priorityTier || 'medium').toLowerCase()
    const requestedKw = requestedKwOf(s)
    const urgency = calculateUrgency({ ...s, priorityTier }, now)
    const typeBias = TYPE_BIAS[vehicleType] ?? 1
    const etaHours =
      requestedKw > 0 ? urgency.energyNeeded / requestedKw : Number.POSITIVE_INFINITY
    const fastCompleteBoost = 1 + 1.5 / (1 + Math.max(0, etaHours))
    const arrivalMs = s.arrivalTime
      ? new Date(s.arrivalTime).getTime()
      : s.createdAt
        ? new Date(s.createdAt).getTime()
        : now.getTime()
    const departMs = s.departureTime
      ? new Date(s.departureTime).getTime()
      : now.getTime() + 4 * 3600_000
    const pMult = peakMult[priorityTier] ?? 1
    const score =
      urgency.urgencyScore * tariffFactor * typeBias * fastCompleteBoost * pMult

    return {
      id,
      tenantId,
      vehicleType,
      priorityTier,
      requestedKw,
      urgencyScore: urgency.urgencyScore,
      energyNeeded: urgency.energyNeeded,
      hoursLeft: urgency.hoursLeft,
      priorityWeight: urgency.priorityWeight,
      currentSoc: urgency.currentSoc,
      targetSoc: clamp(Number(s.targetCharge ?? 80), 0, 100),
      etaHours: round2(etaHours),
      arrivalMs,
      departMs,
      score: round2(score),
    }
  })

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (a.departMs !== b.departMs) return a.departMs - b.departMs
    if (a.currentSoc !== b.currentSoc) return a.currentSoc - b.currentSoc
    if (a.arrivalMs !== b.arrivalMs) return a.arrivalMs - b.arrivalMs
    return a.energyNeeded - b.energyNeeded
  })

  let remaining = capacity
  const allocations = []

  for (const row of scored) {
    let want = row.requestedKw
    if (band === 'peak' && (row.priorityTier === 'low' || row.priorityTier === 'background')) {
      want = round1(want * 0.5)
    }

    const tenantLeft = tenantRemaining.get(row.tenantId) ?? remaining
    const grant = Math.min(want, remaining, Math.max(0, tenantLeft))
    const allocatedPowerKw = round1(Math.max(0, grant))
    remaining = round1(Math.max(0, remaining - allocatedPowerKw))
    tenantRemaining.set(row.tenantId, round1(Math.max(0, tenantLeft - allocatedPowerKw)))

    const threshold = minThresholdKw(row.requestedKw)
    const state = allocatedPowerKw + 1e-9 < threshold ? 'throttled' : 'optimized'

    const etaMin =
      allocatedPowerKw > 0
        ? Math.max(1, Math.ceil((row.energyNeeded / allocatedPowerKw) * 60))
        : null
    const estimatedCompletionTime =
      etaMin != null ? new Date(now.getTime() + etaMin * 60_000).toISOString() : null
    const reason = buildAllocationReasons(row, allocatedPowerKw, band)

    allocations.push({
      id: row.id,
      vehicleId: row.id,
      tenantId: row.tenantId,
      vehicleType: row.vehicleType,
      allocatedPowerKw,
      allocatedPower: allocatedPowerKw,
      state,
      chargingStatus: state,
      score: row.score,
      urgency: row.urgencyScore,
      urgencyScore: row.urgencyScore,
      requestedKw: row.requestedKw,
      energyNeeded: row.energyNeeded,
      hoursLeft: row.hoursLeft,
      estimatedCompletionTime,
      estimatedChargeMinutes: etaMin,
      remainingBatteryPct: row.currentSoc,
      targetBatteryPct: row.targetSoc,
      reason,
      allocationReason: reason,
    })
  }

  const total = round1(allocations.reduce((s, a) => s + a.allocatedPowerKw, 0))
  if (total > capacity + 0.05) {
    const scale = capacity / total
    for (const a of allocations) {
      a.allocatedPowerKw = round1(a.allocatedPowerKw * scale)
      a.allocatedPower = a.allocatedPowerKw
      a.reason = `${a.reason}; Scaled To Grid Cap`
      a.allocationReason = a.reason
    }
  }

  return allocations
}

function optimizeSessionAllocation({
  session,
  vehicle,
  charger,
  site,
  activeSessions = [],
  tariff,
  now,
}) {
  const cohort = [
    {
      id: session._id?.toString?.() || session.id,
      tenantId: session.tenantId,
      maxPowerKw: charger?.maxPowerKw,
      chargerMaxPowerKw: charger?.maxPowerKw,
      maxChargingPowerKw: vehicle?.maxChargingPowerKw,
      priorityTier: vehicle?.priorityTier || session.priorityTier,
      departureTime: vehicle?.departureTime || session.departureTime,
      batteryCapacityKwh: vehicle?.batteryCapacityKwh || session.batteryCapacityKwh,
      currentCharge: vehicle?.currentCharge ?? session.currentCharge,
      targetCharge: vehicle?.targetCharge ?? session.targetCharge,
      vehicleType: vehicle?.vehicleType || session.vehicleType,
      kWhDelivered: session.kWhDelivered,
      arrivalTime: session.arrivalTime,
    },
    ...activeSessions.map((s) => ({
      id: s._id?.toString?.() || s.id,
      tenantId: s.tenantId,
      maxPowerKw: s.maxPowerKw || s.chargerMaxPowerKw,
      chargerMaxPowerKw: s.chargerMaxPowerKw || s.maxPowerKw,
      maxChargingPowerKw: s.maxChargingPowerKw,
      priorityTier: s.priorityTier,
      departureTime: s.departureTime,
      batteryCapacityKwh: s.batteryCapacityKwh,
      currentCharge: s.currentCharge,
      targetCharge: s.targetCharge,
      vehicleType: s.vehicleType,
      kWhDelivered: s.kWhDelivered,
      arrivalTime: s.arrivalTime,
    })),
  ]

  const result = allocatePower(
    cohort,
    site?.maxCapacityKw ?? site?.totalCapacityKw ?? site,
    tariff || { band: 'normal' },
    { now },
  )
  const mine = result.find((r) => r.id === (session._id?.toString?.() || session.id))
  return mine?.allocatedPowerKw ?? 0
}

function broadcastUpdates(
  { site, sessions = [], allocations = [], tenantIds = [], usedKw = 0, tariff, fallback = false },
  io,
) {
  if (!io) return
  const {
    emitSessionUpdate,
    emitSiteUpdate,
    emitTenantUpdate,
    emitDashboardUpdate,
  } = require('../sockets/session.socket')

  const siteId = site?._id?.toString?.() || site?.id || site?.siteId
  const maxCapacityKw = Number(site?.maxCapacityKw ?? site?.totalCapacityKw) || 0
  const freeKw = round1(Math.max(0, maxCapacityKw - usedKw))

  const byTenant = {}
  for (const a of allocations) {
    const tid = String(a.tenantId || 'unknown')
    byTenant[tid] = round1((byTenant[tid] || 0) + a.allocatedPowerKw)
  }

  for (const session of sessions) {
    emitSessionUpdate(io, session)
  }

  const sitePayload = {
    siteId,
    maxCapacityKw,
    totalCapacityKw: maxCapacityKw,
    usedKw: round1(usedKw),
    currentUsageKw: round1(usedKw),
    availableCapacityKw: freeKw,
    freeKw,
    tariff,
    sessionCount: sessions.length,
    tenantIds,
    tenantAllocation: byTenant,
    fallback,
    allocations: allocations.map((a) => ({
      vehicleId: a.id,
      allocatedPowerKw: a.allocatedPowerKw,
      chargingStatus: a.state,
      estimatedCompletionTime: a.estimatedCompletionTime,
      remainingBatteryPct: a.remainingBatteryPct,
      reason: a.reason || a.allocationReason,
    })),
  }
  emitSiteUpdate(io, sitePayload)

  for (const tid of tenantIds) {
    emitTenantUpdate(io, {
      tenantId: tid,
      siteId,
      allocatedKw: byTenant[tid] || 0,
      usedKw: byTenant[tid] || 0,
      maxCapacityKw,
      fallback,
      sessions: sessions
        .filter((s) => String(s.tenantId) === String(tid))
        .map((s) => (typeof s.toSafeJSON === 'function' ? s.toSafeJSON() : s)),
    })
  }

  emitDashboardUpdate(io, {
    siteId,
    ...sitePayload,
    at: new Date().toISOString(),
  })
}

async function applyAllocations(enriched, allocations, io) {
  const byId = new Map(allocations.map((a) => [a.id, a]))
  let usedKw = 0
  const updatedSessions = []
  const { notifySessionThrottled } = require('./notification.service')

  for (const { session, charger } of enriched) {
    const alloc = byId.get(session._id.toString())
    if (!alloc) continue
    const prevState = session.state
    session.allocatedPowerKw = alloc.allocatedPowerKw
    session.allocatedPower = alloc.allocatedPowerKw
    session.state = alloc.state
    session.urgencyScore = alloc.urgencyScore
    session.allocationReason = alloc.reason || alloc.allocationReason || ''
    session.estimatedCompletionAt = alloc.estimatedCompletionTime
      ? new Date(alloc.estimatedCompletionTime)
      : null
    session.powerHistory = [
      ...(session.powerHistory || []).slice(-39),
      { at: new Date(), kw: alloc.allocatedPowerKw },
    ]
    await session.save()

    if (charger) {
      charger.currentAllocatedPower = alloc.allocatedPowerKw
      await charger.save().catch(() => {})
    }

    usedKw += alloc.allocatedPowerKw
    updatedSessions.push(session)

    if (prevState !== 'throttled' && alloc.state === 'throttled') {
      await notifySessionThrottled(io, session).catch((err) => {
        console.error('[optimizer] notify throttle:', err.message)
      })
    }
  }
  return { usedKw: round1(usedKw), updatedSessions }
}

async function rebalanceGrid(siteId, io) {
  const Site = require('../models/Site')
  const Session = require('../models/Session')
  const Vehicle = require('../models/Vehicle')
  const Charger = require('../models/Charger')
  const { getTariff } = require('./tariff.service')
  const key = String(siteId)

  try {
    const site = await Site.findById(siteId)
    if (!site) return []

    const sessions = await Session.find({
      siteId,
      state: { $in: ['charging', 'optimized', 'throttled'] },
    })
    if (!sessions.length) {
      lastSafeBySite.delete(key)
      broadcastUpdates(
        {
          site,
          sessions: [],
          allocations: [],
          tenantIds: site.tenantId ? [site.tenantId.toString()] : [],
          usedKw: 0,
          tariff: getTariff(new Date()),
        },
        io,
      )
      return []
    }

    const enriched = []
    for (const session of sessions) {
      const [vehicle, charger] = await Promise.all([
        Vehicle.findById(session.vehicleId),
        Charger.findById(session.chargerId),
      ])
      if (!charger) continue

      const vehicleType = vehicle?.vehicleType || session.vehicleType || 'car'
      enriched.push({
        session,
        vehicle,
        charger,
        input: {
          id: session._id.toString(),
          tenantId: session.tenantId,
          vehicleType,
          maxChargingPowerKw: vehicle?.maxChargingPowerKw || session.maxChargingPowerKw,
          chargerMaxPowerKw: charger.maxPowerKw,
          maxPowerKw: Math.min(
            vehicle?.maxChargingPowerKw || session.maxChargingPowerKw || charger.maxPowerKw,
            charger.maxPowerKw,
          ),
          priorityTier: session.priorityTier || vehicle?.priorityTier || 'medium',
          priority: session.priorityTier || vehicle?.priorityTier || 'medium',
          departureTime: vehicle?.departureTime || session.departureTime,
          batteryCapacityKwh: vehicle?.batteryCapacityKwh || session.batteryCapacityKwh,
          currentCharge: vehicle?.currentCharge ?? session.currentCharge,
          targetCharge: vehicle?.targetCharge ?? session.targetCharge,
          kWhDelivered: session.kWhDelivered,
          arrivalTime: session.arrivalTime || vehicle?.arrivalTime || session.createdAt,
          createdAt: session.createdAt,
        },
      })
    }

    const tariff = getTariff(new Date())
    const allocations = allocatePower(
      enriched.map((e) => e.input),
      site.maxCapacityKw,
      tariff,
    )

    const { usedKw, updatedSessions } = await applyAllocations(enriched, allocations, io)
    const tenantIds = [...new Set(enriched.map(({ session }) => session.tenantId.toString()))]

    lastSafeBySite.set(key, {
      siteId: key,
      allocations,
      usedKw,
      at: new Date().toISOString(),
    })

    broadcastUpdates(
      {
        site,
        sessions: updatedSessions,
        allocations,
        tenantIds,
        usedKw,
        tariff,
        fallback: false,
      },
      io,
    )

    return allocations
  } catch (err) {
    console.error(`[optimizer] rebalance failed site ${siteId}:`, err.message)
    const safe = lastSafeBySite.get(key)
    if (safe?.allocations?.length && io) {
      try {
        const Site = require('../models/Site')
        const site = await Site.findById(siteId)
        broadcastUpdates(
          {
            site,
            sessions: [],
            allocations: safe.allocations,
            tenantIds: [...new Set(safe.allocations.map((a) => String(a.tenantId)))],
            usedKw: safe.usedKw,
            tariff: { band: 'normal', fallback: true },
            fallback: true,
          },
          io,
        )
        console.warn(`[optimizer] fallback mode for site ${siteId} — keeping last safe kW`)
      } catch (e) {
        console.error('[optimizer] fallback broadcast failed:', e.message)
      }
      return safe.allocations
    }
    throw err
  }
}

async function generateInvoice(session, io) {
  const { recordSessionOnInvoice } = require('./billing.service')
  return recordSessionOnInvoice(session, io)
}

module.exports = {
  calculateUrgency,
  calculateTenantQuota,
  allocatePower,
  rebalanceGrid,
  broadcastUpdates,
  generateInvoice,
  optimizeSessionAllocation,
  energyNeededKwh,
  priorityWeightOf,
  PRIORITY_WEIGHT,
  TYPE_BIAS,
  TARIFF_FACTOR,
  TARIFF_PRIORITY_MULT,
  MIN_ALLOC_KW,
  MIN_ALLOC_FRAC,
  MAX_TENANT_SHARE,
  minThresholdKw,
  round1,
  lastSafeBySite,
}
