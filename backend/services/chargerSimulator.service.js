const Session = require('../models/Session')
const Vehicle = require('../models/Vehicle')
const Charger = require('../models/Charger')
const Site = require('../models/Site')
const { ACTIVE_STATES } = require('../models/Session')
const { rebalanceGrid, generateInvoice } = require('./optimizer.service')
const {
  notifySessionThrottled,
  notifySessionCompleted,
} = require('./notification.service')
const { emitSessionUpdate } = require('../sockets/session.socket')

/** Demo energy tick (faster UX); allocation authority is 30s rebalanceGrid. */
const TICK_MS = Number(process.env.SIMULATOR_TICK_MS) || 3000
const MAX_POWER_TICKS = Number(process.env.SIMULATOR_POWER_TICKS) || 8

const POWER_STATES = new Set(['charging', 'optimized', 'throttled'])
const timers = new Map()

function accumulateEnergy(session, elapsedMs) {
  const power = Number(session.allocatedPowerKw) || 0
  if (power <= 0) return session.kWhDelivered
  const hours = elapsedMs / 3_600_000
  return Number((session.kWhDelivered + power * hours).toFixed(3))
}

/** Prefer optimizer.rebalanceGrid (tenant-fair). */
async function reallocateSite(siteId, io) {
  return rebalanceGrid(siteId, io)
}

async function advanceSession(sessionId, io) {
  const session = await Session.findById(sessionId)
  if (!session || session.state === 'completed') {
    stopSimulation(sessionId)
    return
  }

  const meta = timers.get(String(sessionId)) || { powerTicks: 0 }

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
    await rebalanceGrid(session.siteId, io)
    return
  }

  if (POWER_STATES.has(session.state)) {
    session.kWhDelivered = accumulateEnergy(session, TICK_MS)
    // Sync SoC estimate onto session for board
    const battery = Math.max(1, Number(session.batteryCapacityKwh) || 60)
    const startSoc = Number(session.currentCharge) || 20
    const gainedPct = (session.kWhDelivered / battery) * 100
    session.currentCharge = Math.min(
      Number(session.targetCharge) || 100,
      Math.round((startSoc + gainedPct) * 10) / 10,
    )
    await session.save()

    meta.powerTicks = (meta.powerTicks || 0) + 1
    if (timers.has(String(sessionId))) {
      timers.set(String(sessionId), meta)
    }

    // Light rebalance on energy ticks keeps board fresh; full site pass every 30s via scheduler
    if (meta.powerTicks % 2 === 0) {
      await rebalanceGrid(session.siteId, io)
    } else {
      emitSessionUpdate(io, session)
    }

    if (meta.powerTicks >= MAX_POWER_TICKS) {
      const latest = await Session.findById(sessionId)
      if (latest && latest.state !== 'completed') {
        latest.state = 'completed'
        latest.endTime = new Date()
        latest.allocatedPowerKw = 0
        latest.allocatedPower = 0
        await latest.save()
        await Charger.findByIdAndUpdate(latest.chargerId, {
          status: 'available',
          currentAllocatedPower: 0,
        })
        if (latest.bookingId) {
          const { completeLinkedBooking } = require('./bookingSession.service')
          await completeLinkedBooking(latest, io).catch((err) => {
            console.error('[simulator] booking complete error:', err.message)
          })
        } else {
          await generateInvoice(latest, io).catch((err) => {
            console.error('[simulator] billing error:', err.message)
          })
        }
        await notifySessionCompleted(io, latest).catch((err) => {
          console.error('[simulator] notify complete error:', err.message)
        })
        emitSessionUpdate(io, latest)
        await rebalanceGrid(latest.siteId, io)
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
  if (meta?.timer) clearInterval(meta.timer)
  if (meta) {
    timers.delete(key)
    console.log(`[simulator] stopped session ${sessionId}`)
  }
}

function stopAllSimulations() {
  for (const id of [...timers.keys()]) stopSimulation(id)
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
