/**
 * Pre-booking quote: energy estimate + platform fee + GST (demo).
 */

const GST_RATE = 0.18
const PLATFORM_FEE_RATE = 0.05 // 5% of energy cost
const MIN_PLATFORM_FEE = 1 // ₹ — keep demo totals small

function roundMoney(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

function roundKwh(n) {
  return Math.round((Number(n) || 0) * 1000) / 1000
}

/**
 * @param {{ pricePerKwh: number, maxPowerKw: number, durationMinutes: number }} opts
 */
function buildBookingQuote({ pricePerKwh, maxPowerKw, durationMinutes }) {
  const hours = Math.max(0.25, (Number(durationMinutes) || 60) / 60)
  const kw = Math.min(Number(maxPowerKw) || 22, 50)
  const rate = Number(pricePerKwh) > 0 ? Number(pricePerKwh) : 2
  // Demo: use a light energy estimate so totals stay small (rupees)
  const estimatedKwh = roundKwh(kw * hours * 0.35)
  const energyCost = roundMoney(estimatedKwh * rate)
  const platformFee = roundMoney(Math.max(MIN_PLATFORM_FEE, energyCost * PLATFORM_FEE_RATE))
  const taxable = roundMoney(energyCost + platformFee)
  const gstAmount = roundMoney(taxable * GST_RATE)
  const totalAmount = roundMoney(taxable + gstAmount)

  return {
    durationMinutes: Math.round(hours * 60),
    estimatedKwh,
    pricePerKwh: rate,
    energyCost,
    platformFee,
    platformFeeRate: PLATFORM_FEE_RATE,
    gstRate: GST_RATE,
    gstAmount,
    subtotal: taxable,
    totalAmount,
    currency: 'INR',
  }
}

function demoPaymentId() {
  return `rzp_demo_${Math.floor(100000000 + Math.random() * 900000000)}`
}

function demoOrderId() {
  return `order_demo_${Math.floor(100000 + Math.random() * 900000)}`
}

module.exports = {
  GST_RATE,
  PLATFORM_FEE_RATE,
  MIN_PLATFORM_FEE,
  buildBookingQuote,
  demoPaymentId,
  demoOrderId,
  roundMoney,
  roundKwh,
}
