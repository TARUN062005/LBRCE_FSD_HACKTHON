import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/axios'
import { useToast } from '../../context/ToastContext'
import ErrorState from '../../components/ErrorState'
import EmptyState from '../../components/EmptyState'
import SkeletonCard from '../../components/SkeletonCard'

import { BOOKING_STATUS_BADGE } from '../../components/ui/statusStyles'

const STATUS_STYLE = BOOKING_STATUS_BADGE

export default function BookingsPanel() {
  const { toast } = useToast()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/bookings/history')
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

  async function run(id, action) {
    setBusyId(id)
    try {
      if (action === 'cancel') await api.patch(`/bookings/${id}/cancel`)
      if (action === 'start') await api.post(`/bookings/${id}/start`)
      if (action === 'complete') await api.post(`/bookings/${id}/complete`)
      toast(
        action === 'cancel'
          ? 'Booking cancelled'
          : action === 'start'
            ? 'Charging started'
            : 'Charging completed — invoice generated',
      )
      load()
    } catch (err) {
      toast(err.response?.data?.message || 'Action failed', 'error')
    } finally {
      setBusyId('')
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="page-title">Booking history</h2>
          <p className="page-desc">Pending → approved → charging → completed (invoice).</p>
        </div>
        <Link to="/user/billing" className="text-sm font-semibold text-accent hover:underline">
          View invoices →
        </Link>
      </div>

      {!bookings.length ? (
        <EmptyState
          title="No bookings yet"
          description="Search stations and pre-book a charging slot."
          action={
            <Link to="/user/stations" className="ui-btn ui-btn-primary">
              Browse stations
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <article key={b.id} className="ui-card p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink dark:text-white">
                    {b.siteName} · {b.chargerLabel}
                  </p>
                  <p className="text-sm text-ink-muted">
                    {new Date(b.startTime).toLocaleString()} →{' '}
                    {new Date(b.endTime).toLocaleTimeString()}
                  </p>
                  <p className="mt-1 text-sm text-ink dark:text-white">
                    Est. cost ${Number(b.estimatedCost || 0).toFixed(2)}
                  </p>
                </div>
                <span
                  className={[
                    'rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase',
                    STATUS_STYLE[b.status] || STATUS_STYLE.pending,
                  ].join(' ')}
                >
                  {b.status}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {['pending', 'approved'].includes(b.status) && (
                  <button
                    type="button"
                    disabled={busyId === b.id}
                    onClick={() => run(b.id, 'cancel')}
                    className="ui-btn ui-btn-danger !py-1.5 text-xs"
                  >
                    Cancel
                  </button>
                )}
                {b.status === 'approved' && (
                  <button
                    type="button"
                    disabled={busyId === b.id}
                    onClick={() => run(b.id, 'start')}
                    className="ui-btn ui-btn-primary !py-1.5 text-xs"
                  >
                    Start charging
                  </button>
                )}
                {b.status === 'charging' && (
                  <button
                    type="button"
                    disabled={busyId === b.id}
                    onClick={() => run(b.id, 'complete')}
                    className="ui-btn ui-btn-secondary !py-1.5 text-xs"
                  >
                    Complete & invoice
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
