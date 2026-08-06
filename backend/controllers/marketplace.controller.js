const Site = require('../models/Site')
const Charger = require('../models/Charger')
const Tenant = require('../models/Tenant')
const Booking = require('../models/Booking')
const User = require('../models/User')
const { CHARGER_TYPES } = require('../models/Charger')
const { notifyPlatform } = require('../services/notify.service')

/**
 * Tenant marketplace: create / list / update owned stations.
 */

async function listMyStations(req, res) {
  try {
    if (!req.user.tenantId) {
      return res.status(400).json({ status: 'error', message: 'No tenant company linked' })
    }
    const sites = await Site.find({ tenantId: req.user.tenantId }).sort({ createdAt: -1 })
    const chargers = await Charger.find({ siteId: { $in: sites.map((s) => s._id) } })
    const data = sites.map((site) => {
      const siteChargers = chargers.filter((c) => c.siteId.toString() === site._id.toString())
      return {
        ...site.toSafeJSON(),
        chargerCount: siteChargers.length,
        availableChargers: siteChargers.filter((c) => c.status === 'available').length,
        chargers: siteChargers.map((c) => c.toSafeJSON()),
      }
    })
    return res.json({ status: 'ok', data })
  } catch (err) {
    console.error('[marketplace] listMyStations:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to list stations' })
  }
}

/**
 * POST /marketplace/stations
 * Body: station fields + latitude/longitude + optional chargers[]
 */
async function createStation(req, res) {
  try {
    if (!req.user.tenantId) {
      return res.status(400).json({ status: 'error', message: 'No tenant company linked' })
    }

    const tenant = await Tenant.findById(req.user.tenantId)
    if (!tenant) {
      return res.status(404).json({ status: 'error', message: 'Tenant not found' })
    }
    if (tenant.status === 'suspended') {
      return res.status(403).json({ status: 'error', message: 'Tenant is suspended' })
    }

    const stationName = String(req.body.stationName || req.body.name || '').trim()
    const description = String(req.body.description || '').trim()
    const address = String(req.body.address || req.body.location || '').trim()
    const city = String(req.body.city || '').trim()
    const state = String(req.body.state || '').trim()
    const pincode = String(req.body.pincode || '').trim()
    const photos = Array.isArray(req.body.photos) ? req.body.photos.slice(0, 8) : []
    const pricePerKwh = Number(req.body.pricePerKwh ?? 0.14)
    const maxCapacityKw = Number(req.body.maxCapacityKw ?? 40)
    const latitude = Number(req.body.latitude)
    const longitude = Number(req.body.longitude)
    const chargerCount = Math.min(Number(req.body.numberOfChargers || req.body.chargerCount || 1), 20)

    if (!stationName || !address) {
      return res.status(400).json({
        status: 'error',
        message: 'stationName and address are required',
      })
    }
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({
        status: 'error',
        message: 'latitude and longitude are required (pin on map)',
      })
    }

    const locationLine = [address, city, state, pincode].filter(Boolean).join(', ') || address

    const site = new Site({
      name: stationName,
      location: locationLine,
      description,
      address,
      city,
      state,
      pincode,
      photos,
      pricePerKwh: Number.isFinite(pricePerKwh) ? pricePerKwh : 0.14,
      maxCapacityKw: Number.isFinite(maxCapacityKw) ? maxCapacityKw : 40,
      tenantId: tenant._id,
      status: tenant.status === 'approved' ? 'approved' : 'pending',
      tenantName: tenant.companyName,
      workingHours: {
        open: req.body.workingHours?.open || '08:00',
        close: req.body.workingHours?.close || '20:00',
      },
    })
    site.setCoordinates(latitude, longitude)
    await site.save()

    if (!tenant.siteId) {
      tenant.siteId = site._id
      await tenant.save()
    }

    if (site.status === 'pending') {
      await notifyPlatform({
        io: req.app.get('io'),
        type: 'station_approval',
        message: `[Station approval] ${site.name} from ${tenant.companyName} awaits review`,
      })
    }

    const createdChargers = []
    const explicit = Array.isArray(req.body.chargers) ? req.body.chargers : null
    if (explicit?.length) {
      for (const c of explicit.slice(0, 20)) {
        const charger = await Charger.create({
          siteId: site._id,
          label: String(c.label || `Pole ${createdChargers.length + 1}`).trim(),
          maxPowerKw: Number(c.maxPowerKw) || 22,
          chargerType: CHARGER_TYPES.includes(c.chargerType) ? c.chargerType : 'Type2',
          status: 'available',
        })
        createdChargers.push(charger)
      }
    } else {
      for (let i = 0; i < Math.max(1, chargerCount); i += 1) {
        const charger = await Charger.create({
          siteId: site._id,
          label: `Pole ${i + 1}`,
          maxPowerKw: 22,
          chargerType: 'Type2',
          status: 'available',
        })
        createdChargers.push(charger)
      }
    }

    return res.status(201).json({
      status: 'ok',
      data: {
        ...site.toSafeJSON(),
        chargers: createdChargers.map((c) => c.toSafeJSON()),
      },
    })
  } catch (err) {
    console.error('[marketplace] createStation:', err)
    return res.status(500).json({ status: 'error', message: err.message || 'Failed to create station' })
  }
}

async function updateStation(req, res) {
  try {
    const site = await Site.findById(req.params.id)
    if (!site) {
      return res.status(404).json({ status: 'error', message: 'Station not found' })
    }
    if (
      req.user.role !== 'admin' &&
      (!req.user.tenantId || site.tenantId?.toString() !== req.user.tenantId)
    ) {
      return res.status(403).json({ status: 'error', message: 'Not your station' })
    }

    const fields = [
      'description',
      'address',
      'city',
      'state',
      'pincode',
      'pricePerKwh',
      'maxCapacityKw',
    ]
    if (req.body.stationName || req.body.name) {
      site.name = String(req.body.stationName || req.body.name).trim()
    }
    for (const f of fields) {
      if (req.body[f] !== undefined) site[f] = req.body[f]
    }
    if (Array.isArray(req.body.photos)) site.photos = req.body.photos.slice(0, 8)
    if (req.body.workingHours) {
      site.workingHours = {
        open: req.body.workingHours.open || site.workingHours?.open || '08:00',
        close: req.body.workingHours.close || site.workingHours?.close || '20:00',
      }
    }
    if (req.body.latitude != null && req.body.longitude != null) {
      site.setCoordinates(req.body.latitude, req.body.longitude)
    }
    if (req.body.address || req.body.city) {
      site.location = [site.address, site.city, site.state, site.pincode]
        .filter(Boolean)
        .join(', ')
    }

    await site.save()
    return res.json({ status: 'ok', data: site.toSafeJSON() })
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to update station' })
  }
}

/** Admin: approve / suspend station */
async function setStationStatus(req, res) {
  try {
    const { status } = req.body || {}
    if (!['pending', 'approved', 'suspended'].includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Invalid status' })
    }
    const site = await Site.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    )
    if (!site) {
      return res.status(404).json({ status: 'error', message: 'Station not found' })
    }
    if (status === 'pending') {
      await notifyPlatform({
        io: req.app.get('io'),
        type: 'station_approval',
        message: `[Station approval] ${site.name} marked pending`,
      })
    }
    return res.json({ status: 'ok', data: site.toSafeJSON() })
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to update station status' })
  }
}

/** Tenant bookings for their stations */
async function listTenantBookings(req, res) {
  try {
    if (!req.user.tenantId) {
      return res.status(400).json({ status: 'error', message: 'No tenant company linked' })
    }
    const bookings = await Booking.find({ tenantId: req.user.tenantId })
      .sort({ startTime: -1 })
      .limit(200)
    return res.json({ status: 'ok', data: bookings.map((b) => b.toSafeJSON()) })
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to list bookings' })
  }
}

/** Earnings summary for tenant */
async function tenantEarnings(req, res) {
  try {
    if (!req.user.tenantId) {
      return res.status(400).json({ status: 'error', message: 'No tenant company linked' })
    }
    const paid = await Booking.find({
      tenantId: req.user.tenantId,
      paymentStatus: 'paid',
    })
    const total = paid.reduce((sum, b) => sum + (b.amount || b.estimatedCost || 0), 0)
    const completed = paid.filter((b) => b.status === 'completed').length
    return res.json({
      status: 'ok',
      data: {
        revenue: Number(total.toFixed(2)),
        paidBookings: paid.length,
        completedSessions: completed,
      },
    })
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to load earnings' })
  }
}

/**
 * Self-serve tenant company registration (user becomes manager after admin approve + promote,
 * or if already manager). Creates pending tenant record.
 */
async function registerCompany(req, res) {
  try {
    const companyName = String(req.body.companyName || '').trim()
    if (!companyName) {
      return res.status(400).json({ status: 'error', message: 'companyName is required' })
    }

    const existing = await Tenant.findOne({
      companyName: new RegExp(`^${companyName}$`, 'i'),
    })
    if (existing) {
      return res.status(409).json({ status: 'error', message: 'Company name already exists' })
    }

    const tenant = await Tenant.create({
      companyName,
      billingPlan: 'standard',
      siteId: null,
      status: 'pending',
      description: String(req.body.description || '').trim(),
    })

    await notifyPlatform({
      io: req.app.get('io'),
      type: 'tenant_registration',
      message: `[New tenant registration] ${tenant.companyName} awaits approval`,
    })

    return res.status(201).json({
      status: 'ok',
      data: tenant.toSafeJSON(),
      message: 'Company registered. An admin will approve and promote a manager.',
    })
  } catch (err) {
    console.error('[marketplace] registerCompany:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to register company' })
  }
}

async function setTenantStatus(req, res) {
  try {
    const { status } = req.body || {}
    if (!['pending', 'approved', 'suspended'].includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Invalid status' })
    }
    const tenant = await Tenant.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    )
    if (!tenant) {
      return res.status(404).json({ status: 'error', message: 'Tenant not found' })
    }
    return res.json({ status: 'ok', data: tenant.toSafeJSON() })
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to update tenant' })
  }
}

module.exports = {
  listMyStations,
  createStation,
  updateStation,
  setStationStatus,
  listTenantBookings,
  tenantEarnings,
  registerCompany,
  setTenantStatus,
}
