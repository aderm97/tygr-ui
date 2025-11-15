/**
 * React Hook for Hunt Real-time Streaming
 * Connects to Socket.io and receives hunt events
 */

import { useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

export interface StrixEvent {
  type: string
  timestamp: string
  huntId: string
  sequenceNumber?: number
  data: Record<string, any>
}

export interface HuntStreamState {
  socket: Socket | null
  events: StrixEvent[]
  isConnected: boolean
  error: string | null
}

export interface UseHuntStreamOptions {
  autoConnect?: boolean
  onEvent?: (event: StrixEvent) => void
  onStatus?: (status: string) => void
  onError?: (error: string) => void
}

export function useHuntStream(huntId: string, options: UseHuntStreamOptions = {}) {
  const { autoConnect = true, onEvent, onStatus, onError } = options

  const [socket, setSocket] = useState<Socket | null>(null)
  const [events, setEvents] = useState<StrixEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reconnectAttempts = useRef(0)

  useEffect(() => {
    if (!autoConnect || !huntId) return

    // Initialize socket connection
    const newSocket = io({
      path: '/api/socket',
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
    })

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log(`[Socket] Connected to server: ${newSocket.id}`)
      setIsConnected(true)
      setError(null)
      reconnectAttempts.current = 0

      // Subscribe to hunt updates
      newSocket.emit('subscribe:hunt', huntId)
    })

    newSocket.on('subscribed', ({ huntId: subscribedHuntId }) => {
      console.log(`[Socket] Subscribed to hunt: ${subscribedHuntId}`)
    })

    newSocket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: ${reason}`)
      setIsConnected(false)

      if (reason === 'io server disconnect') {
        // Server initiated disconnect, reconnect manually
        newSocket.connect()
      }
    })

    newSocket.on('connect_error', (err) => {
      console.error(`[Socket] Connection error:`, err)
      reconnectAttempts.current++
      setError(`Connection error (attempt ${reconnectAttempts.current}/5)`)

      if (onError) {
        onError(err.message)
      }
    })

    // Hunt event handlers
    newSocket.on('hunt:event', (event: StrixEvent) => {
      console.log(`[Socket] Received event:`, event.type)
      setEvents((prev) => [...prev, event])

      if (onEvent) {
        onEvent(event)
      }
    })

    newSocket.on('hunt:events', (eventBatch: StrixEvent[]) => {
      console.log(`[Socket] Received ${eventBatch.length} events`)
      setEvents((prev) => [...prev, ...eventBatch])

      if (onEvent) {
        eventBatch.forEach(onEvent)
      }
    })

    newSocket.on('hunt:status', ({ status }) => {
      console.log(`[Socket] Hunt status changed: ${status}`)

      if (onStatus) {
        onStatus(status)
      }
    })

    newSocket.on('hunt:error', ({ error: errorMsg, stack }) => {
      console.error(`[Socket] Hunt error:`, errorMsg)
      setError(errorMsg)

      if (onError) {
        onError(errorMsg)
      }
    })

    // Ping/pong for connection health
    const pingInterval = setInterval(() => {
      if (newSocket.connected) {
        newSocket.emit('ping')
      }
    }, 30000)

    newSocket.on('pong', ({ timestamp }) => {
      const latency = Date.now() - timestamp
      console.log(`[Socket] Pong received, latency: ${latency}ms`)
    })

    setSocket(newSocket)

    // Cleanup
    return () => {
      clearInterval(pingInterval)
      newSocket.emit('unsubscribe:hunt', huntId)
      newSocket.close()
    }
  }, [huntId, autoConnect, onEvent, onStatus, onError])

  // Helper: Get events by type
  const getEventsByType = (type: string): StrixEvent[] => {
    return events.filter((e) => e.type === type)
  }

  // Helper: Get latest event
  const getLatestEvent = (): StrixEvent | null => {
    return events.length > 0 ? events[events.length - 1] : null
  }

  // Helper: Clear events
  const clearEvents = () => {
    setEvents([])
  }

  return {
    socket,
    events,
    isConnected,
    error,
    getEventsByType,
    getLatestEvent,
    clearEvents,
  }
}
