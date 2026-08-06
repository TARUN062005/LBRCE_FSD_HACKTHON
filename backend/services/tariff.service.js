/**
 * Simulated electricity tariff by hour-of-day.
 * No external API — simple lookup table for demos/judges.
 *
 * Bands:
 *   off-peak  00:00–05:59
 *   normal    06:00–16:59 and 21:00–23:59
 *   peak      17:00–20:59
 */

const BANDS = {
  'off-peak': { band: 'off-peak', pricePerKwh: 8, label: 'Off-peak' },
  normal: { band: 'normal', pricePerKwh: 14, label: 'Normal' },
  peak: { band: 'peak', pricePerKwh: 22, label: 'Peak' },
}

/** Hour (0–23) → band key */
const HOUR_BAND = [
  'off-peak', // 0
  'off-peak', // 1
  'off-peak', // 2
  'off-peak', // 3
  'off-peak', // 4
  'off-peak', // 5
  'normal', // 6
  'normal', // 7
  'normal', // 8
  'normal', // 9
  'normal', // 10
  'normal', // 11
  'normal', // 12
  'normal', // 13
  'normal', // 14
  'normal', // 15
  'normal', // 16
  'peak', // 17
  'peak', // 18
  'peak', // 19
  'peak', // 20
  'normal', // 21
  'normal', // 22
  'normal', // 23
]

/**
 * @param {Date} [at]
 * @returns {{ band: 'off-peak'|'normal'|'peak', pricePerKwh: number, label: string, hour: number }}
 */
function getTariff(at = new Date()) {
  const hour = at.getHours()
  const key = HOUR_BAND[hour] || 'normal'
  return { ...BANDS[key], hour }
}

module.exports = { getTariff, BANDS, HOUR_BAND }
