const Site = require('../models/Site')
const Charger = require('../models/Charger')
const Booking = require('../models/Booking')
const { ACTIVE_BOOKING_STATUSES } = require('../models/Booking')
const { getTariff } = require('../services/tariff.service')

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function enrichStation(site, chargers, extras = {}) {
  const siteChargers = chargers.filter((c) => c.siteId.toString() === site._id.toString())
  const availableChargers = siteChargers.filter((c) => c.status === 'available').length
  const base = site.toSafeJSON()
  return {
    ...base,
    chargerCount: siteChargers.length,
    availableChargers,
    chargers: siteChargers.map((c) => c.toSafeJSON()),
    ...extras,
  }
}

/**
 * GET /stations — public catalog (approved stations only unless admin)
 */
async function listStations(req, res) {
  try {
    const q = String(req.query.q || '').trim().toLowerCase()
    const filter =
      req.user?.role === 'admin'
        ? {}
        : { $or: [{ status: 'approved' }, { status: { $exists: false } }, { status: null }] }

    let sites = await Site.find(filter).sort({ name: 1 })
    if (q) {
      sites = sites.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.location || '').toLowerCase().includes(q) ||
          (s.city || '').toLowerCase().includes(q) ||
          (s.address || '').toLowerCase().includes(q),
      )
    }

    const chargers = await Charger.find({ siteId: { $in: sites.map((s) => s._id) } })
    const data = sites.map((site) => enrichStation(site, chargers))

    return res.json({ status: 'ok', data, tariff: getTariff(new Date()) })
  } catch (err) {
    console.error('[stations] list error:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to list stations' })
  }
}

/**
 * GET /stations/nearby?lat=&lng=&radiusKm=20&maxPrice=&chargerType=&sort=
 */
async function nearbyStations(req, res) {
  try {
    const lat = Number(req.query.lat)
    const lng = Number(req.query.lng)
    const radiusKm = Math.min(Number(req.query.radiusKm) || 20, 50)
    const maxPrice = req.query.maxPrice != null ? Number(req.query.maxPrice) : null
    const chargerType = String(req.query.chargerType || '').trim()
    const sort = String(req.query.sort || 'distance')

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({
        status: 'error',
        message: 'lat and lng are required',
      })
    }

    const radiusMeters = radiusKm * 1000
    let sites = []

    try {
      sites = await Site.find({
        $and: [
          { $or: [{ status: 'approved' }, { status: { $exists: false } }] },
          {
            geo: {
              $near: {
                $geometry: { type: 'Point', coordinates: [lng, lat] },
                $maxDistance: radiusMeters,
              },
            },
          },
        ],
      }).limit(100)
    } catch {
      // Fallback if index missing / no geo docs
      const all = await Site.find({
        $or: [{ status: 'approved' }, { status: { $exists: false } }],
        latitude: { $ne: null },
        longitude: { $ne: null },
      })
      sites = all
        .map((s) => ({
          site: s,
          distanceKm: haversineKm(lat, lng, s.latitude, s.longitude),
        }))
        .filter((x) => x.distanceKm <= radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .map((x) => x.site)
    }

    if (maxPrice != null && Number.isFinite(maxPrice)) {
      sites = sites.filter((s) => (s.pricePerKwh ?? 0.14) <= maxPrice)
    }

    const chargers = await Charger.find({ siteId: { $in: sites.map((s) => s._id) } })

    let data = sites.map((site) => {
      const distanceKm = Number(
        haversineKm(lat, lng, site.latitude, site.longitude).toFixed(2),
      )
      const travelMinutes = Math.max(1, Math.round((distanceKm / 30) * 60))
      return enrichStation(site, chargers, {
        distanceKm,
        travelMinutes,
        estimatedTravelTime: `${travelMinutes} min`,
      })
    })

    if (chargerType) {
      data = data.filter((s) =>
        (s.chargers || []).some(
          (c) => String(c.chargerType || '').toLowerCase() === chargerType.toLowerCase(),
        ),
      )
    }

    if (sort === 'price') {
      data.sort((a, b) => (a.pricePerKwh || 0) - (b.pricePerKwh || 0))
    } else if (sort === 'availability') {
      data.sort((a, b) => (b.availableChargers || 0) - (a.availableChargers || 0))
    } else if (sort === 'rating') {
      data.sort((a, b) => (b.ratingAvg || 0) - (a.ratingAvg || 0))
    } else {
      data.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0))
    }

    return res.json({
      status: 'ok',
      data,
      meta: { lat, lng, radiusKm, count: data.length },
      tariff: getTariff(new Date()),
    })
  } catch (err) {
    console.error('[stations] nearby error:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to find nearby stations' })
  }
}

async function getStation(req, res) {
  try {
    const site = await Site.findById(req.params.id)
    if (!site) {
      return res.status(404).json({ status: 'error', message: 'Station not found' })
    }
    if (site.status === 'suspended' && req.user?.role !== 'admin') {
      return res.status(404).json({ status: 'error', message: 'Station not found' })
    }
    const chargers = await Charger.find({ siteId: site._id })
    return res.json({
      status: 'ok',
      data: {
        ...enrichStation(site, chargers),
        tariff: getTariff(new Date()),
      },
    })
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to load station' })
  }
}

/**
 * GET /availability?siteId=&chargerId=&date=YYYY-MM-DD
 */
async function getAvailability(req, res) {
  try {
    const { siteId, chargerId, date } = req.query
    if (!siteId && !chargerId) {
      return res.status(400).json({
        status: 'error',
        message: 'siteId or chargerId is required',
      })
    }

    const day = date ? new Date(date) : new Date()
    const dayStart = new Date(day)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(day)
    dayEnd.setHours(23, 59, 59, 999)

    const query = {
      status: { $in: ACTIVE_BOOKING_STATUSES },
      startTime: { $lt: dayEnd },
      endTime: { $gt: dayStart },
    }
    if (chargerId) query.chargerId = chargerId
    else if (siteId) query.siteId = siteId

    const bookings = await Booking.find(query).sort({ startTime: 1 })

    const busy = bookings.map((b) => ({
      bookingId: b._id.toString(),
      chargerId: b.chargerId.toString(),
      chargerLabel: b.chargerLabel,
      startTime: b.startTime,
      endTime: b.endTime,
      status: b.status,
    }))

    let openHour = 8
    let closeHour = 20
    if (siteId) {
      const site = await Site.findById(siteId)
      if (site?.workingHours?.open) {
        openHour = Number(String(site.workingHours.open).split(':')[0]) || 8
      }
      if (site?.workingHours?.close) {
        closeHour = Number(String(site.workingHours.close).split(':')[0]) || 20
      }
    }

    const freeSlots = []
    for (let hour = openHour; hour < closeHour; hour += 1) {
      const slotStart = new Date(dayStart)
      slotStart.setHours(hour, 0, 0, 0)
      const slotEnd = new Date(dayStart)
      slotEnd.setHours(hour + 1, 0, 0, 0)
      const conflict = busy.some(
        (b) => new Date(b.startTime) < slotEnd && new Date(b.endTime) > slotStart,
      )
      if (!conflict) {
        freeSlots.push({
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
          slot: `${String(hour).padStart(2, '0')}:00–${String(hour + 1).padStart(2, '0')}:00`,
        })
      }
    }

    return res.json({
      status: 'ok',
      data: {
        date: dayStart.toISOString().slice(0, 10),
        busy,
        freeSlots,
        tariff: getTariff(dayStart),
      },
    })
  } catch (err) {
    console.error('[stations] availability error:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to load availability' })
  }
}

module.exports = { listStations, getStation, getAvailability, nearbyStations }
