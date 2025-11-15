/**
 * Individual Hunt API Routes
 * GET /api/hunts/[id] - Get hunt details
 * DELETE /api/hunts/[id] - Delete a hunt
 */

import { NextRequest, NextResponse } from 'next/server'
import { getHuntController } from '@/lib/hunt-controller'

const huntController = getHuntController()

/**
 * GET /api/hunts/[id]
 * Get hunt status and details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const hunt = await huntController.getHuntStatus(id)

    return NextResponse.json({
      success: true,
      data: {
        id: hunt.id,
        name: hunt.name,
        target: hunt.target,
        status: hunt.status,
        progress: hunt.progress,
        vulnerabilityCount: hunt.vulnerabilityCount,
        currentPhase: hunt.currentPhase,
        createdAt: hunt.createdAt.toISOString(),
        startedAt: hunt.startedAt?.toISOString(),
        completedAt: hunt.completedAt?.toISOString(),
        duration: hunt.duration,
        error: hunt.error,
      },
    })
  } catch (error) {
    console.error(`[API] Failed to get hunt:`, error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Hunt not found',
      },
      { status: 404 }
    )
  }
}

/**
 * DELETE /api/hunts/[id]
 * Delete a hunt
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    await huntController.deleteHunt(id)

    return NextResponse.json({
      success: true,
      message: `Hunt ${id} deleted successfully`,
    })
  } catch (error) {
    console.error(`[API] Failed to delete hunt:`, error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete hunt',
      },
      { status: 500 }
    )
  }
}
