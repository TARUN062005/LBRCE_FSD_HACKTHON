const Charger = require('../models/Charger')
const Site = require('../models/Site')
const { CHARGER_STATUSES } = require('../models/Charger')

async function listChargers(req, res) {
  try {
    const filter = {}
    if (req.query.siteId) {
      filter.siteId = req.query.siteId
    }
    const chargers = await Charger.find(filter).sort({ createdAt: -1 })
    return res.json({ status: 'ok', data: chargers.map((c) => c.toSafeJSON()) })
  } catch (err) {
    console.error('[chargers] list error:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to list chargers' })
  }
}

async function getCharger(req, res) {
  try {
    const charger = await Charger.findById(req.params.id)
    if (!charger) {
      return res.status(404).json({ status: 'error', message: 'Charger not found' })
    }
    return res.json({ status: 'ok', data: charger.toSafeJSON() })
  } catch (err) {
    return res.status(400).json({ status: 'error', message: 'Invalid charger id' })
  }
}

async function createCharger(req, res) {
  try {
    const siteId = req.body.siteId
    const label = String(req.body.label || '').trim()
    const maxPowerKw = Number(req.body.maxPowerKw)
    const status = req.body.status || 'available'

    if (!siteId || !label) {
      return res.status(400).json({ status: 'error', message: 'siteId and label are required' })
    }
    if (Number.isNaN(maxPowerKw) || maxPowerKw <= 0) {
      return res.status(400).json({ status: 'error', message: 'maxPowerKw must be a positive number' })
    }
    if (!CHARGER_STATUSES.includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Invalid status' })
    }

    const site = await Site.findById(siteId)
    if (!site) {
      return res.status(400).json({ status: 'error', message: 'Site not found' })
    }

    const charger = await Charger.create({ siteId, label, maxPowerKw, status })
    return res.status(201).json({ status: 'ok', data: charger.toSafeJSON() })
  } catch (err) {
    console.error('[chargers] create error:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to create charger' })
  }
}

async function updateCharger(req, res) {
  try {
    const charger = await Charger.findById(req.params.id)
    if (!charger) {
      return res.status(404).json({ status: 'error', message: 'Charger not found' })
    }

    if (req.body.label !== undefined) charger.label = String(req.body.label).trim()
    if (req.body.maxPowerKw !== undefined) {
      const maxPowerKw = Number(req.body.maxPowerKw)
      if (Number.isNaN(maxPowerKw) || maxPowerKw <= 0) {
        return res.status(400).json({ status: 'error', message: 'maxPowerKw must be a positive number' })
      }
      charger.maxPowerKw = maxPowerKw
    }
    if (req.body.status !== undefined) {
      if (!CHARGER_STATUSES.includes(req.body.status)) {
        return res.status(400).json({ status: 'error', message: 'Invalid status' })
      }
      charger.status = req.body.status
    }
    if (req.body.siteId !== undefined) {
      const site = await Site.findById(req.body.siteId)
      if (!site) {
        return res.status(400).json({ status: 'error', message: 'Site not found' })
      }
      charger.siteId = req.body.siteId
    }

    await charger.save()
    return res.json({ status: 'ok', data: charger.toSafeJSON() })
  } catch (err) {
    console.error('[chargers] update error:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to update charger' })
  }
}

async function deleteCharger(req, res) {
  try {
    const charger = await Charger.findByIdAndDelete(req.params.id)
    if (!charger) {
      return res.status(404).json({ status: 'error', message: 'Charger not found' })
    }
    return res.json({ status: 'ok', message: 'Charger deleted' })
  } catch (err) {
    return res.status(400).json({ status: 'error', message: 'Invalid charger id' })
  }
}

module.exports = {
  listChargers,
  getCharger,
  createCharger,
  updateCharger,
  deleteCharger,
}
