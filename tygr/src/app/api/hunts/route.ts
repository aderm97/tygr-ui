import { NextRequest, NextResponse } from 'next/server'
import { spawn, ChildProcess } from 'child_process'
import { HuntConfig, Hunt, ApiResponse } from '@/types'
import { HuntEventCapture } from '@/lib/event-capture'

// In-memory store for active processes (in production, use Redis or database)
const activeProcesses = new Map<string, ChildProcess>()
const huntStreams = new Map<string, ReadableStream>()

export async function POST(request: NextRequest) {
  try {
    const config: HuntConfig = await request.json()

    console.log('[API] Received hunt config from UI:', JSON.stringify(config, null, 2))

    // Validate the configuration
    if (!config.targets || config.targets.length === 0) {
      console.error('[API] Validation failed: No targets specified')
      return NextResponse.json(
        { success: false, error: 'No targets specified' },
        { status: 400 }
      )
    }

    if (!config.llmProvider) {
      console.error('[API] Validation failed: No LLM provider specified')
      return NextResponse.json(
        { success: false, error: 'No LLM provider specified' },
        { status: 400 }
      )
    }

    // Generate a unique hunt ID
    const huntId = `hunt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    console.log(`[API] Generated hunt ID: ${huntId}`)

    // Build Strix CLI arguments from configuration
    const strixArgs = buildStrixArgs(config, huntId)
    console.log(`[API] Built strix args:`, strixArgs)

    // Verify the argument structure
    console.log(`[API] Final command will be: python3 ${strixArgs.join(' ')}`)

    console.log(`[API] Starting Strix process for hunt ${huntId}`)
    
    // Spawn Python directly to run strix since the console script doesn't exist
    // Use python3 -c "from strix.interface.main import main; main()" [args...]
    const pythonArgs = strixArgs
    console.log(`[API] Spawning python3 with args:`, pythonArgs)
    
    // Use Poetry virtual environment Python
    const poetryPython = '/root/.cache/pypoetry/virtualenvs/strix-agent-0826SdoR-py3.12/bin/python'
    console.log(`[API] Using Poetry Python: ${poetryPython}`)
    
    const strixProcess = spawn(poetryPython, pythonArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONPATH: '/root/strix',
        STRIX_LLM: config.llmProvider,
        LLM_API_KEY: process.env.LLM_API_KEY,
        STRIX_RUN_NAME: huntId,
      }
    })

    // Debug process events
    strixProcess.on('spawn', () => {
      console.log(`[API] Strix process spawned for hunt ${huntId}, PID: ${strixProcess.pid}`)
    })

    strixProcess.on('error', (error) => {
      console.error(`[API] Strix process error for hunt ${huntId}:`, error)
    })

    strixProcess.on('exit', (code, signal) => {
      console.log(`[API] Strix process exited for hunt ${huntId}, code: ${code}, signal: ${signal}`)
    })

    // Debug stdout/stderr
    strixProcess.stdout?.on('data', (data) => {
      console.log(`[API] Strix stdout: ${data.toString().substring(0, 200)}`)
    })

    strixProcess.stderr?.on('data', (data) => {
      console.error(`[API] Strix stderr: ${data.toString().substring(0, 200)}`)
    })

    // Store the process
    activeProcesses.set(huntId, strixProcess)

    // Create event capture for structured events
    console.log(`[API] Creating event capture for hunt ${huntId}`)
    const eventCapture = new HuntEventCapture(huntId)
    eventCapture.start(strixProcess)
    
    // Store the event capture instance
    if (!global.huntEventCaptures) {
      global.huntEventCaptures = new Map()
    }
    global.huntEventCaptures.set(huntId, eventCapture)
    
    console.log(`[API] Hunt ${huntId} started successfully`)

    // Create a stream for real-time output (legacy, can be removed later)
    const stream = createHuntStream(strixProcess, huntId)
    huntStreams.set(huntId, stream)

    // Create the hunt response
    const hunt: Hunt = {
      id: huntId,
      name: config.name,
      target: config.targets[0]?.value || 'Unknown target',
      config,
      status: 'running',
      startedAt: new Date().toISOString(),
      vulnerabilityCount: 0,
      agentCount: config.agentComposition?.length || 0,
      processId: process.pid
    }

    return NextResponse.json({ success: true, data: hunt })
  } catch (error) {
    console.error('Failed to start hunt:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to start hunt' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const hunts = Array.from(activeProcesses.entries()).map(([huntId, strixProcess]) => ({
      id: huntId,
      status: strixProcess.exitCode === null ? 'running' : 'completed',
      processId: strixProcess.pid,
      exitCode: strixProcess.exitCode
    }))

    return NextResponse.json({ success: true, data: hunts })
  } catch (error) {
    console.error('Failed to get hunts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get hunts' },
      { status: 500 }
    )
  }
}

function buildStrixArgs(config: HuntConfig, huntId: string): string[] {
  const args: string[] = []

  // Add targets
  config.targets.forEach(target => {
    args.push('--target', target.value)
  })

  // Add instruction
  if (config.instruction) {
    args.push('--instruction', config.instruction)
  }

  // Add run name
  args.push('--run-name', huntId)

  // Add non-interactive mode
  if (config.nonInteractive) {
    args.push('--non-interactive')
  }

  // Add output format (JSON for parsing)
  args.push('--output', 'json')

  return args
}

function createHuntStream(strixProcess: ChildProcess, huntId: string): ReadableStream {
  const encoder = new TextEncoder()

  return new ReadableStream({
    start(controller) {
      // Handle stdout
      strixProcess.stdout?.on('data', (data: Buffer) => {
        const message = {
          type: 'log',
          data: data.toString(),
          timestamp: new Date().toISOString()
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`))
      })

      // Handle stderr
      strixProcess.stderr?.on('data', (data: Buffer) => {
        const message = {
          type: 'error',
          data: data.toString(),
          timestamp: new Date().toISOString()
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`))
      })

      // Handle process exit
      strixProcess.on('exit', (code) => {
        const message = {
          type: 'exit',
          data: { code },
          timestamp: new Date().toISOString()
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`))
        controller.close()
        
        // Clean up
        activeProcesses.delete(huntId)
        huntStreams.delete(huntId)
      })

      // Handle process errors
      strixProcess.on('error', (error) => {
        const message = {
          type: 'error',
          data: error.message,
          timestamp: new Date().toISOString()
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`))
        controller.close()
        
        // Clean up
        activeProcesses.delete(huntId)
        huntStreams.delete(huntId)
      })
    },
    cancel() {
      // Clean up when stream is cancelled
      strixProcess.kill()
      activeProcesses.delete(huntId)
      huntStreams.delete(huntId)
    }
  })
}