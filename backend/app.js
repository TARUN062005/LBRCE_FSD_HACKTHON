const path = require('path')
const fs = require('fs')
const express = require('express')
const cors = require('cors')
const env = require('./config/env')
const { corsOriginDelegate, applyCorsHeaders, isAllowedOrigin } = require('./config/cors')
const routes = require('./routes')

const app = express()

// Reflect CORS on every response early (covers crashes / HTML error pages)
app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin && isAllowedOrigin(origin, env.CLIENT_ORIGIN)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Vary', 'Origin')
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With',
    )
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    )
  }
  // Do not set COOP on API JSON — reduces Google GIS postMessage console noise from API hops
  if (!req.path.startsWith('/api')) {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
  }
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204)
  }
  return next()
})

app.use(
  cors({
    origin: corsOriginDelegate(env.CLIENT_ORIGIN),
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 204,
  }),
)

app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))

app.use('/api', routes)
app.use('/api', (req, res) => {
  applyCorsHeaders(req, res)
  res.status(404).json({ status: 'error', message: 'Not found' })
})

const frontendDist = path.resolve(__dirname, '../frontend/dist')
const spaIndex = path.join(frontendDist, 'index.html')
if (fs.existsSync(spaIndex)) {
  app.use(express.static(frontendDist))
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
    res.sendFile(spaIndex)
  })
} else {
  app.use((req, res) => {
    applyCorsHeaders(req, res)
    res.status(404).json({ status: 'error', message: 'Not found' })
  })
}

app.use((err, req, res, _next) => {
  console.error('[app] error:', err)
  applyCorsHeaders(req, res)
  return res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal server error',
  })
})

module.exports = app
