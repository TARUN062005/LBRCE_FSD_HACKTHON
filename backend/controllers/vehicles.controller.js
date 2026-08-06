const Vehicle = require('../models/Vehicle')
const { PRIORITY_TIERS, VEHICLE_TYPES, VEHICLE_PRESETS } = require('../models/Vehicle')

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
    let vehicleType = String(req.body.vehicleType || 'car').toLowerCase()
    if (!VEHICLE_TYPES.includes(vehicleType)) vehicleType = 'car'
    const preset = VEHICLE_PRESETS[vehicleType]
    const batteryCapacityKwh = Number(req.body.batteryCapacityKwh) || preset.batteryCapacityKwh
    const maxChargingPowerKw = Number(req.body.maxChargingPowerKw) || preset.maxChargingPowerKw
    const currentCharge = Number(req.body.currentCharge ?? 20)
    const targetCharge = Number(req.body.targetCharge ?? 80)
    let priorityTier = String(req.body.priorityTier || req.body.priority || 'medium').toLowerCase()
    if (priorityTier === 'sla') priorityTier = 'emergency'
    const departureTime = parseDepartureTime(req.body.departureTime)

    if (!driverName) {
      return res.status(400).json({ status: 'error', message: 'driverName is required' })
    }
    if (batteryCapacityKwh < 1) {
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
      userId: req.body.userId || null,
      driverName,
      vehicleType,
      batteryCapacityKwh,
      maxChargingPowerKw,
      currentCharge,
      targetCharge,
      priorityTier,
      arrivalTime: new Date(),
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

    if (req.body.vehicleType !== undefined) {
      const t = String(req.body.vehicleType).toLowerCase()
      if (VEHICLE_TYPES.includes(t)) vehicle.vehicleType = t
    }
    if (req.body.batteryCapacityKwh !== undefined) {
      vehicle.batteryCapacityKwh = Number(req.body.batteryCapacityKwh)
    }
    if (req.body.maxChargingPowerKw !== undefined) {
      vehicle.maxChargingPowerKw = Number(req.body.maxChargingPowerKw)
    }
    if (req.body.currentCharge !== undefined) {
      vehicle.currentCharge = Number(req.body.currentCharge)
    }
    if (req.body.targetCharge !== undefined) {
      vehicle.targetCharge = Number(req.body.targetCharge)
    }
    if (req.body.priorityTier !== undefined || req.body.priority !== undefined) {
      let p = String(req.body.priorityTier || req.body.priority).toLowerCase()
      if (p === 'sla') p = 'emergency'
      if (PRIORITY_TIERS.includes(p)) vehicle.priorityTier = p
    }
    if (req.body.departureTime !== undefined) {
      const departureTime = parseDepartureTime(req.body.departureTime)
      if (!departureTime) {
        return res.status(400).json({ status: 'error', message: 'Invalid departureTime' })
      }
      vehicle.departureTime = departureTime
    }

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
    return res.json({ status: 'ok', data: { id: req.params.id } })
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
