import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const pinIcon = L.divIcon({
  className: '',
  html: `<span style="display:block;width:22px;height:22px;border-radius:999px 999px 0 999px;transform:rotate(-45deg);background:#0f766e;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)"></span>`,
  iconSize: [22, 22],
  iconAnchor: [11, 22],
})

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
 */
export default function LocationPicker({ value, onChange, height = 320 }) {
  const center = useMemo(() => {
    if (value?.lat != null) return [value.lat, value.lng]
    return [17.385, 78.4867]
  }, [value])

  const pos = value?.lat != null ? value : { lat: center[0], lng: center[1] }

  return (
    <div className="ui-card overflow-hidden p-0" style={{ height }}>
      <MapContainer center={center} zoom={13} className="h-full w-full" style={{ height: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <DraggablePin position={pos} onChange={onChange} />
      </MapContainer>
    </div>
  )
}
