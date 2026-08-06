/**
 * Site-level grid rebalance every 30s for all sites with active power sessions.
 */
const Session = require('../models/Session')
const { rebalanceGrid } = require('./optimizer.service')

const REBALANCE_MS = Number(process.env.GRID_REBALANCE_MS) || 30_000

let timer = null
let ioRef = null

async function tickAllSites() {
  if (!ioRef) return
  try {
    const siteIds = await Session.distinct('siteId', {
      state: { $in: ['charging', 'optimized', 'throttled'] },
    })
    for (const siteId of siteIds) {
      await rebalanceGrid(siteId, ioRef).catch((err) => {
        console.error(`[gridScheduler] site ${siteId}:`, err.message)
      })
    }
  } catch (err) {
    console.error('[gridScheduler] tick error:', err.message)
  }
}

function startGridScheduler(io) {
  stopGridScheduler()
  ioRef = io
  timer = setInterval(() => {
    tickAllSites()
  }, REBALANCE_MS)
  console.log(`[gridScheduler] rebalance every ${REBALANCE_MS}ms`)
}

function stopGridScheduler() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  ioRef = null
}

module.exports = {
  REBALANCE_MS,
  startGridScheduler,
  stopGridScheduler,
  tickAllSites,
}
