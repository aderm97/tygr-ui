# TYGR CLI-React Wrapper - Setup & Deployment Guide

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Quick Start](#quick-start)
5. [Configuration](#configuration)
6. [Development](#development)
7. [Production Deployment](#production-deployment)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This wrapper connects the **Strix CLI** security testing tool with a **React/Next.js frontend**, providing:

- ✅ Real-time progress updates via WebSockets
- ✅ Database-backed hunt history and settings
- ✅ Automatic Docker container orchestration
- ✅ Encrypted credential storage
- ✅ Beautiful, responsive UI

### Key Features

- **Integration Layer**: Seamless communication between CLI and UI
- **Event Streaming**: <100ms latency for real-time updates
- **Process Management**: Redis-backed state for crash recovery
- **Security**: Encrypted API keys, input validation, rate limiting

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  React Frontend (Next.js 14)                                │
│  - Dashboard, Hunt Monitor, Settings                        │
│  - Socket.io Client for real-time updates                  │
└──────────────┬──────────────────────────────────────────────┘
               │ HTTP/WebSocket
┌──────────────▼──────────────────────────────────────────────┐
│  Integration Layer                                          │
│  - Hunt Controller: Lifecycle management                    │
│  - Process Manager: Spawn/kill Strix CLI                   │
│  - Event Parser: Parse CLI output → structured events      │
│  - WebSocket Manager: Broadcast to clients                 │
└──────────────┬──────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│  Strix CLI Process                                          │
│  - python -m strix --target X --instruction Y               │
│  - Spawns Docker containers for agents                      │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. User clicks "Start Hunt" in UI
2. Hunt Controller validates config → starts Strix CLI
3. Process Manager captures stdout/stderr streams
4. Event Parser extracts structured events
5. WebSocket Manager broadcasts to UI in real-time
6. UI updates instantly (<100ms latency)

---

## 📦 Prerequisites

### Required

- **Docker** (20.10+) with Docker Compose
- **Node.js** (18+)
- **PostgreSQL** (15+)
- **Redis** (7+)

### Optional

- **LLM API Key** (OpenAI, Anthropic, or local model)

---

## 🚀 Quick Start

### 1. Clone & Navigate

```bash
cd /home/user/tygr-ui
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set **required** values:

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/tygr"

# Redis
REDIS_URL="redis://localhost:6379"

# LLM (choose one)
STRIX_LLM="openai/gpt-4"
LLM_API_KEY="sk-your-api-key-here"

# Security (CHANGE IN PRODUCTION!)
ENCRYPTION_SECRET="your-strong-secret-here"
ENCRYPTION_SALT="your-random-salt-here"
```

### 3. Start with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f tygr-ui

# Stop all services
docker-compose down
```

### 4. Access the Application

Open your browser to:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:3000/api/hunts
- **WebSocket**: ws://localhost:3000/api/socket

---

## ⚙️ Configuration

### Environment Variables

See `.env.example` for all available options. Key variables:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | - | ✅ |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` | ✅ |
| `STRIX_LLM` | LLM provider/model | `openai/gpt-4` | ✅ |
| `LLM_API_KEY` | LLM API key | - | ✅ |
| `DOCKER_HOST` | Docker daemon socket | `unix:///var/run/docker.sock` | ✅ |
| `ENCRYPTION_SECRET` | Encryption key for secrets | - | ✅ |
| `MAX_CONCURRENT_HUNTS` | Max simultaneous hunts | `5` | ❌ |

### LLM Providers

Configure in UI **Settings** page or via environment:

#### OpenAI
```bash
STRIX_LLM="openai/gpt-4"
LLM_API_KEY="sk-..."
```

#### Anthropic
```bash
STRIX_LLM="anthropic/claude-3-opus-20240229"
LLM_API_KEY="sk-ant-..."
```

#### Local (Ollama)
```bash
STRIX_LLM="local/llama2"
LLM_API_BASE="http://localhost:11434"
```

---

## 💻 Development

### Install Dependencies

```bash
cd tygr
npm install
```

### Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Open Prisma Studio (optional)
npm run prisma:studio
```

### Start Development Server

```bash
# Terminal 1: Start PostgreSQL & Redis
docker-compose up postgres redis

# Terminal 2: Start Next.js
npm run dev
```

Access at http://localhost:3000

### Project Structure

```
tygr/
├── src/
│   ├── app/                  # Next.js app router
│   │   ├── api/              # API routes
│   │   │   ├── hunts/        # Hunt endpoints
│   │   │   ├── settings/     # Settings endpoints
│   │   │   └── socket/       # WebSocket endpoint
│   │   ├── hunts/[id]/       # Hunt monitor page
│   │   └── settings/         # Settings page
│   ├── components/           # React components
│   ├── hooks/                # Custom React hooks
│   │   └── use-hunt-stream.ts  # WebSocket hook
│   ├── lib/                  # Integration layer ⭐
│   │   ├── database.ts       # Prisma client
│   │   ├── redis.ts          # Redis client
│   │   ├── hunt-controller.ts  # Main orchestrator
│   │   ├── process-manager.ts  # Process spawning
│   │   ├── event-parser.ts   # CLI output parser
│   │   ├── websocket-manager.ts # Socket.io server
│   │   └── encryption.ts     # Credential encryption
│   ├── stores/               # Zustand state
│   └── types/                # TypeScript types
├── prisma/
│   └── schema.prisma         # Database schema
├── server.ts                 # Custom server with Socket.io
└── Dockerfile                # Production Docker image
```

---

## 🚢 Production Deployment

### Build Docker Image

```bash
cd tygr
docker build -t tygr-ui:latest .
```

### Deploy with Docker Compose

```bash
# Production mode
docker-compose up -d

# Check health
docker-compose ps
docker-compose logs tygr-ui
```

### Environment Checklist

Before deploying to production:

- [ ] Change `ENCRYPTION_SECRET` to a strong random value
- [ ] Change `ENCRYPTION_SALT` to a random salt
- [ ] Set `NODE_ENV=production`
- [ ] Use strong database password
- [ ] Configure firewall (only expose port 3000)
- [ ] Set up SSL/TLS reverse proxy (nginx/Caddy)
- [ ] Enable Redis persistence
- [ ] Configure PostgreSQL backups

### Health Checks

The application includes health checks:

```bash
# Docker health check (automatic)
docker inspect tygr-ui | grep Health

# Manual check
curl http://localhost:3000/api/health
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. "Cannot connect to Database"

**Problem**: PostgreSQL not accessible

**Solution**:
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check connection string
echo $DATABASE_URL

# Test connection
docker-compose exec postgres psql -U postgres -d tygr -c "SELECT 1"
```

#### 2. "Redis connection refused"

**Problem**: Redis not accessible

**Solution**:
```bash
# Check if Redis is running
docker-compose ps redis

# Test connection
docker-compose exec redis redis-cli ping
# Should return: PONG
```

#### 3. "Strix CLI not found"

**Problem**: Strix path incorrect

**Solution**:
```bash
# Verify Strix installation
ls -la /home/user/tygr-ui/strix

# Check Python environment
python -m strix --help
```

#### 4. "WebSocket connection failed"

**Problem**: Socket.io not initialized

**Solution**:
```bash
# Check server logs
docker-compose logs tygr-ui | grep Socket

# Verify server.ts is being used
docker-compose exec tygr-ui ps aux | grep node
```

#### 5. "Hunt starts but no real-time updates"

**Problem**: Event parsing or WebSocket issue

**Solution**:
```bash
# Check browser console for WebSocket errors
# Open DevTools → Console → look for "[Socket]" logs

# Check server-side events
docker-compose logs -f tygr-ui | grep "event"

# Verify Redis is working
docker-compose exec redis redis-cli keys "*hunt*"
```

### Debug Mode

Enable detailed logging:

```bash
# In .env
DEBUG=true
LOG_LEVEL=debug

# Restart
docker-compose restart tygr-ui

# View logs
docker-compose logs -f tygr-ui
```

### Reset Everything

```bash
# Stop all services
docker-compose down

# Remove volumes (⚠️ deletes all data)
docker-compose down -v

# Remove images
docker rmi tygr-ui:latest

# Start fresh
docker-compose up -d --build
```

---

## 📚 Additional Resources

- **Strix Documentation**: See `/strix/README.md`
- **API Documentation**: http://localhost:3000/api/docs (when running)
- **Architecture Plan**: See `TYGR_ARCHITECTURE_PLAN.md`

---

## 🎉 Success Criteria

Your setup is working correctly if:

- ✅ Frontend accessible at http://localhost:3000
- ✅ Can configure LLM settings in UI
- ✅ Can start a hunt from dashboard
- ✅ Real-time progress updates appear instantly
- ✅ Hunt status changes reflect in UI
- ✅ Vulnerabilities are displayed when found
- ✅ Can stop a running hunt
- ✅ Hunt history persists across restarts

---

## 🤝 Support

If you encounter issues:

1. Check logs: `docker-compose logs -f`
2. Review this troubleshooting section
3. Open an issue with:
   - Error messages
   - Log output
   - Environment details
   - Steps to reproduce

---

**Built with ❤️ for the TYGR Security Team**
