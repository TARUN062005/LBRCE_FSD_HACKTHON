import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined
const isDev = import.meta.env.DEV

let socket = null
const listeners = new Set()

/** Rooms to re-join after reconnect (Render ping drops) */
const rooms = {
  admin: false,
  tenantIds: [],
  userId: null,
}

function notifyStatus() {
  const status = !socket
    ? 'disconnected'
    : socket.connected
      ? 'connected'
      : 'disconnected'
  listeners.forEach((fn) => fn(status))
}

function rejoinRooms() {
  if (!socket?.connected) return
  if (rooms.admin) socket.emit('join:admin')
  for (const tenantId of rooms.tenantIds) {
    socket.emit('join:tenant', { tenantId: String(tenantId) })
  }
  if (rooms.userId) socket.emit('join:user', { userId: String(rooms.userId) })
}

/**
 * Shared Socket.IO client — tuned for Render / reverse proxies.
 */
export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      path: '/socket.io/',
      autoConnect: true,
      withCredentials: true,
      transports: ['polling', 'websocket'],
      upgrade: true,
      rememberUpgrade: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.5,
      timeout: 25000,
    })

    socket.on('connect', () => {
      if (isDev) console.log('[socket] connected', socket.id)
      rejoinRooms()
      notifyStatus()
    })

    socket.on('disconnect', (reason) => {
      if (isDev) console.log('[socket] disconnected', reason)
      notifyStatus()
    })

    socket.on('connect_error', (err) => {
      if (isDev) console.warn('[socket] connect_error', err.message)
      notifyStatus()
    })
  }

  return socket
}

export function joinTenantRoom(tenantId, { keepOthers = false } = {}) {
  const s = getSocket()
  if (!tenantId) return s
  const id = String(tenantId)
  rooms.admin = false
  rooms.userId = null
  if (keepOthers) {
    if (!rooms.tenantIds.includes(id)) rooms.tenantIds.push(id)
  } else {
    rooms.tenantIds = [id]
  }
  if (s.connected) s.emit('join:tenant', { tenantId: id })
  return s
}

export function joinAdminRoom() {
  const s = getSocket()
  rooms.admin = true
  rooms.tenantIds = []
  rooms.userId = null
  if (s.connected) s.emit('join:admin')
  return s
}

export function joinUserRoom(userId) {
  const s = getSocket()
  if (!userId) return s
  rooms.userId = String(userId)
  rooms.admin = false
  rooms.tenantIds = []
  if (s.connected) s.emit('join:user', { userId: rooms.userId })
  return s
}

export function disconnectSocket() {
  rooms.admin = false
  rooms.tenantIds = []
  rooms.userId = null
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
    notifyStatus()
  }
}

export function subscribeSocketStatus(listener) {
  listeners.add(listener)
  listener(socket?.connected ? 'connected' : 'disconnected')
  return () => listeners.delete(listener)
}

export default {
  getSocket,
  joinTenantRoom,
  joinAdminRoom,
  joinUserRoom,
  disconnectSocket,
  subscribeSocketStatus,
}
