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
  io.to(ADMIN_ROOM).emit('site:update', {
    ...sitePayload,
    at: new Date().toISOString(),
  })
}

module.exports = {
  ADMIN_ROOM,
  emitSessionUpdate,
  emitSiteUpdate,
}
