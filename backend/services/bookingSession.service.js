/**
 * Auto-link marketplace bookings → grid optimizer sessions.
 * Allocates only what the vehicle needs (min of vehicle max, charger max)
 * so a bike on a 150 kW ultra charger is still billed at bike power.
 */

const Session = require('../models/Session')
const Vehicle = require('../models/Vehicle')
const Charger = require('../models/Charger')
const Booking = require('../models/Booking')
const { VEHICLE_PRESETS, VEHICLE_TYPES } = require('../models/Vehicle')
const { startSimulation, stopSimulation } = require('./chargerSimulator.service')
const { rebalanceGrid } = require('./optimizer.service')
const { emitSessionUpdate } = require('../sockets/session.socket')
const { notify } = require('./notify.service')

/** Serving voltage by vehicle need (not charger max / ultra rail). */
const SERVING_VOLTAGE = {
  bike: 230,
  car: 400,
  bus: 400,
  truck: 400,
}

function servingVoltageFor(vehicleType) {
  return SERVING_VOLTAGE[vehicleType] || 400
}

function inferVehicleType(booking = {}, user = null) {
  const blob = `${booking.notes || ''} ${booking.vehicleNumber || ''} ${user?.vehicleNumber || ''}`.toLowerCase()
  if (/\bbike\b|\bscooter\b|\b2[-\s]?wheeler\b/.test(blob)) return 'bike'
  if (/\bbus\b/.test(blob)) return 'bus'
  if (/\btruck\b|\blorry\b/.test(blob)) return 'truck'
  if (VEHICLE_TYPES.includes(booking.vehicleType)) return booking.vehicleType
  return 'car'
}

/**
 * Ensure vehicle + session exist and optimizer is running for this booking.
 * @returns {{ session, vehicle, created: boolean }}
 */
async function ensureAutomatedSession(booking, io, { forceStart = true } = {}) {
  const charger = await Charger.findById(booking.chargerId)
  if (!charger) throw new Error('Charger not found')

  const vehicleType = VEHICLE_TYPES.includes(booking.vehicleType)
    ? booking.vehicleType
    : inferVehicleType(booking)
  const preset = VEHICLE_PRESETS[vehicleType] || VEHICLE_PRESETS.car
  const battery =
    Number(booking.batteryCapacityKwh) > 0
      ? Number(booking.batteryCapacityKwh)
      : preset.batteryCapacityKwh
  const currentCharge =
    booking.currentCharge != null ? Number(booking.currentCharge) : 25
  const targetCharge =
    booking.targetCharge != null ? Number(booking.targetCharge) : 90
  // Never request more than the vehicle needs, even if charger is ultra-fast
  const vehicleMax = Math.min(
    preset.maxChargingPowerKw,
    Number(charger.maxPowerKw) || preset.maxChargingPowerKw,
  )
  const arrivalTime = booking.paidAt || booking.createdAt || new Date()

  let vehicle = await Vehicle.findOne({
    tenantId: booking.tenantId,
    userId: booking.userId,
  })
  if (!vehicle) {
    vehicle = await Vehicle.create({
      tenantId: booking.tenantId,
      userId: booking.userId,
      driverName: booking.userName || booking.userEmail || 'Driver',
      vehicleType,
      batteryCapacityKwh: battery,
      maxChargingPowerKw: vehicleMax,
      currentCharge,
      targetCharge,
      priorityTier: 'high',
      arrivalTime,
      departureTime: booking.endTime || new Date(Date.now() + 60 * 60_000),
    })
  } else {
    vehicle.vehicleType = vehicleType
    vehicle.batteryCapacityKwh = battery
    vehicle.currentCharge = currentCharge
    vehicle.targetCharge = targetCharge
    vehicle.maxChargingPowerKw = vehicleMax
    vehicle.arrivalTime = arrivalTime
    vehicle.departureTime = booking.endTime || vehicle.departureTime
    await vehicle.save()
  }

  let session = await Session.findOne({
    bookingId: booking._id,
    state: { $in: ['queued', 'connected', 'charging', 'optimized', 'throttled'] },
  })

  let created = false
  if (!session) {
    session = await Session.create({
      chargerId: booking.chargerId,
      vehicleId: vehicle._id,
      tenantId: booking.tenantId,
      siteId: booking.siteId,
      bookingId: booking._id,
      userId: booking.userId,
      state: forceStart ? 'charging' : 'connected',
      allocatedPowerKw: 0,
      allocatedPower: 0,
      driverName: vehicle.driverName,
      chargerLabel: booking.chargerLabel || charger.label || '',
      priorityTier: vehicle.priorityTier,
      vehicleType,
      currentCharge,
      targetCharge,
      batteryCapacityKwh: battery,
      maxChargingPowerKw: vehicleMax,
      chargerMaxPowerKw: charger.maxPowerKw,
      servingVoltage: servingVoltageFor(vehicleType),
      chargerVoltage: charger.voltage || 400,
      departureTime: vehicle.departureTime || booking.endTime,
      arrivalTime,
    })
    created = true
  } else {
    session.vehicleType = vehicleType
    session.currentCharge = currentCharge
    session.targetCharge = targetCharge
    session.batteryCapacityKwh = battery
    session.maxChargingPowerKw = vehicleMax
    session.servingVoltage = servingVoltageFor(vehicleType)
    session.chargerVoltage = charger.voltage || 400
    session.arrivalTime = session.arrivalTime || arrivalTime
    await session.save()
  }

  await Charger.findByIdAndUpdate(charger._id, {
    status: 'in_use',
    currentAllocatedPower: session.allocatedPowerKw || 0,
  })

  if (io) {
    emitSessionUpdate(io, session)
    startSimulation(session._id, io)
    await rebalanceGrid(booking.siteId, io)
    session = await Session.findById(session._id)
  }

  // Enrich booking with pole + ETA after allocation
  const allocated = Number(session?.allocatedPowerKw) || vehicleMax
  const energyNeed = Math.max(
    0,
    ((targetCharge - currentCharge) / 100) * battery,
  )
  const etaMin =
    allocated > 0 ? Math.max(1, Math.ceil((energyNeed / allocated) * 60)) : null

  // Queue position among active sessions at this site (FIFO by arrival)
  let queuePosition = 1
  if (booking.siteId) {
    const peers = await Session.find({
      siteId: booking.siteId,
      state: { $in: ['queued', 'connected', 'charging', 'optimized', 'throttled'] },
    }).sort({ arrivalTime: 1, createdAt: 1 })
    const idx = peers.findIndex((s) => s._id.toString() === session._id.toString())
    queuePosition = idx >= 0 ? idx + 1 : peers.length
  }

  booking.assignedPole = booking.chargerLabel || charger.label || ''
  booking.allocatedPowerKw = allocated
  booking.estimatedChargeMinutes = etaMin
  booking.queuePosition = queuePosition
  if (typeof booking.save === 'function') await booking.save()

  return {
    session,
    vehicle,
    charger,
    created,
    dispatch: {
      assignedPole: booking.assignedPole,
      allocatedPowerKw: allocated,
      estimatedChargeMinutes: etaMin,
      queuePosition,
      vehicleType,
      currentCharge,
      targetCharge,
      servingVoltage: servingVoltageFor(vehicleType),
      requiredKw: vehicleMax,
    },
  }
}

/**
 * Actual energy for invoice: prefer metered session kWh (allocated power × time).
 * Falls back to avg allocated power × actual charging duration — never charger max.
 */
function meteredEnergyFromSession(session, booking) {
  if (session && Number(session.kWhDelivered) > 0) {
    return Number(session.kWhDelivered)
  }

  const end = new Date(
    session?.endTime || booking?.chargingEndedAt || Date.now(),
  )
  const start = new Date(
    booking?.chargingStartedAt || session?.startTime || booking?.startTime || end,
  )
  const hours = Math.max(1 / 60, (end - start) / 3_600_000)

  let avgKw = Number(session?.allocatedPowerKw) || 0
  const hist = session?.powerHistory || []
  if (hist.length) {
    avgKw = hist.reduce((s, p) => s + (Number(p.kw) || 0), 0) / hist.length
  }
  // Cap by vehicle need
  const vehicleMax = Number(session?.maxChargingPowerKw) || avgKw
  avgKw = Math.min(avgKw || vehicleMax, vehicleMax)

  return Math.round(avgKw * hours * 1000) / 1000
}

function avgAllocatedKw(session) {
  const hist = session?.powerHistory || []
  if (hist.length) {
    return Math.round((hist.reduce((s, p) => s + (Number(p.kw) || 0), 0) / hist.length) * 10) / 10
  }
  return Number(session?.allocatedPowerKw) || 0
}

async function stopSessionForBooking(bookingId) {
  const session = await Session.findOne({ bookingId }).sort({ createdAt: -1 })
  if (!session) return null
  if (session.state !== 'completed') {
    stopSimulation(session._id)
    session.state = 'completed'
    session.endTime = new Date()
    session.allocatedPowerKw = 0
    session.allocatedPower = 0
    await session.save()
  }
  return session
}

/**
 * When an automated session finishes (simulator or tenant stop),
 * sync the marketplace booking + fair invoice (allocated kW × actual time).
 */
async function completeLinkedBooking(session, io) {
  if (!session?.bookingId) return null

  const booking = await Booking.findById(session.bookingId)
  if (!booking) return null
  if (booking.status === 'completed') return { booking, invoice: null }

  const { recordBookingOnInvoice } = require('./billing.service')

  booking.status = 'completed'
  booking.chargingEndedAt = session.endTime || new Date()
  booking.chargingStartedAt =
    booking.chargingStartedAt || session.startTime || booking.startTime
  const kWh = meteredEnergyFromSession(session, booking)
  booking.energyConsumed = kWh
  await booking.save()

  await Charger.findByIdAndUpdate(session.chargerId || booking.chargerId, {
    status: 'available',
    currentAllocatedPower: 0,
  }).catch(() => {})

  const avgKw = avgAllocatedKw(session)
  const invoice = await recordBookingOnInvoice(booking, {
    kWh,
    io,
    avgAllocatedKw: avgKw,
    vehicleMaxKw: session.maxChargingPowerKw,
    chargerMaxKw: session.chargerMaxPowerKw,
    sessionId: session._id,
  })

  await notify({
    io,
    userId: booking.userId,
    bookingId: booking._id,
    type: 'completed',
    message: `Charging completed · ${kWh} kWh over actual time · billed at ~${avgKw} kW allocated (not charger max)`,
  }).catch(() => {})

  if (booking.tenantId) {
    await notify({
      io,
      tenantId: booking.tenantId,
      bookingId: booking._id,
      type: 'completed',
      message: `Session auto-completed · ${booking.userName || 'Driver'} · ${kWh} kWh at ${booking.siteName}`,
    }).catch(() => {})
  }

  return { booking, invoice }
}

/**
 * Tenant fine-tunes allocation inputs after approve; grid rebalances.
 */
async function adjustAutomatedSession(sessionId, tenantId, patch = {}, io = null) {
  const filter = { _id: sessionId }
  if (tenantId) filter.tenantId = tenantId

  const session = await Session.findOne(filter)
  if (!session) throw Object.assign(new Error('Session not found'), { status: 404 })
  if (session.state === 'completed') {
    throw Object.assign(new Error('Cannot adjust a completed session'), { status: 400 })
  }

  const PRIORITY = ['emergency', 'high', 'medium', 'low', 'background', 'sla']
  if (patch.priorityTier && PRIORITY.includes(patch.priorityTier)) {
    session.priorityTier = patch.priorityTier
  }
  if (patch.vehicleType && VEHICLE_TYPES.includes(patch.vehicleType)) {
    session.vehicleType = patch.vehicleType
    session.servingVoltage = servingVoltageFor(patch.vehicleType)
    const preset = VEHICLE_PRESETS[patch.vehicleType]
    if (preset && patch.maxChargingPowerKw == null) {
      session.maxChargingPowerKw = Math.min(
        preset.maxChargingPowerKw,
        Number(session.chargerMaxPowerKw) || preset.maxChargingPowerKw,
      )
      session.batteryCapacityKwh = preset.batteryCapacityKwh
    }
  }
  if (patch.maxChargingPowerKw != null) {
    const cap = Number(session.chargerMaxPowerKw) || Number(patch.maxChargingPowerKw)
    session.maxChargingPowerKw = Math.min(
      Math.max(0.5, Number(patch.maxChargingPowerKw)),
      cap,
    )
  }
  if (patch.targetCharge != null) {
    session.targetCharge = Math.min(100, Math.max(1, Number(patch.targetCharge)))
  }
  if (patch.currentCharge != null) {
    session.currentCharge = Math.min(100, Math.max(0, Number(patch.currentCharge)))
  }

  await session.save()

  if (session.vehicleId) {
    const vehicle = await Vehicle.findById(session.vehicleId)
    if (vehicle) {
      if (session.priorityTier) vehicle.priorityTier = session.priorityTier
      if (session.vehicleType) vehicle.vehicleType = session.vehicleType
      vehicle.maxChargingPowerKw = session.maxChargingPowerKw
      vehicle.targetCharge = session.targetCharge
      vehicle.currentCharge = session.currentCharge
      await vehicle.save()
    }
  }

  if (io && session.siteId) {
    await rebalanceGrid(session.siteId, io)
    const fresh = await Session.findById(session._id)
    emitSessionUpdate(io, fresh)
    return fresh
  }

  return session
}

module.exports = {
  SERVING_VOLTAGE,
  servingVoltageFor,
  inferVehicleType,
  ensureAutomatedSession,
  meteredEnergyFromSession,
  avgAllocatedKw,
  stopSessionForBooking,
  completeLinkedBooking,
  adjustAutomatedSession,
}
