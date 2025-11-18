/**
 * Process Manager
 * Spawns and manages Strix CLI processes
 */

import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import * as path from 'path'

export interface ProcessManagerOptions {
  target: string
  targetType: 'url' | 'repository' | 'directory' | 'domain' | 'ip'
  instruction?: string
  profile: string
  env?: Record<string, string>
  workingDir?: string
}

export interface ProcessEvent {
  type: 'stdout' | 'stderr' | 'exit' | 'error'
  data: string | number | Error
  timestamp: Date
}

export class ProcessManager extends EventEmitter {
  private process: ChildProcess | null = null
  private killed = false
  private exitCode: number | null = null
  private startTime: Date | null = null
  private endTime: Date | null = null

  constructor(private options: ProcessManagerOptions) {
    super()
  }

  /**
   * Start the Strix CLI process
   */
  async start(): Promise<void> {
    if (this.process) {
      throw new Error('Process already started')
    }

    this.startTime = new Date()
    const strixPath = this.getStrixPath()
    const args = this.buildCommandArgs()

    console.log(`[ProcessManager] Starting Strix CLI: python -m strix ${args.join(' ')}`)
    console.log(`[ProcessManager] Working directory: ${this.options.workingDir || process.cwd()}`)

    // Spawn the Python process
    this.process = spawn('python', ['-m', 'strix', ...args], {
      cwd: this.options.workingDir || this.getStrixWorkingDir(),
      env: {
        ...process.env,
        ...this.options.env,
        // Ensure Python output is unbuffered for real-time streaming
        PYTHONUNBUFFERED: '1',
        // Disable interactive mode
        STRIX_NON_INTERACTIVE: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'], // stdin ignored, stdout/stderr piped
    })

    // Listen to stdout
    this.process.stdout?.on('data', (data: Buffer) => {
      const output = data.toString()
      this.emit('stdout', output)
      this.emitEvent('stdout', output)
    })

    // Listen to stderr
    this.process.stderr?.on('data', (data: Buffer) => {
      const output = data.toString()
      this.emit('stderr', output)
      this.emitEvent('stderr', output)
    })

    // Listen to process exit
    this.process.on('exit', (code: number | null, signal: string | null) => {
      this.endTime = new Date()
      this.exitCode = code

      console.log(`[ProcessManager] Process exited with code ${code}, signal ${signal}`)
      this.emit('exit', code, signal)
      this.emitEvent('exit', code || 0)
    })

    // Listen to process errors
    this.process.on('error', (error: Error) => {
      console.error('[ProcessManager] Process error:', error)
      this.emit('error', error)
      this.emitEvent('error', error.message)
    })

    console.log(`[ProcessManager] Process started with PID: ${this.process.pid}`)
  }

  /**
   * Stop the process
   */
  async stop(): Promise<void> {
    if (!this.process) {
      return
    }

    if (this.killed) {
      return
    }

    console.log('[ProcessManager] Stopping process...')
    this.killed = true

    // Try graceful shutdown first
    this.process.kill('SIGTERM')

    // Force kill after 5 seconds if still running
    setTimeout(() => {
      if (this.process && !this.process.killed) {
        console.log('[ProcessManager] Force killing process')
        this.process.kill('SIGKILL')
      }
    }, 5000)
  }

  /**
   * Check if process is running
   */
  isRunning(): boolean {
    return this.process !== null && !this.killed && this.exitCode === null
  }

  /**
   * Get process ID
   */
  getPid(): number | undefined {
    return this.process?.pid
  }

  /**
   * Get process runtime duration
   */
  getDuration(): number | null {
    if (!this.startTime) {
      return null
    }

    const end = this.endTime || new Date()
    return Math.floor((end.getTime() - this.startTime.getTime()) / 1000)
  }

  /**
   * Get exit code
   */
  getExitCode(): number | null {
    return this.exitCode
  }

  /**
   * Build command line arguments for Strix CLI
   */
  private buildCommandArgs(): string[] {
    const args: string[] = []

    // Add target
    args.push('--target', this.options.target)

    // Add target type
    args.push('--target-type', this.options.targetType)

    // Add profile
    args.push('--profile', this.options.profile)

    // Add instruction if provided
    if (this.options.instruction) {
      args.push('--instruction', this.options.instruction)
    }

    // Add non-interactive mode
    args.push('--non-interactive')

    // Add JSON output mode for structured events
    args.push('--output-format', 'json')

    return args
  }

  /**
   * Get Strix CLI path
   */
  private getStrixPath(): string {
    // Strix is located in the parent directory
    return path.resolve(__dirname, '../../../strix')
  }

  /**
   * Get Strix working directory
   */
  private getStrixWorkingDir(): string {
    return this.getStrixPath()
  }

  /**
   * Emit a process event
   */
  private emitEvent(type: ProcessEvent['type'], data: string | number | Error): void {
    const event: ProcessEvent = {
      type,
      data,
      timestamp: new Date(),
    }
    this.emit('event', event)
  }
}

/**
 * Create a new process manager
 */
export function createProcessManager(options: ProcessManagerOptions): ProcessManager {
  return new ProcessManager(options)
}
