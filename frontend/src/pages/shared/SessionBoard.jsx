import { useCallback, useEffect, useMemo, useState } from 'react'
import ErrorState from '../../components/ErrorState'
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
  const [error, setError] = useState('')

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
    setError('')
    try {
      const { data } = await api.get('/sessions')
      setSessions(data.data || [])
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load sessions'
      setError(msg)
      toast(msg, 'error')
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
    <section>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-2xl">
          <h2 className="page-title">Live session board</h2>
          <p className="page-desc">
            Queued → Connected → Charging → Optimized → Throttled → Completed
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={load} className="ui-btn ui-btn-secondary">
            Refresh
          </button>
          {showPlugIn && <PlugInButton onStarted={upsertSession} />}
        </div>
      </header>

      {loading ? (
        <SkeletonList count={2} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 md:mx-0 md:px-0">
          {SESSION_STATES.map((state) => (
            <StateColumn
              key={state}
              stateKey={state}
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
