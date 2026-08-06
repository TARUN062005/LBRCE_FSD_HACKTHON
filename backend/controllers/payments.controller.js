const Booking = require('../models/Booking')
const { ACTIVE_BOOKING_STATUSES } = require('../models/Booking')
const { notify } = require('../services/notify.service')

/**
 * Pay an invoice / completed booking (simulated).
 * Does NOT confirm or approve bookings — tenant approval is separate.
 * POST /payments/checkout { bookingId }
 */
async function checkout(req, res) {
  try {
    const { bookingId } = req.body || {}
    if (!bookingId) {
      return res.status(400).json({ status: 'error', message: 'bookingId is required' })
    }

    const booking = await Booking.findById(bookingId)
    if (!booking) {
      return res.status(404).json({ status: 'error', message: 'Booking not found' })
    }
    if (booking.userId.toString() !== req.user.userId) {
      return res.status(403).json({ status: 'error', message: 'Not your booking' })
    }
    if (['cancelled', 'rejected'].includes(booking.status)) {
      return res.status(400).json({ status: 'error', message: 'Booking is not payable' })
    }
    if (booking.status !== 'completed') {
      return res.status(400).json({
        status: 'error',
        message: 'Pay after charging is completed and an invoice is ready',
      })
    }
    if (booking.paymentStatus === 'paid') {
      return res.json({ status: 'ok', data: booking.toSafeJSON(), message: 'Already paid' })
    }

    booking.paymentStatus = 'paid'
    booking.amount = booking.amount || booking.estimatedCost || 0
    await booking.save()

    const io = req.app.get('io')
    const place = `${booking.siteName} · ${booking.chargerLabel}`

    await notify({
      io,
      userId: booking.userId,
      bookingId: booking._id,
      type: 'payment',
      message: `Payment successful · ₹${booking.amount} · ${place}`,
    })
    if (booking.tenantId) {
      await notify({
        io,
        tenantId: booking.tenantId,
        bookingId: booking._id,
        type: 'payment',
        message: `Payment received · ₹${booking.amount} · ${place}`,
      })
    }

    return res.json({
      status: 'ok',
      data: booking.toSafeJSON(),
      message: 'Payment successful (simulated)',
      provider: 'mock',
    })
  } catch (err) {
    console.error('[payments] checkout:', err)
    return res.status(500).json({ status: 'error', message: 'Payment failed' })
  }
}

module.exports = { checkout, ACTIVE_BOOKING_STATUSES }
