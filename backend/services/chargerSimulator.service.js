const Session = require('../models/Session')
const Vehicle = require('../models/Vehicle')
const Charger = require('../models/Charger')
const Site = require('../models/Site')
const { ACTIVE_STATES } = require('../models/Session')
const { allocatePower } = require('./optimizer.service')
const { getTariff } = require('./tariff.service')
const { recordSessionOnInvoice } = require('./billing.service')
const { emitSessionUpdate, emitSiteUpdate } = require('../sockets/session.socket')

/** Demo tick (~10–15s full optimize cycle across a few ticks). */
const TICK_MS = Number(process.env.SIMULATOR_TICK_MS) || 3000
/** Power-phase ticks before auto-complete. */
const MAX_POWER_TICKS = Number(process.env.SIMULATOR_POWER_TICKS) || 4

const POWER_STATES = new Set(['charging', 'optimized', 'throttled'])
const timers = new Map() // sessionId → { timer, powerTicks }

function accumulateEnergy(session, elapsedMs) {
  const power = Number(session.allocatedPowerKw) || 0
  if (power <= 0) return session.kWhDelivered
  const hours = elapsedMs / 3_600_000
  return Number((session.kWhDelivered + power * hours).toFixed(3))
}

/**
 * Site-wide greedy reallocation for all sessions drawing (or about to draw) power.
 * Writes allocatedPowerKw + optimized|throttled state, emits socket updates.
 */
async function reallocateSite(siteId, io) {
  const site = await Site.findById(siteId)
  if (!site) return []

  const sessions = await Session.find({
    siteId,
    state: { $in: ['charging', 'optimized', 'throttled'] },
  })
  if (!sessions.length) return []

  const enriched = []
  for (const session of sessions) {
    const [vehicle, charger] = await Promise.all([
      Vehicle.findById(session.vehicleId),
      Charger.findById(session.chargerId),
    ])
    if (!vehicle || !charger) continue
    enriched.push({
      session,
      input: {
        id: session._id.toString(),
        maxPowerKw: charger.maxPowerKw,
        priorityTier: session.priorityTier || vehicle.priorityTier,
        departureTime: vehicle.departureTime,
        batteryCapacityKwh: vehicle.batteryCapacityKwh,
        kWhDelivered: session.kWhDelivered,
      },
    })
  }

  const tariff = getTariff(new Date())
  const allocations = allocatePower(
    enriched.map((e) => e.input),
    site.maxCapacityKw,
    tariff,
  )

  const byId = new Map(allocations.map((a) => [a.id, a]))
  let usedKw = 0

  for (const { session } of enriched) {
    const alloc = byId.get(session._id.toString())
    if (!alloc) continue

    session.allocatedPowerKw = alloc.allocatedPowerKw
    session.state = alloc.state
    await session.save()
    usedKw += alloc.allocatedPowerKw
    emitSessionUpdate(io, session)
  }

  emitSiteUpdate(io, {
    siteId: site._id.toString(),
    maxCapacityKw: site.maxCapacityKw,
    usedKw: Math.round(usedKw * 10) / 10,
    tariff,
    sessionCount: enriched.length,
  })

  return allocations
}

async function advanceSession(sessionId, io) {
  const session = await Session.findById(sessionId)
  if (!session || session.state === 'completed') {
    stopSimulation(sessionId)
    return
  }

  const meta = timers.get(String(sessionId)) || { powerTicks: 0 }

  // Phase 1: Queued → Connected → Charging
  if (session.state === 'queued') {
    session.state = 'connected'
    await session.save()
    emitSessionUpdate(io, session)
    return
  }

  if (session.state === 'connected') {
    session.state = 'charging'
    await session.save()
    emitSessionUpdate(io, session)
    // First allocation as the session enters the power phase
    await reallocateSite(session.siteId, io)
    return
  }

  // Phase 2: power states — accumulate energy, re-optimize site cohort every tick
  if (POWER_STATES.has(session.state)) {
    session.kWhDelivered = accumulateEnergy(session, TICK_MS)
    await session.save()

    meta.powerTicks = (meta.powerTicks || 0) + 1
    if (timers.has(String(sessionId))) {
      timers.set(String(sessionId), meta)
    }

    await reallocateSite(session.siteId, io)

    if (meta.powerTicks >= MAX_POWER_TICKS) {
      const latest = await Session.findById(sessionId)
      if (latest && latest.state !== 'completed') {
        latest.state = 'completed'
        latest.endTime = new Date()
        await latest.save()
        await Charger.findByIdAndUpdate(latest.chargerId, { status: 'available' })
        await recordSessionOnInvoice(latest).catch((err) => {
          console.error('[simulator] billing error:', err.message)
        })
        emitSessionUpdate(io, latest)
        // Rebalance remaining active sessions on the site
        await reallocateSite(latest.siteId, io)
      }
      stopSimulation(sessionId)
    }
  }
}

function startSimulation(sessionId, io) {
  stopSimulation(sessionId)

  const meta = { powerTicks: 0, timer: null }
  meta.timer = setInterval(() => {
    advanceSession(sessionId, io).catch((err) => {
      console.error(`[simulator] tick error for ${sessionId}:`, err.message)
    })
  }, TICK_MS)

  timers.set(String(sessionId), meta)
  console.log(`[simulator] started session ${sessionId}`)
}

function stopSimulation(sessionId) {
  const key = String(sessionId)
  const meta = timers.get(key)
  if (meta?.timer) {
    clearInterval(meta.timer)
  }
  if (meta) {
    timers.delete(key)
    console.log(`[simulator] stopped session ${sessionId}`)
  }
}

function stopAllSimulations() {
  for (const id of [...timers.keys()]) {
    stopSimulation(id)
  }
}

module.exports = {
  TICK_MS,
  MAX_POWER_TICKS,
  ACTIVE_STATES,
  startSimulation,
  stopSimulation,
  stopAllSimulations,
  advanceSession,
  reallocateSite,
}
