import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/axios'
import useGeolocation from '../../hooks/useGeolocation'
import StationMap from '../../components/map/StationMap'
import EmptyState from '../../components/EmptyState'
import ErrorState from '../../components/ErrorState'
import SkeletonCard from '../../components/SkeletonCard'

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
      if (list[0]) setSelected(list[0])
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

  return (
    <section className="space-y-5">
      <div>
        <h2 className="page-title">Find chargers near you</h2>
        <p className="page-desc">
          Allow location to see stations within 20 km on the map.
        </p>
      </div>

      {(status === 'idle' || status === 'pending' || status === 'denied') && (
        <div className="ui-card flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-semibold text-ink dark:text-white">Location access</p>
            <p className="text-sm text-ink-muted">
              {status === 'pending'
                ? 'Waiting for permission…'
                : geoError || 'We use your location only to find nearby stations.'}
            </p>
          </div>
          <button type="button" className="ui-btn ui-btn-primary" onClick={request}>
            {status === 'denied' ? 'Try again' : 'Allow location'}
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          className="ui-input max-w-xs flex-1"
          placeholder="Search stations…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search stations"
        />
        <input
          className="ui-input w-28"
          type="number"
          step="0.01"
          min="0"
          placeholder="Max $/kWh"
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
          <option value="">All types</option>
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
          <option value="distance">Sort: distance</option>
          <option value="price">Sort: price</option>
          <option value="availability">Sort: availability</option>
          <option value="rating">Sort: rating</option>
        </select>
        <button type="button" className="ui-btn ui-btn-secondary" onClick={loadNearby}>
          Refresh
        </button>
      </div>

      {error ? <ErrorState message={error} onRetry={loadNearby} /> : null}

      {coords ? (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <StationMap
            userCoords={coords}
            stations={stations}
            selectedId={selected?.id}
            onSelect={setSelected}
          />
          <div className="space-y-3">
            {loading ? (
              <SkeletonCard rows={4} />
            ) : !stations.length ? (
              <EmptyState
                title="No stations nearby"
                description="No approved stations within 20 km. Try moving closer to Mylavaram or Vijayawada, or ask a charging company to list their site."
              />
            ) : (
              stations.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelected(s)}
                  className={[
                    'ui-card ui-card-hover w-full p-4 text-left',
                    selected?.id === s.id ? 'border-accent' : '',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-ink dark:text-white">{s.name}</p>
                      <p className="text-xs text-ink-muted">{s.address || s.location}</p>
                    </div>
                    <span className="text-xs font-semibold text-accent">
                      {s.distanceKm != null ? `${s.distanceKm} km` : ''}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-ink-muted">
                    {s.availableChargers}/{s.chargerCount} free · ${Number(s.pricePerKwh || 0).toFixed(2)}/kWh · ★{' '}
                    {Number(s.ratingAvg || 0).toFixed(1)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      to={`/user/stations/${s.id}`}
                      className="ui-btn ui-btn-primary !py-1.5 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View & book
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
