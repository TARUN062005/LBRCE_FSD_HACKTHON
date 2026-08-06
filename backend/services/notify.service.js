/**
 * Unified notifications: persist + Socket.IO.
 * Booking events go ONLY to user and/or tenant — never to admin unless notifyAdmin=true.
 */

const Notification = require('../models/Notification')
const { ADMIN_ROOM } = require('../sockets/session.socket')

function userRoom(userId) {
  return `user:${String(userId)}`
}

/**
 * @param {object} opts
 * @param {boolean} [opts.notifyAdmin=false] — platform alerts only
 */
async function notify({
  io,
  tenantId = null,
  userId = null,
  sessionId = null,
  bookingId = null,
  message,
  type = 'info',
  notifyAdmin = false,
}) {
  if (!message) return null
  if (!tenantId && !userId && !notifyAdmin) return null

  const doc = await Notification.create({
    tenantId: tenantId || null,
    userId: userId || null,
    sessionId: sessionId || null,
    bookingId: bookingId || null,
    message,
    type,
    read: false,
  })

  const payload = doc.toSafeJSON()

  if (io) {
    if (tenantId) io.to(String(tenantId)).emit('notification:new', payload)
    if (userId) io.to(userRoom(userId)).emit('notification:new', payload)
    if (notifyAdmin) io.to(ADMIN_ROOM).emit('notification:new', payload)
  }

  console.log(`[notify] ${type}${notifyAdmin ? ' [admin]' : ''}: ${message}`)
  return payload
}

/** Convenience: user-only booking/user alerts */
async function notifyUser(opts) {
  return notify({ ...opts, tenantId: null, notifyAdmin: false })
}

/** Convenience: tenant-only booking/ops alerts */
async function notifyTenant(opts) {
  return notify({ ...opts, userId: null, notifyAdmin: false })
}

/** Platform / admin-only alerts */
async function notifyPlatform(opts) {
  return notify({
    ...opts,
    tenantId: null,
    userId: null,
    notifyAdmin: true,
    type: opts.type || 'platform',
  })
}

module.exports = { notify, notifyUser, notifyTenant, notifyPlatform, userRoom }
