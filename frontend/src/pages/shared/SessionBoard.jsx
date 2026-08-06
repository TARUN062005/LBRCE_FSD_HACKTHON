import { useCallback, useEffect, useMemo, useState } from 'react'
import PlugInButton from '../../components/PlugInButton'
import StateColumn from '../../components/StateColumn'
import { SkeletonList } from '../../components/SkeletonCard'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import api from '../../lib/axios'
import { getSocket, joinAdminRoom, joinTenantRoom } from '../../lib/socket'

export const SESSION_STATES = [
  'queued',
  'connected',
  'charging',
  'optimized',
  'throttled',
  'completed',
]

const STATE_TITLES = {
  queued: 'Queued',
  connected: 'Connected',
  charging: 'Charging',
  optimized: 'Optimized',
  throttled: 'Throttled',
  completed: 'Completed',
}

export default function SessionBoard({ showPlugIn = false }) {
  const { role, tenantId } = useAuth()
  const { toast } = useToast()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  const upsertSession = useCallback((incoming) => {
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === incoming.id)
      if (idx === -1) return [incoming, ...prev]
      const next = [...prev]
      next[idx] = incoming
      return next
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/sessions')
      setSessions(data.data || [])
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load sessions', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const socket = getSocket()

    if (role === 'admin') {
      joinAdminRoom()
    } else if (tenantId) {
      joinTenantRoom(tenantId)
    }

    const onUpdate = (payload) => {
      if (!payload?.id) return
      // Tenant clients only apply their own sessions (belt + suspenders)
      if (role === 'tenant_manager' && payload.tenantId !== tenantId) return
      upsertSession(payload)
    }

    socket.on('session:update', onUpdate)
    return () => {
      socket.off('session:update', onUpdate)
    }
  }, [role, tenantId, upsertSession])

  async function handleStop(session) {
    try {
      const { data } = await api.post('/sessions/stop', { sessionId: session.id })
      upsertSession(data.data)
      toast('Session stopped')
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to stop session', 'error')
    }
  }

  const byState = useMemo(() => {
    const map = Object.fromEntries(SESSION_STATES.map((s) => [s, []]))
    for (const session of sessions) {
      const key = SESSION_STATES.includes(session.state) ? session.state : 'queued'
      map[key].push(session)
    }
    return map
  }, [sessions])

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink dark:text-white">Live Session Board</h2>
          <p className="text-sm text-ink-muted">
            Queued → Connected → Charging → Optimized → Throttled → Completed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            className="rounded-md border border-border px-3 py-2 text-sm dark:border-border-dark"
          >
            Refresh
          </button>
          {showPlugIn && <PlugInButton onStarted={upsertSession} />}
        </div>
      </header>

      {loading ? (
        <SkeletonList count={2} />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {SESSION_STATES.map((state) => (
            <StateColumn
              key={state}
              title={STATE_TITLES[state]}
              sessions={byState[state]}
              onStop={handleStop}
            />
          ))}
        </div>
      )}
    </section>
  )
}
