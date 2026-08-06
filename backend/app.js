const path = require('path')
const fs = require('fs')
const express = require('express')
const cors = require('cors')
const env = require('./config/env')
const routes = require('./routes')

const app = express()

const clientOrigins = String(env.CLIENT_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin / non-browser tools (no Origin header)
      if (!origin) return callback(null, true)
      if (clientOrigins.includes('*')) return callback(null, true)
      if (clientOrigins.length === 0 || clientOrigins.includes(origin)) {
        return callback(null, true)
      }
      return callback(null, false)
    },
    credentials: true,
  }),
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/api', routes)
app.use('/api', (_req, res) => {
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
  app.use((_req, res) => {
    res.status(404).json({ status: 'error', message: 'Not found' })
  })
}

app.use((err, _req, res, _next) => {
  console.error('[app] error:', err)
  return res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal server error',
  })
})

module.exports = app
