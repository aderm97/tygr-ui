# TYGR Quick Start Guide

Get TYGR up and running in 5 minutes!

## Prerequisites

- **Node.js 18+** - `node --version`
- **PostgreSQL** - Running on port 5432
- **Redis** - Running on port 6379
- **Python 3.9+** - For Strix CLI

## Quick Setup

### 1. Install Dependencies

```bash
cd tygr
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/tygr
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-your-key-here  # or ANTHROPIC_API_KEY
```

### 3. Setup Database

```bash
npx prisma generate
npx prisma migrate dev
```

### 4. Start Services

**Terminal 1 - Redis (if not running):**
```bash
redis-server
```

**Terminal 2 - PostgreSQL (if not running):**
```bash
# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql

# Docker
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres:15
```

**Terminal 3 - TYGR Server:**
```bash
npm run dev
```

### 5. Open Browser

Visit: http://localhost:3000

## Your First Hunt

### Via UI

1. Navigate to http://localhost:3000
2. Click "New Hunt"
3. Configure:
   - **Target:** `https://example.com`
   - **Profile:** Quick Prowl
   - **Instruction:** "Look for XSS vulnerabilities"
4. Click "Start Hunt"
5. Watch real-time results stream in!

### Via API

```bash
curl -X POST http://localhost:3000/api/hunts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My First Hunt",
    "targets": [
      {
        "type": "url",
        "value": "https://example.com"
      }
    ],
    "profile": "quick",
    "instruction": "Look for XSS vulnerabilities"
  }'
```

## Architecture Overview

```
UI (React) ──HTTP──> API Routes ──Redis──> BullMQ Queue
                         │                      │
                         │                      │
                         ▼                      ▼
                    PostgreSQL          Hunt Worker
                    (Prisma)                   │
                         ▲                     │
                         │                     ▼
                         └──────────── Strix CLI Process
                                              │
                                              ▼
                                        Real-time Events
                                              │
                                              ▼
                                        WebSocket (Socket.io)
                                              │
                                              ▼
                                        Frontend Updates
```

## Monitoring

### Queue Status

```bash
curl http://localhost:3000/api/admin/queue
```

### Database Viewer

```bash
npx prisma studio
# Opens at http://localhost:5555
```

### Active Hunts

```bash
curl http://localhost:3000/api/hunts?active=true
```

## Troubleshooting

### "Cannot connect to PostgreSQL"

```bash
# Check if PostgreSQL is running
pg_isready

# Start PostgreSQL
brew services start postgresql  # macOS
sudo systemctl start postgresql # Linux
```

### "Cannot connect to Redis"

```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# Start Redis
redis-server
```

### "Strix CLI not found"

```bash
# Verify Strix is in parent directory
ls ../strix

# Test Strix manually
cd ../strix
python -m strix --help
```

### "Worker not processing jobs"

Check worker logs in terminal. You should see:
```
[HuntWorker] Hunt worker started
[ProcessManager] Process started with PID: 12345
```

If not, restart the server: `npm run dev`

## Next Steps

1. **Read Full Documentation:** See [QUEUE_ARCHITECTURE.md](./QUEUE_ARCHITECTURE.md)
2. **Configure Profiles:** Customize hunt profiles in UI
3. **Setup Authentication:** Add user auth (recommended for production)
4. **Deploy to Production:** See deployment guide in docs
5. **Scale Workers:** Add more worker processes for concurrent hunts

## Common Use Cases

### Scheduled Scans

Add to crontab:
```bash
0 2 * * * curl -X POST http://localhost:3000/api/hunts -d @hunt-config.json
```

### CI/CD Integration

```yaml
# .github/workflows/security-scan.yml
- name: Run Security Hunt
  run: |
    curl -X POST $TYGR_URL/api/hunts \
      -d '{"targets":[{"type":"url","value":"${{ env.APP_URL }}"}]}'
```

### Continuous Monitoring

Set up recurring hunts with different profiles:
- **Quick Prowl** - Every hour (light scan)
- **Deep Stalk** - Daily (comprehensive)
- **API Hunter** - On deploy (API-focused)

## Support

- **Documentation:** [QUEUE_ARCHITECTURE.md](./QUEUE_ARCHITECTURE.md)
- **Issues:** GitHub Issues
- **Architecture Diagram:** See architecture docs

---

**You're all set! Happy hunting! 🎯**
