/**
 * OpenStreetMap Nominatim helpers (no API key).
 * Be polite: one request at a time, proper User-Agent via browser is fine for demo.
 */

const NOMINATIM = 'https://nominatim.openstreetmap.org'

function pickAddressParts(result) {
  const a = result?.address || {}
  const road = [a.road, a.pedestrian, a.suburb, a.neighbourhood, a.hamlet]
    .filter(Boolean)
    .join(', ')
  const address =
    road ||
    a.display_name?.split(',').slice(0, 2).join(',').trim() ||
    result?.display_name ||
    ''
  const city =
    a.city || a.town || a.village || a.municipality || a.county || a.state_district || ''
  const state = a.state || a.region || ''
  const pincode = a.postcode || ''
  return {
    address: String(address).trim(),
    city: String(city).trim(),
    state: String(state).trim(),
    pincode: String(pincode).trim(),
    displayName: result?.display_name || '',
    lat: Number(result?.lat),
    lng: Number(result?.lon),
  }
}

export async function reverseGeocode(lat, lng) {
  const url = new URL(`${NOMINATIM}/reverse`)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lng))
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('zoom', '18')

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error('Could not look up that location')
  const data = await res.json()
  return pickAddressParts(data)
}

export async function searchPlaces(query, { limit = 6 } = {}) {
  const q = String(query || '').trim()
  if (q.length < 2) return []

  const url = new URL(`${NOMINATIM}/search`)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('q', q)
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('limit', String(limit))
  // Bias toward Andhra Pradesh / India for this product
  url.searchParams.set('countrycodes', 'in')

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error('Place search failed')
  const data = await res.json()
  return (Array.isArray(data) ? data : []).map(pickAddressParts).filter((p) => Number.isFinite(p.lat))
}
