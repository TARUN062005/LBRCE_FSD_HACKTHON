import { useCallback, useEffect, useState } from 'react'
import api from '../../lib/axios'
import ErrorState from '../../components/ErrorState'
import EmptyState from '../../components/EmptyState'
import SkeletonCard from '../../components/SkeletonCard'

export default function TenantBookingsPanel() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  if (loading) return <SkeletonCard rows={4} />
  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <section className="space-y-6">
      <div>
        <h2 className="page-title">Station bookings</h2>
        <p className="page-desc">Incoming reservations for your charging sites.</p>
      </div>
      {!bookings.length ? (
        <EmptyState title="No bookings yet" description="When drivers book your stations, they appear here." />
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <article key={b.id} className="ui-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{b.siteName}</p>
                  <p className="text-sm text-ink-muted">
                    {b.userName || b.userEmail} · {b.chargerLabel} · {b.slot || ''}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {new Date(b.startTime).toLocaleString()}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold">${Number(b.amount || 0).toFixed(2)}</p>
                  <p className="text-xs uppercase text-ink-muted">
                    {b.bookingStatus || b.status} · {b.paymentStatus}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
