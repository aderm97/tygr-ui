/**
 * Hunt Controller
 * Manages hunt lifecycle: creation, execution, monitoring, and completion
 */

import { PrismaClient, Hunt, Agent, Vulnerability } from '@prisma/client'
import { enqueueHunt, getHuntJobStatus, stopHuntJob, HuntJobData } from './queue/hunt-queue'
import { getWebSocketManager, isWebSocketManagerInitialized } from './websocket-manager'

// Initialize Prisma client
const prisma = new PrismaClient()

export interface HuntConfiguration {
  name: string
  target: string
  targetType: 'url' | 'repository' | 'directory' | 'domain' | 'ip'
  instruction?: string
  profile: string
  env?: Record<string, string>
}

export interface HuntWithRelations extends Hunt {
  agents?: Agent[]
  vulnerabilities?: Vulnerability[]
}

export class HuntController {
  /**
   * Start a new hunt
   */
  async startHunt(config: HuntConfiguration): Promise<Hunt> {
    console.log('[HuntController] Starting new hunt:', config.name)

    // Create hunt record in database
    const hunt = await prisma.hunt.create({
      data: {
        name: config.name,
        target: config.target,
        targetType: config.targetType,
        instruction: config.instruction,
        profile: config.profile,
        status: 'pending',
        progress: 0,
      },
    })

    console.log(`[HuntController] Hunt created with ID: ${hunt.id}`)

    try {
      // Enqueue the hunt job
      const jobData: HuntJobData = {
        huntId: hunt.id,
        name: config.name,
        target: config.target,
        targetType: config.targetType,
        instruction: config.instruction,
        profile: config.profile,
        env: config.env,
      }

      await enqueueHunt(jobData)

      console.log(`[HuntController] Hunt ${hunt.id} enqueued successfully`)

      // Broadcast initial status if WebSocket is available
      if (isWebSocketManagerInitialized()) {
        const wsManager = getWebSocketManager()
        wsManager.broadcastHuntStatus(hunt.id, {
          status: 'pending',
          progress: 0,
          vulnerabilityCount: 0,
        })
      }

      return hunt
    } catch (error) {
      // Update hunt status to failed if enqueueing fails
      await prisma.hunt.update({
        where: { id: hunt.id },
        data: {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Failed to enqueue hunt',
          errorStack: error instanceof Error ? error.stack : undefined,
        },
      })

      throw error
    }
  }

  /**
   * Stop a running hunt
   */
  async stopHunt(huntId: string): Promise<Hunt> {
    console.log(`[HuntController] Stopping hunt: ${huntId}`)

    const hunt = await prisma.hunt.findUnique({ where: { id: huntId } })

    if (!hunt) {
      throw new Error(`Hunt ${huntId} not found`)
    }

    if (hunt.status !== 'running' && hunt.status !== 'pending') {
      throw new Error(`Hunt ${huntId} is not running (status: ${hunt.status})`)
    }

    // Stop the job in the queue
    await stopHuntJob(huntId)

    // Update database
    const updatedHunt = await prisma.hunt.update({
      where: { id: huntId },
      data: {
        status: 'stopped',
        completedAt: new Date(),
        duration: this.calculateDuration(hunt.startedAt),
      },
    })

    // Broadcast status update
    if (isWebSocketManagerInitialized()) {
      const wsManager = getWebSocketManager()
      wsManager.broadcastHuntStatus(huntId, {
        status: 'stopped',
        progress: updatedHunt.progress,
      })
    }

    console.log(`[HuntController] Hunt ${huntId} stopped`)

    return updatedHunt
  }

  /**
   * Get hunt by ID
   */
  async getHunt(huntId: string, includeRelations = false): Promise<HuntWithRelations | null> {
    return await prisma.hunt.findUnique({
      where: { id: huntId },
      include: includeRelations
        ? {
            agents: true,
            vulnerabilities: true,
          }
        : undefined,
    })
  }

  /**
   * List all hunts
   */
  async listAllHunts(limit = 100, offset = 0): Promise<Hunt[]> {
    return await prisma.hunt.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * List active hunts (running or pending)
   */
  async listActiveHunts(): Promise<Hunt[]> {
    return await prisma.hunt.findMany({
      where: {
        status: {
          in: ['running', 'pending'],
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Update hunt status
   */
  async updateHuntStatus(
    huntId: string,
    status: string,
    updates?: {
      progress?: number
      currentPhase?: string
      error?: string
      processId?: string
    }
  ): Promise<Hunt> {
    const data: any = {
      status,
      lastActivity: new Date(),
    }

    if (updates?.progress !== undefined) {
      data.progress = updates.progress
    }

    if (updates?.currentPhase) {
      data.currentPhase = updates.currentPhase
    }

    if (updates?.error) {
      data.error = updates.error
    }

    if (updates?.processId) {
      data.processId = updates.processId
    }

    // Set timestamps based on status
    if (status === 'running' && !data.startedAt) {
      data.startedAt = new Date()
    }

    if (status === 'completed' || status === 'failed' || status === 'stopped') {
      const hunt = await prisma.hunt.findUnique({ where: { id: huntId } })
      data.completedAt = new Date()
      data.duration = this.calculateDuration(hunt?.startedAt)
    }

    const updatedHunt = await prisma.hunt.update({
      where: { id: huntId },
      data,
    })

    // Broadcast status update
    if (isWebSocketManagerInitialized()) {
      const wsManager = getWebSocketManager()
      wsManager.broadcastHuntStatus(huntId, {
        status: updatedHunt.status,
        progress: updatedHunt.progress,
        phase: updatedHunt.currentPhase || undefined,
        vulnerabilityCount: updatedHunt.vulnerabilityCount,
        error: updatedHunt.error || undefined,
      })
    }

    return updatedHunt
  }

  /**
   * Add vulnerability to hunt
   */
  async addVulnerability(huntId: string, vuln: {
    title: string
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
    description: string
    affectedResource: string
    evidence: string
    remediation?: string
    category?: string
    cwe?: string
    owasp?: string[]
    agentId?: string
  }): Promise<Vulnerability> {
    // Create vulnerability
    const vulnerability = await prisma.vulnerability.create({
      data: {
        huntId,
        agentId: vuln.agentId,
        title: vuln.title,
        severity: vuln.severity,
        description: vuln.description,
        affectedResource: vuln.affectedResource,
        evidence: vuln.evidence,
        remediation: vuln.remediation,
        category: vuln.category,
        cwe: vuln.cwe,
        owasp: vuln.owasp || [],
      },
    })

    // Update hunt vulnerability counts
    const hunt = await prisma.hunt.findUnique({ where: { id: huntId } })
    if (hunt) {
      const updates: any = {
        vulnerabilityCount: hunt.vulnerabilityCount + 1,
        lastActivity: new Date(),
      }

      // Update severity counts
      switch (vuln.severity) {
        case 'critical':
          updates.criticalCount = hunt.criticalCount + 1
          break
        case 'high':
          updates.highCount = hunt.highCount + 1
          break
        case 'medium':
          updates.mediumCount = hunt.mediumCount + 1
          break
        case 'low':
          updates.lowCount = hunt.lowCount + 1
          break
        case 'info':
          updates.infoCount = hunt.infoCount + 1
          break
      }

      await prisma.hunt.update({
        where: { id: huntId },
        data: updates,
      })
    }

    // Broadcast vulnerability
    if (isWebSocketManagerInitialized()) {
      const wsManager = getWebSocketManager()
      wsManager.broadcastVulnerability(huntId, {
        id: vulnerability.id,
        title: vulnerability.title,
        severity: vulnerability.severity,
        description: vulnerability.description,
        affectedResource: vulnerability.affectedResource,
      })
    }

    console.log(`[HuntController] Vulnerability added to hunt ${huntId}: ${vuln.title}`)

    return vulnerability
  }

  /**
   * Add/update agent
   */
  async upsertAgent(huntId: string, agentData: {
    id?: string
    agentType: string
    name: string
    instruction: string
    parentAgentId?: string
    status?: string
  }): Promise<Agent> {
    const data = {
      huntId,
      agentType: agentData.agentType,
      name: agentData.name,
      instruction: agentData.instruction,
      parentAgentId: agentData.parentAgentId,
      status: agentData.status || 'pending',
    }

    let agent: Agent

    if (agentData.id) {
      // Update existing agent
      agent = await prisma.agent.upsert({
        where: { id: agentData.id },
        update: data,
        create: { ...data, id: agentData.id },
      })
    } else {
      // Create new agent
      agent = await prisma.agent.create({ data })
    }

    // Broadcast agent update
    if (isWebSocketManagerInitialized()) {
      const wsManager = getWebSocketManager()
      wsManager.broadcastAgentUpdate(huntId, {
        id: agent.id,
        name: agent.name,
        status: agent.status,
        type: agent.agentType,
      })
    }

    return agent
  }

  /**
   * Record hunt event
   */
  async recordEvent(huntId: string, eventData: {
    type: string
    data: any
    sequenceNumber: number
    agentId?: string
  }): Promise<void> {
    await prisma.huntEvent.create({
      data: {
        huntId,
        type: eventData.type,
        data: eventData.data,
        sequenceNumber: eventData.sequenceNumber,
        agentId: eventData.agentId,
      },
    })
  }

  /**
   * Get hunt events
   */
  async getHuntEvents(huntId: string, limit = 1000, offset = 0) {
    return await prisma.huntEvent.findMany({
      where: { huntId },
      orderBy: { sequenceNumber: 'asc' },
      take: limit,
      skip: offset,
    })
  }

  /**
   * Calculate duration in seconds
   */
  private calculateDuration(startedAt: Date | null): number | null {
    if (!startedAt) {
      return null
    }

    return Math.floor((Date.now() - startedAt.getTime()) / 1000)
  }

  /**
   * Get hunt statistics
   */
  async getStatistics() {
    const [total, running, completed, failed] = await Promise.all([
      prisma.hunt.count(),
      prisma.hunt.count({ where: { status: 'running' } }),
      prisma.hunt.count({ where: { status: 'completed' } }),
      prisma.hunt.count({ where: { status: 'failed' } }),
    ])

    const totalVulnerabilities = await prisma.vulnerability.count()

    return {
      hunts: {
        total,
        running,
        completed,
        failed,
      },
      vulnerabilities: {
        total: totalVulnerabilities,
      },
    }
  }
}

// Singleton instance
let huntControllerInstance: HuntController | null = null

/**
 * Get the hunt controller instance
 */
export function getHuntController(): HuntController {
  if (!huntControllerInstance) {
    huntControllerInstance = new HuntController()
  }

  return huntControllerInstance
}
