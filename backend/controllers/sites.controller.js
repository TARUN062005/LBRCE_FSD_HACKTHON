const Site = require('../models/Site')
const Session = require('../models/Session')
const { getTariff } = require('../services/tariff.service')

async function listSites(_req, res) {
  try {
    const sites = await Site.find().sort({ createdAt: -1 })
    return res.json({ status: 'ok', data: sites.map((s) => s.toSafeJSON()) })
  } catch (err) {
    console.error('[sites] list error:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to list sites' })
  }
}

async function getSite(req, res) {
  try {
    const site = await Site.findById(req.params.id)
    if (!site) {
      return res.status(404).json({ status: 'error', message: 'Site not found' })
    }
    return res.json({ status: 'ok', data: site.toSafeJSON() })
  } catch (err) {
    return res.status(400).json({ status: 'error', message: 'Invalid site id' })
  }
}

async function createSite(req, res) {
  try {
    const name = String(req.body.name || '').trim()
    const location = String(req.body.location || '').trim()
    const maxCapacityKw = Number(req.body.maxCapacityKw)

    if (!name || !location) {
      return res.status(400).json({ status: 'error', message: 'name and location are required' })
    }
    if (Number.isNaN(maxCapacityKw) || maxCapacityKw < 0) {
      return res.status(400).json({ status: 'error', message: 'maxCapacityKw must be a non-negative number' })
    }

    const site = await Site.create({ name, location, maxCapacityKw })
    return res.status(201).json({ status: 'ok', data: site.toSafeJSON() })
  } catch (err) {
    console.error('[sites] create error:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to create site' })
  }
}

async function updateSite(req, res) {
  try {
    const site = await Site.findById(req.params.id)
    if (!site) {
      return res.status(404).json({ status: 'error', message: 'Site not found' })
    }

    if (req.body.name !== undefined) site.name = String(req.body.name).trim()
    if (req.body.location !== undefined) site.location = String(req.body.location).trim()
    if (req.body.maxCapacityKw !== undefined) {
      const maxCapacityKw = Number(req.body.maxCapacityKw)
      if (Number.isNaN(maxCapacityKw) || maxCapacityKw < 0) {
        return res.status(400).json({ status: 'error', message: 'maxCapacityKw must be a non-negative number' })
      }
      site.maxCapacityKw = maxCapacityKw
    }

    await site.save()
    return res.json({ status: 'ok', data: site.toSafeJSON() })
  } catch (err) {
    console.error('[sites] update error:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to update site' })
  }
}

async function updateSiteLimit(req, res) {
  try {
    const maxCapacityKw = Number(req.body.maxCapacityKw)
    if (Number.isNaN(maxCapacityKw) || maxCapacityKw < 0) {
      return res.status(400).json({ status: 'error', message: 'maxCapacityKw must be a non-negative number' })
    }

    const site = await Site.findByIdAndUpdate(
      req.params.id,
      { maxCapacityKw },
      { new: true, runValidators: true },
    )
    if (!site) {
      return res.status(404).json({ status: 'error', message: 'Site not found' })
    }
    return res.json({ status: 'ok', data: site.toSafeJSON() })
  } catch (err) {
    console.error('[sites] limit error:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to update grid limit' })
  }
}

async function deleteSite(req, res) {
  try {
    const site = await Site.findByIdAndDelete(req.params.id)
    if (!site) {
      return res.status(404).json({ status: 'error', message: 'Site not found' })
    }
    return res.json({ status: 'ok', message: 'Site deleted' })
  } catch (err) {
    return res.status(400).json({ status: 'error', message: 'Invalid site id' })
  }
}

/** Dashboard helper: current site power draw vs capacity + tariff band. */
async function getPowerUsage(req, res) {
  try {
    const site = await Site.findById(req.params.id)
    if (!site) {
      return res.status(404).json({ status: 'error', message: 'Site not found' })
    }

    const active = await Session.find({
      siteId: site._id,
      state: { $in: ['charging', 'optimized', 'throttled'] },
    }).sort({ allocatedPowerKw: -1 })

    const usedKw = active.reduce((sum, s) => sum + (s.allocatedPowerKw || 0), 0)
    const tariff = getTariff(new Date())

    return res.json({
      status: 'ok',
      data: {
        siteId: site._id.toString(),
        siteName: site.name,
        maxCapacityKw: site.maxCapacityKw,
        usedKw: Math.round(usedKw * 10) / 10,
        remainingKw: Math.round(Math.max(0, site.maxCapacityKw - usedKw) * 10) / 10,
        utilization: site.maxCapacityKw
          ? Math.round((usedKw / site.maxCapacityKw) * 1000) / 10
          : 0,
        tariff,
        sessions: active.map((s) => ({
          id: s._id.toString(),
          state: s.state,
          allocatedPowerKw: s.allocatedPowerKw,
          driverName: s.driverName,
          chargerLabel: s.chargerLabel,
          priorityTier: s.priorityTier,
        })),
      },
    })
  } catch (err) {
    console.error('[sites] power-usage error:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to load power usage' })
  }
}

module.exports = {
  listSites,
  getSite,
  createSite,
  updateSite,
  updateSiteLimit,
  deleteSite,
  getPowerUsage,
}
