import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/axios'
import ErrorState from '../../components/ErrorState'
import EmptyState from '../../components/EmptyState'
import SkeletonCard from '../../components/SkeletonCard'
import { formatRate } from '../../lib/money'

const PAGE_SIZE = 6

export default function StationsPanel() {
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/stations', { params: search ? { q: search } : {} })
      setStations(data.data || [])
      setPage(1)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load stations')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    load()
  }, [load])

  const totalPages = Math.max(1, Math.ceil(stations.length / PAGE_SIZE))
  const pageSafe = Math.min(page, totalPages)
  const pageStations = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE
    return stations.slice(start, start + PAGE_SIZE)
  }, [stations, pageSafe])

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="page-title">Charging stations</h2>
          <p className="page-desc">Browse approved sites and open a station to book a slot.</p>
        </div>
        <Link to="/user/map" className="ui-btn ui-btn-secondary">
          Open map
        </Link>
      </div>

      <form
        className="ui-card flex flex-wrap gap-2 p-3"
        onSubmit={(e) => {
          e.preventDefault()
          setSearch(q.trim())
        }}
      >
        <div className="relative min-w-[200px] flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-muted">
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, city, or address…"
            className="ui-input w-full !pl-10"
            aria-label="Search stations"
          />
        </div>
        <button type="submit" className="ui-btn ui-btn-primary">
          Search
        </button>
      </form>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !stations.length ? (
        <EmptyState
          title="No stations found"
          description="Try another search, or open the map to find chargers near you."
          action={
            <Link to="/user/map" className="ui-btn ui-btn-primary">
              Open map
            </Link>
          }
        />
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span>
              Showing {(pageSafe - 1) * PAGE_SIZE + 1}–
              {Math.min(pageSafe * PAGE_SIZE, stations.length)} of {stations.length}
            </span>
            <span>
              Page {pageSafe}/{totalPages}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pageStations.map((s) => (
              <article key={s.id} className="ui-card flex h-full flex-col p-4">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-ink dark:text-white">{s.name}</h3>
                  <p className="mt-0.5 line-clamp-2 text-sm text-ink-muted">
                    {s.address || s.location}
                  </p>
                  <p className="mt-3 text-xs text-ink-muted">
                    {s.availableChargers}/{s.chargerCount} free · {formatRate(s.pricePerKwh)} · ★{' '}
                    {Number(s.ratingAvg || 0).toFixed(1)}
                  </p>
                  {(s.amenities || []).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {s.amenities.slice(0, 3).map((a) => (
                        <span
                          key={a}
                          className="rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-medium text-ink-muted dark:bg-surface-dark"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to={`/user/stations/${s.id}`} className="ui-btn ui-btn-primary !py-1.5 text-xs">
                    View & book
                  </Link>
                  {s.latitude != null && (
                    <a
                      className="ui-btn ui-btn-secondary !py-1.5 text-xs"
                      href={`https://www.openstreetmap.org/?mlat=${s.latitude}&mlon=${s.longitude}#map=16/${s.latitude}/${s.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Map
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>

          {stations.length > PAGE_SIZE && (
            <div className="flex items-center justify-between gap-2 border-t border-border pt-4 dark:border-border-dark">
              <button
                type="button"
                className="ui-btn ui-btn-secondary !py-1.5 text-xs"
                disabled={pageSafe <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <div className="flex flex-wrap items-center justify-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className={[
                      'h-8 min-w-8 rounded-lg px-2 text-xs font-semibold',
                      n === pageSafe
                        ? 'bg-accent text-white'
                        : 'text-ink-muted hover:bg-surface dark:hover:bg-surface-dark',
                    ].join(' ')}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="ui-btn ui-btn-secondary !py-1.5 text-xs"
                disabled={pageSafe >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
