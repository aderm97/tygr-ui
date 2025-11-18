/**
 * Event Parser
 * Parses structured JSON events from Strix CLI stdout
 * Events are marked with ###EVENT_TYPE### markers
 */

export interface ParsedEvent {
  type: EventType
  timestamp: Date
  data: any
  raw: string
}

export type EventType =
  | 'hunt_started'
  | 'hunt_completed'
  | 'hunt_failed'
  | 'agent_created'
  | 'agent_started'
  | 'agent_completed'
  | 'agent_failed'
  | 'tool_execution'
  | 'vulnerability_found'
  | 'phase_changed'
  | 'progress_update'
  | 'log'
  | 'unknown'

export interface VulnerabilityEvent {
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  description: string
  affectedResource: string
  evidence: string
  remediation?: string
  category?: string
  cwe?: string
  owasp?: string[]
}

export interface AgentEvent {
  agentId: string
  agentType: string
  name: string
  instruction: string
  parentAgentId?: string
  status?: string
  error?: string
}

export interface ToolExecutionEvent {
  agentId: string
  tool: string
  action: string
  input: any
  output?: any
  success: boolean
  error?: string
  duration?: number
}

export interface ProgressEvent {
  progress: number // 0-100
  phase?: string
  message?: string
}

export class EventParser {
  private buffer = ''
  private eventMarkers = {
    HUNT_STARTED: '###HUNT_STARTED###',
    HUNT_COMPLETED: '###HUNT_COMPLETED###',
    HUNT_FAILED: '###HUNT_FAILED###',
    AGENT_CREATED: '###AGENT_CREATED###',
    AGENT_STARTED: '###AGENT_STARTED###',
    AGENT_COMPLETED: '###AGENT_COMPLETED###',
    AGENT_FAILED: '###AGENT_FAILED###',
    TOOL_EXECUTION: '###TOOL_EXECUTION###',
    VULN_EVENT: '###VULN_EVENT###',
    PHASE_CHANGED: '###PHASE_CHANGED###',
    PROGRESS: '###PROGRESS###',
  }

  /**
   * Parse incoming stdout data
   * Returns array of parsed events
   */
  parse(data: string): ParsedEvent[] {
    this.buffer += data
    const events: ParsedEvent[] = []

    // Split buffer into lines
    const lines = this.buffer.split('\n')

    // Keep the last incomplete line in the buffer
    this.buffer = lines.pop() || ''

    // Process each complete line
    for (const line of lines) {
      const event = this.parseLine(line)
      if (event) {
        events.push(event)
      }
    }

    return events
  }

  /**
   * Parse a single line
   */
  private parseLine(line: string): ParsedEvent | null {
    const trimmed = line.trim()

    if (!trimmed) {
      return null
    }

    // Check for event markers
    for (const [type, marker] of Object.entries(this.eventMarkers)) {
      if (trimmed.includes(marker)) {
        return this.parseMarkedEvent(trimmed, marker, this.markerToEventType(type))
      }
    }

    // Try to parse as JSON event
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const data = JSON.parse(trimmed)
        if (data.type) {
          return {
            type: this.normalizeEventType(data.type),
            timestamp: new Date(data.timestamp || Date.now()),
            data,
            raw: trimmed,
          }
        }
      } catch (error) {
        // Not a valid JSON event, treat as log
      }
    }

    // Default to log event
    return {
      type: 'log',
      timestamp: new Date(),
      data: { message: trimmed },
      raw: trimmed,
    }
  }

  /**
   * Parse a marked event (e.g., ###VULN_EVENT### {...})
   */
  private parseMarkedEvent(line: string, marker: string, type: EventType): ParsedEvent | null {
    try {
      // Extract JSON after the marker
      const jsonStart = line.indexOf(marker) + marker.length
      const jsonStr = line.substring(jsonStart).trim()

      if (!jsonStr) {
        return {
          type,
          timestamp: new Date(),
          data: {},
          raw: line,
        }
      }

      const data = JSON.parse(jsonStr)

      return {
        type,
        timestamp: new Date(data.timestamp || Date.now()),
        data,
        raw: line,
      }
    } catch (error) {
      console.error(`[EventParser] Failed to parse marked event: ${line}`, error)
      return null
    }
  }

  /**
   * Convert marker name to event type
   */
  private markerToEventType(markerName: string): EventType {
    const map: Record<string, EventType> = {
      HUNT_STARTED: 'hunt_started',
      HUNT_COMPLETED: 'hunt_completed',
      HUNT_FAILED: 'hunt_failed',
      AGENT_CREATED: 'agent_created',
      AGENT_STARTED: 'agent_started',
      AGENT_COMPLETED: 'agent_completed',
      AGENT_FAILED: 'agent_failed',
      TOOL_EXECUTION: 'tool_execution',
      VULN_EVENT: 'vulnerability_found',
      PHASE_CHANGED: 'phase_changed',
      PROGRESS: 'progress_update',
    }

    return map[markerName] || 'unknown'
  }

  /**
   * Normalize event type from various formats
   */
  private normalizeEventType(type: string): EventType {
    const normalized = type.toLowerCase().replace(/-/g, '_')

    const validTypes: EventType[] = [
      'hunt_started',
      'hunt_completed',
      'hunt_failed',
      'agent_created',
      'agent_started',
      'agent_completed',
      'agent_failed',
      'tool_execution',
      'vulnerability_found',
      'phase_changed',
      'progress_update',
      'log',
    ]

    return validTypes.includes(normalized as EventType) ? (normalized as EventType) : 'unknown'
  }

  /**
   * Flush remaining buffer
   */
  flush(): ParsedEvent[] {
    if (!this.buffer.trim()) {
      return []
    }

    const event = this.parseLine(this.buffer)
    this.buffer = ''

    return event ? [event] : []
  }

  /**
   * Reset parser state
   */
  reset(): void {
    this.buffer = ''
  }
}

/**
 * Create a new event parser
 */
export function createEventParser(): EventParser {
  return new EventParser()
}
