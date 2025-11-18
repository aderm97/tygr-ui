/**
 * BullMQ Queue Setup for Hunt Jobs
 * Manages the queue for spawning Strix CLI hunts
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq'
import Redis from 'ioredis'

// Redis connection configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

// Hunt job data structure
export interface HuntJobData {
  huntId: string
  name: string
  target: string
  targetType: 'url' | 'repository' | 'directory' | 'domain' | 'ip'
  instruction?: string
  profile: string
  env?: Record<string, string>
}

// Hunt job result
export interface HuntJobResult {
  success: boolean
  huntId: string
  vulnerabilityCount: number
  error?: string
}

// Queue names
export const QUEUE_NAMES = {
  HUNTS: 'hunts',
} as const

// Create the hunt queue
export const huntQueue = new Queue<HuntJobData, HuntJobResult>(QUEUE_NAMES.HUNTS, {
  connection,
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs up to 3 times
    backoff: {
      type: 'exponential',
      delay: 5000, // Start with 5 second delay
    },
    removeOnComplete: {
      count: 1000, // Keep last 1000 completed jobs
      age: 7 * 24 * 3600, // Keep for 7 days
    },
    removeOnFail: {
      count: 5000, // Keep last 5000 failed jobs
      age: 14 * 24 * 3600, // Keep for 14 days
    },
  },
})

// Queue events for monitoring
export const huntQueueEvents = new QueueEvents(QUEUE_NAMES.HUNTS, { connection })

/**
 * Add a hunt job to the queue
 */
export async function enqueueHunt(data: HuntJobData, options?: {
  priority?: number
  delay?: number
}): Promise<Job<HuntJobData, HuntJobResult>> {
  console.log(`[Queue] Enqueuing hunt job: ${data.huntId}`)

  return await huntQueue.add(
    `hunt-${data.huntId}`,
    data,
    {
      jobId: data.huntId, // Use hunt ID as job ID for idempotency
      priority: options?.priority || 0,
      delay: options?.delay || 0,
    }
  )
}

/**
 * Get hunt job status
 */
export async function getHuntJobStatus(huntId: string): Promise<{
  state: string
  progress: number
  data?: HuntJobData
  returnValue?: HuntJobResult
  failedReason?: string
} | null> {
  const job = await huntQueue.getJob(huntId)

  if (!job) {
    return null
  }

  const state = await job.getState()
  const progress = job.progress as number || 0

  return {
    state,
    progress,
    data: job.data,
    returnValue: job.returnvalue,
    failedReason: job.failedReason,
  }
}

/**
 * Stop a hunt job
 */
export async function stopHuntJob(huntId: string): Promise<boolean> {
  const job = await huntQueue.getJob(huntId)

  if (!job) {
    return false
  }

  try {
    await job.remove()
    console.log(`[Queue] Stopped hunt job: ${huntId}`)
    return true
  } catch (error) {
    console.error(`[Queue] Failed to stop hunt job ${huntId}:`, error)
    return false
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    huntQueue.getWaitingCount(),
    huntQueue.getActiveCount(),
    huntQueue.getCompletedCount(),
    huntQueue.getFailedCount(),
    huntQueue.getDelayedCount(),
  ])

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  }
}

/**
 * Graceful shutdown
 */
export async function shutdownQueue() {
  console.log('[Queue] Shutting down hunt queue...')
  await huntQueue.close()
  await huntQueueEvents.close()
  await connection.quit()
  console.log('[Queue] Hunt queue shutdown complete')
}

// Cleanup on process exit
process.on('SIGTERM', shutdownQueue)
process.on('SIGINT', shutdownQueue)
