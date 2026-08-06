import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/axios'
import { formatMoney } from '../../lib/money'
import { useToast } from '../../context/ToastContext'
import ErrorState from '../../components/ErrorState'
import EmptyState from '../../components/EmptyState'
import SkeletonCard from '../../components/SkeletonCard'
import { BOOKING_STATUS_BADGE } from '../../components/ui/statusStyles'

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

  async function rejectOffer(id) {
    setBusyId(id)
    try {
      const { data } = await api.patch(`/bookings/${id}/reject-offer`)
      toast(data.message || 'Offer rejected')
      load()
    } catch (err) {
      toast(err.response?.data?.message || 'Could not reject', 'error')
    } finally {
      setBusyId('')
    }
  }

  async function acceptOffer(id) {
    setBusyId(id)
    try {
      const { data } = await api.patch(`/bookings/${id}/accept-offer`)
      toast(data.message || 'Next slot accepted')
      load()
    } catch (err) {
      toast(err.response?.data?.message || 'Could not accept', 'error')
    } finally {
      setBusyId('')
    }
  }

  async function cancel(id) {
    setBusyId(id)
    try {
      await api.patch(`/bookings/${id}/cancel`)
      toast('Booking cancelled')
      load()
    } catch (err) {
      toast(err.response?.data?.message || 'Could not cancel', 'error')
    } finally {
      setBusyId('')
    }
  }

  async function pay(id) {
    setBusyId(id)
    try {
      await api.post('/payments/checkout', { bookingId: id })
      toast('Payment successful')
      load()
    } catch (err) {
      toast(err.response?.data?.message || 'Payment failed', 'error')
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
          <h2 className="page-title">My bookings</h2>
          <p className="page-desc">
            Pay (demo) → host approve → auto grid sort → invoice on actual energy × time.
          </p>
        </div>
        <Link to="/user/billing" className="text-sm font-semibold text-accent hover:underline">
          View invoices →
        </Link>
      </div>

      {!bookings.length ? (
        <EmptyState
          title="No bookings yet"
          description="Find a nearby station on the map and request a slot."
          action={
            <Link to="/user/map" className="ui-btn ui-btn-primary">
              Open map
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
                    {b.siteName} · {b.assignedPole || b.chargerLabel}
                  </p>
                  <p className="text-sm text-ink-muted">
                    {new Date(b.startTime).toLocaleString()} →{' '}
                    {new Date(b.endTime).toLocaleTimeString()}
                  </p>
                  {(b.vehicleType || b.currentCharge != null) && (
                    <p className="text-sm text-ink-muted">
                      {b.vehicleType || 'EV'}
                      {b.vehicleNumber ? ` · ${b.vehicleNumber}` : ''}
                      {b.currentCharge != null
                        ? ` · ${b.currentCharge}%→${b.targetCharge ?? 90}%`
                        : ''}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-ink dark:text-white">
                    {formatMoney(b.amount || b.estimatedCost)}
                    {b.paymentStatus === 'paid' ? ' · Paid' : ''}
                    {b.paymentId ? ` · ${b.paymentId}` : ''}
                  </p>
                  {(b.estimatedChargeMinutes || b.allocatedPowerKw) && (
                    <p className="mt-1 text-xs font-medium text-accent">
                      {b.assignedPole || b.chargerLabel
                        ? `Pole ${b.assignedPole || b.chargerLabel}`
                        : null}
                      {b.allocatedPowerKw != null ? ` · ${b.allocatedPowerKw} kW` : ''}
                      {b.estimatedChargeMinutes
                        ? ` · ~${b.estimatedChargeMinutes} min`
                        : ''}
                      {b.queuePosition ? ` · queue #${b.queuePosition}` : ''}
                    </p>
                  )}
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
              <div className="mt-3 flex flex-wrap gap-2">
                {['pending', 'approved'].includes(b.status) && (
                  <button
                    type="button"
                    disabled={busyId === b.id}
                    onClick={() => cancel(b.id)}
                    className="ui-btn ui-btn-danger !py-1.5 text-xs"
                  >
                    Cancel
                  </button>
                )}
                {b.status === 'completed' && b.paymentStatus !== 'paid' && (
                  <button
                    type="button"
                    disabled={busyId === b.id}
                    onClick={() => pay(b.id)}
                    className="ui-btn ui-btn-primary !py-1.5 text-xs"
                  >
                    Pay invoice
                  </button>
                )}
                {b.status === 'offered' && (
                  <>
                    <p className="w-full text-xs text-ink-muted">
                      {b.grantMessage ||
                        `Requested slot full. Next available: ${b.offeredSlot || 'later'} on ${
                          b.offeredChargerLabel || 'a free port'
                        }.`}
                    </p>
                    <button
                      type="button"
                      disabled={busyId === b.id}
                      onClick={() => acceptOffer(b.id)}
                      className="ui-btn ui-btn-primary !py-1.5 text-xs"
                    >
                      {busyId === b.id ? 'Working…' : 'OK · take next slot'}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === b.id}
                      onClick={() => rejectOffer(b.id)}
                      className="ui-btn ui-btn-danger !py-1.5 text-xs"
                    >
                      Reject offer
                    </button>
                  </>
                )}
                {b.status === 'pending' && (
                  <p className="w-full text-xs text-ink-muted">
                    {b.paymentStatus === 'paid'
                      ? b.fillOrder
                        ? `Granted · fill order #${b.fillOrder} · pole ${
                            b.assignedPole || b.chargerLabel
                          } — waiting for host approve.`
                        : `Paid · waiting for host · preferred pole ${
                            b.assignedPole || b.chargerLabel
                          }${
                            b.estimatedChargeMinutes
                              ? ` · est. ~${b.estimatedChargeMinutes} min after approve`
                              : ''
                          }`
                      : 'Waiting for the station host to respond.'}
                  </p>
                )}
                {b.status === 'approved' && (
                  <p className="w-full text-xs text-ink-muted">
                    Approved · go to pole {b.assignedPole || b.chargerLabel}
                    {b.estimatedChargeMinutes
                      ? ` · ~${b.estimatedChargeMinutes} min`
                      : ''}
                    . Grid will sort with other vehicles (FIFO + fast-complete).
                  </p>
                )}
                {b.status === 'charging' && (
                  <p className="w-full text-xs text-ink-muted">
                    Live · pole {b.assignedPole || b.chargerLabel}
                    {b.allocatedPowerKw != null ? ` · ${b.allocatedPowerKw} kW` : ''}
                    {b.estimatedChargeMinutes
                      ? ` · ~${b.estimatedChargeMinutes} min remaining est.`
                      : ''}
                    . Billed on actual energy × time.
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
