/**
 * Hunt Worker
 * Processes hunt jobs from BullMQ queue
 * Spawns Strix CLI, parses events, updates database, broadcasts to WebSocket
 */

import { Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import { HuntJobData, HuntJobResult, QUEUE_NAMES } from '../lib/queue/hunt-queue'
import { createProcessManager, ProcessManager } from '../lib/process-manager'
import { createEventParser, EventParser, ParsedEvent } from '../lib/event-parser'
import { getHuntController } from '../lib/hunt-controller'
import { getWebSocketManager, isWebSocketManagerInitialized } from '../lib/websocket-manager'

// Redis connection
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

// Track active processes
const activeProcesses = new Map<string, ProcessManager>()

/**
 * Process a hunt job
 */
async function processHuntJob(job: Job<HuntJobData, HuntJobResult>): Promise<HuntJobResult> {
  const { huntId, name, target, targetType, instruction, profile, env } = job.data

  console.log(`[HuntWorker] Processing hunt job ${huntId}: ${name}`)

  const huntController = getHuntController()
  const eventParser = createEventParser()
  let eventSequence = 0

  try {
    // Update hunt status to running
    await huntController.updateHuntStatus(huntId, 'running', {
      progress: 0,
      currentPhase: 'initializing',
    })

    // Create process manager
    const processManager = createProcessManager({
      target,
      targetType,
      instruction,
      profile,
      env,
    })

    // Track process
    activeProcesses.set(huntId, processManager)

    // Setup event handlers
    let vulnerabilityCount = 0

    processManager.on('stdout', async (data: string) => {
      // Parse events from stdout
      const events = eventParser.parse(data)

      for (const event of events) {
        await handleParsedEvent(huntId, event, eventSequence++, huntController)

        if (event.type === 'vulnerability_found') {
          vulnerabilityCount++
        }
      }

      // Update job progress periodically
      if (events.some((e) => e.type === 'progress_update')) {
        const progressEvent = events.find((e) => e.type === 'progress_update')
        if (progressEvent?.data?.progress) {
          await job.updateProgress(progressEvent.data.progress)
        }
      }
    })

    processManager.on('stderr', async (data: string) => {
      console.error(`[HuntWorker] stderr from hunt ${huntId}:`, data)

      // Broadcast error logs
      if (isWebSocketManagerInitialized()) {
        const wsManager = getWebSocketManager()
        wsManager.broadcastLog(huntId, {
          level: 'error',
          message: data,
        })
      }
    })

    processManager.on('exit', async (code: number | null, signal: string | null) => {
      console.log(`[HuntWorker] Process exited for hunt ${huntId}: code=${code}, signal=${signal}`)

      // Flush any remaining events
      const finalEvents = eventParser.flush()
      for (const event of finalEvents) {
        await handleParsedEvent(huntId, event, eventSequence++, huntController)
      }

      // Remove from active processes
      activeProcesses.delete(huntId)
    })

    processManager.on('error', async (error: Error) => {
      console.error(`[HuntWorker] Process error for hunt ${huntId}:`, error)

      await huntController.updateHuntStatus(huntId, 'failed', {
        error: error.message,
      })
    })

    // Start the process
    await processManager.start()

    // Update with process ID
    const pid = processManager.getPid()
    if (pid) {
      await huntController.updateHuntStatus(huntId, 'running', {
        processId: pid.toString(),
      })
    }

    // Wait for process to complete
    await new Promise<void>((resolve, reject) => {
      processManager.on('exit', (code: number | null) => {
        if (code === 0 || code === null) {
          resolve()
        } else {
          reject(new Error(`Process exited with code ${code}`))
        }
      })

      processManager.on('error', (error: Error) => {
        reject(error)
      })
    })

    // Update hunt status to completed
    await huntController.updateHuntStatus(huntId, 'completed', {
      progress: 100,
    })

    console.log(`[HuntWorker] Hunt ${huntId} completed successfully with ${vulnerabilityCount} vulnerabilities`)

    return {
      success: true,
      huntId,
      vulnerabilityCount,
    }
  } catch (error) {
    console.error(`[HuntWorker] Hunt ${huntId} failed:`, error)

    // Update hunt status to failed
    await huntController.updateHuntStatus(huntId, 'failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    // Clean up process
    const process = activeProcesses.get(huntId)
    if (process) {
      await process.stop()
      activeProcesses.delete(huntId)
    }

    return {
      success: false,
      huntId,
      vulnerabilityCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Handle parsed event from CLI
 */
async function handleParsedEvent(
  huntId: string,
  event: ParsedEvent,
  sequenceNumber: number,
  huntController: ReturnType<typeof getHuntController>
): Promise<void> {
  console.log(`[HuntWorker] Event for hunt ${huntId}: ${event.type}`)

  // Record event in database
  await huntController.recordEvent(huntId, {
    type: event.type,
    data: event.data,
    sequenceNumber,
    agentId: event.data.agentId,
  })

  // Broadcast event via WebSocket
  if (isWebSocketManagerInitialized()) {
    const wsManager = getWebSocketManager()
    wsManager.broadcastHuntEvent(huntId, event)
  }

  // Handle specific event types
  switch (event.type) {
    case 'vulnerability_found':
      await handleVulnerabilityEvent(huntId, event, huntController)
      break

    case 'agent_created':
    case 'agent_started':
    case 'agent_completed':
    case 'agent_failed':
      await handleAgentEvent(huntId, event, huntController)
      break

    case 'progress_update':
      await handleProgressEvent(huntId, event, huntController)
      break

    case 'phase_changed':
      await handlePhaseEvent(huntId, event, huntController)
      break

    case 'log':
      await handleLogEvent(huntId, event)
      break
  }
}

/**
 * Handle vulnerability event
 */
async function handleVulnerabilityEvent(
  huntId: string,
  event: ParsedEvent,
  huntController: ReturnType<typeof getHuntController>
): Promise<void> {
  const vulnData = event.data

  await huntController.addVulnerability(huntId, {
    title: vulnData.title,
    severity: vulnData.severity,
    description: vulnData.description,
    affectedResource: vulnData.affectedResource || vulnData.url || 'Unknown',
    evidence: vulnData.evidence || JSON.stringify(vulnData),
    remediation: vulnData.remediation,
    category: vulnData.category,
    cwe: vulnData.cwe,
    owasp: vulnData.owasp,
    agentId: vulnData.agentId,
  })
}

/**
 * Handle agent event
 */
async function handleAgentEvent(
  huntId: string,
  event: ParsedEvent,
  huntController: ReturnType<typeof getHuntController>
): Promise<void> {
  const agentData = event.data

  const status =
    event.type === 'agent_created'
      ? 'pending'
      : event.type === 'agent_started'
      ? 'running'
      : event.type === 'agent_completed'
      ? 'completed'
      : 'failed'

  await huntController.upsertAgent(huntId, {
    id: agentData.agentId,
    agentType: agentData.agentType || agentData.type || 'unknown',
    name: agentData.name,
    instruction: agentData.instruction || '',
    parentAgentId: agentData.parentAgentId,
    status,
  })
}

/**
 * Handle progress event
 */
async function handleProgressEvent(
  huntId: string,
  event: ParsedEvent,
  huntController: ReturnType<typeof getHuntController>
): Promise<void> {
  const progress = event.data.progress

  if (typeof progress === 'number' && progress >= 0 && progress <= 100) {
    await huntController.updateHuntStatus(huntId, 'running', {
      progress,
    })
  }
}

/**
 * Handle phase event
 */
async function handlePhaseEvent(
  huntId: string,
  event: ParsedEvent,
  huntController: ReturnType<typeof getHuntController>
): Promise<void> {
  const phase = event.data.phase

  if (phase) {
    await huntController.updateHuntStatus(huntId, 'running', {
      currentPhase: phase,
    })
  }
}

/**
 * Handle log event
 */
async function handleLogEvent(huntId: string, event: ParsedEvent): Promise<void> {
  if (isWebSocketManagerInitialized()) {
    const wsManager = getWebSocketManager()
    wsManager.broadcastLog(huntId, {
      level: 'info',
      message: event.data.message || event.raw,
      data: event.data,
    })
  }
}

/**
 * Create and start the hunt worker
 */
export function createHuntWorker(): Worker<HuntJobData, HuntJobResult> {
  console.log('[HuntWorker] Starting hunt worker...')

  const worker = new Worker<HuntJobData, HuntJobResult>(
    QUEUE_NAMES.HUNTS,
    async (job) => {
      return await processHuntJob(job)
    },
    {
      connection,
      concurrency: parseInt(process.env.WORKER_CONCURRENCY || '3'), // Process up to 3 hunts concurrently
      limiter: {
        max: 10, // Max 10 jobs per duration
        duration: 60000, // Per minute
      },
    }
  )

  // Worker event handlers
  worker.on('completed', (job) => {
    console.log(`[HuntWorker] Job ${job.id} completed`)
  })

  worker.on('failed', (job, error) => {
    console.error(`[HuntWorker] Job ${job?.id} failed:`, error)
  })

  worker.on('error', (error) => {
    console.error('[HuntWorker] Worker error:', error)
  })

  console.log('[HuntWorker] Hunt worker started')

  return worker
}

/**
 * Graceful shutdown
 */
export async function shutdownWorker(worker: Worker): Promise<void> {
  console.log('[HuntWorker] Shutting down worker...')

  // Stop all active processes
  for (const [huntId, process] of activeProcesses.entries()) {
    console.log(`[HuntWorker] Stopping process for hunt ${huntId}`)
    await process.stop()
  }

  activeProcesses.clear()

  // Close worker
  await worker.close()
  await connection.quit()

  console.log('[HuntWorker] Worker shutdown complete')
}
