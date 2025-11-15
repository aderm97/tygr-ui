// Core application types for TYGR Security Agent

// Hunt Configuration Types
export interface HuntTarget {
  type: 'url' | 'repository' | 'local_directory' | 'domain' | 'ip_address'
  value: string
  workspaceSubdir?: string
  clonedPath?: string
}

export interface HuntProfile {
  id: 'quick_prowl' | 'deep_stalk' | 'api_hunter' | 'auth_ambush' | 'custom'
  name: string
  description: string
  instruction: string
  agentComposition: string[]
  estimatedDuration: string
}

export interface LLMProvider {
  id: string
  name: string
  model: string
  apiKey?: string
  apiBase?: string
  timeout: number
  enabled: boolean
}

export interface HuntConfig {
  id?: string
  name: string
  targets: HuntTarget[]
  instruction?: string
  profile: HuntProfile['id']
  llmProvider: string
  agentComposition: string[]
  credentials?: {
    username?: string
    password?: string
    apiKey?: string
    token?: string
  }
  notifications?: {
    enabled: boolean
    webhooks?: string[]
    slack?: string
    email?: string
  }
  runName?: string
  nonInteractive: boolean
  createdAt?: string
  updatedAt?: string
}

// Hunt Execution Types
export type HuntStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface Hunt {
  id: string
  name: string
  target: string
  config: HuntConfig
  status: HuntStatus
  startedAt?: string
  completedAt?: string
  duration?: number
  processId?: number
  outputDir?: string
  vulnerabilityCount: number
  agentCount: number
  vulnerabilities?: Vulnerability[]
  resourceUsage?: {
    cpu: number
    memory: number
    network: number
  }
}

// Agent Coordination Types
export interface AgentNode {
  id: string
  name: string
  task: string
  status: 'running' | 'waiting' | 'completed' | 'error' | 'stopped'
  parentId: string | null
  vulnerabilitiesFound: number
  iteration: number
  maxIterations: number
  createdAt: string
  updatedAt: string
  toolExecutions: number
}

export interface AgentEdge {
  from: string
  to: string
  type: 'delegation' | 'message'
  messageCount: number
  createdAt: string
}

export interface AgentGraph {
  nodes: Record<string, AgentNode>
  edges: AgentEdge[]
  rootAgentId: string | null
}

export interface AgentMessage {
  id: string
  from: string
  to: string
  content: string
  messageType: 'query' | 'instruction' | 'information'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  timestamp: string
  delivered: boolean
  read: boolean
}

// Vulnerability Types
export interface Vulnerability {
  id: string
  title: string
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  cvssScore?: number
  cweIds?: string[]
  owaspCategory?: string
  location: {
    file?: string
    line?: number
    endpoint?: string
    parameter?: string
  }
  proofOfConcept: string
  impact: string
  remediation: string
  discoveredBy: string
  discoveredAt: string
  status: 'new' | 'confirmed' | 'false_positive' | 'remediated' | 'risk_accepted'
  fix?: {
    code: string
    description: string
    tested: boolean
  }
  tags: string[]
}

// Real-time Event Types
export type HuntEventType = 
  | 'hunt_started'
  | 'hunt_completed'
  | 'hunt_failed'
  | 'vulnerability_found'
  | 'agent_created'
  | 'agent_completed'
  | 'agent_message'
  | 'log_output'
  | 'resource_update'

export interface HuntEvent {
  type: HuntEventType
  huntId: string
  timestamp: string
  data: any
}

export interface LogOutputEvent {
  type: 'log_output'
  huntId: string
  timestamp: string
  data: {
    level: 'info' | 'warning' | 'error' | 'debug'
    message: string
    source: 'stdout' | 'stderr' | 'agent'
    agentId?: string
  }
}

export interface VulnerabilityFoundEvent {
  type: 'vulnerability_found'
  huntId: string
  timestamp: string
  data: {
    vulnerability: Omit<Vulnerability, 'id' | 'status'>
    agentId: string
  }
}

// Results and Reporting Types
export interface HuntResults {
  hunt: Hunt
  vulnerabilities: Vulnerability[]
  agentGraph: AgentGraph
  executionLog: LogOutputEvent[]
  summary: {
    totalVulnerabilities: number
    criticalCount: number
    highCount: number
    mediumCount: number
    lowCount: number
    infoCount: number
    totalAgents: number
    totalDuration: number
    totalToolExecutions: number
    llmUsage: {
      inputTokens: number
      outputTokens: number
      cost: number
      requests: number
    }
  }
  compliance: {
    owaspTop10: Record<string, number>
    cweTop25: Record<string, number>
    sansTop25: Record<string, number>
  }
}

// Settings and Configuration Types
export interface AppSettings {
  llmProviders: LLMProvider[]
  dockerSettings: {
    image: string
    autoPull: boolean
    resourceLimits: {
      cpu: number
      memory: string
      network: boolean
    }
  }
  notificationSettings: {
    enabled: boolean
    webhooks: string[]
    slackWebhook?: string
    email?: string
  }
  securitySettings: {
    credentialEncryption: boolean
    inputValidation: boolean
    rateLimiting: boolean
    auditLogging: boolean
  }
  uiSettings: {
    theme: 'light' | 'dark' | 'system'
    fontSize: 'small' | 'medium' | 'large'
    compactMode: boolean
    animations: boolean
  }
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasNext: boolean
  hasPrevious: boolean
}

// Real-time Streaming Types
export interface StreamEvent {
  type: 'log' | 'vulnerability' | 'agent_event' | 'status_update' | 'error'
  data: any
  timestamp: string
}

// File and Directory Types
export interface FileInfo {
  name: string
  path: string
  size: number
  type: 'file' | 'directory'
  modified: string
  permissions: string
}

export interface DirectoryListing {
  path: string
  files: FileInfo[]
}

// Compliance and Standards Types
export interface ComplianceMapping {
  standard: 'OWASP Top 10' | 'CWE Top 25' | 'SANS 25' | 'NIST' | 'ISO 27001'
  category: string
  description: string
  vulnerabilities: string[]
  coverage: number
}

// Export all types for easy importing
export type {
  HuntTarget as Target,
  HuntConfig as Config,
  Hunt as HuntInstance,
  AgentNode as Agent,
  Vulnerability as Vuln,
  HuntEvent as Event,
  AppSettings as Settings
}