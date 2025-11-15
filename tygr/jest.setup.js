import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
    }
  },
  useParams() {
    return {}
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock Zustand stores
jest.mock('@/stores/hunt-store', () => ({
  useHuntStore: jest.fn(() => ({
    hunts: [],
    huntEvents: {},
    vulnerabilities: {},
    agentGraphs: {},
    currentHunt: null,
    addHunt: jest.fn(),
    updateHunt: jest.fn(),
    removeHunt: jest.fn(),
    addHuntEvent: jest.fn(),
    addVulnerability: jest.fn(),
  })),
  useHuntActions: jest.fn(() => ({
    startHunt: jest.fn(),
    completeHunt: jest.fn(),
    failHunt: jest.fn(),
    recordVulnerability: jest.fn(),
    recordHuntEvent: jest.fn(),
  })),
}))

// Mock environment variables
process.env.STRIX_LLM = 'openai/gpt-4'
process.env.LLM_API_KEY = 'test-api-key'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

// Suppress console errors in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
}