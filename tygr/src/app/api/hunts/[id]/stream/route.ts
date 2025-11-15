import { NextRequest } from 'next/server'
import { HuntEventCapture } from '@/lib/event-capture'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const huntId = params.id

  try {
    // Get the event capture instance
    const eventCapture = global.huntEventCaptures?.get(huntId)
    if (!eventCapture) {
      return new Response('Hunt not found or not running', { status: 404 })
    }

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        
        // Send buffered vulnerability events first
        const bufferedEvents = eventCapture.getBufferedEvents()
        console.log(`[SSE] Sending ${bufferedEvents.length} buffered events for hunt ${huntId}`)
        
        bufferedEvents.forEach(event => {
          controller.enqueue(
            encoder.encode(`event: vulnerability\ndata: ${JSON.stringify(event)}\n\n`)
          )
        })
        
        // Listen for new vulnerability events
        const vulnerabilityHandler = (event: any) => {
          try {
            controller.enqueue(
              encoder.encode(`event: vulnerability\ndata: ${JSON.stringify(event)}\n\n`)
            )
          } catch (error) {
            console.error('Failed to send event:', error)
          }
        }
        
        // Listen for log events
        const logHandler = (event: any) => {
          try {
            controller.enqueue(
              encoder.encode(`event: log\ndata: ${JSON.stringify(event)}\n\n`)
            )
          } catch (error) {
            console.error('Failed to send log event:', error)
          }
        }
        
        eventCapture.on('vulnerability', vulnerabilityHandler)
        eventCapture.on('log', logHandler)
        
        // Handle connection close
        request.signal.addEventListener('abort', () => {
          console.log(`[SSE] Client disconnected from hunt ${huntId}`)
          eventCapture.off('vulnerability', vulnerabilityHandler)
          eventCapture.off('log', logHandler)
          controller.close()
        })
        
        // Send initial connection confirmation
        controller.enqueue(
          encoder.encode(`event: connected\ndata: ${JSON.stringify({ huntId, status: 'connected' })}\n\n`)
        )
      },
      cancel() {
        console.log(`[SSE] Stream cancelled for hunt ${huntId}`)
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  } catch (error) {
    console.error('Failed to create hunt stream:', error)
    return new Response('Failed to create hunt stream', { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const huntId = params.id

  try {
    // Get and stop the event capture
    const eventCapture = global.huntEventCaptures?.get(huntId)
    if (eventCapture) {
      eventCapture.stop()
      global.huntEventCaptures?.delete(huntId)
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Hunt terminated successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Failed to terminate hunt:', error)
    return new Response(JSON.stringify(
      { success: false, error: 'Failed to terminate hunt' }
    ), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}