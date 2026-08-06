const Session = require('../models/Session')
const Vehicle = require('../models/Vehicle')
const Charger = require('../models/Charger')
const Tenant = require('../models/Tenant')
const { ACTIVE_STATES } = require('../models/Session')
const {
  startSimulation,
  stopSimulation,
} = require('../services/chargerSimulator.service')
const { recordSessionOnInvoice } = require('../services/billing.service')
const { notifySessionCompleted } = require('../services/notification.service')
const { emitSessionUpdate } = require('../sockets/session.socket')

async function listSessions(req, res) {
  try {
    const filter = {}

    if (req.user.role === 'tenant_manager') {
      filter.tenantId = req.user.tenantId
    } else if (req.user.role === 'admin') {
      if (req.query.tenantId) {
        filter.tenantId = req.query.tenantId
      }
      if (req.query.siteId) {
        filter.siteId = req.query.siteId
      }
    } else {
      return res.status(403).json({ status: 'error', message: 'Insufficient permissions' })
    }

    if (req.query.active === 'true') {
      filter.state = { $in: ACTIVE_STATES }
    }

    const sessions = await Session.find(filter).sort({ startTime: -1 }).limit(200)
    return res.json({ status: 'ok', data: sessions.map((s) => s.toSafeJSON()) })
  } catch (err) {
    console.error('[sessions] list error:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to list sessions' })
  }
}

async function listPlugInOptions(req, res) {
  try {
    if (req.user.role !== 'tenant_manager' || !req.user.tenantId) {
      return res.status(403).json({ status: 'error', message: 'Tenant manager access required' })
    }

    const tenant = await Tenant.findById(req.user.tenantId)
    if (!tenant) {
      return res.status(400).json({
        status: 'error',
        message: 'Tenant profile not found — ask admin to onboard your company',
      })
    }

    const Site = require('../models/Site')
    let siteIds = []
    if (tenant.siteId) siteIds.push(tenant.siteId)
    const owned = await Site.find({ tenantId: tenant._id }).select('_id')
    for (const s of owned) {
      if (!siteIds.some((id) => id.toString() === s._id.toString())) {
        siteIds.push(s._id)
      }
    }

    const [vehicles, chargers] = await Promise.all([
      Vehicle.find({ tenantId: req.user.tenantId }).sort({ driverName: 1 }),
      siteIds.length
        ? Charger.find({ siteId: { $in: siteIds }, status: 'available' }).sort({ label: 1 })
        : Promise.resolve([]),
    ])

    return res.json({
      status: 'ok',
      data: {
        siteId: siteIds[0] ? siteIds[0].toString() : null,
        vehicles: vehicles.map((v) => v.toSafeJSON()),
        chargers: chargers.map((c) => c.toSafeJSON()),
      },
    })
  } catch (err) {
    console.error('[sessions] options error:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to load plug-in options' })
  }
}

async function startSession(req, res) {
  try {
    if (req.user.role !== 'tenant_manager' || !req.user.tenantId) {
      return res.status(403).json({ status: 'error', message: 'Tenant manager access required' })
    }

    const vehicleId = req.body.vehicleId
    const chargerId = req.body.chargerId
    if (!vehicleId || !chargerId) {
      return res.status(400).json({
        status: 'error',
        message: 'vehicleId and chargerId are required',
      })
    }

    const tenantId = req.user.tenantId
    const tenant = await Tenant.findById(tenantId)
    if (!tenant) {
      return res.status(400).json({ status: 'error', message: 'Tenant profile not found' })
    }

    const Site = require('../models/Site')
    const vehicle = await Vehicle.findOne({ _id: vehicleId, tenantId })
    if (!vehicle) {
      return res.status(404).json({ status: 'error', message: 'Vehicle not found in your fleet' })
    }

    const charger = await Charger.findById(chargerId)
    if (!charger) {
      return res.status(404).json({ status: 'error', message: 'Charger not found' })
    }

    const chargerSite = await Site.findById(charger.siteId)
    const ownsSite =
      chargerSite &&
      ((tenant.siteId && chargerSite._id.toString() === tenant.siteId.toString()) ||
        (chargerSite.tenantId && chargerSite.tenantId.toString() === tenantId))
    if (!ownsSite) {
      return res.status(403).json({
        status: 'error',
        message: 'Charger is not on your assigned site',
      })
    }
    if (charger.status !== 'available') {
      return res.status(409).json({ status: 'error', message: 'Charger is not available' })
    }

    const busyVehicle = await Session.findOne({
      vehicleId,
      state: { $in: ACTIVE_STATES },
    })
    if (busyVehicle) {
      return res.status(409).json({
        status: 'error',
        message: 'Vehicle already has an active session',
      })
    }

    const busyCharger = await Session.findOne({
      chargerId,
      state: { $in: ACTIVE_STATES },
    })
    if (busyCharger) {
      return res.status(409).json({
        status: 'error',
        message: 'Charger already has an active session',
      })
    }

    const session = await Session.create({
      chargerId,
      vehicleId,
      tenantId,
      siteId: charger.siteId,
      state: 'queued',
      allocatedPowerKw: 0,
      startTime: new Date(),
      endTime: null,
      kWhDelivered: 0,
      driverName: vehicle.driverName,
      chargerLabel: charger.label,
      priorityTier: vehicle.priorityTier,
    })

    await Charger.findByIdAndUpdate(chargerId, { status: 'in_use' })

    const io = req.app.get('io')
    emitSessionUpdate(io, session)
    startSimulation(session._id, io)

    return res.status(201).json({ status: 'ok', data: session.toSafeJSON() })
  } catch (err) {
    console.error('[sessions] start error:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to start session' })
  }
}

async function stopSession(req, res) {
  try {
    const sessionId = req.body.sessionId || req.body.id
    if (!sessionId) {
      return res.status(400).json({ status: 'error', message: 'sessionId is required' })
    }

    const filter = { _id: sessionId }
    if (req.user.role === 'tenant_manager') {
      filter.tenantId = req.user.tenantId
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'Insufficient permissions' })
    }

    const session = await Session.findOne(filter)
    if (!session) {
      return res.status(404).json({ status: 'error', message: 'Session not found' })
    }
    if (session.state === 'completed') {
      return res.json({ status: 'ok', data: session.toSafeJSON() })
    }

    stopSimulation(session._id)
    session.state = 'completed'
    session.endTime = new Date()
    await session.save()
    await Charger.findByIdAndUpdate(session.chargerId, { status: 'available' })
    await recordSessionOnInvoice(session)

    const io = req.app.get('io')
    await notifySessionCompleted(io, session)
    emitSessionUpdate(io, session)

    return res.json({ status: 'ok', data: session.toSafeJSON() })
  } catch (err) {
    console.error('[sessions] stop error:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to stop session' })
  }
}

module.exports = {
  listSessions,
  listPlugInOptions,
  startSession,
  stopSession,
}
