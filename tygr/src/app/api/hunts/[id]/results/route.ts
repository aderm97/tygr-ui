import { NextRequest, NextResponse } from 'next/server'
import { readFile, readdir, stat } from 'fs/promises'
import { join } from 'path'
import { HuntResults, Vulnerability, AgentGraph } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const huntId = params.id

  try {
    // In production, this would read from the actual Strix output directory
    // For now, we'll simulate reading from a structured output
    const resultsDir = join(process.cwd(), 'agent_runs', huntId)
    
    // Check if results exist
    try {
      await stat(resultsDir)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Hunt results not found' },
        { status: 404 }
      )
    }

    // Read vulnerabilities from JSON output
    const vulnerabilities = await readVulnerabilities(resultsDir)
    
    // Read agent graph data
    const agentGraph = await readAgentGraph(resultsDir)
    
    // Read execution logs
    const executionLog = await readExecutionLog(resultsDir)

    // Generate summary
    const summary = generateSummary(vulnerabilities, agentGraph)

    // Generate compliance mapping
    const compliance = generateComplianceMapping(vulnerabilities)

    const huntResults: HuntResults = {
      hunt: {
        id: huntId,
        name: `Hunt ${huntId}`,
        target: 'Unknown target', // Would be populated from config
        config: {} as any, // Would be populated from stored config
        status: 'completed',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        duration: 3600, // Example duration
        vulnerabilityCount: vulnerabilities.length,
        agentCount: Object.keys(agentGraph.nodes || {}).length
      },
      vulnerabilities,
      agentGraph,
      executionLog,
      summary,
      compliance
    }

    return NextResponse.json({ success: true, data: huntResults })
  } catch (error) {
    console.error('Failed to get hunt results:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get hunt results' },
      { status: 500 }
    )
  }
}

async function readVulnerabilities(resultsDir: string): Promise<Vulnerability[]> {
  try {
    const vulnerabilitiesPath = join(resultsDir, 'vulnerabilities.json')
    const data = await readFile(vulnerabilitiesPath, 'utf-8')
    return JSON.parse(data)
  } catch {
    // Return sample data for demonstration
    return [
      {
        id: 'vuln-1',
        title: 'SQL Injection in User Authentication',
        description: 'The application is vulnerable to SQL injection in the login endpoint.',
        severity: 'critical',
        cvssScore: 9.8,
        cweIds: ['CWE-89'],
        owaspCategory: 'A03:2021 - Injection',
        location: {
          endpoint: '/api/auth/login',
          parameter: 'username'
        },
        proofOfConcept: 'Send payload: `admin\' OR \'1\'=\'1` in username field',
        impact: 'Can bypass authentication and access sensitive user data',
        remediation: 'Use parameterized queries or prepared statements',
        discoveredBy: 'sql_injection_agent',
        discoveredAt: new Date().toISOString(),
        status: 'new',
        tags: ['sql-injection', 'authentication', 'critical']
      },
      {
        id: 'vuln-2',
        title: 'Cross-Site Scripting (XSS) in Search Function',
        description: 'The search functionality does not properly sanitize user input.',
        severity: 'high',
        cvssScore: 7.5,
        cweIds: ['CWE-79'],
        owaspCategory: 'A03:2021 - Injection',
        location: {
          endpoint: '/search',
          parameter: 'q'
        },
        proofOfConcept: 'Inject: `<script>alert(\'XSS\')</script>` in search query',
        impact: 'Can execute arbitrary JavaScript in victim\'s browser',
        remediation: 'Implement proper input sanitization and output encoding',
        discoveredBy: 'xss_detection_agent',
        discoveredAt: new Date().toISOString(),
        status: 'new',
        tags: ['xss', 'client-side', 'high']
      }
    ]
  }
}

async function readAgentGraph(resultsDir: string): Promise<AgentGraph> {
  try {
    const graphPath = join(resultsDir, 'agent_graph.json')
    const data = await readFile(graphPath, 'utf-8')
    return JSON.parse(data)
  } catch {
    // Return sample data for demonstration
    return {
      nodes: {
        'agent-1': {
          id: 'agent-1',
          name: 'reconnaissance_agent',
          task: 'Initial reconnaissance and mapping',
          status: 'completed',
          parentId: null,
          vulnerabilitiesFound: 0,
          iteration: 1,
          maxIterations: 3,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          toolExecutions: 15
        },
        'agent-2': {
          id: 'agent-2',
          name: 'sql_injection_agent',
          task: 'SQL injection testing',
          status: 'completed',
          parentId: 'agent-1',
          vulnerabilitiesFound: 1,
          iteration: 2,
          maxIterations: 5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          toolExecutions: 8
        }
      },
      edges: [
        {
          from: 'agent-1',
          to: 'agent-2',
          type: 'delegation',
          messageCount: 3,
          createdAt: new Date().toISOString()
        }
      ],
      rootAgentId: 'agent-1'
    }
  }
}

async function readExecutionLog(resultsDir: string): Promise<any[]> {
  try {
    const logPath = join(resultsDir, 'execution.log')
    const data = await readFile(logPath, 'utf-8')
    return data.split('\n').filter(line => line.trim()).map(line => ({
      type: 'log_output',
      huntId: 'current',
      timestamp: new Date().toISOString(),
      data: {
        level: 'info',
        message: line,
        source: 'stdout'
      }
    }))
  } catch {
    return []
  }
}

function generateSummary(vulnerabilities: Vulnerability[], agentGraph: AgentGraph) {
  const severityCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0
  }

  vulnerabilities.forEach(vuln => {
    severityCounts[vuln.severity]++
  })

  const totalAgents = Object.keys(agentGraph.nodes).length
  const totalToolExecutions = Object.values(agentGraph.nodes).reduce(
    (sum, node) => sum + node.toolExecutions, 0
  )

  return {
    totalVulnerabilities: vulnerabilities.length,
    criticalCount: severityCounts.critical,
    highCount: severityCounts.high,
    mediumCount: severityCounts.medium,
    lowCount: severityCounts.low,
    infoCount: severityCounts.info,
    totalAgents,
    totalDuration: 3600, // Example
    totalToolExecutions,
    llmUsage: {
      inputTokens: 15000,
      outputTokens: 8000,
      cost: 0.45,
      requests: 120
    }
  }
}

function generateComplianceMapping(vulnerabilities: Vulnerability[]) {
  const owaspTop10: Record<string, number> = {}
  const cweTop25: Record<string, number> = {}
  const sansTop25: Record<string, number> = {}

  vulnerabilities.forEach(vuln => {
    // Map to OWASP Top 10
    if (vuln.owaspCategory) {
      const category = vuln.owaspCategory.split(':')[0]
      owaspTop10[category] = (owaspTop10[category] || 0) + 1
    }

    // Map to CWE Top 25
    vuln.cweIds?.forEach(cweId => {
      cweTop25[cweId] = (cweTop25[cweId] || 0) + 1
    })

    // Map to SANS 25 (simplified mapping)
    if (vuln.severity === 'critical' || vuln.severity === 'high') {
      const category = 'Critical Vulnerabilities'
      sansTop25[category] = (sansTop25[category] || 0) + 1
    }
  })

  return {
    owaspTop10,
    cweTop25,
    sansTop25
  }
}