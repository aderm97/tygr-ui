/**
 * Bull Board API Route
 * Provides queue monitoring UI
 * Access at: /api/admin/queue
 */

import { NextRequest, NextResponse } from 'next/server'
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ExpressAdapter } from '@bull-board/express'
import { huntQueue, getQueueStats } from '@/lib/queue/hunt-queue'

// Create Bull Board server adapter
const serverAdapter = new ExpressAdapter()
serverAdapter.setBasePath('/api/admin/queue')

// Initialize Bull Board
createBullBoard({
  queues: [new BullMQAdapter(huntQueue)],
  serverAdapter,
})

/**
 * GET /api/admin/queue
 * Return queue statistics (or redirect to Bull Board UI in production)
 */
export async function GET(request: NextRequest) {
  try {
    const stats = await getQueueStats()

    return NextResponse.json({
      success: true,
      data: stats,
      message: 'For detailed queue monitoring, use Bull Board UI',
      bullBoardUrl: '/api/admin/queue/ui',
    })
  } catch (error) {
    console.error('[QueueAPI] Failed to get queue stats:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get queue stats',
      },
      { status: 500 }
    )
  }
}
