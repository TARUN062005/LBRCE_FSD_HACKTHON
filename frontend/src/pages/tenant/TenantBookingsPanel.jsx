import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/axios'
import { formatMoney } from '../../lib/money'
import { useToast } from '../../context/ToastContext'
import ErrorState from '../../components/ErrorState'
import EmptyState from '../../components/EmptyState'
import SkeletonCard from '../../components/SkeletonCard'
import { BOOKING_STATUS_BADGE } from '../../components/ui/statusStyles'

export default function TenantBookingsPanel() {
  const { toast } = useToast()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/marketplace/bookings')
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

  async function act(id, action) {
    setBusyId(id)
    try {
      if (action === 'approve') await api.patch(`/bookings/${id}/approve`)
      if (action === 'reject') await api.patch(`/bookings/${id}/reject`)
      if (action === 'start') await api.post(`/bookings/${id}/start`)
      if (action === 'complete') await api.post(`/bookings/${id}/complete`)
      toast(
        action === 'approve'
          ? 'Booking approved — driver notified'
          : action === 'reject'
            ? 'Booking rejected — driver notified'
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

  if (loading) return <SkeletonCard rows={4} />
  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <section className="space-y-6">
      <div>
        <h2 className="page-title">Booking requests</h2>
        <p className="page-desc">
          Approve or reject requests from EV drivers, then mark charging when they arrive.
        </p>
      </div>
      {!bookings.length ? (
        <EmptyState
          title="No booking requests yet"
          description="When a driver books one of your stations, the request shows up here with a notification."
        />
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <article key={b.id} className="ui-card p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="font-semibold text-ink dark:text-white">{b.siteName}</p>
                  <p className="text-sm text-ink-muted">
                    {b.userName || b.userEmail || 'Driver'}
                    {b.vehicleNumber ? ` · ${b.vehicleNumber}` : ''}
                    {' · '}
                    {b.chargerLabel}
                  </p>
                  <p className="text-sm text-ink dark:text-white">
                    {new Date(b.startTime).toLocaleString()}
                    {b.slot ? ` · ${b.slot}` : ''}
                  </p>
                  <p className="text-xs text-ink-muted">
                    Est. {formatMoney(b.amount || b.estimatedCost || 0)}
                    {b.userPhone ? ` · ${b.userPhone}` : ''}
                    {b.userEmail ? ` · ${b.userEmail}` : ''}
                  </p>
                </div>
                <span
                  className={[
                    'rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase',
                    BOOKING_STATUS_BADGE[b.status] || BOOKING_STATUS_BADGE.pending,
                  ].join(' ')}
                >
                  {b.status}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {b.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      disabled={busyId === b.id}
                      onClick={() => act(b.id, 'approve')}
                      className="ui-btn ui-btn-primary !py-1.5 text-xs"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busyId === b.id}
                      onClick={() => act(b.id, 'reject')}
                      className="ui-btn ui-btn-danger !py-1.5 text-xs"
                    >
                      Reject
                    </button>
                  </>
                )}
                {b.status === 'approved' && (
                  <button
                    type="button"
                    disabled={busyId === b.id}
                    onClick={() => act(b.id, 'start')}
                    className="ui-btn ui-btn-primary !py-1.5 text-xs"
                  >
                    Mark charging started
                  </button>
                )}
                {b.status === 'charging' && (
                  <button
                    type="button"
                    disabled={busyId === b.id}
                    onClick={() => act(b.id, 'complete')}
                    className="ui-btn ui-btn-secondary !py-1.5 text-xs"
                  >
                    Mark charging completed
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="text-center text-sm text-ink-muted">
        <Link to="/tenant/stations" className="font-semibold text-accent hover:underline">
          Manage stations →
        </Link>
      </p>
    </section>
  )
}
