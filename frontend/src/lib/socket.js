import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined

let socket = null

/**
 * Get or create the shared Socket.IO client.
 * Connects lazily; joins a tenant room when tenantId is provided.
 */
export function getSocket(tenantId) {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      withCredentials: true,
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      console.log('[socket] connected', socket.id)
    })

    socket.on('disconnect', (reason) => {
      console.log('[socket] disconnected', reason)
    })

    socket.on('connect_error', (err) => {
      console.warn('[socket] connect_error', err.message)
    })
  }

  if (tenantId && socket.connected) {
    socket.emit('join:tenant', { tenantId })
  } else if (tenantId) {
    socket.once('connect', () => {
      socket.emit('join:tenant', { tenantId })
    })
  }

  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export default { getSocket, disconnectSocket }
