const Site = require('../models/Site')
const Charger = require('../models/Charger')
const Booking = require('../models/Booking')
const { getTariff } = require('../services/tariff.service')

/**
 * GET /stations — list charging sites with charger summary (public + authenticated)
 */
async function listStations(req, res) {
  try {
    const q = String(req.query.q || '').trim().toLowerCase()
    let sites = await Site.find().sort({ name: 1 })
    if (q) {
      sites = sites.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.location.toLowerCase().includes(q),
      )
    }

    const chargers = await Charger.find({
      siteId: { $in: sites.map((s) => s._id) },
    })

    const data = sites.map((site) => {
      const siteChargers = chargers.filter((c) => c.siteId.toString() === site._id.toString())
      return {
        id: site._id.toString(),
        name: site.name,
        location: site.location,
        maxCapacityKw: site.maxCapacityKw,
        chargerCount: siteChargers.length,
        availableChargers: siteChargers.filter((c) => c.status === 'available').length,
        chargers: siteChargers.map((c) => ({
          id: c._id.toString(),
          label: c.label,
          maxPowerKw: c.maxPowerKw,
          status: c.status,
        })),
      }
    })

    return res.json({ status: 'ok', data, tariff: getTariff(new Date()) })
  } catch (err) {
    console.error('[stations] list error:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to list stations' })
  }
}

async function getStation(req, res) {
  try {
    const site = await Site.findById(req.params.id)
    if (!site) {
      return res.status(404).json({ status: 'error', message: 'Station not found' })
    }
    const chargers = await Charger.find({ siteId: site._id })
    return res.json({
      status: 'ok',
      data: {
        id: site._id.toString(),
        name: site.name,
        location: site.location,
        maxCapacityKw: site.maxCapacityKw,
        chargers: chargers.map((c) => ({
          id: c._id.toString(),
          label: c.label,
          maxPowerKw: c.maxPowerKw,
          status: c.status,
        })),
        tariff: getTariff(new Date()),
      },
    })
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to load station' })
  }
}

/**
 * GET /availability?siteId=&chargerId=&date=YYYY-MM-DD
 * Returns busy windows + suggested free slots for the day.
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
      status: { $in: ['pending', 'approved', 'charging'] },
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

    // Simple hourly free slots 08:00–20:00
    const freeSlots = []
    for (let hour = 8; hour < 20; hour += 1) {
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

module.exports = { listStations, getStation, getAvailability }
