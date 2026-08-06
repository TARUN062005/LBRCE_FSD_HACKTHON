import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined

let socket = null
const listeners = new Set()

function notifyStatus() {
  const status = !socket
    ? 'disconnected'
    : socket.connected
      ? 'connected'
      : 'disconnected'
  listeners.forEach((fn) => fn(status))
}

/**
 * Get or create the shared Socket.IO client.
 * Join rooms via joinTenantRoom / joinAdminRoom after auth.
 */
export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      withCredentials: true,
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      console.log('[socket] connected', socket.id)
      notifyStatus()
    })

    socket.on('disconnect', (reason) => {
      console.log('[socket] disconnected', reason)
      notifyStatus()
    })

    socket.on('connect_error', (err) => {
      console.warn('[socket] connect_error', err.message)
      notifyStatus()
    })
  }

  return socket
}

export function joinTenantRoom(tenantId) {
  const s = getSocket()
  if (!tenantId) return s

  const join = () => s.emit('join:tenant', { tenantId: String(tenantId) })
  if (s.connected) join()
  else s.once('connect', join)
  return s
}

export function joinAdminRoom() {
  const s = getSocket()
  const join = () => s.emit('join:admin')
  if (s.connected) join()
  else s.once('connect', join)
  return s
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
    notifyStatus()
  }
}

export function subscribeSocketStatus(listener) {
  listeners.add(listener)
  listener(
    socket?.connected ? 'connected' : 'disconnected',
  )
  return () => listeners.delete(listener)
}

export default {
  getSocket,
  joinTenantRoom,
  joinAdminRoom,
  disconnectSocket,
  subscribeSocketStatus,
}
