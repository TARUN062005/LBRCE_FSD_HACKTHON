import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/axios'
import { useToast } from '../../context/ToastContext'
import ErrorState from '../../components/ErrorState'
import EmptyState from '../../components/EmptyState'
import SkeletonCard from '../../components/SkeletonCard'

const STATUS_STYLE = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  approved: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200',
  charging: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200',
  completed: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
}

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
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-semibold">Booking history</h2>
          <p className="text-sm text-ink-muted">
            Pending → approved → charging → completed (invoice).
          </p>
        </div>
        <Link to="/user/billing" className="text-sm font-semibold text-accent">
          View invoices →
        </Link>
      </div>

      {!bookings.length ? (
        <EmptyState
          title="No bookings yet"
          description="Search stations and pre-book a charging slot."
          action={
            <Link
              to="/user/stations"
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white"
            >
              Browse stations
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <article key={b.id} className="glass-panel rounded-xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {b.siteName} · {b.chargerLabel}
                  </p>
                  <p className="text-sm text-ink-muted">
                    {new Date(b.startTime).toLocaleString()} →{' '}
                    {new Date(b.endTime).toLocaleTimeString()}
                  </p>
                  <p className="mt-1 text-sm">Est. cost ${Number(b.estimatedCost || 0).toFixed(2)}</p>
                </div>
                <span
                  className={[
                    'rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase',
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
                    className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600"
                  >
                    Cancel
                  </button>
                )}
                {b.status === 'approved' && (
                  <button
                    type="button"
                    disabled={busyId === b.id}
                    onClick={() => run(b.id, 'start')}
                    className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Start charging
                  </button>
                )}
                {b.status === 'charging' && (
                  <button
                    type="button"
                    disabled={busyId === b.id}
                    onClick={() => run(b.id, 'complete')}
                    className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white dark:bg-white dark:text-ink"
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
