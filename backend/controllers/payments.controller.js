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

const { VEHICLE_PRESETS, VEHICLE_TYPES } = require('../models/Vehicle')

function normalizeVehicleType(raw) {
  const t = String(raw || '').toLowerCase()
  return VEHICLE_TYPES.includes(t) ? t : 'car'
}

function energyNeededFromProfile({ vehicleType, currentCharge, targetCharge, batteryCapacityKwh }) {
  const type = normalizeVehicleType(vehicleType)
  const preset = VEHICLE_PRESETS[type] || VEHICLE_PRESETS.car
  const battery = Number(batteryCapacityKwh) > 0 ? Number(batteryCapacityKwh) : preset.batteryCapacityKwh
  const cur = Math.min(100, Math.max(0, Number(currentCharge ?? 20)))
  const tgt = Math.min(100, Math.max(cur, Number(targetCharge ?? 80)))
  return Math.max(0, ((tgt - cur) / 100) * battery)
}

/**
 * GET/POST quote for pre-booking summary (no DB write).
 * POST /payments/quote
 */
async function quote(req, res) {
  try {
    const {
      siteId,
      chargerId,
      startTime,
      endTime,
      duration,
      vehicleType,
      currentCharge,
      targetCharge,
      batteryCapacityKwh,
    } = req.body || {}
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

    const type = normalizeVehicleType(vehicleType)
    const preset = VEHICLE_PRESETS[type] || VEHICLE_PRESETS.car
    const vehicleMax = Math.min(preset.maxChargingPowerKw, Number(charger.maxPowerKw) || preset.maxChargingPowerKw)
    const energyNeeded = energyNeededFromProfile({
      vehicleType: type,
      currentCharge,
      targetCharge,
      batteryCapacityKwh: batteryCapacityKwh || preset.batteryCapacityKwh,
    })

    const durationMin =
      Number(duration) || Math.round((end - start) / (1000 * 60))
    const pricing = buildBookingQuote({
      pricePerKwh: site.pricePerKwh,
      maxPowerKw: charger.maxPowerKw,
      durationMinutes: durationMin,
      vehicleMaxKw: vehicleMax,
      energyNeededKwh: energyNeeded || undefined,
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
        vehicleType: type,
        currentCharge: currentCharge != null ? Number(currentCharge) : null,
        targetCharge: targetCharge != null ? Number(targetCharge) : null,
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
      vehicleType,
      currentCharge,
      targetCharge,
      batteryCapacityKwh,
      vehicleNumber,
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

    const { resolveSlotGrant } = require('../services/waitlist.service')
    const grant = await resolveSlotGrant({
      siteId: site._id,
      preferredChargerId: chargerId,
      startTime: start,
      endTime: end,
    })
    if (grant.outcome === 'full' || grant.outcome === 'unavailable') {
      return res.status(409).json({
        status: 'error',
        message: grant.message || 'No ports available',
        grant,
      })
    }

    const assignedCharger = grant.charger || charger
    const durationMin = Number(duration) || Math.round((end - start) / (1000 * 60))
    const type = normalizeVehicleType(vehicleType)
    const preset = VEHICLE_PRESETS[type] || VEHICLE_PRESETS.car
    const vehicleMax = Math.min(
      preset.maxChargingPowerKw,
      Number(assignedCharger.maxPowerKw) || preset.maxChargingPowerKw,
    )
    const cur = currentCharge != null ? Number(currentCharge) : 25
    const tgt = targetCharge != null ? Number(targetCharge) : 90
    const battery =
      Number(batteryCapacityKwh) > 0 ? Number(batteryCapacityKwh) : preset.batteryCapacityKwh
    const energyNeeded = energyNeededFromProfile({
      vehicleType: type,
      currentCharge: cur,
      targetCharge: tgt,
      batteryCapacityKwh: battery,
    })
    const pricing = buildBookingQuote({
      pricePerKwh: site.pricePerKwh,
      maxPowerKw: assignedCharger.maxPowerKw,
      durationMinutes: durationMin,
      vehicleMaxKw: vehicleMax,
      energyNeededKwh: energyNeeded || undefined,
    })

    const isOffer = grant.outcome === 'offered'
    const bookedStart = isOffer ? start : grant.startTime
    const bookedEnd = isOffer ? end : grant.endTime
    const slotLabel = grant.slot

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
        chargerLabel: assignedCharger.label,
        energyCost: pricing.energyCost,
        platformFee: pricing.platformFee,
        gstAmount: pricing.gstAmount,
        estimatedKwh: pricing.estimatedKwh,
        grantStatus: grant.grantStatus,
        fillOrder: grant.fillOrder,
      },
    })

    const booking = await Booking.create({
      userId: user._id,
      tenantId: site.tenantId,
      chargerId: isOffer ? assignedCharger._id : assignedCharger._id,
      siteId: site._id,
      bookingDate: bookingDate ? new Date(bookingDate) : bookedStart,
      startTime: bookedStart,
      endTime: bookedEnd,
      slot: slotLabel,
      duration: pricing.durationMinutes,
      status: isOffer ? 'offered' : 'pending',
      estimatedCost: pricing.energyCost,
      amount: pricing.totalAmount,
      energyCost: pricing.energyCost,
      platformFee: pricing.platformFee,
      gstAmount: pricing.gstAmount,
      estimatedKwh: pricing.estimatedKwh,
      estimatedChargeMinutes: pricing.estimatedChargeMinutes,
      paymentStatus: 'paid',
      paymentId,
      orderId,
      paymentMethod: payMethod,
      paidAt: new Date(),
      notificationSentToTenant: false,
      notificationSentToUser: false,
      notes: notes || '',
      siteName: site.name,
      chargerLabel: assignedCharger.label,
      assignedPole: isOffer ? '' : assignedCharger.label,
      userName: user.name || '',
      userEmail: user.email || '',
      userPhone: user.phone || '',
      vehicleNumber: vehicleNumber || user.vehicleNumber || '',
      vehicleType: type,
      currentCharge: cur,
      targetCharge: tgt,
      batteryCapacityKwh: battery,
      grantStatus: grant.grantStatus,
      fillOrder: grant.fillOrder,
      grantMessage: grant.message || '',
      offeredStartTime: isOffer ? grant.offeredStartTime : null,
      offeredEndTime: isOffer ? grant.offeredEndTime : null,
      offeredChargerId: isOffer ? assignedCharger._id : null,
      offeredChargerLabel: isOffer ? assignedCharger.label : '',
      offeredSlot: isOffer ? grant.offeredSlot : '',
    })

    payment.bookingId = booking._id
    await payment.save()

    const io = req.app.get('io')
    const when = bookedStart.toLocaleString()

    if (!isOffer) {
      await notify({
        io,
        tenantId: site.tenantId,
        bookingId: booking._id,
        type: 'booking',
        message: `Granted #${grant.fillOrder} · ${user.name || 'Driver'} · ${type} · pole ${assignedCharger.label} · ${when} · ₹${pricing.totalAmount}`,
      })
    } else {
      await notify({
        io,
        tenantId: site.tenantId,
        bookingId: booking._id,
        type: 'booking',
        message: `Overflow offer · ${user.name || 'Driver'} · requested ${slotLabel} full · offered ${grant.offeredSlot}`,
      })
    }
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
      message: isOffer
        ? grant.message
        : `Granted · fill order #${grant.fillOrder} · pole ${assignedCharger.label} · ${slotLabel}. Waiting for host approve.`,
    })
    booking.notificationSentToUser = true
    await booking.save()

    return res.status(201).json({
      status: 'ok',
      message: grant.message,
      data: {
        booking: booking.toSafeJSON(),
        payment: payment.toSafeJSON(),
        paymentId,
        orderId,
        amount: pricing.totalAmount,
        paymentStatus: 'paid',
        grant: {
          outcome: grant.outcome,
          grantStatus: grant.grantStatus,
          fillOrder: grant.fillOrder,
          portsTotal: grant.portsTotal,
          portsFree: grant.portsFree,
          message: grant.message,
          offeredSlot: grant.offeredSlot || null,
        },
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
