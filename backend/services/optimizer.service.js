/**
 * Task 6 stub — allocate power for a session entering the Optimized state.
 * Stable export: optimizeSessionAllocation(context) → allocatedPowerKw
 * Real optimizer logic can replace the body later without changing call sites.
 */

const PRIORITY_WEIGHT = {
  low: 0.35,
  medium: 0.55,
  high: 0.8,
  sla: 1,
}

/**
 * @param {object} ctx
 * @param {object} ctx.session
 * @param {object} ctx.vehicle
 * @param {object} ctx.charger
 * @param {object} ctx.site
 * @param {Array}  ctx.activeSessions - other non-completed sessions on the same site
 * @returns {Promise<number>} allocatedPowerKw
 */
async function optimizeSessionAllocation({
  session,
  vehicle,
  charger,
  site,
  activeSessions = [],
}) {
  const siteCap = Number(site?.maxCapacityKw) || 0
  const chargerMax = Number(charger?.maxPowerKw) || 0
  const weight = PRIORITY_WEIGHT[vehicle?.priorityTier] || PRIORITY_WEIGHT.medium

  const othersDraw = activeSessions
    .filter((s) => s._id.toString() !== session._id.toString())
    .filter((s) => ['charging', 'optimized', 'throttled'].includes(s.state))
    .reduce((sum, s) => sum + (Number(s.allocatedPowerKw) || 0), 0)

  const remaining = Math.max(0, siteCap - othersDraw)
  const desired = chargerMax * weight
  const allocated = Math.max(0, Math.min(desired, chargerMax, remaining))

  // Round to 1 decimal for board display
  return Math.round(allocated * 10) / 10
}

module.exports = { optimizeSessionAllocation }
