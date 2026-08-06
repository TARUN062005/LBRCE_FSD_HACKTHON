import { useCallback, useEffect, useState } from 'react'
import EmptyState from '../../components/EmptyState'
import ErrorState from '../../components/ErrorState'
import Modal from '../../components/Modal'
import { SkeletonList } from '../../components/SkeletonCard'
import VehicleCard from '../../components/VehicleCard'
import VehicleForm from '../../components/forms/VehicleForm'
import { useToast } from '../../context/ToastContext'
import api from '../../lib/axios'

export default function VehiclesPanel() {
  const { toast } = useToast()
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/vehicles')
      setVehicles(data.data || [])
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load vehicles'
      setError(msg)
      toast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  function openCreate() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(vehicle) {
    setEditing(vehicle)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
  }

  async function handleSubmit(payload) {
    setSubmitting(true)
    try {
      if (editing) {
        const { data } = await api.patch(`/vehicles/${editing.id}`, payload)
        setVehicles((prev) => prev.map((v) => (v.id === editing.id ? data.data : v)))
        toast('Vehicle updated')
      } else {
        const { data } = await api.post('/vehicles', payload)
        setVehicles((prev) => [...prev, data.data].sort(byDeparture))
        toast('Vehicle added')
      }
      closeModal()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="page-title">Vehicles</h2>
          <p className="page-desc">
            Register drivers, priority tier, and target departure for your fleet.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="ui-btn ui-btn-primary"
        >
          Add vehicle
        </button>
      </header>

      {loading ? (
        <SkeletonList count={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : vehicles.length === 0 ? (
        <EmptyState
          title="No vehicles yet — add one"
          description="Priority tier and departure time feed the charging optimizer."
          action={
            <button
              type="button"
              onClick={openCreate}
              className="ui-btn ui-btn-primary"
            >
              Add vehicle
            </button>
          }
        />
      ) : (
        <div className="grid gap-3 xs:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} onEdit={openEdit} />
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editing ? 'Edit vehicle' : 'Add vehicle'}
        onClose={closeModal}
      >
        <VehicleForm
          key={editing?.id || 'new'}
          initial={editing}
          submitting={submitting}
          onCancel={closeModal}
          onSubmit={handleSubmit}
        />
      </Modal>
    </section>
  )
}

function byDeparture(a, b) {
  return new Date(a.departureTime) - new Date(b.departureTime)
}
