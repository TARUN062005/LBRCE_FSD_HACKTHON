/**
 * In-memory ring buffer of site power samples for live charts.
 * Fed by the simulator's site:update emissions — no DB collection.
 */

const MAX_POINTS = 48
const historyBySite = new Map()

function recordSiteUsage({ siteId, usedKw, maxCapacityKw, at }) {
  if (!siteId) return
  const key = String(siteId)
  const series = historyBySite.get(key) || []
  series.push({
    at: at || new Date().toISOString(),
    usedKw: Number(usedKw) || 0,
    maxCapacityKw: Number(maxCapacityKw) || 0,
  })
  while (series.length > MAX_POINTS) series.shift()
  historyBySite.set(key, series)
}

function getSiteHistory(siteId) {
  if (!siteId) {
    // Merge all sites by timestamp for platform view
    const merged = []
    for (const series of historyBySite.values()) {
      merged.push(...series)
    }
    return merged.sort((a, b) => new Date(a.at) - new Date(b.at)).slice(-MAX_POINTS)
  }
  return [...(historyBySite.get(String(siteId)) || [])]
}

function getAllHistories() {
  const out = {}
  for (const [siteId, series] of historyBySite.entries()) {
    out[siteId] = [...series]
  }
  return out
}

module.exports = {
  recordSiteUsage,
  getSiteHistory,
  getAllHistories,
  MAX_POINTS,
}
