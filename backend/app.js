const express = require('express')
const cors = require('cors')
const env = require('./config/env')
const routes = require('./routes')

const app = express()

app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  }),
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/api', routes)

app.use((_req, res) => {
  res.status(404).json({ status: 'error', message: 'Not found' })
})

app.use((err, _req, res, _next) => {
  console.error('[app] error:', err)
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal server error',
  })
})

module.exports = app
