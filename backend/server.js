const http = require('http')
const { Server } = require('socket.io')
const app = require('./app')
const connectDB = require('./config/db')
const env = require('./config/env')
const { registerSockets } = require('./sockets')

async function start() {
  await connectDB()

  const server = http.createServer(app)

  const io = new Server(server, {
    cors: {
      origin: env.CLIENT_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
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
