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
  const { role, tenantId, tenantIds } = useAuth()
  const { toast } = useToast()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [capacity, setCapacity] = useState({
    totalCapacityKw: 0,
    usedKw: 0,
    freeKw: 0,
    tenantAllocation: {},
  })

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
    } else {
      const ids = tenantIds?.length ? tenantIds : tenantId ? [tenantId] : []
      ids.forEach((id) => joinTenantRoom(id, { keepOthers: true }))
    }

    const onUpdate = (payload) => {
      if (!payload?.id) return
      if (role === 'tenant_manager') {
        const ids = tenantIds?.length ? tenantIds : tenantId ? [tenantId] : []
        if (!ids.includes(payload.tenantId)) return
      }
      upsertSession(payload)
    }

    const onSite = (payload) => {
      if (!payload) return
      setCapacity({
        totalCapacityKw: payload.totalCapacityKw ?? payload.maxCapacityKw ?? 0,
        usedKw: payload.usedKw ?? payload.currentUsageKw ?? 0,
        freeKw:
          payload.availableCapacityKw ??
          payload.freeKw ??
          Math.max(
            0,
            (payload.totalCapacityKw ?? payload.maxCapacityKw ?? 0) -
              (payload.usedKw ?? 0),
          ),
        tenantAllocation: payload.tenantAllocation || {},
      })
    }

    socket.on('session:update', onUpdate)
    socket.on('site:update', onSite)
    socket.on('dashboard:update', onSite)
    return () => {
      socket.off('session:update', onUpdate)
      socket.off('site:update', onSite)
      socket.off('dashboard:update', onSite)
    }
  }, [role, tenantId, tenantIds, upsertSession])

  async function handleStop(session) {
    try {
      const { data } = await api.post('/sessions/stop', { sessionId: session.id })
      upsertSession(data.data)
      toast('Session stopped · billed on allocated energy')
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to stop session', 'error')
    }
  }

  async function handleAdjust(session, patch) {
    try {
      const { data } = await api.patch(`/sessions/${session.id}/adjust`, patch)
      upsertSession(data.data)
      toast(data.message || 'Grid re-sorted')
    } catch (err) {
      toast(err.response?.data?.message || 'Adjust failed', 'error')
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

  const active = sessions.filter((s) => s.state !== 'completed')
  const usedFallback = active.reduce((s, x) => s + (Number(x.allocatedPowerKw) || 0), 0)
  const total = capacity.totalCapacityKw || 0
  const used = capacity.usedKw || usedFallback
  const free = capacity.freeKw || Math.max(0, total - used)
  const usedPct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-2xl">
          <h2 className="page-title">Live charging board</h2>
          <p className="page-desc">
            Approve auto-starts the grid sort. Concurrent sessions share site capacity — Required vs
            Allocated updates live. Fine-tune anytime.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={load} className="ui-btn ui-btn-secondary">
            Refresh
          </button>
          {showPlugIn && <PlugInButton onStarted={upsertSession} />}
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <CapacityCard label="Total capacity" value={`${total || '—'} kW`} />
        <CapacityCard label="Used" value={`${Math.round(used * 10) / 10} kW`} accent />
        <CapacityCard label="Free" value={`${Math.round(free * 10) / 10} kW`} />
      </div>

      {total > 0 && (
        <div className="ui-card p-4">
          <div className="mb-2 flex justify-between text-xs font-semibold text-ink-muted">
            <span>Site utilization</span>
            <span>{usedPct}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-surface dark:bg-surface-dark">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${usedPct}%` }}
            />
          </div>
          {Object.keys(capacity.tenantAllocation || {}).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink-muted">
              {Object.entries(capacity.tenantAllocation).map(([tid, kw]) => (
                <span
                  key={tid}
                  className="rounded-md bg-surface px-2 py-1 dark:bg-surface-dark"
                >
                  Tenant {tid.slice(-4)} · {kw} kW
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && !error && active.length > 0 && (
        <div className="ui-card overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-ink text-[11px] font-semibold uppercase tracking-wide text-white dark:bg-ink-muted">
              <tr>
                <th className="px-3 py-2">Vehicle</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Required</th>
                <th className="px-3 py-2">Allocated</th>
                <th className="px-3 py-2">ETA</th>
                <th className="px-3 py-2">Reason</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Left</th>
              </tr>
            </thead>
            <tbody>
              {active.map((s) => (
                <tr key={s.id} className="border-t border-border dark:border-border-dark">
                  <td className="px-3 py-2 font-medium">{s.driverName || '—'}</td>
                  <td className="px-3 py-2 capitalize">{s.vehicleType || 'car'}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {s.requestedKw ?? s.maxChargingPowerKw ?? '—'} kW
                  </td>
                  <td className="px-3 py-2 tabular-nums font-semibold text-accent">
                    {s.allocatedPowerKw ?? 0} kW
                  </td>
                  <td className="px-3 py-2 text-xs tabular-nums">
                    {s.estimatedChargeMinutes
                      ? `~${s.estimatedChargeMinutes} min`
                      : s.estimatedCompletionAt
                        ? new Date(s.estimatedCompletionAt).toLocaleTimeString()
                        : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-ink-muted max-w-[180px]">
                    {s.allocationReason || s.reason || '—'}
                  </td>
                  <td className="px-3 py-2 capitalize">{s.state}</td>
                  <td className="px-3 py-2">{s.timeRemaining || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
              onAdjust={handleAdjust}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function CapacityCard({ label, value, accent }) {
  return (
    <div className="ui-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className={['mt-1 text-2xl font-bold tabular-nums', accent ? 'text-accent' : 'text-ink dark:text-white'].join(' ')}>
        {value}
      </p>
    </div>
  )
}
