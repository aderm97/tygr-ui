# TYGR Queue Architecture Documentation

## Overview

This document describes the production-ready queue-based architecture for connecting the TYGR UI to the Strix CLI backend.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TYGR Architecture                            │
└─────────────────────────────────────────────────────────────────────┘

  Frontend (React/Next.js)
         │
         │ HTTP POST /api/hunts
         ▼
  ┌─────────────────┐
  │  API Routes     │
  │  - Validate     │
  │  - Create Hunt  │
  │  - Enqueue Job  │
  └────────┬────────┘
           │
           │ Redis
           ▼
  ┌─────────────────┐
  │  BullMQ Queue   │
  │  - Priority     │
  │  - Retry Logic  │
  │  - Job Tracking │
  └────────┬────────┘
           │
           │ Worker Pool
           ▼
  ┌─────────────────────┐
  │  Hunt Worker        │
  │  - Spawn Strix CLI  │
  │  - Parse Events     │
  │  - Update DB        │
  │  - Broadcast WS     │
  └──────┬──────────────┘
         │
         ├──────────► PostgreSQL (Prisma)
         │             - Hunts
         │             - Agents
         │             - Vulnerabilities
         │             - Events
         │
         └──────────► WebSocket (Socket.io)
                       Real-time broadcasting
                       to frontend clients
```

## Key Components

### 1. Queue System (`src/lib/queue/hunt-queue.ts`)

**Responsibilities:**
- Enqueue hunt jobs with priority and retry logic
- Track job status and progress
- Provide queue statistics
- Handle graceful shutdown

**Features:**
- Automatic retries (3 attempts with exponential backoff)
- Job persistence (Redis-backed)
- Job retention (1000 completed, 5000 failed)
- Priority support
- Delayed job scheduling

**API:**
```typescript
// Enqueue a hunt
await enqueueHunt(data: HuntJobData, options?: {
  priority?: number
  delay?: number
})

// Get job status
await getHuntJobStatus(huntId: string)

// Stop a job
await stopHuntJob(huntId: string)

// Get queue stats
await getQueueStats()
```

### 2. Process Manager (`src/lib/process-manager.ts`)

**Responsibilities:**
- Spawn and manage Strix CLI child processes
- Capture stdout/stderr streams
- Handle process lifecycle (start, stop, monitor)
- Emit process events

**Features:**
- Real-time stdout/stderr capture
- Graceful shutdown with SIGTERM → SIGKILL fallback
- Process duration tracking
- PID management

**Events:**
- `stdout` - Standard output data
- `stderr` - Standard error data
- `exit` - Process exit with code/signal
- `error` - Process error
- `event` - Structured process event

### 3. Event Parser (`src/lib/event-parser.ts`)

**Responsibilities:**
- Parse structured JSON events from Strix CLI stdout
- Handle event markers (###EVENT_TYPE###)
- Buffer incomplete lines
- Normalize event types

**Supported Event Types:**
- `hunt_started`, `hunt_completed`, `hunt_failed`
- `agent_created`, `agent_started`, `agent_completed`, `agent_failed`
- `tool_execution`
- `vulnerability_found`
- `phase_changed`
- `progress_update`
- `log`

**Event Format:**
```
###VULN_EVENT### {"title": "XSS Found", "severity": "high", ...}
###PROGRESS### {"progress": 45, "phase": "validation"}
```

### 4. WebSocket Manager (`src/lib/websocket-manager.ts`)

**Responsibilities:**
- Manage Socket.io connections
- Broadcast real-time events to subscribed clients
- Handle client subscriptions to specific hunts

**Features:**
- Room-based broadcasting (one room per hunt)
- Connection tracking
- Automatic cleanup on disconnect
- CORS support

**Events (Server → Client):**
- `connected` - Connection acknowledgment
- `hunt:event` - Generic hunt event
- `hunt:status` - Status update (running, completed, etc.)
- `hunt:vulnerability` - New vulnerability found
- `hunt:agent` - Agent update
- `hunt:log` - Log message

**Events (Client → Server):**
- `subscribe:hunt` - Subscribe to hunt updates
- `unsubscribe:hunt` - Unsubscribe from hunt

### 5. Hunt Controller (`src/lib/hunt-controller.ts`)

**Responsibilities:**
- Manage hunt lifecycle
- Database operations (Prisma)
- Coordinate between queue, DB, and WebSocket

**Key Methods:**
```typescript
// Start a new hunt
await startHunt(config: HuntConfiguration): Promise<Hunt>

// Stop a running hunt
await stopHunt(huntId: string): Promise<Hunt>

// Update hunt status
await updateHuntStatus(huntId: string, status: string, updates?: {...})

// Add vulnerability
await addVulnerability(huntId: string, vuln: {...})

// Upsert agent
await upsertAgent(huntId: string, agentData: {...})

// Record event
await recordEvent(huntId: string, eventData: {...})
```

### 6. Hunt Worker (`src/workers/hunt-worker.ts`)

**Responsibilities:**
- Process hunt jobs from the queue
- Orchestrate all components (process manager, event parser, DB, WebSocket)
- Handle errors and retries
- Track active processes

**Workflow:**
1. Receive job from queue
2. Update hunt status to "running"
3. Spawn Strix CLI process
4. Parse stdout events in real-time
5. Update database with agents, vulnerabilities, events
6. Broadcast events via WebSocket
7. Handle completion or failure
8. Clean up resources

**Configuration:**
- Concurrency: 3 hunts simultaneously (configurable via `WORKER_CONCURRENCY`)
- Rate limiting: 10 jobs per minute
- Automatic retries on failure

### 7. Server Initialization (`src/lib/server-init.ts`)

**Responsibilities:**
- Initialize WebSocket server
- Start hunt worker
- Handle graceful shutdown

**Lifecycle:**
```typescript
// Startup
await initializeServer(httpServer)
// → Initializes WebSocket manager
// → Starts hunt worker

// Shutdown (SIGTERM/SIGINT)
await shutdownServer()
// → Stops active processes
// → Closes worker
// → Disconnects clients
```

## Usage

### Starting a Hunt

**Frontend:**
```typescript
// POST /api/hunts
const response = await fetch('/api/hunts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'My Security Hunt',
    targets: [{ type: 'url', value: 'https://example.com' }],
    profile: 'quick',
    instruction: 'Look for XSS vulnerabilities',
  })
})

const { data } = await response.json()
const huntId = data.id
```

**Backend Flow:**
1. API route validates input
2. Creates hunt record in database (status: "pending")
3. Enqueues job in BullMQ
4. Returns hunt ID to client
5. Worker picks up job
6. Updates status to "running"
7. Spawns Strix CLI
8. Streams events to WebSocket

### Real-time Monitoring

**Frontend (Socket.io):**
```typescript
import io from 'socket.io-client'

const socket = io('http://localhost:3000', {
  path: '/socket.io',
  transports: ['websocket', 'polling'],
})

socket.on('connected', (data) => {
  console.log('Connected:', data.clientId)

  // Subscribe to hunt updates
  socket.emit('subscribe:hunt', huntId)
})

socket.on('hunt:vulnerability', (payload) => {
  console.log('New vulnerability:', payload.vulnerability)
})

socket.on('hunt:status', (payload) => {
  console.log('Status update:', payload.status, payload.progress)
})

socket.on('hunt:log', (payload) => {
  console.log(`[${payload.level}]`, payload.message)
})
```

### Stopping a Hunt

```typescript
// POST /api/hunts/{id}/stop
await fetch(`/api/hunts/${huntId}/stop`, { method: 'POST' })

// Backend:
// 1. Removes job from queue
// 2. Sends SIGTERM to Strix process
// 3. Updates DB status to "stopped"
// 4. Broadcasts status update
```

## Configuration

### Environment Variables

See `.env.example` for full configuration options.

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string (for BullMQ)

**Optional:**
- `WORKER_CONCURRENCY` - Number of concurrent hunts (default: 3)
- `PORT` - Server port (default: 3000)
- `NEXT_PUBLIC_APP_URL` - Frontend URL for CORS

### Queue Configuration

Edit `src/lib/queue/hunt-queue.ts`:
```typescript
defaultJobOptions: {
  attempts: 3,              // Retry count
  backoff: {
    type: 'exponential',
    delay: 5000,            // Initial delay (ms)
  },
  removeOnComplete: {
    count: 1000,            // Keep last N completed
    age: 7 * 24 * 3600,     // Keep for N seconds
  },
}
```

### Worker Configuration

Edit `src/workers/hunt-worker.ts`:
```typescript
new Worker(..., {
  concurrency: 3,           // Concurrent jobs
  limiter: {
    max: 10,                // Max jobs
    duration: 60000,        // Per minute
  },
})
```

## Monitoring

### Queue Dashboard

Access Bull Board at `/api/admin/queue` for queue statistics:
```bash
curl http://localhost:3000/api/admin/queue
```

Response:
```json
{
  "success": true,
  "data": {
    "waiting": 5,
    "active": 3,
    "completed": 142,
    "failed": 2,
    "delayed": 0,
    "total": 152
  }
}
```

### Database Queries

```sql
-- Active hunts
SELECT id, name, status, progress FROM "Hunt"
WHERE status IN ('running', 'pending')
ORDER BY "createdAt" DESC;

-- Hunt statistics
SELECT
  status,
  COUNT(*) as count,
  AVG(duration) as avg_duration
FROM "Hunt"
GROUP BY status;

-- Recent vulnerabilities
SELECT h.name, v.severity, v.title
FROM "Vulnerability" v
JOIN "Hunt" h ON v."huntId" = h.id
ORDER BY v."discoveredAt" DESC
LIMIT 10;
```

### WebSocket Monitoring

```typescript
const wsManager = getWebSocketManager()

// Get connection count
const connectionCount = wsManager.getConnectionCount()

// Get hunt subscribers
const subscriberCount = await wsManager.getHuntSubscribers(huntId)
```

## Deployment

### Prerequisites

1. **PostgreSQL** - Database server
2. **Redis** - Queue backend
3. **Python 3.9+** - For Strix CLI
4. **Node.js 18+** - For Next.js server

### Setup Steps

```bash
# 1. Clone repository
git clone <repo-url>
cd tygr

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your configuration

# 4. Setup database
npx prisma generate
npx prisma migrate dev

# 5. Start Redis (if not running)
redis-server

# 6. Start the server
npm run dev
# Production: npm run build && npm start
```

### Docker Deployment

```dockerfile
# Dockerfile example
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://user:pass@db:5432/tygr
      REDIS_URL: redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: tygr
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Scaling

**Horizontal Scaling (Multiple Workers):**

1. Run worker as separate process:
```bash
# Terminal 1: Web server
npm start

# Terminal 2: Additional workers
WORKER_CONCURRENCY=5 node -r ts-node/register src/workers/hunt-worker.ts
```

2. Deploy multiple worker containers:
```yaml
# docker-compose.yml
services:
  web:
    # ... web service config

  worker:
    build: .
    command: npm run worker
    environment:
      WORKER_CONCURRENCY: 5
    deploy:
      replicas: 3  # 3 worker instances
```

**Benefits:**
- Load distribution across workers
- Fault tolerance (one worker fails, others continue)
- Independent scaling of web and worker layers

## Troubleshooting

### Queue Issues

**Problem:** Jobs stuck in "waiting" state

**Solution:**
```bash
# Check Redis connection
redis-cli ping

# Check worker logs
# Should see: "[HuntWorker] Hunt worker started"

# Manually process queue
npm run worker
```

### Process Issues

**Problem:** Strix CLI fails to start

**Solution:**
```bash
# Test Strix CLI manually
cd ../strix
python -m strix --target https://example.com --profile quick --non-interactive

# Check Python environment
which python
python --version

# Check Strix dependencies
pip install -r requirements.txt
```

### WebSocket Issues

**Problem:** Clients not receiving events

**Solution:**
```typescript
// Check WebSocket initialization
import { isWebSocketManagerInitialized } from '@/lib/websocket-manager'
console.log('WS initialized:', isWebSocketManagerInitialized())

// Check client connection
socket.on('connect', () => console.log('Connected'))
socket.on('connect_error', (err) => console.error('Connection error:', err))
```

### Database Issues

**Problem:** Prisma errors

**Solution:**
```bash
# Regenerate Prisma client
npx prisma generate

# Reset database (dev only)
npx prisma migrate reset

# View database
npx prisma studio
```

## Performance Tuning

### Worker Concurrency

Adjust based on available resources:
```bash
# Low resources (1-2 CPU cores)
WORKER_CONCURRENCY=1

# Medium resources (4 CPU cores)
WORKER_CONCURRENCY=3

# High resources (8+ CPU cores)
WORKER_CONCURRENCY=5
```

### Queue Retention

Reduce memory usage:
```typescript
removeOnComplete: {
  count: 100,        // Keep fewer completed jobs
  age: 24 * 3600,    // Keep for 1 day instead of 7
}
```

### Database Connection Pool

Configure Prisma:
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/tygr?schema=public&connection_limit=20"
```

## Security Considerations

1. **Credential Encryption** - Use `ENCRYPTION_SECRET` for sensitive data
2. **API Authentication** - Add auth middleware to API routes
3. **WebSocket Authentication** - Validate socket connections
4. **Input Validation** - Sanitize hunt configurations
5. **Rate Limiting** - Limit hunt creation per user
6. **Process Isolation** - Run Strix CLI in Docker containers

## Next Steps

1. **Add Authentication** - Implement user authentication
2. **Add Authorization** - Role-based access control
3. **Add Metrics** - Prometheus/Grafana monitoring
4. **Add Notifications** - Email/Slack alerts on hunt completion
5. **Add Scheduling** - Cron-based recurring hunts (integrate Airflow)
6. **Add Distributed Tracing** - OpenTelemetry integration

## Support

For issues or questions:
- GitHub Issues: [repository-url]/issues
- Documentation: [docs-url]
- Team Contact: security-team@example.com
