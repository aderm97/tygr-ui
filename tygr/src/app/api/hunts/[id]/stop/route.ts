/**
 * Hunt Control API - Stop a running hunt
 * POST /api/hunts/[id]/stop
 */

import { NextRequest, NextResponse } from 'next/server'
import { getHuntController } from '@/lib/hunt-controller'

const huntController = getHuntController()

/**
 * POST /api/hunts/[id]/stop
 * Stop a running hunt
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    await huntController.stopHunt(id)

    return NextResponse.json({
      success: true,
      message: `Hunt ${id} stopped successfully`,
    })
  } catch (error) {
    console.error(`[API] Failed to stop hunt:`, error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop hunt',
      },
      { status: 500 }
    )
  }
}
