import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../../lib/axios'
import { useToast } from '../../context/ToastContext'
import ErrorState from '../../components/ErrorState'
import EmptyState from '../../components/EmptyState'
import SkeletonCard from '../../components/SkeletonCard'

const TABS = [
  { id: 'normal_user', label: 'Normal users' },
  { id: 'tenant_manager', label: 'Tenant managers' },
]

const PAGE_SIZE = 10

export default function UsersPanel() {
  const { toast } = useToast()
  const [tab, setTab] = useState('normal_user')
  const [users, setUsers] = useState([])
  const [meta, setMeta] = useState({ page: 1, total: 0, hasMore: false, totalPages: 1 })
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  /** userId → selected tenant id[] */
  const [picks, setPicks] = useState({})
  const [editingId, setEditingId] = useState('')
  const [busyId, setBusyId] = useState('')

  const sortedTenants = useMemo(
    () => [...tenants].sort((a, b) => (a.companyName || '').localeCompare(b.companyName || '')),
    [tenants],
  )

  const loadTenants = useCallback(async () => {
    const { data } = await api.get('/tenants')
    setTenants(data.data || [])
  }, [])

  const loadPage = useCallback(
    async (page = 1, append = false) => {
      if (append) setLoadingMore(true)
      else {
        setLoading(true)
        setError('')
      }
      try {
        const { data } = await api.get('/users', {
          params: {
            role: tab,
            page,
            limit: PAGE_SIZE,
            q: search || undefined,
          },
        })
        const list = data.data || []
        setUsers((prev) => (append ? [...prev, ...list] : list))
        setMeta(data.meta || { page, total: list.length, hasMore: false, totalPages: 1 })

        setPicks((prev) => {
          const next = { ...prev }
          for (const u of list) {
            if (!next[u.userId]) {
              next[u.userId] = u.tenantIds?.length
                ? [...u.tenantIds]
                : u.tenantId
                  ? [u.tenantId]
                  : []
            }
          }
          return next
        })
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load users')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [tab, search],
  )

  useEffect(() => {
    loadTenants().catch(() => {})
  }, [loadTenants])

  useEffect(() => {
    setUsers([])
    setPicks({})
    setEditingId('')
    loadPage(1, false)
  }, [loadPage])

  function toggleTenant(userId, tenantId) {
    setPicks((prev) => {
      const cur = new Set(prev[userId] || [])
      if (cur.has(tenantId)) cur.delete(tenantId)
      else cur.add(tenantId)
      return { ...prev, [userId]: [...cur] }
    })
  }

  async function promote(userId) {
    const tenantIds = picks[userId] || []
    if (!tenantIds.length) {
      toast('Select at least one company', 'error')
      return
    }
    setBusyId(userId)
    try {
      await api.patch(`/users/${userId}/promote`, { tenantIds })
      toast('Assigned as tenant manager')
      setEditingId('')
      loadPage(1, false)
    } catch (err) {
      toast(err.response?.data?.message || 'Promote failed', 'error')
    } finally {
      setBusyId('')
    }
  }

  async function saveTenants(userId) {
    const tenantIds = picks[userId] || []
    if (!tenantIds.length) {
      toast('Select at least one company', 'error')
      return
    }
    setBusyId(userId)
    try {
      await api.patch(`/users/${userId}/tenants`, { tenantIds })
      toast('Company assignment updated')
      setEditingId('')
      loadPage(meta.page, false)
    } catch (err) {
      toast(err.response?.data?.message || 'Update failed', 'error')
    } finally {
      setBusyId('')
    }
  }

  async function demote(userId) {
    setBusyId(userId)
    try {
      await api.patch(`/users/${userId}/demote`)
      toast('Demoted to normal user')
      setEditingId('')
      loadPage(1, false)
    } catch (err) {
      toast(err.response?.data?.message || 'Demote failed', 'error')
    } finally {
      setBusyId('')
    }
  }

  function companyLabel(u) {
    if (u.tenants?.length) return u.tenants.map((t) => t.companyName).join(', ')
    if (u.tenantNames?.length) return u.tenantNames.join(', ')
    return 'No company'
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="page-title">Managers & users</h2>
        <p className="page-desc">
          Promote Google users to tenant managers and assign one or more charging companies.
          Assignments are visible after save — edit anytime.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={[
              'rounded-lg px-3 py-1.5 text-sm font-semibold transition',
              tab === t.id
                ? 'bg-accent text-white'
                : 'bg-surface text-ink-muted hover:text-ink dark:bg-surface-dark',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
        <form
          className="ml-auto flex min-w-[200px] flex-1 gap-2 sm:max-w-xs"
          onSubmit={(e) => {
            e.preventDefault()
            setSearch(q.trim())
          }}
        >
          <input
            className="ui-input flex-1"
            placeholder="Search name or email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search users"
          />
          <button type="submit" className="ui-btn ui-btn-secondary">
            Search
          </button>
        </form>
      </div>

      {loading ? (
        <SkeletonCard rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => loadPage(1, false)} />
      ) : !users.length ? (
        <EmptyState
          title={tab === 'normal_user' ? 'No normal users yet' : 'No tenant managers yet'}
          description={
            tab === 'normal_user'
              ? 'People who sign in with Google appear here for promotion.'
              : 'Promote a normal user and assign companies to see them here.'
          }
        />
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-ink-muted">
            Showing {users.length} of {meta.total} · page {meta.page}/{meta.totalPages}
          </p>

          {users.map((u) => {
            const selected = picks[u.userId] || []
            const isEditing = editingId === u.userId || tab === 'normal_user'
            return (
              <article key={u.userId} className="ui-card space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink dark:text-white">{u.name}</p>
                    <p className="truncate text-sm text-ink-muted">{u.email}</p>
                    {tab === 'tenant_manager' && (
                      <p className="mt-1 text-xs font-medium text-accent">
                        Assigned: {companyLabel(u)}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tab === 'tenant_manager' && !isEditing && (
                      <button
                        type="button"
                        className="ui-btn ui-btn-secondary !py-1.5 text-xs"
                        onClick={() => {
                          setEditingId(u.userId)
                          setPicks((prev) => ({
                            ...prev,
                            [u.userId]: u.tenantIds?.length
                              ? [...u.tenantIds]
                              : u.tenantId
                                ? [u.tenantId]
                                : [],
                          }))
                        }}
                      >
                        Edit companies
                      </button>
                    )}
                    {tab === 'tenant_manager' && (
                      <button
                        type="button"
                        disabled={busyId === u.userId}
                        onClick={() => demote(u.userId)}
                        className="ui-btn ui-btn-danger !py-1.5 text-xs"
                      >
                        Demote
                      </button>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="rounded-lg border border-border bg-surface/70 p-3 dark:border-border-dark dark:bg-surface-dark/50">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      Companies (multi-select)
                    </p>
                    {!sortedTenants.length ? (
                      <p className="text-sm text-ink-muted">
                        No companies yet — create one under Tenants first.
                      </p>
                    ) : (
                      <div className="grid max-h-48 gap-2 overflow-y-auto sm:grid-cols-2">
                        {sortedTenants.map((t) => {
                          const checked = selected.includes(t.id)
                          return (
                            <label
                              key={t.id}
                              className={[
                                'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm',
                                checked
                                  ? 'border-accent bg-accent/10'
                                  : 'border-border dark:border-border-dark',
                              ].join(' ')}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleTenant(u.userId, t.id)}
                              />
                              <span className="min-w-0 truncate font-medium">{t.companyName}</span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                    {selected.length > 0 && (
                      <p className="mt-2 text-xs text-ink-muted">
                        Selected ({selected.length}):{' '}
                        {sortedTenants
                          .filter((t) => selected.includes(t.id))
                          .map((t) => t.companyName)
                          .join(', ')}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tab === 'normal_user' ? (
                        <button
                          type="button"
                          disabled={busyId === u.userId || !sortedTenants.length}
                          onClick={() => promote(u.userId)}
                          className="ui-btn ui-btn-primary !py-1.5 text-xs"
                        >
                          Promote & assign
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={busyId === u.userId}
                            onClick={() => saveTenants(u.userId)}
                            className="ui-btn ui-btn-primary !py-1.5 text-xs"
                          >
                            Save assignment
                          </button>
                          <button
                            type="button"
                            className="ui-btn ui-btn-secondary !py-1.5 text-xs"
                            onClick={() => setEditingId('')}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </article>
            )
          })}

          {meta.hasMore && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                className="ui-btn ui-btn-secondary"
                disabled={loadingMore}
                onClick={() => loadPage(meta.page + 1, true)}
              >
                {loadingMore ? 'Loading…' : `Load next ${PAGE_SIZE}`}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
