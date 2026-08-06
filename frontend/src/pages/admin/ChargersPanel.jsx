import { useCallback, useEffect, useMemo, useState } from 'react'
import EmptyState from '../../components/EmptyState'
import EntityTable from '../../components/EntityTable'
import ErrorState from '../../components/ErrorState'
import Modal from '../../components/Modal'
import { SkeletonList } from '../../components/SkeletonCard'
import ChargerForm from '../../components/forms/ChargerForm'
import { useToast } from '../../context/ToastContext'
import api from '../../lib/axios'

export default function ChargersPanel() {
  const { toast } = useToast()
  const [chargers, setChargers] = useState([])
  const [sites, setSites] = useState([])
  const [siteFilter, setSiteFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const siteNameById = useMemo(
    () => Object.fromEntries(sites.map((s) => [s.id, s.name])),
    [sites],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [chargersRes, sitesRes] = await Promise.all([
        api.get('/chargers', { params: siteFilter ? { siteId: siteFilter } : {} }),
        api.get('/sites'),
      ])
      setChargers(chargersRes.data.data || [])
      setSites(sitesRes.data.data || [])
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load chargers'
      setError(msg)
      toast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }, [siteFilter, toast])

  useEffect(() => {
    load()
  }, [load])

  async function handleCreate(payload) {
    setSubmitting(true)
    try {
      const { data } = await api.post('/chargers', payload)
      if (!siteFilter || siteFilter === payload.siteId) {
        setChargers((prev) => [data.data, ...prev])
      }
      setModalOpen(false)
      toast('Charger registered')
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    { key: 'label', label: 'Label' },
    {
      key: 'siteId',
      label: 'Site',
      render: (row) => siteNameById[row.siteId] || row.siteId,
    },
    {
      key: 'maxPowerKw',
      label: 'Max power',
      render: (row) => `${row.maxPowerKw} kW`,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <span className="capitalize">{row.status.replace('_', ' ')}</span>
      ),
    },
  ]

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink dark:text-white">Chargers</h2>
          <p className="text-sm text-ink-muted">Register chargers under a site.</p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover"
        >
          New charger
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="site-filter" className="text-sm text-ink-muted">
          Filter by site
        </label>
        <select
          id="site-filter"
          value={siteFilter}
          onChange={(e) => setSiteFilter(e.target.value)}
          className="rounded-md border border-border bg-panel px-3 py-2 text-sm dark:border-border-dark dark:bg-panel-dark"
        >
          <option value="">All sites</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <SkeletonList count={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : chargers.length === 0 ? (
        <EmptyState
          title="No chargers yet — register one"
          description={
            sites.length
              ? 'Add a charger to an existing site.'
              : 'Create a site first, then register chargers.'
          }
          action={
            sites.length ? (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white"
              >
                Register charger
              </button>
            ) : null
          }
        />
      ) : (
        <EntityTable columns={columns} rows={chargers} />
      )}

      <Modal open={modalOpen} title="Register charger" onClose={() => setModalOpen(false)}>
        <ChargerForm
          sites={sites}
          submitting={submitting}
          onCancel={() => setModalOpen(false)}
          onSubmit={handleCreate}
        />
      </Modal>
    </section>
  )
}
