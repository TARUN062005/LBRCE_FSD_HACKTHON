import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const pinIcon = L.divIcon({
  className: '',
  html: `<span style="display:block;width:22px;height:22px;border-radius:999px 999px 0 999px;transform:rotate(-45deg);background:#0f766e;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)"></span>`,
  iconSize: [22, 22],
  iconAnchor: [11, 22],
})

const youIcon = L.divIcon({
  className: '',
  html: `<span style="display:block;width:14px;height:14px;border-radius:999px;background:#2563eb;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.35)"></span>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

function Recenter({ lat, lng, zoom = 15 }) {
  const map = useMap()
  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    map.setView([lat, lng], zoom, { animate: true })
  }, [map, lat, lng, zoom])
  return null
}

function DraggablePin({ position, onChange }) {
  const [pos, setPos] = useState(position)

  useEffect(() => {
    setPos(position)
  }, [position])

  useMapEvents({
    click(e) {
      const next = { lat: e.latlng.lat, lng: e.latlng.lng }
      setPos(next)
      onChange?.(next)
    },
  })

  return (
    <Marker
      position={[pos.lat, pos.lng]}
      icon={pinIcon}
      draggable
      eventHandlers={{
        dragend: (e) => {
          const ll = e.target.getLatLng()
          const next = { lat: ll.lat, lng: ll.lng }
          setPos(next)
          onChange?.(next)
        },
      }}
    />
  )
}

/**
 * Tenant location picker — click map or drag marker.
 * value: { lat, lng }
 * userLocation: optional { lat, lng } for "you are here"
 */
export default function LocationPicker({
  value,
  onChange,
  userLocation = null,
  height = 320,
}) {
  const center = useMemo(() => {
    if (value?.lat != null) return [value.lat, value.lng]
    if (userLocation?.lat != null) return [userLocation.lat, userLocation.lng]
    return [16.5062, 80.648]
  }, [value, userLocation])

  const pos = value?.lat != null ? value : { lat: center[0], lng: center[1] }

  return (
    <div
      className="overflow-hidden rounded-2xl border border-border shadow-sm dark:border-border-dark"
      style={{ height }}
    >
      <MapContainer center={center} zoom={14} className="h-full w-full" style={{ height: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter lat={pos.lat} lng={pos.lng} />
        {userLocation?.lat != null && (
          <>
            <Marker position={[userLocation.lat, userLocation.lng]} icon={youIcon} />
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={400}
              pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.08, weight: 1 }}
            />
          </>
        )}
        <DraggablePin position={pos} onChange={onChange} />
      </MapContainer>
    </div>
  )
}
