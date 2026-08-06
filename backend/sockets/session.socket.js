const { recordSiteUsage } = require('../services/metrics.service')

const ADMIN_ROOM = 'admin'

/**
 * Emit session:update to the tenant room and admin room.
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
  if (payload.session?.tenantId) {
    io.to(String(payload.session.tenantId)).emit('site:update', payload)
  } else if (sitePayload.tenantIds) {
    for (const tid of sitePayload.tenantIds) {
      io.to(String(tid)).emit('site:update', payload)
    }
  }
}

function emitTenantUpdate(io, payload) {
  if (!io || !payload?.tenantId) return
  const body = { ...payload, at: new Date().toISOString() }
  io.to(String(payload.tenantId)).emit('tenant:update', body)
  io.to(ADMIN_ROOM).emit('tenant:update', body)
}

function emitDashboardUpdate(io, payload) {
  if (!io) return
  const body = { ...payload, at: new Date().toISOString() }
  io.to(ADMIN_ROOM).emit('dashboard:update', body)
  if (payload.tenantIds) {
    for (const tid of payload.tenantIds) {
      io.to(String(tid)).emit('dashboard:update', body)
    }
  } else if (payload.tenantId) {
    io.to(String(payload.tenantId)).emit('dashboard:update', body)
  }
}

module.exports = {
  ADMIN_ROOM,
  emitSessionUpdate,
  emitSiteUpdate,
  emitTenantUpdate,
  emitDashboardUpdate,
}
