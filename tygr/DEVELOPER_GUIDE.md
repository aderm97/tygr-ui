# TYGR Developer Guide

This guide provides comprehensive information for developers working on TYGR Security Agent, including architecture details, development workflows, and best practices.

## 🏗️ Architecture Deep Dive

### Frontend Architecture

TYGR uses Next.js 14+ App Router with a modular component architecture:

#### Core Pages Structure
```
app/
├── layout.tsx              # Root layout with global providers
├── page.tsx                # Dashboard (Mission Control)
├── hunts/
│   ├── [id]/page.tsx       # Hunt monitoring with real-time updates
│   └── new/page.tsx        # Hunt configuration wizard
├── intelligence/page.tsx   # Vulnerability analysis & reporting
└── settings/page.tsx       # Application configuration
```

#### Component Hierarchy
```
components/
├── providers.tsx           # Global state and context providers
├── hunt-configuration-wizard.tsx  # Multi-step form wizard
└── [future components]     # Reusable UI components
```

#### State Management

**Zustand Store Architecture:**
```typescript
interface HuntState {
  // Hunt execution
  currentHunt: Hunt | null
  hunts: Hunt[]
  huntConfigs: HuntConfig[]
  
  // Real-time data
  huntEvents: Record<string, HuntEvent[]>
  vulnerabilities: Record<string, Vulnerability[]>
  agentGraphs: Record<string, AgentGraph>
  
  // UI state
  selectedHuntId: string | null
  huntFilters: HuntFilters
  huntStats: HuntStats
}
```

### Backend API Architecture

#### API Routes Structure
```
api/
├── hunts/
│   ├── route.ts            # POST: Start hunt, GET: List hunts
│   └── [id]/
│       ├── stream/         # GET: Real-time SSE stream
│       └── results/        # GET: Hunt results
├── agents/
│   └── route.ts            # Agent coordination endpoints
└── settings/
    └── route.ts            # Settings management
```

#### Process Management

**Strix CLI Integration:**
```typescript
// Process spawning and management
const strixProcess = spawn('strix', buildCliArgs(config), {
  env: {
    STRIX_LLM: config.llmProvider,
    LLM_API_KEY: process.env.LLM_API_KEY,
    STRIX_RUN_NAME: huntId,
  }
})

// Real-time output streaming
strixProcess.stdout?.on('data', (data: Buffer) => {
  const message = parseStrixOutput(data)
  streamController.enqueue(message)
})
```

### Data Flow Architecture

#### Hunt Lifecycle
1. **Configuration** → User configures hunt via wizard
2. **Validation** → Frontend validates configuration
3. **API Request** → POST to `/api/hunts` with config
4. **Process Spawn** → Backend spawns Strix process
5. **Real-time Streaming** → SSE stream for live updates
6. **Results Processing** → Parse and normalize Strix output
7. **Storage** → Store results in state management
8. **Analysis** → Intelligence center for vulnerability analysis

#### Real-time Updates
```typescript
// Server-Sent Events for live updates
const stream = new ReadableStream({
  start(controller) {
    // Handle stdout from Strix process
    process.stdout?.on('data', (data) => {
      controller.enqueue(formatEvent(data))
    })
    
    // Handle process exit
    process.on('exit', (code) => {
      controller.enqueue({ type: 'exit', code })
      controller.close()
    })
  }
})
```

## 🛠️ Development Workflow

### Setting Up Development Environment

1. **Install dependencies:**
   ```bash
   cd tygr
   npm install
   ```

2. **Environment configuration:**
   ```bash
   cp .env.example .env.local
   # Configure your API keys and settings
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Run tests:**
   ```bash
   npm test
   ```

5. **Build for production:**
   ```bash
   npm run build
   ```

### Code Organization Best Practices

#### Component Structure
```typescript
// Example component structure
interface ComponentProps {
  // Required props
  requiredProp: string
  
  // Optional props
  optionalProp?: number
  
  // Event handlers
  onEvent?: () => void
}

export function ComponentName({ requiredProp, optionalProp, onEvent }: ComponentProps) {
  // Component logic
  return (
    <div className="component-styles">
      {/* Component JSX */}
    </div>
  )
}
```

#### State Management Patterns
```typescript
// Zustand store pattern
interface StoreState {
  // State
  data: DataType[]
  loading: boolean
  error: string | null
  
  // Actions
  fetchData: () => Promise<void>
  addData: (item: DataType) => void
  removeData: (id: string) => void
}

export const useStore = create<StoreState>()(
  devtools(
    persist(
      (set, get) => ({
        data: [],
        loading: false,
        error: null,
        
        fetchData: async () => {
          set({ loading: true, error: null })
          try {
            const data = await api.fetchData()
            set({ data, loading: false })
          } catch (error) {
            set({ error: error.message, loading: false })
          }
        },
        
        addData: (item) => set((state) => ({
          data: [...state.data, item]
        })),
        
        removeData: (id) => set((state) => ({
          data: state.data.filter(item => item.id !== id)
        }))
      }),
      {
        name: 'store-name',
        partialize: (state) => ({ data: state.data })
      }
    )
  )
)
```

### API Integration Patterns

#### Fetching Data
```typescript
// Using TanStack Query for server state
import { useQuery, useMutation } from '@tanstack/react-query'

// Fetch hunts
const { data: hunts, isLoading, error } = useQuery({
  queryKey: ['hunts'],
  queryFn: async () => {
    const response = await fetch('/api/hunts')
    if (!response.ok) throw new Error('Failed to fetch hunts')
    return response.json()
  }
})

// Start hunt mutation
const startHuntMutation = useMutation({
  mutationFn: async (config: HuntConfig) => {
    const response = await fetch('/api/hunts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    })
    if (!response.ok) throw new Error('Failed to start hunt')
    return response.json()
  },
  onSuccess: (data) => {
    // Handle success
    queryClient.invalidateQueries(['hunts'])
  }
})
```

#### Real-time Streaming
```typescript
// Server-Sent Events for real-time updates
useEffect(() => {
  const eventSource = new EventSource(`/api/hunts/${huntId}/stream`)
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data)
    // Handle real-time updates
    addHuntEvent(huntId, data)
  }
  
  eventSource.onerror = (error) => {
    console.error('SSE error:', error)
    eventSource.close()
  }
  
  return () => {
    eventSource.close()
  }
}, [huntId])
```

## 🧪 Testing Strategy

### Unit Tests
```typescript
// Component testing with React Testing Library
import { render, screen, fireEvent } from '@testing-library/react'
import { HuntConfigurationWizard } from '@/components/hunt-configuration-wizard'

describe('HuntConfigurationWizard', () => {
  it('should render all steps', () => {
    render(<HuntConfigurationWizard isOpen={true} onClose={() => {}} onHuntStarted={() => {}} />)
    
    expect(screen.getByText('Configure Security Hunt')).toBeInTheDocument()
    expect(screen.getByText('Target')).toBeInTheDocument()
    expect(screen.getByText('Profile')).toBeInTheDocument()
    expect(screen.getByText('Agents')).toBeInTheDocument()
  })
  
  it('should validate required fields', async () => {
    const onHuntStarted = jest.fn()
    render(<HuntConfigurationWizard isOpen={true} onClose={() => {}} onHuntStarted={onHuntStarted} />)
    
    const startButton = screen.getByText('Start Hunt')
    fireEvent.click(startButton)
    
    expect(onHuntStarted).not.toHaveBeenCalled()
    expect(screen.getByText('Please provide a hunt name and at least one target')).toBeInTheDocument()
  })
})
```

### Integration Tests
```typescript
// API route testing
import { POST } from '@/app/api/hunts/route'
import { NextRequest } from 'next/server'

describe('POST /api/hunts', () => {
  it('should start a hunt with valid configuration', async () => {
    const config = {
      name: 'Test Hunt',
      targets: [{ type: 'url', value: 'https://example.com' }],
      instruction: 'Test instruction',
      profile: 'quick_prowl',
      llmProvider: 'openai',
      agentComposition: ['reconnaissance'],
      nonInteractive: true
    }
    
    const request = new NextRequest('http://localhost:3000/api/hunts', {
      method: 'POST',
      body: JSON.stringify(config)
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveProperty('id')
    expect(data.data.status).toBe('running')
  })
})
```

### E2E Tests
```typescript
// Playwright E2E tests
import { test, expect } from '@playwright/test'

test('complete hunt workflow', async ({ page }) => {
  // Navigate to dashboard
  await page.goto('http://localhost:3000')
  
  // Click "New Hunt"
  await page.click('text=New Hunt')
  
  // Fill hunt configuration
  await page.fill('input[placeholder="e.g., Production API Security Scan"]', 'E2E Test Hunt')
  await page.fill('input[placeholder="https://example.com"]', 'https://test-target.com')
  await page.click('button:has-text("Add")')
  
  // Select profile
  await page.click('text=Quick Prowl')
  
  // Start hunt
  await page.click('button:has-text("Start Hunt")')
  
  // Verify hunt started
  await expect(page.locator('text=Hunt started')).toBeVisible()
})
```

## 📊 Performance Optimization

### Code Splitting
```typescript
// Lazy load heavy components
import dynamic from 'next/dynamic'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <div>Loading editor...</div>
})

const D3Graph = dynamic(() => import('@/components/d3-graph'), {
  ssr: false,
  loading: () => <div>Loading graph...</div>
})
```

### Memoization
```typescript
// Use React.memo for components
import { memo } from 'react'

interface VulnerabilityListProps {
  vulnerabilities: Vulnerability[]
  onSelect: (id: string) => void
}

export const VulnerabilityList = memo(function VulnerabilityList({
  vulnerabilities,
  onSelect
}: VulnerabilityListProps) {
  return (
    <div className="vulnerability-list">
      {vulnerabilities.map(vuln => (
        <VulnerabilityCard 
          key={vuln.id} 
          vulnerability={vuln}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
})
```

### Virtual Scrolling
```typescript
// For large lists
import { Virtuoso } from 'react-virtuoso'

<Virtuoso
  data={vulnerabilities}
  itemContent={(index, vulnerability) => (
    <VulnerabilityCard vulnerability={vulnerability} />
  )}
  style={{ height: '600px' }}
/>
```

## 🔒 Security Best Practices

### Input Validation
```typescript
// Validate all user inputs
import { z } from 'zod'

const HuntConfigSchema = z.object({
  name: z.string().min(1).max(100),
  targets: z.array(z.object({
    type: z.enum(['url', 'repository', 'local_directory', 'domain', 'ip_address']),
    value: z.string().min(1)
  })).min(1),
  instruction: z.string().optional(),
  profile: z.enum(['quick_prowl', 'deep_stalk', 'api_hunter', 'auth_ambush', 'custom']),
  llmProvider: z.string().min(1),
  agentComposition: z.array(z.string()).min(1),
  credentials: z.object({
    username: z.string().optional(),
    password: z.string().optional(),
    apiKey: z.string().optional(),
    token: z.string().optional()
  }).optional(),
  nonInteractive: z.boolean()
})

// Validate before processing
const result = HuntConfigSchema.safeParse(userInput)
if (!result.success) {
  throw new Error('Invalid configuration')
}
```

### Credential Management
```typescript
// Never log sensitive data
const sanitizeConfig = (config: HuntConfig) => {
  const sanitized = { ...config }
  if (sanitized.credentials) {
    sanitized.credentials = {
      username: sanitized.credentials.username ? '***' : undefined,
      password: sanitized.credentials.password ? '***' : undefined,
      apiKey: sanitized.credentials.apiKey ? '***' : undefined,
      token: sanitized.credentials.token ? '***' : undefined
    }
  }
  return sanitized
}

// Use environment variables for secrets
const strixProcess = spawn('strix', args, {
  env: {
    ...process.env,
    LLM_API_KEY: process.env.LLM_API_KEY, // Never hardcode
    STRIX_LLM: config.llmProvider
  }
})
```

## 🚀 Deployment

### Production Build
```bash
# Build for production
npm run build

# Start production server
npm start
```

### Docker Deployment
```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Configuration
```bash
# Production environment variables
NODE_ENV=production
STRIX_LLM=openai/gpt-4
LLM_API_KEY=your-production-key
TYGR_MAX_CONCURRENT_HUNTS=5
TYGR_RESULT_RETENTION_DAYS=90
```

## 📚 API Reference

### Hunt Management API

#### POST /api/hunts
Start a new security hunt.

**Request Body:**
```json
{
  "name": "Production API Scan",
  "targets": [
    {
      "type": "url",
      "value": "https://api.example.com"
    }
  ],
  "instruction": "Focus on authentication vulnerabilities",
  "profile": "api_hunter",
  "llmProvider": "openai",
  "agentComposition": ["api_scanner", "authentication_tester"],
  "credentials": {
    "apiKey": "secret-key"
  },
  "nonInteractive": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "hunt-123456789",
    "name": "Production API Scan",
    "target": "https://api.example.com",
    "status": "running",
    "startedAt": "2024-01-01T12:00:00Z",
    "vulnerabilityCount": 0,
    "agentCount": 2
  }
}
```

#### GET /api/hunts
List all hunts.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "hunt-123456789",
      "name": "Production API Scan",
      "status": "running",
      "startedAt": "2024-01-01T12:00:00Z"
    }
  ]
}
```

### Real-time Streaming API

#### GET /api/hunts/:id/stream
Server-Sent Events stream for real-time hunt updates.

**Event Types:**
- `log`: Standard output from Strix process
- `error`: Error output from Strix process
- `vulnerability`: New vulnerability discovered
- `agent_event`: Agent coordination event
- `exit`: Process completion

**Example Event:**
```
data: {"type":"vulnerability","data":{"title":"SQL Injection","severity":"critical"},"timestamp":"2024-01-01T12:00:00Z"}
```

### Settings API

#### GET /api/settings
Get current application settings.

#### POST /api/settings
Update application settings.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](../CONTRIBUTING.md) for details.

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Add tests** for new functionality
5. **Run the test suite**: `npm test`
6. **Commit your changes**: `git commit -m 'Add amazing feature'`
7. **Push to the branch**: `git push origin feature/amazing-feature`
8. **Open a Pull Request**

### Code Style Guidelines

- Use TypeScript with strict mode
- Follow the existing component patterns
- Add comprehensive JSDoc comments
- Maintain test coverage above 80%
- Use meaningful variable and function names
- Keep components small and focused

## 📄 License

TYGR Security Agent is released under the MIT License. See [LICENSE](../LICENSE) for details.

## 🙏 Acknowledgments

- Built on the powerful [Strix](https://github.com/strix/strix) security testing framework
- Inspired by enterprise security platforms like Snyk, Burp Suite, and Metasploit Pro
- Designed with security professionals and developers in mind

---

**Happy hacking!** 🐯🔒