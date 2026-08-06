import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/axios'
import useGeolocation from '../../hooks/useGeolocation'
import StationMap from '../../components/map/StationMap'
import EmptyState from '../../components/EmptyState'
import ErrorState from '../../components/ErrorState'
import SkeletonCard from '../../components/SkeletonCard'
import { formatRate } from '../../lib/money'

const PAGE_SIZE = 5

export default function MapDiscover() {
  const { coords, status, error: geoError, request } = useGeolocation()
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [q, setQ] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [chargerType, setChargerType] = useState('')
  const [sort, setSort] = useState('distance')
  const [page, setPage] = useState(1)

  const loadNearby = useCallback(async () => {
    if (!coords) return
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/stations/nearby', {
        params: {
          lat: coords.lat,
          lng: coords.lng,
          radiusKm: 20,
          maxPrice: maxPrice || undefined,
          chargerType: chargerType || undefined,
          sort,
        },
      })
      let list = data.data || []
      if (q.trim()) {
        const needle = q.trim().toLowerCase()
        list = list.filter(
          (s) =>
            s.name?.toLowerCase().includes(needle) ||
            s.address?.toLowerCase().includes(needle) ||
            s.city?.toLowerCase().includes(needle),
        )
      }
      setStations(list)
      setPage(1)
      if (list[0]) setSelected(list[0])
      else setSelected(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load nearby stations')
    } finally {
      setLoading(false)
    }
  }, [coords, maxPrice, chargerType, sort, q])

  useEffect(() => {
    if (status === 'idle') request()
  }, [status, request])

  useEffect(() => {
    loadNearby()
  }, [loadNearby])

  const totalPages = Math.max(1, Math.ceil(stations.length / PAGE_SIZE))
  const pageSafe = Math.min(page, totalPages)
  const pageStations = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE
    return stations.slice(start, start + PAGE_SIZE)
  }, [stations, pageSafe])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="page-title">Nearby chargers</h2>
          <p className="page-desc">Live map of stations within 20 km of you.</p>
        </div>
        {coords && (
          <p className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
            {stations.length} station{stations.length === 1 ? '' : 's'} found
          </p>
        )}
      </div>

      {(status === 'idle' || status === 'pending' || status === 'denied') && (
        <div className="ui-card flex flex-wrap items-center justify-between gap-3 border-accent/20 bg-gradient-to-r from-teal-50/80 to-white p-4 dark:from-teal-950/30 dark:to-surface-dark">
          <div>
            <p className="text-sm font-semibold text-ink dark:text-white">Share your location</p>
            <p className="text-sm text-ink-muted">
              {status === 'pending'
                ? 'Waiting for permission…'
                : geoError || 'We only use it to find chargers near you.'}
            </p>
          </div>
          <button type="button" className="ui-btn ui-btn-primary" onClick={request}>
            {status === 'denied' ? 'Try again' : 'Allow location'}
          </button>
        </div>
      )}

      <div className="ui-card space-y-3 p-3 sm:p-4">
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-muted">
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            className="ui-input w-full !pl-10"
            placeholder="Search by station, street, or city…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search stations"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            className="ui-input w-[7.5rem]"
            type="number"
            step="1"
            min="0"
            placeholder="Max ₹/kWh"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            aria-label="Max price"
          />
          <select
            className="ui-input w-36"
            value={chargerType}
            onChange={(e) => setChargerType(e.target.value)}
            aria-label="Charger type"
          >
            <option value="">All connectors</option>
            <option value="Type2">Type2</option>
            <option value="CCS">CCS</option>
            <option value="DC">DC</option>
            <option value="AC">AC</option>
            <option value="CHAdeMO">CHAdeMO</option>
          </select>
          <select
            className="ui-input w-40"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort"
          >
            <option value="distance">Nearest first</option>
            <option value="price">Lowest price</option>
            <option value="availability">Most available</option>
            <option value="rating">Top rated</option>
          </select>
          <button type="button" className="ui-btn ui-btn-secondary ml-auto" onClick={loadNearby}>
            Refresh
          </button>
        </div>
      </div>

      {error ? <ErrorState message={error} onRetry={loadNearby} /> : null}

      {coords ? (
        <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
          <StationMap
            userCoords={coords}
            stations={stations}
            selectedId={selected?.id}
            onSelect={(s) => {
              setSelected(s)
              const idx = stations.findIndex((x) => x.id === s.id)
              if (idx >= 0) setPage(Math.floor(idx / PAGE_SIZE) + 1)
            }}
            height="min(72vh,620px)"
          />

          <div className="flex min-h-0 flex-col">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-ink dark:text-white">Station list</h3>
              {stations.length > 0 && (
                <span className="text-xs text-ink-muted">
                  {(pageSafe - 1) * PAGE_SIZE + 1}–
                  {Math.min(pageSafe * PAGE_SIZE, stations.length)} of {stations.length}
                </span>
              )}
            </div>

            <div className="flex-1 space-y-2.5">
              {loading ? (
                <SkeletonCard rows={4} />
              ) : !stations.length ? (
                <EmptyState
                  title="No stations nearby"
                  description="Nothing within 20 km matches your filters. Try clearing search or moving closer to Mylavaram / Vijayawada."
                />
              ) : (
                pageStations.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelected(s)}
                    className={[
                      'ui-card ui-card-hover w-full p-3.5 text-left transition',
                      selected?.id === s.id
                        ? 'border-accent ring-1 ring-accent/30'
                        : '',
                    ].join(' ')}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink dark:text-white">{s.name}</p>
                        <p className="truncate text-xs text-ink-muted">{s.address || s.location}</p>
                      </div>
                      <span className="shrink-0 rounded-md bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                        {s.distanceKm != null ? `${s.distanceKm} km` : '—'}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-ink-muted">
                      {s.availableChargers}/{s.chargerCount} free · {formatRate(s.pricePerKwh)} · ★{' '}
                      {Number(s.ratingAvg || 0).toFixed(1)}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <Link
                        to={`/user/stations/${s.id}`}
                        className="ui-btn ui-btn-primary !py-1.5 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Book Now
                      </Link>
                      {s.latitude != null && (
                        <a
                          className="ui-btn ui-btn-secondary !py-1.5 text-xs"
                          href={`https://www.openstreetmap.org/directions?from=${coords.lat},${coords.lng}&to=${s.latitude},${s.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Navigate
                        </a>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            {stations.length > PAGE_SIZE && (
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3 dark:border-border-dark">
                <button
                  type="button"
                  className="ui-btn ui-btn-secondary !py-1.5 text-xs"
                  disabled={pageSafe <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
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
                      aria-label={`Page ${n}`}
                      aria-current={n === pageSafe ? 'page' : undefined}
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
                  Next 5
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <EmptyState
          title="Enable location to open the map"
          description="Your coordinates stay on this device and are only used to query nearby stations."
          action={
            <button type="button" className="ui-btn ui-btn-primary" onClick={request}>
              Allow location
            </button>
          }
        />
      )}
    </section>
  )
}
