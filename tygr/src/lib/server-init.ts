/**
 * Server Initialization
 * Sets up WebSocket server and hunt worker
 * Called once when the Next.js server starts
 */

import { Server as HTTPServer } from 'http'
import { initWebSocketManager } from './websocket-manager'
import { createHuntWorker, shutdownWorker } from '../workers/hunt-worker'
import { Worker } from 'bullmq'

let isInitialized = false
let worker: Worker | null = null

/**
 * Initialize server components
 * Should be called once during server startup
 */
export async function initializeServer(httpServer: HTTPServer): Promise<void> {
  if (isInitialized) {
    console.log('[ServerInit] Server already initialized')
    return
  }

  console.log('[ServerInit] Initializing TYGR server...')

  try {
    // Initialize WebSocket manager
    console.log('[ServerInit] Initializing WebSocket manager...')
    initWebSocketManager({
      httpServer,
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        credentials: true,
      },
    })
    console.log('[ServerInit] WebSocket manager initialized')

    // Start hunt worker
    console.log('[ServerInit] Starting hunt worker...')
    worker = createHuntWorker()
    console.log('[ServerInit] Hunt worker started')

    isInitialized = true
    console.log('[ServerInit] TYGR server initialized successfully')
  } catch (error) {
    console.error('[ServerInit] Failed to initialize server:', error)
    throw error
  }
}

/**
 * Shutdown server components
 * Called during graceful shutdown
 */
export async function shutdownServer(): Promise<void> {
  if (!isInitialized) {
    return
  }

  console.log('[ServerInit] Shutting down TYGR server...')

  try {
    // Shutdown worker
    if (worker) {
      console.log('[ServerInit] Shutting down hunt worker...')
      await shutdownWorker(worker)
      worker = null
    }

    isInitialized = false
    console.log('[ServerInit] TYGR server shutdown complete')
  } catch (error) {
    console.error('[ServerInit] Error during shutdown:', error)
  }
}

/**
 * Check if server is initialized
 */
export function isServerInitialized(): boolean {
  return isInitialized
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[ServerInit] Received SIGTERM, shutting down...')
  await shutdownServer()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('[ServerInit] Received SIGINT, shutting down...')
  await shutdownServer()
  process.exit(0)
})
