const http = require('http')
const { Server } = require('socket.io')
const app = require('./app')
const connectDB = require('./config/db')
const env = require('./config/env')
const { registerSockets } = require('./sockets')

async function start() {
  await connectDB()

  const server = http.createServer(app)

  const allowedOrigins = String(env.CLIENT_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)

  const io = new Server(server, {
    path: '/socket.io/',
    // Render / proxies: tolerate slow pongs so clients don't drop on "ping timeout"
    pingInterval: 25000,
    pingTimeout: 60000,
    connectTimeout: 45000,
    cors: {
      origin(origin, callback) {
        if (!origin) return callback(null, true)
        if (!allowedOrigins.length || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          return callback(null, true)
        }
        return callback(null, false)
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    allowEIO3: true,
  })

  // Expose io for controllers/services in later tasks
  app.set('io', io)
  registerSockets(io)

  server.listen(env.PORT, () => {
    console.log(`[server] listening on http://localhost:${env.PORT}`)
  })
}

start().catch((err) => {
  console.error('[server] failed to start:', err)
  process.exit(1)
})
