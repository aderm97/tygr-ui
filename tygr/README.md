# TYGR Security Agent

Production-ready Next.js UI for Strix CLI with real-time hunt execution and monitoring.

## Architecture

TYGR uses a queue-based architecture for reliable, scalable security hunting:

```
UI → API Routes → BullMQ (Redis) → Worker → Strix CLI → WebSocket → UI
                      ↓
                 PostgreSQL
```

**Key Features:**
- ✅ Real-time event streaming (<100ms latency)
- ✅ Queue-based job processing with automatic retries
- ✅ WebSocket broadcasting for live updates
- ✅ Database persistence (PostgreSQL + Prisma)
- ✅ Horizontal scalability (multiple workers)
- ✅ Monitoring dashboard (Bull Board)

## Quick Start

### Prerequisites

Before running TYGR, ensure you have:

1. **Node.js 18+**
   ```bash
   node --version  # Should be 18.0.0 or higher
   ```

2. **PostgreSQL** (running on port 5432)
   ```bash
   # macOS
   brew install postgresql@15
   brew services start postgresql@15

   # Ubuntu/Debian
   sudo apt install postgresql-15
   sudo systemctl start postgresql

   # Docker
   docker run -d --name postgres \
     -e POSTGRES_PASSWORD=password \
     -p 5432:5432 postgres:15
   ```

3. **Redis** (running on port 6379)
   ```bash
   # macOS
   brew install redis
   brew services start redis

   # Ubuntu/Debian
   sudo apt install redis-server
   sudo systemctl start redis-server

   # Docker
   docker run -d --name redis -p 6379:6379 redis:7-alpine
   ```

4. **Python 3.9+** (for Strix CLI)
   ```bash
   python --version  # Should be 3.9 or higher
   ```

### Installation

```bash
# 1. Install Node.js dependencies
npm install

# 2. Configure environment
cp .env.example .env

# Edit .env with your settings:
# - DATABASE_URL: PostgreSQL connection string
# - REDIS_URL: Redis connection string
# - OPENAI_API_KEY or ANTHROPIC_API_KEY: LLM provider API key

# 3. Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate dev

# 4. Start the server
npm run dev
```

Visit http://localhost:3000

### Verifying Prerequisites

Before running \`npm run dev\`, verify all services are running:

```bash
# Check Redis
redis-cli ping
# Should return: PONG

# Check PostgreSQL
psql -U postgres -c "SELECT version();"
# Should show PostgreSQL version
```

## Configuration

### Environment Variables

Key configuration options (see \`.env.example\` for complete list):

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/tygr

# Redis (required for BullMQ)
REDIS_URL=redis://localhost:6379

# Worker
WORKER_CONCURRENCY=3  # Number of concurrent hunts

# LLM Provider
OPENAI_API_KEY=sk-...
# OR
ANTHROPIC_API_KEY=sk-ant-...
```

## Usage

### Starting a Hunt (UI)

1. Navigate to http://localhost:3000
2. Click "New Hunt"
3. Configure target, profile, and instructions
4. Click "Start Hunt"
5. Watch real-time results stream in

### Starting a Hunt (API)

```bash
curl -X POST http://localhost:3000/api/hunts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Security Scan",
    "targets": [{"type": "url", "value": "https://example.com"}],
    "profile": "quick",
    "instruction": "Look for XSS vulnerabilities"
  }'
```

## Troubleshooting

### "Cannot connect to Redis"

```bash
# Check if Redis is running
redis-cli ping

# Start Redis
brew services start redis  # macOS
sudo systemctl start redis # Linux
docker run -d -p 6379:6379 redis:7-alpine  # Docker
```

### "Cannot connect to PostgreSQL"

```bash
# Check if PostgreSQL is running
pg_isready

# Start PostgreSQL
brew services start postgresql@15  # macOS
sudo systemctl start postgresql    # Linux
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres:15  # Docker
```

### "Strix CLI not found"

```bash
# Verify Strix is in parent directory
ls ../strix

# Test Strix manually
cd ../strix
python -m strix --help
```

## Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - 5-minute setup guide
- **[QUEUE_ARCHITECTURE.md](./QUEUE_ARCHITECTURE.md)** - Comprehensive architecture documentation

## Stack

- **Frontend:** React 18, Next.js 14, TypeScript, Zustand, TailwindCSS
- **Backend:** Next.js API Routes, BullMQ, Socket.io
- **Database:** PostgreSQL, Prisma ORM
- **Queue:** Redis, BullMQ
- **CLI:** Python (Strix)

## License

MIT
