const Vehicle = require('../models/Vehicle')
const { PRIORITY_TIERS } = require('../models/Vehicle')

function parseDepartureTime(value) {
  if (value === undefined || value === null || value === '') return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

async function listVehicles(req, res) {
  try {
    const vehicles = await Vehicle.find({ tenantId: req.tenantId }).sort({
      departureTime: 1,
    })
    return res.json({ status: 'ok', data: vehicles.map((v) => v.toSafeJSON()) })
  } catch (err) {
    console.error('[vehicles] list error:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to list vehicles' })
  }
}

async function getVehicle(req, res) {
  try {
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    })
    if (!vehicle) {
      return res.status(404).json({ status: 'error', message: 'Vehicle not found' })
    }
    return res.json({ status: 'ok', data: vehicle.toSafeJSON() })
  } catch (err) {
    return res.status(400).json({ status: 'error', message: 'Invalid vehicle id' })
  }
}

async function createVehicle(req, res) {
  try {
    const driverName = String(req.body.driverName || '').trim()
    const batteryCapacityKwh = Number(req.body.batteryCapacityKwh)
    const priorityTier = String(req.body.priorityTier || 'medium').toLowerCase()
    const departureTime = parseDepartureTime(req.body.departureTime)

    // Intentionally ignore any client-supplied tenantId
    if (!driverName) {
      return res.status(400).json({ status: 'error', message: 'driverName is required' })
    }
    if (Number.isNaN(batteryCapacityKwh) || batteryCapacityKwh < 1) {
      return res.status(400).json({
        status: 'error',
        message: 'batteryCapacityKwh must be a positive number',
      })
    }
    if (!PRIORITY_TIERS.includes(priorityTier)) {
      return res.status(400).json({
        status: 'error',
        message: `priorityTier must be one of: ${PRIORITY_TIERS.join(', ')}`,
      })
    }
    if (!departureTime) {
      return res.status(400).json({
        status: 'error',
        message: 'departureTime must be a valid datetime',
      })
    }

    const vehicle = await Vehicle.create({
      tenantId: req.tenantId,
      driverName,
      batteryCapacityKwh,
      priorityTier,
      departureTime,
    })

    return res.status(201).json({ status: 'ok', data: vehicle.toSafeJSON() })
  } catch (err) {
    console.error('[vehicles] create error:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to create vehicle' })
  }
}

async function updateVehicle(req, res) {
  try {
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    })
    if (!vehicle) {
      return res.status(404).json({ status: 'error', message: 'Vehicle not found' })
    }

    if (req.body.driverName !== undefined) {
      const driverName = String(req.body.driverName).trim()
      if (!driverName) {
        return res.status(400).json({ status: 'error', message: 'driverName cannot be empty' })
      }
      vehicle.driverName = driverName
    }

    if (req.body.batteryCapacityKwh !== undefined) {
      const batteryCapacityKwh = Number(req.body.batteryCapacityKwh)
      if (Number.isNaN(batteryCapacityKwh) || batteryCapacityKwh < 1) {
        return res.status(400).json({
          status: 'error',
          message: 'batteryCapacityKwh must be a positive number',
        })
      }
      vehicle.batteryCapacityKwh = batteryCapacityKwh
    }

    if (req.body.priorityTier !== undefined) {
      const priorityTier = String(req.body.priorityTier).toLowerCase()
      if (!PRIORITY_TIERS.includes(priorityTier)) {
        return res.status(400).json({
          status: 'error',
          message: `priorityTier must be one of: ${PRIORITY_TIERS.join(', ')}`,
        })
      }
      vehicle.priorityTier = priorityTier
    }

    if (req.body.departureTime !== undefined) {
      const departureTime = parseDepartureTime(req.body.departureTime)
      if (!departureTime) {
        return res.status(400).json({
          status: 'error',
          message: 'departureTime must be a valid datetime',
        })
      }
      vehicle.departureTime = departureTime
    }

    // Never allow tenant reassignment from the client
    await vehicle.save()
    return res.json({ status: 'ok', data: vehicle.toSafeJSON() })
  } catch (err) {
    console.error('[vehicles] update error:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to update vehicle' })
  }
}

async function deleteVehicle(req, res) {
  try {
    const vehicle = await Vehicle.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenantId,
    })
    if (!vehicle) {
      return res.status(404).json({ status: 'error', message: 'Vehicle not found' })
    }
    return res.json({ status: 'ok', message: 'Vehicle deleted' })
  } catch (err) {
    return res.status(400).json({ status: 'error', message: 'Invalid vehicle id' })
  }
}

module.exports = {
  listVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
}
