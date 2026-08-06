/**
 * Metered billing for marketplace bookings (with GST) and legacy fleet sessions.
 */

const Invoice = require('../models/Invoice')
const Tenant = require('../models/Tenant')
const User = require('../models/User')
const Site = require('../models/Site')
const { getTariff } = require('./tariff.service')
const { notify } = require('./notify.service')
const { GST_RATE } = require('../models/Invoice')

function currentPeriod(at = new Date()) {
  const y = at.getFullYear()
  const m = String(at.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function roundMoney(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

function roundKwh(n) {
  return Math.round((Number(n) || 0) * 1000) / 1000
}

function withGst(subtotal) {
  const base = roundMoney(subtotal)
  const gstAmount = roundMoney(base * GST_RATE)
  return {
    subtotal: base,
    gstRate: GST_RATE,
    gstAmount,
    total: roundMoney(base + gstAmount),
  }
}

async function recordSessionOnInvoice(session, io = null) {
  if (!session?.tenantId) return null

  const deliveredAt = session.endTime ? new Date(session.endTime) : new Date()
  const tariff = getTariff(deliveredAt)
  const kWh = roundKwh(session.kWhDelivered)
  const taxed = withGst(kWh * tariff.pricePerKwh)
  const period = currentPeriod(deliveredAt)
  const sessionId = session._id || session.id

  let invoice = await Invoice.findOne({
    tenantId: session.tenantId,
    userId: null,
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
      paymentStatus: 'unpaid',
      totalKwh: 0,
      subtotal: 0,
      gstRate: GST_RATE,
      gstAmount: 0,
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
  invoice.subtotal = roundMoney((invoice.subtotal || 0) + taxed.subtotal)
  invoice.gstAmount = roundMoney((invoice.gstAmount || 0) + taxed.gstAmount)
  invoice.amount = roundMoney((invoice.amount || 0) + taxed.total)
  invoice.tariffRate = tariff.pricePerKwh
  invoice.lineItems.push({
    sessionId,
    bookingId: null,
    kWh,
    tariffRate: tariff.pricePerKwh,
    tariffBand: tariff.band,
    amount: taxed.total,
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
    message: `Invoice updated · ${kWh} kWh · ₹${taxed.total} incl. GST`,
  })

  return invoice
}

/**
 * One marketplace invoice per completed booking (user + host tenant).
 */
async function recordBookingOnInvoice(booking, { kWh, io } = {}) {
  if (!booking?.userId) return null

  const deliveredAt = new Date()
  const started =
    booking.chargingStartedAt || booking.startTime || deliveredAt
  const durationMinutes = Math.max(
    1,
    Math.round((deliveredAt - new Date(started)) / 60000),
  )

  let pricePerKwh = 0
  if (booking.siteId) {
    const site = await Site.findById(booking.siteId)
    if (site?.pricePerKwh > 0) pricePerKwh = site.pricePerKwh
  }
  if (!pricePerKwh) {
    pricePerKwh = getTariff(deliveredAt).pricePerKwh
  }

  const energy = roundKwh(kWh != null ? kWh : estimateKwh(booking))
  const taxed = withGst(energy * pricePerKwh)
  const period = currentPeriod(deliveredAt)
  const bookingId = booking._id || booking.id
  const user = await User.findById(booking.userId)
  const tenant = booking.tenantId ? await Tenant.findById(booking.tenantId) : null

  const existing = await Invoice.findOne({ bookingIds: bookingId })
  if (existing) return existing

  const invoice = await Invoice.create({
    userId: booking.userId,
    tenantId: booking.tenantId || null,
    period,
    status: 'closed',
    paymentStatus: 'unpaid',
    totalKwh: energy,
    subtotal: taxed.subtotal,
    gstRate: GST_RATE,
    gstAmount: taxed.gstAmount,
    amount: taxed.total,
    tariffRate: pricePerKwh,
    durationMinutes,
    stationName: booking.siteName || '',
    chargerId: booking.chargerId ? String(booking.chargerId) : '',
    sessionIds: [],
    bookingIds: [bookingId],
    lineItems: [
      {
        sessionId: null,
        bookingId,
        stationName: booking.siteName || '',
        chargerId: booking.chargerId ? String(booking.chargerId) : '',
        kWh: energy,
        durationMinutes,
        tariffRate: pricePerKwh,
        tariffBand: 'station',
        amount: taxed.total,
        driverName: user?.name || booking.userName || '',
        chargerLabel: booking.chargerLabel || '',
        deliveredAt,
      },
    ],
    companyName: tenant?.companyName || booking.siteName || '',
    customerName: user?.name || booking.userName || '',
    customerEmail: user?.email || booking.userEmail || '',
    generatedAt: deliveredAt,
  })

  booking.amount = taxed.total
  if (typeof booking.save === 'function') await booking.save()

  await notify({
    io,
    userId: booking.userId,
    bookingId,
    type: 'booking',
    message: `Invoice generated · ${energy} kWh · ₹${taxed.total} (incl. ${(GST_RATE * 100).toFixed(0)}% GST)`,
  })

  return invoice
}

function estimateKwh(booking) {
  const end = booking.chargingEndedAt || booking.endTime || new Date()
  const start = booking.chargingStartedAt || booking.startTime
  const hours = Math.max(0.25, (new Date(end) - new Date(start)) / (1000 * 60 * 60))
  return roundKwh(22 * hours * 0.7)
}

module.exports = {
  currentPeriod,
  recordSessionOnInvoice,
  recordBookingOnInvoice,
  estimateKwh,
  roundKwh,
  roundMoney,
  withGst,
  GST_RATE,
}
