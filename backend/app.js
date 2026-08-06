const path = require('path')
const fs = require('fs')
const express = require('express')
const cors = require('cors')
const env = require('./config/env')
const { corsOriginDelegate, applyCorsHeaders } = require('./config/cors')
const routes = require('./routes')

const app = express()

// Google Identity Services popup / postMessage — avoid strict COOP blocking
app.use((_req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
  res.removeHeader?.('Cross-Origin-Embedder-Policy')
  next()
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

// Production: serve Vite build from the same Web Service (Render-friendly)
const frontendDist = path.resolve(__dirname, '../frontend/dist')
const spaIndex = path.join(frontendDist, 'index.html')
if (fs.existsSync(spaIndex)) {
  app.use(express.static(frontendDist))
  app.get(/^(?!\/api).*/, (_req, res) => {
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
