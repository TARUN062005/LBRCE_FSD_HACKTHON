/**
 * Unified notifications: persist + Socket.IO to tenant / user / admin rooms.
 */

const Notification = require('../models/Notification')
const { ADMIN_ROOM } = require('../sockets/session.socket')

function userRoom(userId) {
  return `user:${String(userId)}`
}

async function notify({
  io,
  tenantId = null,
  userId = null,
  sessionId = null,
  bookingId = null,
  message,
  type = 'info',
}) {
  if (!message) return null
  if (!tenantId && !userId) return null

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
    io.to(ADMIN_ROOM).emit('notification:new', payload)
  }

  console.log(`[notify] ${type}: ${message}`)
  return payload
}

module.exports = { notify, userRoom }
