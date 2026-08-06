import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'gridfleet_user_location'

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Number.isFinite(parsed?.lat) && Number.isFinite(parsed?.lng)) return parsed
  } catch {
    /* ignore */
  }
  return null
}

/**
 * Browser Geolocation helper — visual UX only wraps the same permission API.
 */
export default function useGeolocation() {
  const [coords, setCoords] = useState(() => readStored())
  const [status, setStatus] = useState(() => (readStored() ? 'granted' : 'idle'))
  const [error, setError] = useState('')

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('unsupported')
      setError('Geolocation is not supported in this browser')
      return
    }
    setStatus('pending')
    setError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }
        setCoords(next)
        setStatus('granted')
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      },
      (err) => {
        setStatus('denied')
        setError(err.message || 'Location permission denied')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    )
  }, [])

  useEffect(() => {
    if (!coords && status === 'idle') {
      // soft prompt on mount for returning users without stored coords
    }
  }, [coords, status])

  return { coords, status, error, request, setCoords }
}
