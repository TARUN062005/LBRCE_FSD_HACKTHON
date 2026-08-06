/**
 * Lightweight greedy power allocator (hackathon scope — not MILP/OR-Tools).
 *
 * Scoring formula (per session):
 *   socFraction     = clamp(kWhDelivered / batteryCapacityKwh, 0, 1)
 *   energyNeed      = 1 - socFraction                          // farther from full → higher
 *   hoursToDepart   = max(0.25, (departureTime - now) / 1h)   // sooner → higher
 *   urgency         = energyNeed / hoursToDepart
 *   priorityWeight  = SLA:4 > High:3 > Medium:2 > Low:1
 *   tariffFactor    = peak:1.25, normal:1.1, off-peak:1.0     // peak pressures critical loads
 *   score           = urgency * priorityWeight * tariffFactor
 *
 * Allocation:
 *   1. Sort sessions by score descending
 *   2. Greedily grant up to charger maxPowerKw from remaining site capacity
 *   3. If allocated < minThreshold → state "throttled", else "optimized"
 */

const PRIORITY_WEIGHT = {
  low: 1,
  medium: 2,
  high: 3,
  sla: 4,
}

const TARIFF_FACTOR = {
  'off-peak': 1.0,
  normal: 1.1,
  peak: 1.25,
}

/** Absolute floor (kW) — below this a session is considered grid-throttled. */
const MIN_ALLOC_KW = 3
/** Relative floor — also throttle if below this fraction of charger max. */
const MIN_ALLOC_FRAC = 0.15

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n))
}

function round1(n) {
  return Math.round(n * 10) / 10
}

function minThresholdKw(maxPowerKw) {
  return Math.max(MIN_ALLOC_KW, maxPowerKw * MIN_ALLOC_FRAC)
}

/**
 * Pure, synchronous allocator.
 *
 * @param {Array<{
 *   id: string,
 *   maxPowerKw: number,
 *   priorityTier: string,
 *   departureTime: Date|string|number,
 *   batteryCapacityKwh: number,
 *   kWhDelivered?: number,
 * }>} activeSessions
 * @param {number} siteCapacityKw
 * @param {{ band?: string, pricePerKwh?: number }} tariff
 * @param {{ now?: Date }} [options]
 * @returns {Array<{
 *   id: string,
 *   allocatedPowerKw: number,
 *   state: 'optimized'|'throttled',
 *   score: number,
 *   urgency: number,
 *   requestedKw: number,
 * }>}
 */
function allocatePower(activeSessions, siteCapacityKw, tariff, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date()
  const capacity = Math.max(0, Number(siteCapacityKw) || 0)
  const band = tariff?.band || 'normal'
  const tariffFactor = TARIFF_FACTOR[band] ?? TARIFF_FACTOR.normal

  const scored = (activeSessions || []).map((s) => {
    const maxPowerKw = Math.max(0, Number(s.maxPowerKw) || 0)
    const battery = Math.max(1, Number(s.batteryCapacityKwh) || 1)
    const delivered = Math.max(0, Number(s.kWhDelivered) || 0)
    const socFraction = clamp(delivered / battery, 0, 1)
    const energyNeed = 1 - socFraction

    const departMs = new Date(s.departureTime).getTime() - now.getTime()
    const hoursToDepart = Math.max(0.25, departMs / 3_600_000)

    // urgency ↑ when departure is soon AND battery is farther from full
    const urgency = energyNeed / hoursToDepart

    const priorityWeight =
      PRIORITY_WEIGHT[String(s.priorityTier || 'medium').toLowerCase()] ||
      PRIORITY_WEIGHT.medium

    const score = urgency * priorityWeight * tariffFactor

    return {
      id: String(s.id),
      maxPowerKw,
      requestedKw: maxPowerKw,
      urgency: round1(urgency * 100) / 100,
      score: round1(score * 100) / 100,
      priorityWeight,
    }
  })

  scored.sort((a, b) => b.score - a.score)

  let remaining = capacity
  const allocations = []

  for (const row of scored) {
    const grant = Math.min(row.maxPowerKw, remaining)
    const allocatedPowerKw = round1(Math.max(0, grant))
    remaining = round1(Math.max(0, remaining - allocatedPowerKw))

    const threshold = minThresholdKw(row.maxPowerKw)
    const state =
      allocatedPowerKw + 1e-9 < threshold ? 'throttled' : 'optimized'

    allocations.push({
      id: row.id,
      allocatedPowerKw,
      state,
      score: row.score,
      urgency: row.urgency,
      requestedKw: row.requestedKw,
    })
  }

  return allocations
}

/**
 * Convenience wrapper used when only one session context is available.
 * Builds a single-item cohort (plus optional peers) and returns its kW.
 */
function optimizeSessionAllocation({
  session,
  vehicle,
  charger,
  site,
  activeSessions = [],
  tariff,
  now,
}) {
  const cohort = [
    {
      id: session._id?.toString?.() || session.id,
      maxPowerKw: charger?.maxPowerKw,
      priorityTier: vehicle?.priorityTier || session.priorityTier,
      departureTime: vehicle?.departureTime || session.departureTime,
      batteryCapacityKwh: vehicle?.batteryCapacityKwh || session.batteryCapacityKwh,
      kWhDelivered: session.kWhDelivered,
    },
    ...activeSessions.map((s) => ({
      id: s._id?.toString?.() || s.id,
      maxPowerKw: s.maxPowerKw || s.chargerMaxPowerKw,
      priorityTier: s.priorityTier,
      departureTime: s.departureTime,
      batteryCapacityKwh: s.batteryCapacityKwh,
      kWhDelivered: s.kWhDelivered,
    })),
  ]

  const result = allocatePower(
    cohort,
    site?.maxCapacityKw ?? site,
    tariff || { band: 'normal' },
    { now },
  )
  const mine = result.find(
    (r) => r.id === (session._id?.toString?.() || session.id),
  )
  return mine?.allocatedPowerKw ?? 0
}

module.exports = {
  allocatePower,
  optimizeSessionAllocation,
  PRIORITY_WEIGHT,
  TARIFF_FACTOR,
  MIN_ALLOC_KW,
  MIN_ALLOC_FRAC,
  minThresholdKw,
}
