const http = require('http')
const { Server } = require('socket.io')
const app = require('./app')
const connectDB = require('./config/db')
const env = require('./config/env')
const { corsOriginDelegate } = require('./config/cors')
const { registerSockets } = require('./sockets')

async function start() {
  await connectDB()

  const server = http.createServer(app)

  const io = new Server(server, {
    path: '/socket.io/',
    // Render / proxies: tolerate slow pongs so clients don't drop on "ping timeout"
    pingInterval: 25000,
    pingTimeout: 60000,
    connectTimeout: 45000,
    cors: {
      origin: corsOriginDelegate(env.CLIENT_ORIGIN),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    allowEIO3: true,
  })

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
