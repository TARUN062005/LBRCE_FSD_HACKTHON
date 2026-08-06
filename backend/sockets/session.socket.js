const { recordSiteUsage } = require('../services/metrics.service')

const ADMIN_ROOM = 'admin'

/**
 * Emit session:update to the tenant room and site:update to the admin room.
 */
function emitSessionUpdate(io, session) {
  if (!io || !session) return

  const payload = typeof session.toSafeJSON === 'function' ? session.toSafeJSON() : session
  const tenantRoom = String(payload.tenantId)
  const siteId = String(payload.siteId)

  io.to(tenantRoom).emit('session:update', payload)
  io.to(ADMIN_ROOM).emit('session:update', payload)
  io.to(ADMIN_ROOM).emit('site:update', {
    siteId,
    session: payload,
    at: new Date().toISOString(),
  })
}

function emitSiteUpdate(io, sitePayload) {
  if (!io) return
  const at = new Date().toISOString()
  const payload = { ...sitePayload, at }

  if (payload.siteId != null && payload.usedKw != null) {
    recordSiteUsage({
      siteId: payload.siteId,
      usedKw: payload.usedKw,
      maxCapacityKw: payload.maxCapacityKw,
      at,
    })
  }

  io.to(ADMIN_ROOM).emit('site:update', payload)
  // Tenants watching the same site board also get live power samples
  if (payload.session?.tenantId) {
    io.to(String(payload.session.tenantId)).emit('site:update', payload)
  } else if (sitePayload.tenantIds) {
    for (const tid of sitePayload.tenantIds) {
      io.to(String(tid)).emit('site:update', payload)
    }
  }
}

module.exports = {
  ADMIN_ROOM,
  emitSessionUpdate,
  emitSiteUpdate,
}
