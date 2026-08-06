import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../lib/axios'
import { getSocket } from '../lib/socket'
import { playNotificationSound } from '../lib/notificationSound'

const ADMIN_PLATFORM_TYPES = new Set([
  'platform',
  'tenant_registration',
  'station_approval',
  'error',
  'complaint',
  'analytics',
])

/**
 * Loads persisted notifications and listens on the shared Socket.IO connection
 * for `notification:new` (toast + sound + panel).
 */
export default function useNotifications() {
  const { isAuthenticated, role, tenantId } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [latest, setLatest] = useState(null)

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return
    setLoading(true)
    try {
      const { data } = await api.get('/notifications')
      setNotifications(data.data?.notifications || [])
      setUnreadCount(data.data?.unreadCount || 0)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([])
      setUnreadCount(0)
      return undefined
    }
    refresh()
  }, [isAuthenticated, refresh])

  useEffect(() => {
    if (!isAuthenticated) return undefined

    const socket = getSocket()

    const onNew = (payload) => {
      if (!payload?.id) return
      if (role === 'tenant_manager' && payload.tenantId !== tenantId) return
      if (role === 'admin' && !ADMIN_PLATFORM_TYPES.has(payload.type)) return

      setNotifications((prev) => {
        if (prev.some((n) => n.id === payload.id)) return prev
        return [payload, ...prev].slice(0, 50)
      })
      if (!payload.read) {
        setUnreadCount((c) => c + 1)
      }
      setLatest(payload)
      playNotificationSound()
    }

    socket.on('notification:new', onNew)
    return () => {
      socket.off('notification:new', onNew)
    }
  }, [isAuthenticated, role, tenantId])

  const markRead = useCallback(async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch {
      // ignore
    }
  }, [])

  const markAllRead = useCallback(async () => {
    try {
      await api.patch('/notifications/read-all')
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch {
      // ignore
    }
  }, [])

  const clearLatest = useCallback(() => setLatest(null), [])

  return {
    notifications,
    unreadCount,
    loading,
    latest,
    clearLatest,
    refresh,
    markRead,
    markAllRead,
  }
}
