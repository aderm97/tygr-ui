/**
 * Hunt API Routes
 * POST /api/hunts - Start a new hunt
 * GET /api/hunts - List all hunts
 * DELETE /api/hunts/[id] - Delete a hunt
 */

import { NextRequest, NextResponse } from 'next/server'
import { getHuntController, HuntConfiguration } from '@/lib/hunt-controller'
import { HuntConfig } from '@/types'

const huntController = getHuntController()

/**
 * POST /api/hunts
 * Start a new security hunt
 */
export async function POST(request: NextRequest) {
  try {
    const config: HuntConfig = await request.json()

    console.log('[API] Received hunt config from UI:', JSON.stringify(config, null, 2))

    // Validate basic requirements
    if (!config.targets || config.targets.length === 0) {
      console.error('[API] Validation failed: No targets specified')
      return NextResponse.json(
        { success: false, error: 'No targets specified' },
        { status: 400 }
      )
    }

    // Convert UI config to HuntConfiguration
    const huntConfig: HuntConfiguration = {
      name: config.name || `Hunt ${new Date().toISOString()}`,
      target: config.targets[0]?.value || '',
      targetType: mapTargetType(config.targets[0]?.type),
      instruction: config.instruction,
      profile: config.profile || 'quick',
      env: {
        // LLM provider from config or settings
        ...(config.llmProvider && { STRIX_LLM: config.llmProvider }),
      },
    }

    console.log('[API] Starting hunt with configuration:', huntConfig)

    // Start hunt using HuntController
    const hunt = await huntController.startHunt(huntConfig)

    console.log(`[API] Hunt ${hunt.id} started successfully`)

    return NextResponse.json({
      success: true,
      data: {
        id: hunt.id,
        name: hunt.name,
        target: hunt.target,
        status: hunt.status,
        progress: hunt.progress,
        vulnerabilityCount: hunt.vulnerabilityCount,
        startedAt: hunt.startedAt?.toISOString(),
        createdAt: hunt.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('[API] Failed to start hunt:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start hunt',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/hunts
 * List all hunts (with optional filtering)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    let hunts

    if (activeOnly) {
      hunts = await huntController.listActiveHunts()
    } else {
      hunts = await huntController.listAllHunts(limit, offset)
    }

    return NextResponse.json({
      success: true,
      data: hunts.map((hunt) => ({
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
      })),
    })
  } catch (error) {
    console.error('[API] Failed to get hunts:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get hunts',
      },
      { status: 500 }
    )
  }
}

/**
 * Helper: Map UI target type to internal target type
 */
function mapTargetType(uiType?: string): 'url' | 'repository' | 'directory' | 'domain' | 'ip' {
  const typeMap: Record<string, HuntConfiguration['targetType']> = {
    web: 'url',
    url: 'url',
    repo: 'repository',
    repository: 'repository',
    dir: 'directory',
    directory: 'directory',
    domain: 'domain',
    ip: 'ip',
  }

  return typeMap[uiType?.toLowerCase() || ''] || 'url'
}
