import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Link } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'

const userIcon = L.divIcon({
  className: '',
  html: `<span style="display:block;width:14px;height:14px;border-radius:999px;background:#0f766e;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.35)"></span>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

const stationIcon = L.divIcon({
  className: '',
  html: `<span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:999px;background:#111827;color:#fff;font-size:12px;font-weight:700;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)">⚡</span>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -12],
})

function FitBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    if (!points?.length) return
    if (points.length === 1) {
      map.setView(points[0], 14)
      return
    }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 14 })
  }, [map, points])
  return null
}

/**
 * OpenStreetMap station discovery map.
 * props: userCoords {lat,lng}, stations[], selectedId, onSelect(station)
 */
export default function StationMap({
  userCoords,
  stations = [],
  selectedId,
  onSelect,
  height = 'min(70vh,560px)',
}) {
  const center = useMemo(() => {
    if (userCoords) return [userCoords.lat, userCoords.lng]
    const first = stations.find((s) => s.latitude != null && s.longitude != null)
    if (first) return [first.latitude, first.longitude]
    return [16.5062, 80.648] // Vijayawada fallback
  }, [userCoords, stations])

  const points = useMemo(() => {
    const pts = []
    if (userCoords) pts.push([userCoords.lat, userCoords.lng])
    for (const s of stations) {
      if (s.latitude != null && s.longitude != null) pts.push([s.latitude, s.longitude])
    }
    return pts
  }, [userCoords, stations])

  return (
    <div className="ui-card overflow-hidden p-0" style={{ height }}>
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom
        className="h-full w-full"
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        {userCoords && (
          <>
            <Marker position={[userCoords.lat, userCoords.lng]} icon={userIcon}>
              <Popup>You are here</Popup>
            </Marker>
            <Circle
              center={[userCoords.lat, userCoords.lng]}
              radius={20000}
              pathOptions={{ color: '#0f766e', fillColor: '#0f766e', fillOpacity: 0.06, weight: 1 }}
            />
          </>
        )}
        {stations.map((s) => {
          if (s.latitude == null || s.longitude == null) return null
          return (
            <Marker
              key={s.id}
              position={[s.latitude, s.longitude]}
              icon={stationIcon}
              eventHandlers={{
                click: () => onSelect?.(s),
              }}
              opacity={selectedId && selectedId !== s.id ? 0.65 : 1}
            >
              <Popup>
                <div className="min-w-[200px] space-y-1.5 text-sm">
                  <p className="font-semibold text-slate-900">{s.name}</p>
                  {s.distanceKm != null && (
                    <p className="text-xs text-slate-600">{s.distanceKm} km away</p>
                  )}
                  <p className="text-xs text-slate-700">
                    ${Number(s.pricePerKwh || 0).toFixed(2)}/kWh
                  </p>
                  <p className="text-xs text-slate-700">
                    {s.availableChargers ?? 0}/{s.chargerCount ?? 0} chargers available
                  </p>
                  <p className="text-xs text-slate-700">
                    ★ {Number(s.ratingAvg || 0).toFixed(1)}
                    {s.ratingCount ? ` (${s.ratingCount})` : ''}
                  </p>
                  <Link
                    to={`/user/stations/${s.id}`}
                    className="mt-1 inline-block rounded bg-teal-700 px-2.5 py-1.5 text-xs font-semibold text-white no-underline"
                  >
                    Book Now
                  </Link>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
