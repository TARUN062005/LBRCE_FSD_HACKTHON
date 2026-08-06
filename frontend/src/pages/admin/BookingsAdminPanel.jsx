import { useCallback, useEffect, useState } from 'react'
import api from '../../lib/axios'
import { useToast } from '../../context/ToastContext'
import ErrorState from '../../components/ErrorState'
import EmptyState from '../../components/EmptyState'
import SkeletonCard from '../../components/SkeletonCard'
import { BOOKING_STATUS_BADGE } from '../../components/ui/statusStyles'

export default function BookingsAdminPanel() {
  const { toast } = useToast()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/bookings')
      setBookings(data.data || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function approve(id) {
    try {
      await api.patch(`/bookings/${id}/approve`)
      toast('Booking approved')
      load()
    } catch (err) {
      toast(err.response?.data?.message || 'Approve failed', 'error')
    }
  }

  async function cancel(id) {
    try {
      await api.patch(`/bookings/${id}/cancel`)
      toast('Booking cancelled')
      load()
    } catch (err) {
      toast(err.response?.data?.message || 'Cancel failed', 'error')
    }
  }

  if (loading) return <SkeletonCard rows={3} />
  if (error) return <ErrorState message={error} onRetry={load} />
  if (!bookings.length) {
    return <EmptyState title="No bookings" description="Driver bookings will appear here." />
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="page-title">Booking approvals</h2>
        <p className="page-desc">Approve or cancel driver pre-bookings.</p>
      </div>
      <div className="space-y-2">
        {bookings.map((b) => (
          <article key={b.id} className="ui-card p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <p className="font-semibold text-ink dark:text-white">
                  {b.userName || b.userEmail} · {b.siteName} / {b.chargerLabel}
                </p>
                <p className="text-sm text-ink-muted">
                  {new Date(b.startTime).toLocaleString()} →{' '}
                  {new Date(b.endTime).toLocaleTimeString()} · ${Number(b.estimatedCost).toFixed(2)}
                </p>
                <span
                  className={[
                    'mt-2 inline-flex rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase',
                    BOOKING_STATUS_BADGE[b.status] || BOOKING_STATUS_BADGE.pending,
                  ].join(' ')}
                >
                  {b.status}
                </span>
              </div>
              <div className="flex gap-2">
                {b.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => approve(b.id)}
                    className="ui-btn ui-btn-primary !py-1.5 text-xs"
                  >
                    Approve
                  </button>
                )}
                {!['cancelled', 'completed'].includes(b.status) && (
                  <button
                    type="button"
                    onClick={() => cancel(b.id)}
                    className="ui-btn ui-btn-danger !py-1.5 text-xs"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
