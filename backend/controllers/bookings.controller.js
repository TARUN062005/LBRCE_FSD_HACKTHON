const Booking = require('../models/Booking')
const Site = require('../models/Site')
const Charger = require('../models/Charger')
const User = require('../models/User')
const { ACTIVE_BOOKING_STATUSES } = require('../models/Booking')
const { getTariff } = require('../services/tariff.service')
const { notify } = require('../services/notify.service')
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
  return (
    req.user.role === 'tenant_manager' &&
    req.user.tenantId &&
    booking.tenantId &&
    booking.tenantId.toString() === req.user.tenantId
  )
}

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

    // Booking held unpaid — tenant/user alerts fire after payment (see payments.controller)
    const booking = await Booking.create({
      userId: req.user.userId,
      tenantId: site.tenantId || null,
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
    })

    return res.status(201).json({ status: 'ok', data: booking.toSafeJSON() })
  } catch (err) {
    console.error('[bookings] create error:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to create booking' })
  }
}

async function listBookings(req, res) {
  try {
    let query = {}
    if (req.user.role === 'normal_user') {
      query.userId = req.user.userId
    } else if (req.user.role === 'admin') {
      if (req.query.status) query.status = req.query.status
    } else {
      return res.status(403).json({ status: 'error', message: 'Insufficient permissions' })
    }

    const bookings = await Booking.find(query).sort({ startTime: -1 }).limit(100)
    return res.json({ status: 'ok', data: bookings.map((b) => b.toSafeJSON()) })
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to list bookings' })
  }
}

async function history(req, res) {
  req.query = { ...req.query }
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

    const isAdmin = req.user.role === 'admin'
    if (!isBookingOwner(req, booking) && !isStationTenant(req, booking) && !isAdmin) {
      return res.status(403).json({ status: 'error', message: 'Insufficient permissions' })
    }

    if (['completed', 'cancelled'].includes(booking.status)) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot cancel a ${booking.status} booking`,
      })
    }

    booking.status = 'cancelled'
    await booking.save()

    const io = getIo(req)
    const base = `${booking.siteName} / ${booking.chargerLabel}`

    // User: booking cancelled
    await notify({
      io,
      userId: booking.userId,
      bookingId: booking._id,
      type: 'booking',
      message: `[Booking cancelled] ${base}`,
    })

    // Tenant: booking cancelled (never admin)
    if (booking.tenantId) {
      await notify({
        io,
        tenantId: booking.tenantId,
        bookingId: booking._id,
        type: 'booking',
        message: `[Booking cancelled] ${booking.userName || 'Driver'} · ${base}`,
      })
    }

    return res.json({ status: 'ok', data: booking.toSafeJSON() })
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to cancel booking' })
  }
}

/** Tenant (or admin) confirms a pending booking after review */
async function approveBooking(req, res) {
  try {
    const booking = await Booking.findById(req.params.id)
    if (!booking) {
      return res.status(404).json({ status: 'error', message: 'Booking not found' })
    }

    const isAdmin = req.user.role === 'admin'
    if (!isStationTenant(req, booking) && !isAdmin) {
      return res.status(403).json({ status: 'error', message: 'Insufficient permissions' })
    }
    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      return res.status(400).json({
        status: 'error',
        message: 'Only pending/confirmed bookings can be approved',
      })
    }
    booking.status = 'approved'
    await booking.save()

    await notify({
      io: getIo(req),
      userId: booking.userId,
      bookingId: booking._id,
      type: 'booking',
      message: `[Booking confirmed] ${booking.siteName} / ${booking.chargerLabel} · arrive at ${new Date(booking.startTime).toLocaleString()}`,
    })

    return res.json({ status: 'ok', data: booking.toSafeJSON() })
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to approve booking' })
  }
}

/** Driver starts charging on an approved/confirmed booking */
async function startCharging(req, res) {
  try {
    const booking = await Booking.findById(req.params.id)
    if (!booking) {
      return res.status(404).json({ status: 'error', message: 'Booking not found' })
    }

    const isAdmin = req.user.role === 'admin'
    if (!isBookingOwner(req, booking) && !isStationTenant(req, booking) && !isAdmin) {
      return res.status(403).json({ status: 'error', message: 'Insufficient permissions' })
    }
    if (!['approved', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Booking must be confirmed before charging',
      })
    }
    if (booking.status === 'confirmed' && booking.paymentStatus === 'unpaid') {
      return res.status(400).json({
        status: 'error',
        message: 'Payment required before charging',
      })
    }

    booking.status = 'charging'
    await booking.save()
    await Charger.findByIdAndUpdate(booking.chargerId, { status: 'in_use' })

    const io = getIo(req)

    // User: charging started
    await notify({
      io,
      userId: booking.userId,
      bookingId: booking._id,
      type: 'booking',
      message: `[Charging started] ${booking.siteName} · ${booking.chargerLabel}`,
    })

    // Tenant: user arrived
    if (booking.tenantId) {
      await notify({
        io,
        tenantId: booking.tenantId,
        bookingId: booking._id,
        type: 'booking',
        message: `[User arrived] ${booking.userName || 'Driver'} started charging at ${booking.siteName}`,
      })
    }

    return res.json({ status: 'ok', data: booking.toSafeJSON() })
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to start charging' })
  }
}

/** Complete charging → invoice */
async function completeCharging(req, res) {
  try {
    const booking = await Booking.findById(req.params.id)
    if (!booking) {
      return res.status(404).json({ status: 'error', message: 'Booking not found' })
    }

    const isAdmin = req.user.role === 'admin'
    if (!isBookingOwner(req, booking) && !isStationTenant(req, booking) && !isAdmin) {
      return res.status(403).json({ status: 'error', message: 'Insufficient permissions' })
    }
    if (booking.status !== 'charging') {
      return res.status(400).json({
        status: 'error',
        message: 'Booking must be in charging state',
      })
    }

    const kWh = roundKwh(estimateKwh(booking))
    booking.status = 'completed'
    await booking.save()
    await Charger.findByIdAndUpdate(booking.chargerId, { status: 'available' })

    const invoice = await recordBookingOnInvoice(booking, { kWh, io: getIo(req) })

    const io = getIo(req)

    // User: charging completed
    await notify({
      io,
      userId: booking.userId,
      bookingId: booking._id,
      type: 'completed',
      message: `[Charging completed] ${kWh} kWh delivered · invoice ready`,
    })

    // Tenant: charging completed
    if (booking.tenantId) {
      await notify({
        io,
        tenantId: booking.tenantId,
        bookingId: booking._id,
        type: 'completed',
        message: `[Charging completed] ${booking.userName || 'Driver'} · ${kWh} kWh at ${booking.siteName}`,
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
  startCharging,
  completeCharging,
}
