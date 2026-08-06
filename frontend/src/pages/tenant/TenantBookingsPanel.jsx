import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/axios'
import { formatMoney } from '../../lib/money'
import { useToast } from '../../context/ToastContext'
import ErrorState from '../../components/ErrorState'
import EmptyState from '../../components/EmptyState'
import SkeletonCard from '../../components/SkeletonCard'
import { BOOKING_STATUS_BADGE } from '../../components/ui/statusStyles'

const ACTION_PATH = {
  approve: (id) => ({ method: 'patch', url: `/bookings/${id}/approve` }),
  reject: (id) => ({ method: 'patch', url: `/bookings/${id}/reject` }),
  start: (id) => ({ method: 'post', url: `/bookings/${id}/start` }),
  complete: (id) => ({ method: 'post', url: `/bookings/${id}/complete` }),
}

const ACTION_TOAST = {
  approve: 'Booking approved — driver notified',
  reject: 'Booking rejected — driver notified',
  start: 'Charging started',
  complete: 'Charging completed — invoice generated',
}

export default function TenantBookingsPanel() {
  const { toast } = useToast()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')

  const load = useCallback(async ({ soft = false } = {}) => {
    if (!soft) {
      setLoading(true)
      setError('')
    }
    try {
      const { data } = await api.get('/marketplace/bookings')
      setBookings(data.data || [])
      setError('')
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load bookings'
      if (!soft) setError(msg)
      else toast(msg, 'error')
    } finally {
      if (!soft) setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  async function act(id, action) {
    const route = ACTION_PATH[action]
    if (!route) return
    setBusyId(id)
    try {
      const { method, url } = route(id)
      const { data } =
        method === 'post' ? await api.post(url) : await api.patch(url)
      const updated = data?.data
      if (updated?.id) {
        setBookings((prev) =>
          prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b)),
        )
      }
      toast(ACTION_TOAST[action] || 'Done')
      // Refresh quietly — never wipe the page into a full error state
      load({ soft: true })
    } catch (err) {
      toast(err.response?.data?.message || 'Action failed', 'error')
    } finally {
      setBusyId('')
    }
  }

  if (loading) return <SkeletonCard rows={4} />
  if (error) return <ErrorState message={error} onRetry={() => load()} />

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
                    {b.startTime ? new Date(b.startTime).toLocaleString() : '—'}
                    {b.slot ? ` · ${b.slot}` : ''}
                  </p>
                  <p className="text-xs text-ink-muted">
                    Est. {formatMoney(b.amount || b.estimatedCost || 0)}
                    {b.paymentStatus === 'paid' ? ' · Paid' : ''}
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
                      {busyId === b.id ? 'Working…' : 'Approve'}
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
                {(b.status === 'approved' || b.status === 'confirmed') && (
                  <button
                    type="button"
                    disabled={busyId === b.id}
                    onClick={() => act(b.id, 'start')}
                    className="ui-btn ui-btn-primary !py-1.5 text-xs"
                  >
                    {busyId === b.id ? 'Working…' : 'Mark charging started'}
                  </button>
                )}
                {b.status === 'charging' && (
                  <button
                    type="button"
                    disabled={busyId === b.id}
                    onClick={() => act(b.id, 'complete')}
                    className="ui-btn ui-btn-secondary !py-1.5 text-xs"
                  >
                    {busyId === b.id ? 'Working…' : 'Mark charging completed'}
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
