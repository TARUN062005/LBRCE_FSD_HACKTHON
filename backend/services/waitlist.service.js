/**
 * Slot grant / overflow offers for multi-port stations.
 *
 * Example: 20 drivers request 10:00–11:00 but site has 10 ports
 * → first 10 (FIFO by pay time) get granted + fillOrder 1..10
 * → remaining get next free hour as an offer (Accept / Reject)
 */

const Charger = require('../models/Charger')
const Booking = require('../models/Booking')
const Site = require('../models/Site')
const { ACTIVE_BOOKING_STATUSES } = require('../models/Booking')

/** Statuses that occupy a port for a time window (not alternate offers). */
const OCCUPYING = [...ACTIVE_BOOKING_STATUSES]

function overlaps(b, start, end) {
  return new Date(b.startTime) < end && new Date(b.endTime) > start
}

function slotLabel(start, end) {
  return `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}–${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

async function loadDayBookings(siteId, dayStart, dayEnd) {
  return Booking.find({
    siteId,
    status: { $in: OCCUPYING },
    startTime: { $lt: dayEnd },
    endTime: { $gt: dayStart },
  }).sort({ paidAt: 1, createdAt: 1 })
}

function freeChargersAt(chargers, bookings, start, end) {
  return chargers.filter((c) => {
    const cid = c._id.toString()
    return !bookings.some((b) => b.chargerId.toString() === cid && overlaps(b, start, end))
  })
}

/**
 * Resolve preferred slot → grant on free port, or alternate offer.
 */
async function resolveSlotGrant({
  siteId,
  preferredChargerId,
  startTime,
  endTime,
}) {
  const start = new Date(startTime)
  const end = new Date(endTime)
  const durationMs = Math.max(15 * 60_000, end - start)

  const [site, chargers] = await Promise.all([
    Site.findById(siteId),
    Charger.find({ siteId }),
  ])
  if (!site || !chargers.length) {
    return { outcome: 'unavailable', message: 'Station has no ports' }
  }

  const dayStart = new Date(start)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(start)
  dayEnd.setHours(23, 59, 59, 999)

  const bookings = await loadDayBookings(siteId, dayStart, dayEnd)
  const freeNow = freeChargersAt(chargers, bookings, start, end)
  const portsTotal = chargers.length
  const portsFree = freeNow.length

  if (portsFree > 0) {
    let charger =
      freeNow.find((c) => c._id.toString() === String(preferredChargerId)) || freeNow[0]

    const alreadyGranted = bookings.filter((b) => overlaps(b, start, end)).length
    const fillOrder = alreadyGranted + 1

    return {
      outcome: 'granted',
      grantStatus: 'granted',
      charger,
      startTime: start,
      endTime: end,
      slot: slotLabel(start, end),
      fillOrder,
      portsTotal,
      portsFree: portsFree - 1,
      message: `Granted · fill order #${fillOrder} of ${portsTotal} · pole ${charger.label}`,
    }
  }

  // Slot full — find next hour with a free port (up to 12h / working window)
  let openHour = 8
  let closeHour = 20
  if (site.workingHours?.open) {
    openHour = Number(String(site.workingHours.open).split(':')[0]) || 8
  }
  if (site.workingHours?.close) {
    closeHour = Number(String(site.workingHours.close).split(':')[0]) || 20
  }

  const cursor = new Date(start)
  cursor.setMinutes(0, 0, 0)
  cursor.setHours(cursor.getHours() + 1)

  for (let i = 0; i < 24; i += 1) {
    const hour = cursor.getHours()
    if (hour < openHour) {
      cursor.setHours(openHour, 0, 0, 0)
    }
    if (hour >= closeHour) {
      cursor.setDate(cursor.getDate() + 1)
      cursor.setHours(openHour, 0, 0, 0)
    }

    const offerStart = new Date(cursor)
    const offerEnd = new Date(offerStart.getTime() + durationMs)
    const free = freeChargersAt(chargers, bookings, offerStart, offerEnd)
    if (free.length) {
      const charger =
        free.find((c) => c._id.toString() === String(preferredChargerId)) || free[0]
      return {
        outcome: 'offered',
        grantStatus: 'offered',
        charger,
        startTime: start,
        endTime: end,
        offeredStartTime: offerStart,
        offeredEndTime: offerEnd,
        offeredSlot: slotLabel(offerStart, offerEnd),
        slot: slotLabel(start, end),
        fillOrder: null,
        portsTotal,
        portsFree: 0,
        message: `Requested slot full (${portsTotal}/${portsTotal} ports). Next available: ${slotLabel(offerStart, offerEnd)} on ${charger.label}. Accept or reject.`,
      }
    }
    cursor.setHours(cursor.getHours() + 1)
  }

  return {
    outcome: 'full',
    grantStatus: 'full',
    portsTotal,
    portsFree: 0,
    message: 'No free ports in the next 24 hours',
  }
}

module.exports = {
  resolveSlotGrant,
  freeChargersAt,
  overlaps,
  OCCUPYING,
}
