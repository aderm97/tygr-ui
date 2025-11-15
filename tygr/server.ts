/**
 * Custom Next.js Server with Socket.io
 * This wraps the Next.js server to enable Socket.io functionality
 */

import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { initializeServer } from './src/lib/server-init'

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

// Initialize Next.js
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  // Create HTTP server
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

  // Initialize Socket.io and other server components
  initializeServer(httpServer)

  // Start listening
  httpServer.listen(port, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ████████╗██╗   ██╗ ██████╗ ██████╗                        ║
║   ╚══██╔══╝╚██╗ ██╔╝██╔════╝ ██╔══██╗                       ║
║      ██║    ╚████╔╝ ██║  ███╗██████╔╝                       ║
║      ██║     ╚██╔╝  ██║   ██║██╔══██╗                       ║
║      ██║      ██║   ╚██████╔╝██║  ██║                       ║
║      ╚═╝      ╚═╝    ╚═════╝ ╚═╝  ╚═╝                       ║
║                                                               ║
║   TYGR Security Agent - CLI-React Wrapper                   ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

🚀 Server ready on http://${hostname}:${port}
🔌 Socket.io ready on ws://${hostname}:${port}/api/socket
🗄️  Database: ${process.env.DATABASE_URL?.split('@')[1] || 'Not configured'}
💾 Redis: ${process.env.REDIS_URL || 'Not configured'}
🐳 Docker: ${process.env.DOCKER_HOST || 'Not configured'}

Environment: ${process.env.NODE_ENV || 'development'}
    `)
  })

  // Graceful shutdown
  const gracefulShutdown = async () => {
    console.log('\n⏸️  Shutting down gracefully...')

    httpServer.close(() => {
      console.log('✅ HTTP server closed')
      process.exit(0)
    })

    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('❌ Could not close connections in time, forcefully shutting down')
      process.exit(1)
    }, 10000)
  }

  process.on('SIGTERM', gracefulShutdown)
  process.on('SIGINT', gracefulShutdown)
})
