/** Format INR amounts for the marketplace UI. */
export function formatMoney(value) {
  const n = Number(value) || 0
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: n > 0 && n < 1 ? 2 : 2,
    maximumFractionDigits: 2,
  }).format(n)
  return formatted
}

/** Price per kWh in rupees */
export function formatRate(value) {
  const n = Number(value) || 0
  return `₹${n.toFixed(2)}/kWh`
}
