const Booking = require('../models/Booking')
const Site = require('../models/Site')
const Charger = require('../models/Charger')
const User = require('../models/User')
const Notification = require('../models/Notification')
const { getTariff } = require('../services/tariff.service')

async function createBooking(req, res) {
  try {
    const { chargerId, siteId, bookingDate, startTime, endTime, notes } = req.body || {}
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

    const [site, charger, user] = await Promise.all([
      Site.findById(siteId),
      Charger.findById(chargerId),
      User.findById(req.user.userId),
    ])

    if (!site || !charger) {
      return res.status(404).json({ status: 'error', message: 'Site or charger not found' })
    }
    if (charger.siteId.toString() !== site._id.toString()) {
      return res.status(400).json({ status: 'error', message: 'Charger does not belong to site' })
    }
    if (charger.status === 'offline') {
      return res.status(400).json({ status: 'error', message: 'Charger is offline' })
    }

    // Overlap check: pending/approved/charging on same charger
    const overlap = await Booking.findOne({
      chargerId,
      status: { $in: ['pending', 'approved', 'charging'] },
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
    const estimatedKw = Math.min(charger.maxPowerKw, 22)
    const estimatedCost = Number((estimatedKw * hours * tariff.pricePerKwh).toFixed(2))

    const booking = await Booking.create({
      userId: req.user.userId,
      chargerId,
      siteId,
      bookingDate: bookingDate ? new Date(bookingDate) : start,
      startTime: start,
      endTime: end,
      status: 'pending',
      estimatedCost,
      notes: notes || '',
      siteName: site.name,
      chargerLabel: charger.label,
      userName: user?.name || '',
      userEmail: user?.email || '',
    })

    await Notification.create({
      userId: req.user.userId,
      bookingId: booking._id,
      type: 'booking',
      message: `[Booking] Pending confirmation at ${site.name} · charger ${charger.label} · est. $${estimatedCost}`,
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

    const isOwner =
      req.user.role === 'normal_user' && booking.userId.toString() === req.user.userId
    const isAdmin = req.user.role === 'admin'
    if (!isOwner && !isAdmin) {
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
    return res.json({ status: 'ok', data: booking.toSafeJSON() })
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to cancel booking' })
  }
}

/** Admin approve pending booking */
async function approveBooking(req, res) {
  try {
    const booking = await Booking.findById(req.params.id)
    if (!booking) {
      return res.status(404).json({ status: 'error', message: 'Booking not found' })
    }
    if (booking.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: 'Only pending bookings can be approved',
      })
    }
    booking.status = 'approved'
    await booking.save()
    return res.json({ status: 'ok', data: booking.toSafeJSON() })
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to approve booking' })
  }
}

module.exports = {
  createBooking,
  listBookings,
  cancelBooking,
  approveBooking,
}
