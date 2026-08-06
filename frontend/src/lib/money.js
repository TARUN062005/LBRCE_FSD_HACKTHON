/** Format USD; show 4 decimals for sub-cent demo charges. */
export function formatMoney(value) {
  const n = Number(value) || 0
  if (n > 0 && n < 0.01) return `$${n.toFixed(4)}`
  return `$${n.toFixed(2)}`
}
