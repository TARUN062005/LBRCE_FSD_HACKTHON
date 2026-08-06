/**
 * Metered usage billing — one open invoice per tenant per demo period.
 * cost = kWhDelivered × tariffRateAtDeliveryTime
 * No payment processing.
 */

const Invoice = require('../models/Invoice')
const Tenant = require('../models/Tenant')
const { getTariff } = require('./tariff.service')

function currentPeriod(at = new Date()) {
  const y = at.getFullYear()
  const m = String(at.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/** Keep 4 decimals so short demo sessions still show a non-zero charge. */
function roundMoney(n) {
  return Math.round((Number(n) || 0) * 10000) / 10000
}

function roundKwh(n) {
  return Math.round((Number(n) || 0) * 1000) / 1000
}

/**
 * Append a completed session to the tenant's open invoice for the current period.
 * Idempotent per sessionId.
 */
async function recordSessionOnInvoice(session) {
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
      period,
      status: 'open',
      totalKwh: 0,
      amount: 0,
      sessionIds: [],
      lineItems: [],
      companyName: tenant?.companyName || '',
    })
  }

  const already = invoice.sessionIds.some(
    (id) => id.toString() === sessionId.toString(),
  )
  if (already) {
    return invoice
  }

  invoice.sessionIds.push(sessionId)
  invoice.totalKwh = roundKwh(invoice.totalKwh + kWh)
  invoice.amount = roundMoney(invoice.amount + amount)
  invoice.lineItems.push({
    sessionId,
    kWh,
    tariffRate: tariff.pricePerKwh,
    tariffBand: tariff.band,
    amount,
    driverName: session.driverName || '',
    chargerLabel: session.chargerLabel || '',
    deliveredAt,
  })

  await invoice.save()
  console.log(
    `[billing] session ${sessionId} → invoice ${invoice._id} +${kWh} kWh @ $${tariff.pricePerKwh}/kWh = $${amount}`,
  )
  return invoice
}

module.exports = {
  currentPeriod,
  recordSessionOnInvoice,
}
