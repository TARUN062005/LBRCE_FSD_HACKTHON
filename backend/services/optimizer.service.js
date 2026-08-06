/**
 * Grid-Aware Multi-Tenant EV Fleet Charging Optimization Engine
 *
 * Pure allocation + DB-backed rebalance. Extension hooks for V2G / solar /
 * storage / carbon-aware / energy trading live at the bottom of this file.
 *
 * Hard invariant: sum(allocatedPowerKw) <= siteCapacityKw
 */

const PRIORITY_WEIGHT = {
  emergency: 5,
  sla: 5, // legacy alias
  high: 4,
  medium: 3,
  low: 2,
  background: 1,
}

/** Soft type bias — bikes should not starve cars/buses/trucks when scores tie. */
const TYPE_BIAS = {
  truck: 1.08,
  bus: 1.05,
  car: 1.02,
  bike: 0.92,
}

const TARIFF_FACTOR = {
  'off-peak': 1.0,
  normal: 1.05,
  peak: 1.15,
}

const MIN_ALLOC_KW = 1
const MIN_ALLOC_FRAC = 0.1
/** When ≥2 tenants share a site, no single tenant may take more than this fraction. */
const MAX_TENANT_SHARE = 0.6

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

/**
 * energyNeeded (kWh) from SoC % and battery capacity.
 */
function energyNeededKwh(session) {
  const battery = Math.max(1, Number(session.batteryCapacityKwh) || 60)
  const current = clamp(Number(session.currentCharge ?? 20), 0, 100)
  const target = clamp(Number(session.targetCharge ?? 80), 0, 100)
  const delivered = Math.max(0, Number(session.kWhDelivered) || 0)
  // Prefer explicit SoC delta; fall back to remaining capacity after delivered
  const fromSoc = Math.max(0, ((target - current) / 100) * battery)
  if (fromSoc > 0) return fromSoc
  return Math.max(0, battery - delivered)
}

/**
 * Urgency score:
 *   (priorityWeight × energyNeeded) / (hoursLeft + 1)
 */
function calculateUrgency(session, now = new Date()) {
  const priorityWeight = priorityWeightOf(session.priority || session.priorityTier)
  const energyNeeded = energyNeededKwh(session)
  const depart = session.departureTime ? new Date(session.departureTime).getTime() : now.getTime() + 4 * 3600_000
  const hoursLeft = Math.max(0, (depart - now.getTime()) / 3_600_000)
  const urgencyScore = (priorityWeight * energyNeeded) / (hoursLeft + 1)
  return {
    urgencyScore: round2(urgencyScore),
    energyNeeded: round2(energyNeeded),
    hoursLeft: round2(hoursLeft),
    priorityWeight,
  }
}

/**
 * Fair tenant quotas for a site.
 * Equal base + proportional to active session count; cap monopolies.
 *
 * @returns {Map<string, number>} tenantId → max kW
 */
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
  // 50% equal split + 50% proportional to session count
  for (const tid of tenants) {
    const equal = capacity / n
    const proportional = capacity * (counts.get(tid) / totalSessions)
    let share = 0.5 * equal + 0.5 * proportional
    share = Math.min(share, capacity * MAX_TENANT_SHARE)
    quotas.set(tid, round1(share))
  }

  // Normalize if sum of caps < capacity (leave headroom) or > capacity
  let sum = [...quotas.values()].reduce((a, b) => a + b, 0)
  if (sum > capacity && sum > 0) {
    for (const tid of tenants) {
      quotas.set(tid, round1((quotas.get(tid) / sum) * capacity))
    }
  }
  return quotas
}

/**
 * Requested kW for a session = min(vehicle max, charger max).
 */
function requestedKwOf(s) {
  const vehicleMax = Number(s.maxChargingPowerKw ?? s.vehicleMaxPowerKw) || Number(s.maxPowerKw) || 22
  const chargerMax = Number(s.chargerMaxPowerKw ?? s.maxPowerKw) || vehicleMax
  return Math.max(0, Math.min(vehicleMax, chargerMax))
}

/**
 * Pure, synchronous allocator with tenant fairness.
 *
 * @param {Array<object>} activeSessions
 * @param {number} siteCapacityKw
 * @param {{ band?: string }} tariff
 * @param {{ now?: Date }} [options]
 */
function allocatePower(activeSessions, siteCapacityKw, tariff = {}, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date()
  const capacity = Math.max(0, Number(siteCapacityKw) || 0)
  const band = tariff?.band || 'normal'
  const tariffFactor = TARIFF_FACTOR[band] ?? TARIFF_FACTOR.normal

  const list = activeSessions || []
  const quotas = calculateTenantQuota(list, capacity)
  const tenantRemaining = new Map(quotas)

  const scored = list.map((s) => {
    const id = String(s.id || s._id || s.sessionId)
    const tenantId = String(s.tenantId || 'unknown')
    const vehicleType = String(s.vehicleType || 'car').toLowerCase()
    const requestedKw = requestedKwOf(s)
    const urgency = calculateUrgency(s, now)
    const typeBias = TYPE_BIAS[vehicleType] ?? 1
    const score = urgency.urgencyScore * tariffFactor * typeBias

    return {
      id,
      tenantId,
      vehicleType,
      requestedKw,
      maxPowerKw: requestedKw,
      urgencyScore: urgency.urgencyScore,
      energyNeeded: urgency.energyNeeded,
      hoursLeft: urgency.hoursLeft,
      priorityWeight: urgency.priorityWeight,
      score: round2(score),
    }
  })

  // Sort: urgency/score desc; tie-break prefer non-bike over bike
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (a.vehicleType === 'bike' && b.vehicleType !== 'bike') return 1
    if (b.vehicleType === 'bike' && a.vehicleType !== 'bike') return -1
    return 0
  })

  let remaining = capacity
  const allocations = []

  for (const row of scored) {
    const tenantLeft = tenantRemaining.get(row.tenantId) ?? remaining
    const grant = Math.min(row.requestedKw, remaining, Math.max(0, tenantLeft))
    const allocatedPowerKw = round1(Math.max(0, grant))
    remaining = round1(Math.max(0, remaining - allocatedPowerKw))
    tenantRemaining.set(row.tenantId, round1(Math.max(0, tenantLeft - allocatedPowerKw)))

    const threshold = minThresholdKw(row.requestedKw)
    const state =
      allocatedPowerKw + 1e-9 < threshold
        ? 'throttled'
        : allocatedPowerKw + 1e-9 < row.requestedKw
          ? 'optimized'
          : 'optimized'

    allocations.push({
      id: row.id,
      tenantId: row.tenantId,
      vehicleType: row.vehicleType,
      allocatedPowerKw,
      allocatedPower: allocatedPowerKw,
      state,
      score: row.score,
      urgency: row.urgencyScore,
      urgencyScore: row.urgencyScore,
      requestedKw: row.requestedKw,
      energyNeeded: row.energyNeeded,
      hoursLeft: row.hoursLeft,
    })
  }

  // Hard invariant
  const total = round1(allocations.reduce((s, a) => s + a.allocatedPowerKw, 0))
  if (total > capacity + 0.05) {
    // Safety shrink (should never trigger)
    const scale = capacity / total
    for (const a of allocations) {
      a.allocatedPowerKw = round1(a.allocatedPowerKw * scale)
      a.allocatedPower = a.allocatedPowerKw
    }
  }

  return allocations
}

/**
 * Convenience single-session wrapper (legacy callers).
 */
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

/**
 * Broadcast live grid updates over Socket.IO.
 */
function broadcastUpdates({ site, sessions = [], allocations = [], tenantIds = [], usedKw = 0, tariff }, io) {
  if (!io) return
  const { emitSessionUpdate, emitSiteUpdate, emitTenantUpdate, emitDashboardUpdate } = require('../sockets/session.socket')

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
  }
  emitSiteUpdate(io, sitePayload)

  for (const tid of tenantIds) {
    emitTenantUpdate(io, {
      tenantId: tid,
      siteId,
      allocatedKw: byTenant[tid] || 0,
      usedKw: byTenant[tid] || 0,
      maxCapacityKw,
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

/**
 * Load site cohort, allocate, persist, broadcast.
 */
async function rebalanceGrid(siteId, io) {
  const Site = require('../models/Site')
  const Session = require('../models/Session')
  const Vehicle = require('../models/Vehicle')
  const Charger = require('../models/Charger')
  const { getTariff } = require('./tariff.service')
  const { notifySessionThrottled } = require('./notification.service')

  const site = await Site.findById(siteId)
  if (!site) return []

  const sessions = await Session.find({
    siteId,
    state: { $in: ['charging', 'optimized', 'throttled'] },
  })
  if (!sessions.length) {
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
    const input = {
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
    }
    enriched.push({ session, vehicle, charger, input })
  }

  const tariff = getTariff(new Date())
  const allocations = allocatePower(
    enriched.map((e) => e.input),
    site.maxCapacityKw,
    tariff,
  )
  const byId = new Map(allocations.map((a) => [a.id, a]))
  let usedKw = 0
  const updatedSessions = []

  for (const { session, charger } of enriched) {
    const alloc = byId.get(session._id.toString())
    if (!alloc) continue
    const prevState = session.state
    session.allocatedPowerKw = alloc.allocatedPowerKw
    session.allocatedPower = alloc.allocatedPowerKw
    session.state = alloc.state
    session.urgencyScore = alloc.urgencyScore
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

  const tenantIds = [
    ...new Set(enriched.map(({ session }) => session.tenantId.toString())),
  ]

  broadcastUpdates(
    {
      site,
      sessions: updatedSessions,
      allocations,
      tenantIds,
      usedKw: round1(usedKw),
      tariff,
    },
    io,
  )

  return allocations
}

/**
 * Invoice alias — delegates to billing service.
 */
async function generateInvoice(session, io) {
  const { recordSessionOnInvoice } = require('./billing.service')
  return recordSessionOnInvoice(session, io)
}

/*
 * Future extension hooks (not implemented):
 * - Vehicle-to-grid (V2G) bidirectional flows
 * - Solar / on-site generation offset
 * - Battery storage buffer in calculateTenantQuota
 * - Carbon-aware tariff band weighting
 * - Inter-tenant energy trading marketplace
 */

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
  MIN_ALLOC_KW,
  MIN_ALLOC_FRAC,
  MAX_TENANT_SHARE,
  minThresholdKw,
  round1,
}
