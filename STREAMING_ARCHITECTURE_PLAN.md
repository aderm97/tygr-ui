# TYGR Live Scan Streaming Architecture

## Overview
This document outlines the architecture for implementing real-time scan monitoring and streaming from the Strix Python backend to the TYGR Next.js frontend.

## Current State Analysis

### CLI Streaming (Python)
- **Tracer Class**: Captures all scan events including:
  - Agent lifecycle (creation, status updates, completion)
  - Tool executions (start, progress, completion, results)
  - Chat messages between agents
  - Vulnerability discoveries
  - Scan configuration and metadata
- **Output**: Currently saves to files and triggers callbacks, but doesn't stream structured data

### Web Interface (Next.js)
- **Current Streaming**: Basic stdout/stderr pipe with minimal structure
- **State Management**: Zustand store with persistence
- **UI Components**: Static hunt monitoring page with mock data

## Proposed Architecture

### 1. Event-Driven Streaming Protocol

#### Python Backend Events
```python
# Event types emitted by enhanced Tracer
{
  "event_id": "uuid",
  "timestamp": "2025-11-14T19:46:19.683Z",
  "hunt_id": "hunt-abc123",
  "type": "agent_created|agent_updated|tool_execution|vulnerability_found|chat_message|status_update",
  "data": { ... }
}
```

#### Event Categories
1. **Agent Events**: Creation, status changes, completion, errors
2. **Tool Events**: Execution start, progress updates, completion, results
3. **Vulnerability Events**: Discovery with full details (CVE, CVSS, location)
4. **Chat Events**: Inter-agent communication and user messages
5. **System Events**: Resource usage, errors, scan lifecycle

### 2. Streaming Transport Layer

#### Option A: Server-Sent Events (SSE) - RECOMMENDED
- **Pros**: Simple HTTP-based, automatic reconnection, text-based
- **Cons**: Unidirectional (server→client only)
- **Use Case**: Perfect for monitoring (primarily server→client)

#### Option B: WebSockets
- **Pros**: Bidirectional, lower latency
- **Cons**: More complex, requires separate connection management
- **Use Case**: If we need to send commands back to running scans

#### Decision: Start with SSE, add WebSockets later if needed

### 3. Enhanced Python Tracer

```python
class StreamingTracer(Tracer):
    def __init__(self, run_name: str, stream_target: str = "stdio"):
        super().__init__(run_name)
        self.stream_target = stream_target  # "stdio", "websocket", "file"
        self.event_queue = asyncio.Queue()
        
    async def emit_event(self, event_type: str, data: dict):
        event = {
            "event_id": f"evt-{uuid4().hex[:8]}",
            "timestamp": datetime.now(UTC).isoformat(),
            "hunt_id": self.run_id,
            "type": event_type,
            "data": data
        }
        
        if self.stream_target == "stdio":
            print(json.dumps(event), flush=True)
        elif self.stream_target == "websocket":
            await self.event_queue.put(event)
            
    # Override all logging methods to emit events
    def log_agent_creation(self, *args, **kwargs):
        super().log_agent_creation(*args, **kwargs)
        self.emit_event("agent_created", {
            "agent_id": kwargs.get("agent_id"),
            "name": kwargs.get("name"),
            "task": kwargs.get("task"),
            "parent_id": kwargs.get("parent_id")
        })
```

### 4. Next.js API Layer

#### Enhanced Stream Endpoint
```typescript
// app/api/hunts/[id]/stream/route.ts
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const huntId = params.id
  
  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Subscribe to hunt events
      const eventSource = createHuntEventSource(huntId)
      
      eventSource.on('event', (event) => {
        controller.enqueue(
          `data: ${JSON.stringify(event)}\n\n`
        )
      })
      
      eventSource.on('end', () => controller.close())
    }
  })
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}
```

### 5. Frontend Event Processing

#### Event Parser Service
```typescript
// lib/event-parser.ts
export class HuntEventParser {
  private eventHandlers: Map<string, Function[]> = new Map()
  
  parseEvent(rawEvent: string): HuntEvent {
    const event = JSON.parse(rawEvent)
    return this.enrichEvent(event)
  }
  
  enrichEvent(event: HuntEvent): HuntEvent {
    // Add frontend-specific metadata
    return {
      ...event,
      receivedAt: new Date().toISOString(),
      processed: false
    }
  }
  
  on(eventType: string, handler: Function) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, [])
    }
    this.eventHandlers.get(eventType)!.push(handler)
  }
}
```

#### Real-time State Manager
```typescript
// stores/hunt-stream-store.ts
interface HuntStreamState {
  activeStreams: Map<string, EventSource>
  eventBuffer: Map<string, HuntEvent[]>
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting'
  
  connectToHunt: (huntId: string) => void
  disconnectFromHunt: (huntId: string) => void
  processEvent: (huntId: string, event: HuntEvent) => void
}
```

### 6. UI Components

#### Live Agent Monitor
- **Agent Tree**: Real-time agent hierarchy with status indicators
- **Status Icons**: 🟢 Running, 🟡 Waiting, ✅ Completed, ❌ Failed
- **Progress Bars**: Tool execution progress, iteration counters
- **Live Updates**: Animated status changes, new agent creation

#### Vulnerability Feed
- **Real-time Cards**: New vulnerabilities appear with slide-in animation
- **Severity Badges**: Color-coded (critical=red, high=orange, etc.)
- **Expandable Details**: Proof of concept, impact, remediation
- **Filters**: By severity, agent, location, status

#### Tool Execution Tracker
- **Live Log Stream**: Real-time tool output
- **Progress Indicators**: For long-running tools
- **Result Display**: Formatted tool results with syntax highlighting
- **Execution Timeline**: Chronological view of all tool calls

#### Resource Monitor
- **CPU/Memory Charts**: Real-time usage graphs
- **Network I/O**: Bandwidth monitoring
- **Agent Count**: Active agents over time
- **Alert Thresholds**: Visual warnings for high resource usage

### 7. Performance Optimizations

#### Event Buffering
- **Client-side**: Buffer events during reconnection
- **Server-side**: Maintain event history for new connections
- **Pagination**: Load historical events on demand

#### Update Throttling
- **Vulnerability Debouncing**: Group rapid-fire discoveries
- **UI Update Batching**: Batch React updates for high-frequency events
- **Virtual Scrolling**: For large event lists

#### Connection Management
- **Automatic Reconnection**: Exponential backoff
- **Connection Health**: Ping/pong keepalive
- **Event Replay**: Catch up on missed events after reconnection

### 8. Error Handling & Resilience

#### Network Issues
- **Graceful Degradation**: Show cached data when offline
- **Reconnection UI**: Visual indicator with retry button
- **Event Recovery**: Request missed events after reconnection

#### Backend Failures
- **Process Monitoring**: Watchdog for Strix processes
- **Automatic Restart**: Restart failed scans (configurable)
- **Error Propagation**: Clear error messages to UI

### 9. Security Considerations

#### Event Validation
- **Schema Validation**: Validate all events against JSON schema
- **Sanitization**: Clean all user-generated content
- **Rate Limiting**: Prevent event flooding

#### Access Control
- **Hunt Isolation**: Users can only see their own hunts
- **Stream Authentication**: Secure event stream endpoints
- **Admin Override**: View all hunts for debugging

### 10. Implementation Phases

#### Phase 1: Core Streaming Infrastructure
- Enhanced Python tracer with JSON event emission
- SSE endpoint with event buffering
- Basic event parser and state management
- Simple agent status display

#### Phase 2: Rich UI Components
- Live agent tree with animations
- Real-time vulnerability feed
- Tool execution tracker
- Resource monitoring charts

#### Phase 3: Advanced Features
- Event history and replay
- Advanced filtering and search
- Performance optimizations
- Comprehensive error handling

#### Phase 4: Production Hardening
- Security enhancements
- Scalability improvements
- Monitoring and alerting
- Documentation and testing

## Technical Stack

### Backend (Python)
- **Current**: `strix/telemetry/tracer.py`
- **Enhancements**: Async event emission, JSON serialization
- **Dependencies**: `asyncio`, `json`, `datetime`

### Frontend (Next.js/React)
- **Current**: Next.js 14, React 18, TypeScript
- **Enhancements**: EventSource API, Zustand for real-time state
- **UI Components**: Custom components with Tailwind CSS
- **Charts**: Recharts or Chart.js for resource monitoring

### Transport
- **Primary**: Server-Sent Events (SSE)
- **Fallback**: Long polling for older browsers
- **Future**: WebSockets for bidirectional communication

## Success Metrics

1. **Latency**: Events appear in UI within <100ms
2. **Reliability**: 99.9% event delivery success rate
3. **Performance**: UI remains responsive with 100+ events/sec
4. **User Experience**: Intuitive real-time feedback, clear status indicators
5. **Scalability**: Support for 10+ concurrent hunts with 50+ agents each

## Next Steps

1. Review and approve architecture
2. Implement enhanced Python tracer
3. Create SSE endpoint with event buffering
4. Build frontend event processing pipeline
5. Develop UI components incrementally
6. Test with real scans and optimize performance