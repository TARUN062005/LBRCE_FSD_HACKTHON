/**
 * Session throttle/complete notifications (tenant-scoped) — uses unified notify bus.
 */

const { notify } = require('./notify.service')

async function createAndEmitNotification(io, { tenantId, sessionId, message, type = 'info' }) {
  return notify({ io, tenantId, sessionId, message, type })
}

async function notifySessionThrottled(io, session) {
  const power = session.allocatedPowerKw ?? 0
  const driver = session.driverName || 'Vehicle'
  const message = `[Simulated push/SMS] ${driver} on ${session.chargerLabel || 'charger'} was throttled (grid limit). Allocated ${power} kW.`
  return notify({
    io,
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
  return notify({
    io,
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
