import { useCallback, useEffect, useState } from 'react'
import EmptyState from '../../components/EmptyState'
import EntityTable from '../../components/EntityTable'
import ErrorState from '../../components/ErrorState'
import Modal from '../../components/Modal'
import { SkeletonList } from '../../components/SkeletonCard'
import SiteForm from '../../components/forms/SiteForm'
import { useToast } from '../../context/ToastContext'
import api from '../../lib/axios'

export default function SitesPanel() {
  const { toast } = useToast()
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [savingId, setSavingId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/sites')
      setSites(data.data || [])
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load sites'
      setError(msg)
      toast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  async function handleCreate(payload) {
    setSubmitting(true)
    try {
      const { data } = await api.post('/sites', payload)
      setSites((prev) => [data.data, ...prev])
      setModalOpen(false)
      toast('Site created')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLimitChange(siteId, maxCapacityKw) {
    setSites((prev) =>
      prev.map((s) => (s.id === siteId ? { ...s, maxCapacityKw } : s)),
    )
  }

  async function handleLimitSave(siteId, maxCapacityKw) {
    setSavingId(siteId)
    try {
      const { data } = await api.patch(`/sites/${siteId}/limit`, { maxCapacityKw })
      setSites((prev) => prev.map((s) => (s.id === siteId ? data.data : s)))
      toast('Grid limit updated')
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update limit', 'error')
      load()
    } finally {
      setSavingId(null)
    }
  }

  async function setStatus(siteId, status) {
    try {
      await api.patch(`/marketplace/stations/${siteId}/status`, { status })
      toast(`Station ${status}`)
      load()
    } catch (err) {
      toast(err.response?.data?.message || 'Status update failed', 'error')
    }
  }

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'location', label: 'Location' },
    {
      key: 'status',
      label: 'Status',
      render: (row) => row.status || 'approved',
    },
    {
      key: 'maxCapacityKw',
      label: 'Grid limit',
      render: (row) => `${row.maxCapacityKw} kW`,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className="ui-btn ui-btn-secondary !px-2 !py-1 text-xs"
            onClick={() => setStatus(row.id, 'approved')}
          >
            Approve
          </button>
          <button
            type="button"
            className="ui-btn ui-btn-danger !px-2 !py-1 text-xs"
            onClick={() => setStatus(row.id, 'suspended')}
          >
            Suspend
          </button>
        </div>
      ),
    },
  ]

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="page-title">Stations</h2>
          <p className="page-desc">Platform stations — approve, suspend, or set grid capacity.</p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="ui-btn ui-btn-primary"
        >
          New site
        </button>
      </header>

      {loading ? (
        <SkeletonList count={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : sites.length === 0 ? (
        <EmptyState
          title="No sites yet — register one"
          description="Sites hold chargers, tenants, and the site-wide grid limit."
          action={
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="ui-btn ui-btn-primary"
            >
              Register site
            </button>
          }
        />
      ) : (
        <>
          <EntityTable columns={columns} rows={sites} />

          <div className="space-y-3">
            <h3 className="section-title">Grid limits</h3>
            <div className="grid gap-3 lg:grid-cols-2">
              {sites.map((site) => (
                <article
                  key={site.id}
                  className="ui-card flex h-full flex-col p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-ink dark:text-white">{site.name}</p>
                      <p className="text-xs text-ink-muted">{site.location}</p>
                    </div>
                    <span className="text-sm font-semibold text-accent">{site.maxCapacityKw} kW</span>
                  </div>
                  <label className="block text-xs text-ink-muted" htmlFor={`limit-${site.id}`}>
                    Adjust capacity
                  </label>
                  <input
                    id={`limit-${site.id}`}
                    type="range"
                    min={0}
                    max={2000}
                    step={10}
                    value={site.maxCapacityKw}
                    onChange={(e) => handleLimitChange(site.id, Number(e.target.value))}
                    onMouseUp={(e) => handleLimitSave(site.id, Number(e.target.value))}
                    onTouchEnd={(e) => handleLimitSave(site.id, Number(e.currentTarget.value))}
                    className="mt-1 w-full accent-accent"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={site.maxCapacityKw}
                      onChange={(e) => handleLimitChange(site.id, Number(e.target.value))}
                      className="ui-input !w-28"
                    />
                    <button
                      type="button"
                      disabled={savingId === site.id}
                      onClick={() => handleLimitSave(site.id, site.maxCapacityKw)}
                      className="ui-btn ui-btn-secondary"
                    >
                      {savingId === site.id ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </>
      )}

      <Modal open={modalOpen} title="Register site" onClose={() => setModalOpen(false)}>
        <SiteForm
          submitting={submitting}
          onCancel={() => setModalOpen(false)}
          onSubmit={handleCreate}
        />
      </Modal>
    </section>
  )
}
