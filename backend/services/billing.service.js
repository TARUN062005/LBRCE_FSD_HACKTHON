/**
 * Metered billing for tenants (sessions) and drivers (completed bookings).
 */

const Invoice = require('../models/Invoice')
const Tenant = require('../models/Tenant')
const User = require('../models/User')
const { getTariff } = require('./tariff.service')
const { notify } = require('./notify.service')

function currentPeriod(at = new Date()) {
  const y = at.getFullYear()
  const m = String(at.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function roundMoney(n) {
  return Math.round((Number(n) || 0) * 10000) / 10000
}

function roundKwh(n) {
  return Math.round((Number(n) || 0) * 1000) / 1000
}

async function recordSessionOnInvoice(session, io = null) {
  if (!session?.tenantId) return null

  const deliveredAt = session.endTime ? new Date(session.endTime) : new Date()
  const tariff = getTariff(deliveredAt)
  const kWh = roundKwh(session.kWhDelivered)
  const amount = roundMoney(kWh * tariff.pricePerKwh)
  const period = currentPeriod(deliveredAt)
  const sessionId = session._id || session.id

  let invoice = await Invoice.findOne({
    tenantId: session.tenantId,
    period,
    status: 'open',
  })

  if (!invoice) {
    const tenant = await Tenant.findById(session.tenantId)
    invoice = await Invoice.create({
      tenantId: session.tenantId,
      userId: null,
      period,
      status: 'open',
      totalKwh: 0,
      amount: 0,
      tariffRate: tariff.pricePerKwh,
      sessionIds: [],
      bookingIds: [],
      lineItems: [],
      companyName: tenant?.companyName || '',
      generatedAt: new Date(),
    })
  }

  const already = invoice.sessionIds.some((id) => id.toString() === sessionId.toString())
  if (already) return invoice

  invoice.sessionIds.push(sessionId)
  invoice.totalKwh = roundKwh(invoice.totalKwh + kWh)
  invoice.amount = roundMoney(invoice.amount + amount)
  invoice.tariffRate = tariff.pricePerKwh
  invoice.lineItems.push({
    sessionId,
    bookingId: null,
    kWh,
    tariffRate: tariff.pricePerKwh,
    tariffBand: tariff.band,
    amount,
    driverName: session.driverName || '',
    chargerLabel: session.chargerLabel || '',
    deliveredAt,
  })

  await invoice.save()

  await notify({
    io,
    tenantId: session.tenantId,
    sessionId,
    type: 'completed',
    message: `[Invoice] Session billed ${kWh} kWh · $${amount} (invoice ${invoice._id})`,
  })

  return invoice
}

/**
 * Create / append a driver invoice when a booking completes charging.
 */
async function recordBookingOnInvoice(booking, { kWh, io } = {}) {
  if (!booking?.userId) return null

  const deliveredAt = new Date()
  const tariff = getTariff(deliveredAt)
  const energy = roundKwh(kWh != null ? kWh : estimateKwh(booking))
  const amount = roundMoney(energy * tariff.pricePerKwh)
  const period = currentPeriod(deliveredAt)
  const bookingId = booking._id || booking.id

  let invoice = await Invoice.findOne({
    userId: booking.userId,
    period,
    status: 'open',
  })

  const user = await User.findById(booking.userId)

  if (!invoice) {
    invoice = await Invoice.create({
      userId: booking.userId,
      tenantId: null,
      period,
      status: 'open',
      totalKwh: 0,
      amount: 0,
      tariffRate: tariff.pricePerKwh,
      sessionIds: [],
      bookingIds: [],
      lineItems: [],
      customerName: user?.name || booking.userName || '',
      customerEmail: user?.email || booking.userEmail || '',
      generatedAt: new Date(),
    })
  }

  const already = (invoice.bookingIds || []).some((id) => id.toString() === bookingId.toString())
  if (already) return invoice

  invoice.bookingIds.push(bookingId)
  invoice.totalKwh = roundKwh(invoice.totalKwh + energy)
  invoice.amount = roundMoney(invoice.amount + amount)
  invoice.tariffRate = tariff.pricePerKwh
  invoice.lineItems.push({
    sessionId: null,
    bookingId,
    kWh: energy,
    tariffRate: tariff.pricePerKwh,
    tariffBand: tariff.band,
    amount,
    driverName: user?.name || booking.userName || '',
    chargerLabel: booking.chargerLabel || '',
    deliveredAt,
  })
  invoice.generatedAt = new Date()
  await invoice.save()

  await notify({
    io,
    userId: booking.userId,
    bookingId,
    type: 'booking',
    message: `[Invoice] Charging complete · ${energy} kWh · $${amount} · ${tariff.label} tariff`,
  })

  return invoice
}

function estimateKwh(booking) {
  const hours = Math.max(
    0.25,
    (new Date(booking.endTime) - new Date(booking.startTime)) / (1000 * 60 * 60),
  )
  // Conservative demo delivery ~70% of a 22 kW session window
  return roundKwh(22 * hours * 0.7)
}

module.exports = {
  currentPeriod,
  recordSessionOnInvoice,
  recordBookingOnInvoice,
  estimateKwh,
  roundKwh,
  roundMoney,
}
