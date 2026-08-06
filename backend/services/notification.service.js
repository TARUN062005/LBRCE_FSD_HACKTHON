/**
 * Simulated push/SMS — persist + emit notification:new on the existing Socket.IO bus.
 */

const Notification = require('../models/Notification')
const { ADMIN_ROOM } = require('../sockets/session.socket')

async function createAndEmitNotification(io, { tenantId, sessionId, message, type = 'info' }) {
  if (!tenantId || !message) return null

  const doc = await Notification.create({
    tenantId,
    sessionId: sessionId || null,
    message,
    type,
    read: false,
  })

  const payload = doc.toSafeJSON()

  if (io) {
    io.to(String(tenantId)).emit('notification:new', payload)
    // Admin live board can mirror simulated alerts
    io.to(ADMIN_ROOM).emit('notification:new', payload)
  }

  console.log(`[notify] ${type} → tenant ${tenantId}: ${message}`)
  return payload
}

async function notifySessionThrottled(io, session) {
  const power = session.allocatedPowerKw ?? 0
  const driver = session.driverName || 'Vehicle'
  const message = `[Simulated push/SMS] ${driver} on ${session.chargerLabel || 'charger'} was throttled (grid limit). Allocated ${power} kW.`
  return createAndEmitNotification(io, {
    tenantId: session.tenantId,
    sessionId: session._id || session.id,
    message,
    type: 'throttled',
  })
}

async function notifySessionCompleted(io, session) {
  const kwh = session.kWhDelivered ?? 0
  const driver = session.driverName || 'Vehicle'
  const message = `[Simulated push/SMS] ${driver} finished charging — ${kwh} kWh delivered.`
  return createAndEmitNotification(io, {
    tenantId: session.tenantId,
    sessionId: session._id || session.id,
    message,
    type: 'completed',
  })
}

module.exports = {
  createAndEmitNotification,
  notifySessionThrottled,
  notifySessionCompleted,
}
