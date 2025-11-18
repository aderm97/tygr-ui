/**
 * Custom Next.js Server
 * Required for Socket.io WebSocket support
 */

import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { initializeServer } from './src/lib/server-init'

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOST || 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(async () => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('Internal server error')
    }
  })

  // Initialize TYGR server components (WebSocket + Worker)
  try {
    await initializeServer(httpServer)
  } catch (error) {
    console.error('Failed to initialize TYGR server:', error)
    process.exit(1)
  }

  httpServer
    .once('error', (err: Error) => {
      console.error('Server error:', err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
      console.log('> TYGR Security Agent is running')
      console.log('> WebSocket server: Ready')
      console.log('> Hunt worker: Ready')
    })

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing server...')
    httpServer.close(() => {
      console.log('HTTP server closed')
      process.exit(0)
    })
  })

  process.on('SIGINT', async () => {
    console.log('SIGINT received, closing server...')
    httpServer.close(() => {
      console.log('HTTP server closed')
      process.exit(0)
    })
  })
})
