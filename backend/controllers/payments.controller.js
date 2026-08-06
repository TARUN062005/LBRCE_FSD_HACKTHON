const Booking = require('../models/Booking')
const Payment = require('../models/Payment')
const Site = require('../models/Site')
const Charger = require('../models/Charger')
const User = require('../models/User')
const { ACTIVE_BOOKING_STATUSES } = require('../models/Booking')
const { notify } = require('../services/notify.service')
const {
  buildBookingQuote,
  demoPaymentId,
  demoOrderId,
} = require('../services/pricing.service')
const { PAYMENT_METHODS } = require('../models/Payment')

/**
 * GET/POST quote for pre-booking summary (no DB write).
 * POST /payments/quote
 */
async function quote(req, res) {
  try {
    const { siteId, chargerId, startTime, endTime, duration } = req.body || {}
    if (!siteId || !chargerId || !startTime || !endTime) {
      return res.status(400).json({
        status: 'error',
        message: 'siteId, chargerId, startTime, and endTime are required',
      })
    }

    const start = new Date(startTime)
    const end = new Date(endTime)
    if (!(start < end)) {
      return res.status(400).json({ status: 'error', message: 'endTime must be after startTime' })
    }

    const [site, charger] = await Promise.all([
      Site.findById(siteId),
      Charger.findById(chargerId),
    ])
    if (!site || !charger) {
      return res.status(404).json({ status: 'error', message: 'Site or charger not found' })
    }

    const durationMin =
      Number(duration) || Math.round((end - start) / (1000 * 60))
    const pricing = buildBookingQuote({
      pricePerKwh: site.pricePerKwh,
      maxPowerKw: charger.maxPowerKw,
      durationMinutes: durationMin,
    })

    return res.json({
      status: 'ok',
      data: {
        stationName: site.name,
        chargerLabel: charger.label,
        chargerId: charger._id.toString(),
        stationId: site._id.toString(),
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        slot: `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}–${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        ...pricing,
      },
    })
  } catch (err) {
    console.error('[payments] quote:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to build quote' })
  }
}

/**
 * Fake Razorpay checkout for pre-booking.
 * Creates payment (paid) + booking (pending, paymentStatus paid) + notifies tenant.
 * POST /payments/demo-checkout
 */
async function demoCheckout(req, res) {
  try {
    const {
      siteId,
      chargerId,
      bookingDate,
      startTime,
      endTime,
      duration,
      method = 'upi',
      notes,
    } = req.body || {}

    if (!siteId || !chargerId || !startTime || !endTime) {
      return res.status(400).json({
        status: 'error',
        message: 'siteId, chargerId, startTime, and endTime are required',
      })
    }

    const payMethod = PAYMENT_METHODS.includes(method) ? method : 'upi'
    const user = await User.findById(req.user.userId)
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' })
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
    if (!site.tenantId) {
      return res.status(400).json({ status: 'error', message: 'This station has no host company yet' })
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

    const durationMin = Number(duration) || Math.round((end - start) / (1000 * 60))
    const pricing = buildBookingQuote({
      pricePerKwh: site.pricePerKwh,
      maxPowerKw: charger.maxPowerKw,
      durationMinutes: durationMin,
    })
    const slotLabel = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}–${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`

    const paymentId = demoPaymentId()
    const orderId = demoOrderId()

    const payment = await Payment.create({
      paymentId,
      orderId,
      userId: user._id,
      stationId: site._id,
      amount: pricing.totalAmount,
      currency: 'INR',
      method: payMethod,
      status: 'paid',
      provider: 'razorpay_demo',
      meta: {
        stationName: site.name,
        chargerLabel: charger.label,
        energyCost: pricing.energyCost,
        platformFee: pricing.platformFee,
        gstAmount: pricing.gstAmount,
        estimatedKwh: pricing.estimatedKwh,
      },
    })

    const booking = await Booking.create({
      userId: user._id,
      tenantId: site.tenantId,
      chargerId,
      siteId: site._id,
      bookingDate: bookingDate ? new Date(bookingDate) : start,
      startTime: start,
      endTime: end,
      slot: slotLabel,
      duration: pricing.durationMinutes,
      status: 'pending',
      estimatedCost: pricing.energyCost,
      amount: pricing.totalAmount,
      energyCost: pricing.energyCost,
      platformFee: pricing.platformFee,
      gstAmount: pricing.gstAmount,
      estimatedKwh: pricing.estimatedKwh,
      paymentStatus: 'paid',
      paymentId,
      orderId,
      paymentMethod: payMethod,
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

    payment.bookingId = booking._id
    await payment.save()

    const io = req.app.get('io')
    const when = start.toLocaleString()

    await notify({
      io,
      tenantId: site.tenantId,
      bookingId: booking._id,
      type: 'booking',
      message: `New booking request received. ${user.name || 'Driver'} · ${site.name} · ${charger.label} · ${when} · ₹${pricing.totalAmount} paid`,
    })
    await notify({
      io,
      tenantId: site.tenantId,
      bookingId: booking._id,
      type: 'payment',
      message: `Payment received · ₹${pricing.totalAmount} · ${paymentId}`,
    })
    booking.notificationSentToTenant = true

    await notify({
      io,
      userId: user._id,
      bookingId: booking._id,
      type: 'booking',
      message: `Your booking request has been sent to the station owner. Payment ${paymentId} successful.`,
    })
    booking.notificationSentToUser = true
    await booking.save()

    return res.status(201).json({
      status: 'ok',
      message: 'Your booking request has been sent to the station owner.',
      data: {
        booking: booking.toSafeJSON(),
        payment: payment.toSafeJSON(),
        paymentId,
        orderId,
        amount: pricing.totalAmount,
        paymentStatus: 'paid',
        timestamp: payment.createdAt,
      },
      provider: 'razorpay_demo',
    })
  } catch (err) {
    console.error('[payments] demoCheckout:', err)
    return res.status(500).json({ status: 'error', message: 'Demo payment failed' })
  }
}

/**
 * Record cancelled / failed demo attempt (optional analytics).
 * POST /payments/demo-cancel
 */
async function demoCancel(req, res) {
  try {
    const { siteId, amount = 0, method = 'upi', reason = 'cancelled' } = req.body || {}
    const payment = await Payment.create({
      paymentId: demoPaymentId(),
      orderId: demoOrderId(),
      userId: req.user.userId,
      stationId: siteId || null,
      amount: Number(amount) || 0,
      method: PAYMENT_METHODS.includes(method) ? method : 'upi',
      status: reason === 'failed' ? 'failed' : 'cancelled',
      provider: 'razorpay_demo',
    })
    return res.json({
      status: 'ok',
      message: 'Payment cancelled.',
      data: payment.toSafeJSON(),
    })
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Could not record cancellation' })
  }
}

/** Legacy: mark completed booking invoice as paid */
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
    if (booking.paymentStatus === 'paid') {
      return res.json({ status: 'ok', data: booking.toSafeJSON(), message: 'Already paid' })
    }

    booking.paymentStatus = 'paid'
    if (!booking.paymentId) {
      booking.paymentId = demoPaymentId()
      booking.orderId = demoOrderId()
    }
    await booking.save()

    return res.json({
      status: 'ok',
      data: booking.toSafeJSON(),
      message: 'Payment successful (simulated)',
      provider: 'razorpay_demo',
    })
  } catch (err) {
    console.error('[payments] checkout:', err)
    return res.status(500).json({ status: 'error', message: 'Payment failed' })
  }
}

module.exports = { quote, demoCheckout, demoCancel, checkout }
