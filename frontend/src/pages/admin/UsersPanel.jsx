import { useCallback, useEffect, useState } from 'react'
import api from '../../lib/axios'
import { useToast } from '../../context/ToastContext'
import ErrorState from '../../components/ErrorState'
import EmptyState from '../../components/EmptyState'
import SkeletonCard from '../../components/SkeletonCard'

export default function UsersPanel() {
  const { toast } = useToast()
  const [users, setUsers] = useState([])
  const [pending, setPending] = useState([])
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tenantPick, setTenantPick] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [all, pend, t] = await Promise.all([
        api.get('/users'),
        api.get('/users/pending'),
        api.get('/tenants'),
      ])
      setUsers(all.data.data || [])
      setPending(pend.data.data || [])
      setTenants(t.data.data || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function promote(userId) {
    try {
      const tid = tenantPick[userId] || tenants[0]?.id
      if (!tid) {
        toast('Create a tenant company first', 'error')
        return
      }
      await api.patch(`/users/${userId}/promote`, { tenantId: tid })
      toast('Promoted to tenant manager')
      load()
    } catch (err) {
      toast(err.response?.data?.message || 'Promote failed', 'error')
    }
  }

  async function demote(userId) {
    try {
      await api.patch(`/users/${userId}/demote`)
      toast('Demoted to normal user')
      load()
    } catch (err) {
      toast(err.response?.data?.message || 'Demote failed', 'error')
    }
  }

  if (loading) return <SkeletonCard rows={4} />
  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold">Users & promotions</h2>
        <p className="text-sm text-ink-muted">
          Google users start as <strong>normal_user</strong>. Promote drivers to tenant managers
          after you create a tenant. Admins come only from <code>SUPER_ADMIN_EMAIL</code>.
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-ink-muted">
          Pending drivers ({pending.length})
        </h3>
        {!pending.length ? (
          <EmptyState
            title="No normal users yet"
            description="When people sign in with Google, they appear here for promotion."
          />
        ) : (
          <div className="space-y-2">
            {pending.map((u) => (
              <div
                key={u.userId}
                className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-xl p-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{u.name}</p>
                  <p className="truncate text-sm text-ink-muted">{u.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="rounded-lg border border-border bg-panel px-2 py-1.5 text-xs dark:border-border-dark dark:bg-panel-dark"
                    value={tenantPick[u.userId] || tenants[0]?.id || ''}
                    onChange={(e) =>
                      setTenantPick((prev) => ({ ...prev, [u.userId]: e.target.value }))
                    }
                  >
                    {!tenants.length && <option value="">No tenants — create one first</option>}
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.companyName}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => promote(u.userId)}
                    disabled={!tenants.length}
                    className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    Promote to Tenant Manager
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-ink-muted">
          All users ({users.length})
        </h3>
        <div className="space-y-2">
          {users.map((u) => (
            <div
              key={u.userId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 dark:border-border-dark"
            >
              <div>
                <p className="font-medium">{u.name}</p>
                <p className="text-xs text-ink-muted">
                  {u.email} · <span className="uppercase text-accent">{u.role}</span>
                </p>
              </div>
              {u.role === 'tenant_manager' && (
                <button
                  type="button"
                  onClick={() => demote(u.userId)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold dark:border-border-dark"
                >
                  Demote to normal user
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
