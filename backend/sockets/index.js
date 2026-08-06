const { ADMIN_ROOM } = require('./session.socket')
const { userRoom } = require('../services/notify.service')

/**
 * Rooms: tenantId, admin, user:<userId>
 */
function registerSockets(io) {
  io.on('connection', (socket) => {
    console.log(`[socket] connected ${socket.id}`)

    socket.on('join:tenant', ({ tenantId } = {}) => {
      if (!tenantId || typeof tenantId !== 'string') {
        socket.emit('error', { message: 'tenantId is required to join a room' })
        return
      }
      const room = String(tenantId)
      socket.join(room)
      console.log(`[socket] ${socket.id} joined tenant room ${room}`)
      socket.emit('joined:tenant', { tenantId: room })
    })

    socket.on('leave:tenant', ({ tenantId } = {}) => {
      if (!tenantId) return
      socket.leave(String(tenantId))
    })

    socket.on('join:admin', () => {
      socket.join(ADMIN_ROOM)
      console.log(`[socket] ${socket.id} joined admin room`)
      socket.emit('joined:admin', { room: ADMIN_ROOM })
    })

    socket.on('leave:admin', () => {
      socket.leave(ADMIN_ROOM)
    })

    socket.on('join:user', ({ userId } = {}) => {
      if (!userId) {
        socket.emit('error', { message: 'userId is required' })
        return
      }
      const room = userRoom(userId)
      socket.join(room)
      console.log(`[socket] ${socket.id} joined ${room}`)
      socket.emit('joined:user', { userId: String(userId) })
    })

    socket.on('leave:user', ({ userId } = {}) => {
      if (!userId) return
      socket.leave(userRoom(userId))
    })

    socket.on('disconnect', (reason) => {
      console.log(`[socket] disconnected ${socket.id}: ${reason}`)
    })
  })
}

module.exports = { registerSockets }
