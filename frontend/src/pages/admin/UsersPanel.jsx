import { useCallback, useEffect, useState } from 'react'
import api from '../../lib/axios'
import { useToast } from '../../context/ToastContext'
import ErrorState from '../../components/ErrorState'
import SkeletonCard from '../../components/SkeletonCard'

export default function UsersPanel() {
  const { toast } = useToast()
  const [users, setUsers] = useState([])
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tenantPick, setTenantPick] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [u, t] = await Promise.all([api.get('/auth/users'), api.get('/tenants')])
      setUsers(u.data.data || [])
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

  async function promote(userId, role) {
    try {
      const body = { userId, role }
      if (role === 'tenant_manager') {
        const tid = tenantPick[userId] || tenants[0]?.id
        if (!tid) {
          toast('Create a tenant first', 'error')
          return
        }
        body.tenantId = tid
      }
      await api.patch('/auth/promote', body)
      toast(role === 'tenant_manager' ? 'Promoted to tenant manager' : 'Reverted to normal user')
      load()
    } catch (err) {
      toast(err.response?.data?.message || 'Promote failed', 'error')
    }
  }

  if (loading) return <SkeletonCard rows={4} />
  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold">Users & role approval</h2>
        <p className="text-sm text-ink-muted">
          Google OAuth users start as normal_user. Promote to tenant_manager with a company.
          Admins are seed-only.
        </p>
      </div>
      <div className="space-y-2">
        {users.map((u) => (
          <div
            key={u.userId}
            className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-xl p-4"
          >
            <div className="min-w-0">
              <p className="font-semibold">{u.name}</p>
              <p className="truncate text-sm text-ink-muted">{u.email}</p>
              <p className="text-xs uppercase tracking-wider text-accent">{u.role}</p>
            </div>
            {u.role !== 'admin' && (
              <div className="flex flex-wrap items-center gap-2">
                {u.role === 'normal_user' && (
                  <>
                    <select
                      className="rounded-lg border border-border bg-panel px-2 py-1.5 text-xs dark:border-border-dark dark:bg-panel-dark"
                      value={tenantPick[u.userId] || tenants[0]?.id || ''}
                      onChange={(e) =>
                        setTenantPick((prev) => ({ ...prev, [u.userId]: e.target.value }))
                      }
                    >
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.companyName}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => promote(u.userId, 'tenant_manager')}
                      className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Approve as tenant manager
                    </button>
                  </>
                )}
                {u.role === 'tenant_manager' && (
                  <button
                    type="button"
                    onClick={() => promote(u.userId, 'normal_user')}
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold dark:border-border-dark"
                  >
                    Demote to normal user
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
