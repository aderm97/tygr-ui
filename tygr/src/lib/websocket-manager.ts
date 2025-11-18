/**
 * WebSocket Manager
 * Manages Socket.io connections and real-time event broadcasting
 */

import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { ParsedEvent } from './event-parser'

export interface WebSocketManagerOptions {
  httpServer: HTTPServer
  cors?: {
    origin: string | string[]
    credentials?: boolean
  }
}

export class WebSocketManager {
  private io: SocketIOServer
  private connections = new Map<string, Socket>()

  constructor(options: WebSocketManagerOptions) {
    this.io = new SocketIOServer(options.httpServer, {
      cors: options.cors || {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        credentials: true,
      },
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    })

    this.setupEventHandlers()
    console.log('[WebSocketManager] Socket.io server initialized')
  }

  /**
   * Setup Socket.io event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      const clientId = socket.id
      console.log(`[WebSocketManager] Client connected: ${clientId}`)

      this.connections.set(clientId, socket)

      // Handle client subscribing to a hunt
      socket.on('subscribe:hunt', (huntId: string) => {
        console.log(`[WebSocketManager] Client ${clientId} subscribing to hunt ${huntId}`)
        socket.join(`hunt:${huntId}`)
      })

      // Handle client unsubscribing from a hunt
      socket.on('unsubscribe:hunt', (huntId: string) => {
        console.log(`[WebSocketManager] Client ${clientId} unsubscribing from hunt ${huntId}`)
        socket.leave(`hunt:${huntId}`)
      })

      // Handle disconnection
      socket.on('disconnect', (reason: string) => {
        console.log(`[WebSocketManager] Client disconnected: ${clientId}, reason: ${reason}`)
        this.connections.delete(clientId)
      })

      // Send connection acknowledgment
      socket.emit('connected', {
        clientId,
        timestamp: new Date().toISOString(),
      })
    })
  }

  /**
   * Broadcast hunt event to all subscribed clients
   */
  broadcastHuntEvent(huntId: string, event: ParsedEvent): void {
    const room = `hunt:${huntId}`
    const payload = {
      huntId,
      event: {
        type: event.type,
        timestamp: event.timestamp.toISOString(),
        data: event.data,
      },
    }

    this.io.to(room).emit('hunt:event', payload)
  }

  /**
   * Broadcast hunt status update
   */
  broadcastHuntStatus(huntId: string, status: {
    status: string
    progress: number
    phase?: string
    vulnerabilityCount?: number
    error?: string
  }): void {
    const room = `hunt:${huntId}`
    const payload = {
      huntId,
      ...status,
      timestamp: new Date().toISOString(),
    }

    this.io.to(room).emit('hunt:status', payload)
  }

  /**
   * Broadcast vulnerability found
   */
  broadcastVulnerability(huntId: string, vulnerability: {
    id: string
    title: string
    severity: string
    description: string
    affectedResource: string
  }): void {
    const room = `hunt:${huntId}`
    const payload = {
      huntId,
      vulnerability,
      timestamp: new Date().toISOString(),
    }

    this.io.to(room).emit('hunt:vulnerability', payload)
  }

  /**
   * Broadcast agent update
   */
  broadcastAgentUpdate(huntId: string, agent: {
    id: string
    name: string
    status: string
    type: string
  }): void {
    const room = `hunt:${huntId}`
    const payload = {
      huntId,
      agent,
      timestamp: new Date().toISOString(),
    }

    this.io.to(room).emit('hunt:agent', payload)
  }

  /**
   * Broadcast log message
   */
  broadcastLog(huntId: string, log: {
    level: 'info' | 'warn' | 'error' | 'debug'
    message: string
    data?: any
  }): void {
    const room = `hunt:${huntId}`
    const payload = {
      huntId,
      ...log,
      timestamp: new Date().toISOString(),
    }

    this.io.to(room).emit('hunt:log', payload)
  }

  /**
   * Get connected client count
   */
  getConnectionCount(): number {
    return this.connections.size
  }

  /**
   * Get clients subscribed to a hunt
   */
  async getHuntSubscribers(huntId: string): Promise<number> {
    const room = `hunt:${huntId}`
    const sockets = await this.io.in(room).fetchSockets()
    return sockets.length
  }

  /**
   * Close WebSocket server
   */
  async close(): Promise<void> {
    console.log('[WebSocketManager] Closing WebSocket server...')

    // Disconnect all clients
    this.io.disconnectSockets(true)

    // Close the server
    await new Promise<void>((resolve) => {
      this.io.close(() => {
        console.log('[WebSocketManager] WebSocket server closed')
        resolve()
      })
    })
  }

  /**
   * Get the Socket.io server instance
   */
  getServer(): SocketIOServer {
    return this.io
  }
}

// Singleton instance
let wsManagerInstance: WebSocketManager | null = null

/**
 * Initialize WebSocket manager (should be called once during server startup)
 */
export function initWebSocketManager(options: WebSocketManagerOptions): WebSocketManager {
  if (wsManagerInstance) {
    console.warn('[WebSocketManager] Manager already initialized, returning existing instance')
    return wsManagerInstance
  }

  wsManagerInstance = new WebSocketManager(options)
  return wsManagerInstance
}

/**
 * Get the WebSocket manager instance
 */
export function getWebSocketManager(): WebSocketManager {
  if (!wsManagerInstance) {
    throw new Error('WebSocketManager not initialized. Call initWebSocketManager first.')
  }

  return wsManagerInstance
}

/**
 * Check if WebSocket manager is initialized
 */
export function isWebSocketManagerInitialized(): boolean {
  return wsManagerInstance !== null
}
