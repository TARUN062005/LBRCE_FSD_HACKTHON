/**
 * Attach Socket.IO handlers.
 * Tenant-scoped rooms: clients emit `join:tenant` with { tenantId }.
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
      console.log(`[socket] ${socket.id} left tenant room ${tenantId}`)
    })

    socket.on('disconnect', (reason) => {
      console.log(`[socket] disconnected ${socket.id}: ${reason}`)
    })
  })
}

module.exports = { registerSockets }
