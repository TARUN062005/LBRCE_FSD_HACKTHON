const Booking = require('../models/Booking')
const Site = require('../models/Site')
const Charger = require('../models/Charger')
const User = require('../models/User')
const { ACTIVE_BOOKING_STATUSES } = require('../models/Booking')
const { getTariff } = require('../services/tariff.service')
const { notify } = require('../services/notify.service')
const { ownsTenant } = require('../middleware/auth.middleware')
const {
  recordBookingOnInvoice,
  estimateKwh,
  roundKwh,
} = require('../services/billing.service')

function getIo(req) {
  return req.app.get('io')
}

function isBookingOwner(req, booking) {
  return req.user.role === 'normal_user' && booking.userId.toString() === req.user.userId
}

function isStationTenant(req, booking) {
  if (req.user.role !== 'tenant_manager') return false
  if (!booking?.tenantId) return false
  return ownsTenant(req, booking.tenantId)
}

async function safeNotify(opts) {
  try {
    await notify(opts)
  } catch (err) {
    console.error('[bookings] notify failed:', err?.message || err)
  }
}

/**
 * Book Now → pending. ONLY the station tenant is notified (never admin).
 * User also gets a quiet "request sent" confirmation.
 */
async function createBooking(req, res) {
  try {
    const user = await User.findById(req.user.userId)
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' })
    }

    const { chargerId, siteId, bookingDate, startTime, endTime, notes, duration } = req.body || {}
    if (!chargerId || !siteId || !startTime || !endTime) {
      return res.status(400).json({
        status: 'error',
        message: 'chargerId, siteId, startTime, and endTime are required',
      })
    }

    const start = new Date(startTime)
    const end = new Date(endTime)
    if (!(start < end)) {
      return res.status(400).json({ status: 'error', message: 'endTime must be after startTime' })
    }
    if (start < new Date(Date.now() - 5 * 60 * 1000)) {
      return res.status(400).json({ status: 'error', message: 'startTime must be in the future' })
    }

    const [site, charger] = await Promise.all([
      Site.findById(siteId),
      Charger.findById(chargerId),
    ])

    if (!site || !charger) {
      return res.status(404).json({ status: 'error', message: 'Site or charger not found' })
    }
    if (site.status && site.status !== 'approved') {
      return res.status(400).json({ status: 'error', message: 'Station is not available for booking' })
    }
    if (charger.siteId.toString() !== site._id.toString()) {
      return res.status(400).json({ status: 'error', message: 'Charger does not belong to site' })
    }
    if (charger.status === 'offline') {
      return res.status(400).json({ status: 'error', message: 'Charger is offline' })
    }
    if (!site.tenantId) {
      return res.status(400).json({
        status: 'error',
        message: 'This station has no host company yet',
      })
    }

    const overlap = await Booking.findOne({
      chargerId,
      status: { $in: ACTIVE_BOOKING_STATUSES },
      startTime: { $lt: end },
      endTime: { $gt: start },
    })
    if (overlap) {
      return res.status(409).json({
        status: 'error',
        message: 'Charger already booked for that time window',
      })
    }

    const hours = (end - start) / (1000 * 60 * 60)
    const tariff = getTariff(start)
    const rate = site.pricePerKwh > 0 ? site.pricePerKwh : tariff.pricePerKwh
    const estimatedKw = Math.min(charger.maxPowerKw, 22)
    const estimatedCost = Number((estimatedKw * hours * rate).toFixed(2))
    const durationMin = Number(duration) || Math.round(hours * 60)
    const slotLabel = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}–${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`

    const booking = await Booking.create({
      userId: req.user.userId,
      tenantId: site.tenantId,
      chargerId,
      siteId,
      bookingDate: bookingDate ? new Date(bookingDate) : start,
      startTime: start,
      endTime: end,
      slot: slotLabel,
      duration: durationMin,
      status: 'pending',
      estimatedCost,
      amount: estimatedCost,
      paymentStatus: 'unpaid',
      notificationSentToTenant: false,
      notificationSentToUser: false,
      notes: notes || '',
      siteName: site.name,
      chargerLabel: charger.label,
      userName: user.name || '',
      userEmail: user.email || '',
      userPhone: user.phone || '',
      vehicleNumber: user.vehicleNumber || '',
    })

    const io = getIo(req)
    const when = new Date(start).toLocaleString()

    // Tenant only — new booking request (admin never notified)
    await notify({
      io,
      tenantId: site.tenantId,
      bookingId: booking._id,
      type: 'booking',
      message: `New booking request received. ${user.name || 'Driver'} · ${site.name} · ${charger.label} · ${when}`,
    })
    booking.notificationSentToTenant = true

    // User — request sent confirmation
    await notify({
      io,
      userId: req.user.userId,
      bookingId: booking._id,
      type: 'booking',
      message: `Booking request sent to ${site.name}. Waiting for the host to approve.`,
    })
    booking.notificationSentToUser = true
    await booking.save()

    return res.status(201).json({ status: 'ok', data: booking.toSafeJSON() })
  } catch (err) {
    console.error('[bookings] create error:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to create booking' })
  }
}

async function listBookings(req, res) {
  try {
    if (req.user.role !== 'normal_user') {
      return res.status(403).json({
        status: 'error',
        message: 'Bookings are managed by station hosts, not platform admins',
      })
    }

    const bookings = await Booking.find({ userId: req.user.userId })
      .sort({ startTime: -1 })
      .limit(100)
    return res.json({ status: 'ok', data: bookings.map((b) => b.toSafeJSON()) })
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to list bookings' })
  }
}

async function history(req, res) {
  return listBookings(req, res)
}

async function cancelBooking(req, res) {
  try {
    const id = req.params.id || req.body?.bookingId
    if (!id) {
      return res.status(400).json({ status: 'error', message: 'booking id required' })
    }

    const booking = await Booking.findById(id)
    if (!booking) {
      return res.status(404).json({ status: 'error', message: 'Booking not found' })
    }

    if (!isBookingOwner(req, booking) && !isStationTenant(req, booking)) {
      return res.status(403).json({ status: 'error', message: 'Insufficient permissions' })
    }

    if (['completed', 'cancelled', 'rejected'].includes(booking.status)) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot cancel a ${booking.status} booking`,
      })
    }

    booking.status = 'cancelled'
    await booking.save()

    const io = getIo(req)
    const base = `${booking.siteName} / ${booking.chargerLabel}`

    await notify({
      io,
      userId: booking.userId,
      bookingId: booking._id,
      type: 'booking',
      message: `Your booking has been cancelled · ${base}`,
    })

    if (booking.tenantId) {
      await notify({
        io,
        tenantId: booking.tenantId,
        bookingId: booking._id,
        type: 'booking',
        message: `Booking cancelled · ${booking.userName || 'Driver'} · ${base}`,
      })
    }

    return res.json({ status: 'ok', data: booking.toSafeJSON() })
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to cancel booking' })
  }
}

/** Tenant host approves a pending booking */
async function approveBooking(req, res) {
  try {
    const booking = await Booking.findById(req.params.id)
    if (!booking) {
      return res.status(404).json({ status: 'error', message: 'Booking not found' })
    }
    if (!isStationTenant(req, booking)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only the station host can approve bookings',
      })
    }
    if (booking.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: 'Only pending bookings can be approved',
      })
    }

    booking.status = 'approved'
    await booking.save()

    await safeNotify({
      io: getIo(req),
      userId: booking.userId,
      bookingId: booking._id,
      type: 'booking',
      message: `Your booking has been confirmed. ${booking.siteName} · arrive at ${new Date(booking.startTime).toLocaleString()}`,
    })

    return res.json({ status: 'ok', data: booking.toSafeJSON() })
  } catch (err) {
    console.error('[bookings] approve error:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to approve booking' })
  }
}

/** Tenant host rejects a pending booking */
async function rejectBooking(req, res) {
  try {
    const booking = await Booking.findById(req.params.id)
    if (!booking) {
      return res.status(404).json({ status: 'error', message: 'Booking not found' })
    }
    if (!isStationTenant(req, booking)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only the station host can reject bookings',
      })
    }
    if (booking.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: 'Only pending bookings can be rejected',
      })
    }

    booking.status = 'rejected'
    await booking.save()

    await safeNotify({
      io: getIo(req),
      userId: booking.userId,
      bookingId: booking._id,
      type: 'booking',
      message: `Your booking has been rejected. ${booking.siteName} / ${booking.chargerLabel}`,
    })

    return res.json({ status: 'ok', data: booking.toSafeJSON() })
  } catch (err) {
    console.error('[bookings] reject error:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to reject booking' })
  }
}

/** Tenant marks charging started when the driver arrives */
async function startCharging(req, res) {
  try {
    const booking = await Booking.findById(req.params.id)
    if (!booking) {
      return res.status(404).json({ status: 'error', message: 'Booking not found' })
    }
    if (!isStationTenant(req, booking)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only the station host can start a charging session',
      })
    }
    if (!['approved', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Booking must be approved before charging starts',
      })
    }

    booking.status = 'charging'
    booking.chargingStartedAt = new Date()
    await booking.save()
    try {
      await Charger.findByIdAndUpdate(booking.chargerId, { status: 'in_use' })
    } catch (err) {
      console.error('[bookings] charger update failed:', err?.message || err)
    }

    // Link marketplace booking → optimizer session (grid board)
    try {
      const Session = require('../models/Session')
      const Vehicle = require('../models/Vehicle')
      const { VEHICLE_PRESETS } = require('../models/Vehicle')
      const { startSimulation } = require('../services/chargerSimulator.service')
      const { emitSessionUpdate } = require('../sockets/session.socket')

      let vehicle = await Vehicle.findOne({
        tenantId: booking.tenantId,
        userId: booking.userId,
      })
      if (!vehicle) {
        const preset = VEHICLE_PRESETS.car
        vehicle = await Vehicle.create({
          tenantId: booking.tenantId,
          userId: booking.userId,
          driverName: booking.userName || booking.userEmail || 'Driver',
          vehicleType: 'car',
          batteryCapacityKwh: preset.batteryCapacityKwh,
          maxChargingPowerKw: preset.maxChargingPowerKw,
          currentCharge: 25,
          targetCharge: 90,
          priorityTier: 'high',
          arrivalTime: new Date(),
          departureTime: booking.endTime || new Date(Date.now() + 2 * 3600_000),
        })
      }

      const existing = await Session.findOne({
        bookingId: booking._id,
        state: { $in: ['queued', 'connected', 'charging', 'optimized', 'throttled'] },
      })
      if (!existing) {
        const charger = await Charger.findById(booking.chargerId)
        const session = await Session.create({
          chargerId: booking.chargerId,
          vehicleId: vehicle._id,
          tenantId: booking.tenantId,
          siteId: booking.siteId,
          bookingId: booking._id,
          userId: booking.userId,
          state: 'connected',
          allocatedPowerKw: 0,
          driverName: vehicle.driverName,
          chargerLabel: booking.chargerLabel || charger?.label || '',
          priorityTier: vehicle.priorityTier,
          vehicleType: vehicle.vehicleType,
          currentCharge: vehicle.currentCharge,
          targetCharge: vehicle.targetCharge,
          batteryCapacityKwh: vehicle.batteryCapacityKwh,
          maxChargingPowerKw: vehicle.maxChargingPowerKw,
          chargerMaxPowerKw: charger?.maxPowerKw || 22,
          departureTime: vehicle.departureTime,
        })
        const io = getIo(req)
        emitSessionUpdate(io, session)
        startSimulation(session._id, io)
      }
    } catch (err) {
      console.error('[bookings] session link failed:', err?.message || err)
    }

    await safeNotify({
      io: getIo(req),
      userId: booking.userId,
      bookingId: booking._id,
      type: 'booking',
      message: `Charging has started at ${booking.siteName} · ${booking.chargerLabel}`,
    })

    return res.json({ status: 'ok', data: booking.toSafeJSON() })
  } catch (err) {
    console.error('[bookings] start error:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to start charging' })
  }
}

/** Tenant marks charging complete → invoice + GST */
async function completeCharging(req, res) {
  try {
    const booking = await Booking.findById(req.params.id)
    if (!booking) {
      return res.status(404).json({ status: 'error', message: 'Booking not found' })
    }
    if (!isStationTenant(req, booking)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only the station host can complete a charging session',
      })
    }
    if (booking.status !== 'charging') {
      return res.status(400).json({
        status: 'error',
        message: 'Booking must be in charging state',
      })
    }

    const kWh = roundKwh(estimateKwh(booking))
    booking.status = 'completed'
    booking.chargingEndedAt = new Date()
    booking.energyConsumed = kWh
    await booking.save()
    try {
      await Charger.findByIdAndUpdate(booking.chargerId, { status: 'available' })
    } catch (err) {
      console.error('[bookings] charger free failed:', err?.message || err)
    }

    let invoice = null
    try {
      invoice = await recordBookingOnInvoice(booking, { kWh, io: getIo(req) })
    } catch (err) {
      console.error('[bookings] invoice error:', err)
    }

    const io = getIo(req)
    await safeNotify({
      io,
      userId: booking.userId,
      bookingId: booking._id,
      type: 'completed',
      message: `Charging completed · ${kWh} kWh · invoice ready`,
    })
    if (booking.tenantId) {
      await safeNotify({
        io,
        tenantId: booking.tenantId,
        bookingId: booking._id,
        type: 'completed',
        message: `Charging completed · ${booking.userName || 'Driver'} · ${kWh} kWh at ${booking.siteName}`,
      })
    }

    return res.json({
      status: 'ok',
      data: booking.toSafeJSON(),
      invoice: invoice ? invoice.toSafeJSON() : null,
    })
  } catch (err) {
    console.error('[bookings] complete error:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to complete charging' })
  }
}

module.exports = {
  createBooking,
  listBookings,
  history,
  cancelBooking,
  approveBooking,
  rejectBooking,
  startCharging,
  completeCharging,
}
