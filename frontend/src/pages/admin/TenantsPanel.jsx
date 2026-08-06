import { useCallback, useEffect, useMemo, useState } from 'react'
import EmptyState from '../../components/EmptyState'
import EntityTable from '../../components/EntityTable'
import Modal from '../../components/Modal'
import { SkeletonList } from '../../components/SkeletonCard'
import TenantForm from '../../components/forms/TenantForm'
import { useToast } from '../../context/ToastContext'
import api from '../../lib/axios'

export default function TenantsPanel() {
  const { toast } = useToast()
  const [tenants, setTenants] = useState([])
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const siteNameById = useMemo(
    () => Object.fromEntries(sites.map((s) => [s.id, s.name])),
    [sites],
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [tenantsRes, sitesRes] = await Promise.all([
        api.get('/tenants'),
        api.get('/sites'),
      ])
      setTenants(tenantsRes.data.data || [])
      setSites(sitesRes.data.data || [])
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load tenants', 'error')
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
      const { data } = await api.post('/tenants', payload)
      setTenants((prev) => [data.data, ...prev])
      setModalOpen(false)
      toast('Tenant onboarded')
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    { key: 'companyName', label: 'Company' },
    {
      key: 'billingPlan',
      label: 'Plan',
      render: (row) => <span className="capitalize">{row.billingPlan}</span>,
    },
    {
      key: 'siteId',
      label: 'Site',
      render: (row) => siteNameById[row.siteId] || row.siteId,
    },
  ]

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink dark:text-white">Tenants</h2>
          <p className="text-sm text-ink-muted">Onboard tenant companies to a site.</p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover"
        >
          New tenant
        </button>
      </header>

      {loading ? (
        <SkeletonList count={3} />
      ) : tenants.length === 0 ? (
        <EmptyState
          title="No tenants yet — onboard one"
          description={
            sites.length
              ? 'Assign a company to a site with a billing plan.'
              : 'Create a site first, then onboard tenants.'
          }
          action={
            sites.length ? (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white"
              >
                Onboard tenant
              </button>
            ) : null
          }
        />
      ) : (
        <EntityTable columns={columns} rows={tenants} />
      )}

      <Modal open={modalOpen} title="Onboard tenant" onClose={() => setModalOpen(false)}>
        <TenantForm
          sites={sites}
          submitting={submitting}
          onCancel={() => setModalOpen(false)}
          onSubmit={handleCreate}
        />
      </Modal>
    </section>
  )
}
