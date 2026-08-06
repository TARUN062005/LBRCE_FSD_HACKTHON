const Session = require('../models/Session')
const Vehicle = require('../models/Vehicle')
const Charger = require('../models/Charger')
const Site = require('../models/Site')
const { SESSION_STATES, ACTIVE_STATES } = require('../models/Session')
const { optimizeSessionAllocation } = require('./optimizer.service')
const { emitSessionUpdate } = require('../sockets/session.socket')

const TICK_MS = Number(process.env.SIMULATOR_TICK_MS) || 2500
const timers = new Map()

function nextState(current) {
  const idx = SESSION_STATES.indexOf(current)
  if (idx < 0 || idx >= SESSION_STATES.length - 1) return null
  return SESSION_STATES[idx + 1]
}

function accumulateEnergy(session, elapsedMs) {
  const power = Number(session.allocatedPowerKw) || 0
  if (power <= 0) return session.kWhDelivered
  const hours = elapsedMs / 3_600_000
  return Number((session.kWhDelivered + power * hours).toFixed(3))
}

async function advanceSession(sessionId, io) {
  const session = await Session.findById(sessionId)
  if (!session || session.state === 'completed') {
    stopSimulation(sessionId)
    return
  }

  const upcoming = nextState(session.state)
  if (!upcoming) {
    stopSimulation(sessionId)
    return
  }

  // Energy delivered while in power-drawing states
  if (['charging', 'optimized', 'throttled'].includes(session.state)) {
    session.kWhDelivered = accumulateEnergy(session, TICK_MS)
  }

  session.state = upcoming

  if (upcoming === 'optimized') {
    const [vehicle, charger, site, activeSessions] = await Promise.all([
      Vehicle.findById(session.vehicleId),
      Charger.findById(session.chargerId),
      Site.findById(session.siteId),
      Session.find({
        siteId: session.siteId,
        state: { $in: ACTIVE_STATES },
        _id: { $ne: session._id },
      }),
    ])

    session.allocatedPowerKw = await optimizeSessionAllocation({
      session,
      vehicle,
      charger,
      site,
      activeSessions,
    })
  }

  if (upcoming === 'throttled' && session.allocatedPowerKw > 0) {
    // Mild throttle after optimize for visible board transition
    session.allocatedPowerKw = Math.round(session.allocatedPowerKw * 0.7 * 10) / 10
  }

  if (upcoming === 'completed') {
    session.endTime = new Date()
    if (session.allocatedPowerKw > 0) {
      session.kWhDelivered = accumulateEnergy(session, TICK_MS)
    }
    await Charger.findByIdAndUpdate(session.chargerId, { status: 'available' })
    stopSimulation(sessionId)
  }

  await session.save()
  emitSessionUpdate(io, session)
}

function startSimulation(sessionId, io) {
  stopSimulation(sessionId)

  const timer = setInterval(() => {
    advanceSession(sessionId, io).catch((err) => {
      console.error(`[simulator] tick error for ${sessionId}:`, err.message)
    })
  }, TICK_MS)

  timers.set(String(sessionId), timer)
  console.log(`[simulator] started session ${sessionId}`)
}

function stopSimulation(sessionId) {
  const key = String(sessionId)
  const timer = timers.get(key)
  if (timer) {
    clearInterval(timer)
    timers.delete(key)
    console.log(`[simulator] stopped session ${sessionId}`)
  }
}

function stopAllSimulations() {
  for (const id of timers.keys()) {
    stopSimulation(id)
  }
}

module.exports = {
  TICK_MS,
  startSimulation,
  stopSimulation,
  stopAllSimulations,
  advanceSession,
}
