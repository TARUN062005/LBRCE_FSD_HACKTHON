/**
 * Shared CORS origin checks for Express + Socket.IO.
 * Always allow local + known GridFleet hosts even if CLIENT_ORIGIN is misconfigured on Render.
 */

const BUILTIN = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'https://lbrce-fsd-hackthon-one.vercel.app',
  'https://lbrce-fsd-hackthon-1jkv.onrender.com',
]

function parseEnvOrigins(clientOrigin) {
  return String(clientOrigin || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
}

function isAllowedOrigin(origin, clientOriginEnv) {
  if (!origin) return true

  const listed = parseEnvOrigins(clientOriginEnv)
  if (listed.includes('*')) return true
  if (listed.includes(origin)) return true
  if (BUILTIN.includes(origin)) return true

  try {
    const host = new URL(origin).hostname
    if (host === 'lbrce-fsd-hackthon-one.vercel.app') return true
    // Hackathon: any Vercel / Render preview for this project
    if (host.endsWith('.vercel.app')) return true
    if (host.endsWith('.onrender.com') && host.includes('lbrce-fsd-hackthon')) return true
  } catch {
    return false
  }

  return false
}

function corsOriginDelegate(clientOriginEnv) {
  return function origin(origin, callback) {
    if (isAllowedOrigin(origin, clientOriginEnv)) {
      return callback(null, true)
    }
    console.warn(`[cors] blocked origin: ${origin}`)
    return callback(null, false)
  }
}

function applyCorsHeaders(req, res) {
  const origin = req.headers.origin
  if (origin && isAllowedOrigin(origin, require('./env').CLIENT_ORIGIN)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Vary', 'Origin')
  }
}

module.exports = {
  BUILTIN,
  parseEnvOrigins,
  isAllowedOrigin,
  corsOriginDelegate,
  applyCorsHeaders,
}
