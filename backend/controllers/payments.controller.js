const Booking = require('../models/Booking')
const { ACTIVE_BOOKING_STATUSES } = require('../models/Booking')
const { notify } = require('../services/notify.service')

/**
 * Mock online payment — production would call Stripe/Razorpay.
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
    if (booking.userId.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'Not your booking' })
    }
    if (booking.status === 'cancelled') {
      return res.status(400).json({ status: 'error', message: 'Booking is cancelled' })
    }
    if (booking.paymentStatus === 'paid') {
      return res.json({ status: 'ok', data: booking.toSafeJSON(), message: 'Already paid' })
    }

    booking.paymentStatus = 'paid'
    booking.amount = booking.amount || booking.estimatedCost || 0
    if (['pending', 'approved'].includes(booking.status)) {
      booking.status = 'confirmed'
    }
    await booking.save()

    const io = req.app.get('io')
    await notify({
      io,
      userId: booking.userId,
      tenantId: booking.tenantId,
      bookingId: booking._id,
      type: 'booking',
      message: `[Payment] Paid $${booking.amount} · ${booking.siteName} confirmed`,
    })

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
