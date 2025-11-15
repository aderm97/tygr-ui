'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useHuntStore } from '@/stores/hunt-store'
import { Hunt, HuntEvent, Vulnerability, AgentNode } from '@/types'
import { VulnerabilityFeed } from '@/components/vulnerability-feed'
import {
  Shield, Activity, BarChart3, Terminal, Users, AlertTriangle,
  CheckCircle, XCircle, Play, Pause, StopCircle, Download,
  ArrowLeft, Eye, EyeOff, Filter, Search
} from 'lucide-react'

export default function HuntMonitorPage() {
  const params = useParams()
  const huntId = params.id as string
  
  const { hunts, huntEvents, vulnerabilities, agentGraphs } = useHuntStore()
  const [hunt, setHunt] = useState<Hunt | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'agents' | 'findings' | 'resources'>('overview')
  const [showRawLogs, setShowRawLogs] = useState(false)
  const [logFilter, setLogFilter] = useState('')

  useEffect(() => {
    const foundHunt = hunts.find(h => h.id === huntId)
    setHunt(foundHunt || null)
  }, [hunts, huntId])

  if (!hunt) {
    return (
      <div className="min-h-screen bg-tygr-black-900 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-tygr-black-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Hunt Not Found</h2>
          <p className="text-tygr-black-400">The requested security hunt could not be found.</p>
        </div>
      </div>
    )
  }

  const currentEvents = huntEvents[huntId] || []
  const currentVulnerabilities = vulnerabilities[huntId] || []
  const agentGraph = agentGraphs[huntId]

  const criticalVulnerabilities = currentVulnerabilities.filter(v => v.severity === 'critical')
  const highVulnerabilities = currentVulnerabilities.filter(v => v.severity === 'high')
  const mediumVulnerabilities = currentVulnerabilities.filter(v => v.severity === 'medium')
  const lowVulnerabilities = currentVulnerabilities.filter(v => v.severity === 'low')

  const filteredLogs = currentEvents.filter(event => 
    event.type === 'log_output' && 
    (!logFilter || event.data.message.toLowerCase().includes(logFilter.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-tygr-black-900">
      {/* Header */}
      <header className="border-b border-tygr-black-700 bg-tygr-black-800/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => window.history.back()}
                className="flex items-center space-x-2 text-tygr-black-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Dashboard</span>
              </button>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-tygr-gradient rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-heading font-bold text-white">
                    {hunt.name}
                  </h1>
                  <p className="text-sm text-tygr-black-400">
                    {hunt.target} • Started {new Date(hunt.startedAt!).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                hunt.status === 'running' 
                  ? 'bg-tygr-orange-500/20 text-tygr-orange-400 border border-tygr-orange-500/30'
                  : hunt.status === 'completed'
                  ? 'bg-tygr-low/20 text-tygr-low border border-tygr-low/30'
                  : hunt.status === 'failed'
                  ? 'bg-tygr-critical/20 text-tygr-critical border border-tygr-critical/30'
                  : 'bg-tygr-black-600 text-tygr-black-300'
              }`}>
                {hunt.status}
              </span>
              
              {hunt.status === 'running' && (
                <div className="flex items-center space-x-2">
                  <button className="px-3 py-1 bg-tygr-orange-500 text-white rounded-lg hover:bg-tygr-orange-600 transition-colors text-sm">
                    <Pause className="w-4 h-4" />
                  </button>
                  <button className="px-3 py-1 bg-tygr-critical text-white rounded-lg hover:bg-tygr-critical/80 transition-colors text-sm">
                    <StopCircle className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 mt-6">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'logs', label: 'Live Logs', icon: Terminal },
              { id: 'agents', label: 'Agent Graph', icon: Users },
              { id: 'findings', label: 'Findings', icon: AlertTriangle },
              { id: 'resources', label: 'Resources', icon: Activity }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === id
                    ? 'bg-tygr-orange-500 text-white shadow-tyglow'
                    : 'text-tygr-black-400 hover:text-tygr-black-200 hover:bg-tygr-black-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-tygr-black-400 text-sm">Total Vulnerabilities</p>
                    <p className="text-2xl font-bold text-white mt-1">{currentVulnerabilities.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-tygr-orange-500/20 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-tygr-orange-400" />
                  </div>
                </div>
              </div>

              <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-tygr-black-400 text-sm">Critical</p>
                    <p className="text-2xl font-bold text-tygr-critical mt-1">{criticalVulnerabilities.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-tygr-critical/20 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-tygr-critical" />
                  </div>
                </div>
              </div>

              <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-tygr-black-400 text-sm">Active Agents</p>
                    <p className="text-2xl font-bold text-white mt-1">{agentGraph ? Object.keys(agentGraph.nodes).length : 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-tygr-low/20 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-tygr-low" />
                  </div>
                </div>
              </div>

              <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-tygr-black-400 text-sm">Events Processed</p>
                    <p className="text-2xl font-bold text-white mt-1">{currentEvents.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-tygr-orange-500/20 rounded-lg flex items-center justify-center">
                    <Activity className="w-6 h-6 text-tygr-orange-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Vulnerabilities */}
              <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Vulnerabilities</h3>
                <div className="space-y-3">
                  {currentVulnerabilities.slice(0, 5).map((vuln) => (
                    <div key={vuln.id} className="flex items-center justify-between p-3 bg-tygr-black-700 rounded-lg">
                      <div>
                        <h4 className="font-medium text-white text-sm">{vuln.title}</h4>
                        <p className="text-tygr-black-400 text-xs">{vuln.location.endpoint || vuln.location.file}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        vuln.severity === 'critical' ? 'bg-tygr-critical/20 text-tygr-critical' :
                        vuln.severity === 'high' ? 'bg-tygr-orange-500/20 text-tygr-orange-400' :
                        vuln.severity === 'medium' ? 'bg-tygr-warning/20 text-tygr-warning' :
                        'bg-tygr-low/20 text-tygr-low'
                      }`}>
                        {vuln.severity}
                      </span>
                    </div>
                  ))}
                  {currentVulnerabilities.length === 0 && (
                    <p className="text-tygr-black-400 text-center py-4">No vulnerabilities found yet</p>
                  )}
                </div>
              </div>

              {/* Agent Status */}
              <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Agent Status</h3>
                <div className="space-y-3">
                  {agentGraph ? (
                    Object.values(agentGraph.nodes).slice(0, 5).map((agent: any) => (
                      <div key={agent.id} className="flex items-center justify-between p-3 bg-tygr-black-700 rounded-lg">
                        <div>
                          <h4 className="font-medium text-white text-sm">{agent.name}</h4>
                          <p className="text-tygr-black-400 text-xs">{agent.task}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          agent.status === 'running' ? 'bg-tygr-orange-500/20 text-tygr-orange-400' :
                          agent.status === 'completed' ? 'bg-tygr-low/20 text-tygr-low' :
                          agent.status === 'error' ? 'bg-tygr-critical/20 text-tygr-critical' :
                          'bg-tygr-black-600 text-tygr-black-300'
                        }`}>
                          {agent.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-tygr-black-400 text-center py-4">No agent data available</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl overflow-hidden">
            {/* Log Controls */}
            <div className="border-b border-tygr-black-700 p-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-tygr-black-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter logs..."
                    value={logFilter}
                    onChange={(e) => setLogFilter(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-tygr-black-700 border border-tygr-black-600 rounded-lg text-white placeholder-tygr-black-400 focus:outline-none focus:border-tygr-orange-500"
                  />
                </div>
                
                <button
                  onClick={() => setShowRawLogs(!showRawLogs)}
                  className="flex items-center space-x-2 px-3 py-2 bg-tygr-black-700 border border-tygr-black-600 rounded-lg text-tygr-black-400 hover:text-white transition-colors"
                >
                  {showRawLogs ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span className="text-sm">{showRawLogs ? 'Hide Raw' : 'Show Raw'}</span>
                </button>
              </div>
              
              <button className="flex items-center space-x-2 px-3 py-2 bg-tygr-orange-500 text-white rounded-lg hover:bg-tygr-orange-600 transition-colors">
                <Download className="w-4 h-4" />
                <span className="text-sm">Export Logs</span>
              </button>
            </div>

            {/* Log Content */}
            <div className="h-96 overflow-y-auto font-mono text-sm">
              {filteredLogs.length === 0 ? (
                <div className="p-8 text-center text-tygr-black-400">
                  <Terminal className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No logs available yet</p>
                </div>
              ) : (
                <div className="p-4 space-y-1">
                  {filteredLogs.map((event, index) => (
                    <div key={index} className="flex">
                      <span className="text-tygr-black-500 mr-4 flex-shrink-0">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                      <code className={`flex-1 ${
                        event.data.level === 'error' ? 'text-tygr-critical' :
                        event.data.level === 'warning' ? 'text-tygr-warning' :
                        'text-tygr-black-300'
                      }`}>
                        {showRawLogs ? JSON.stringify(event.data) : event.data.message}
                      </code>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'findings' && (
          <div className="space-y-6">
            {/* Vulnerability Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-tygr-critical/10 border border-tygr-critical/20 rounded-xl p-4">
                <div className="text-tygr-critical text-2xl font-bold">{criticalVulnerabilities.length}</div>
                <div className="text-tygr-critical text-sm">Critical</div>
              </div>
              <div className="bg-tygr-orange-500/10 border border-tygr-orange-500/20 rounded-xl p-4">
                <div className="text-tygr-orange-400 text-2xl font-bold">{highVulnerabilities.length}</div>
                <div className="text-tygr-orange-400 text-sm">High</div>
              </div>
              <div className="bg-tygr-warning/10 border border-tygr-warning/20 rounded-xl p-4">
                <div className="text-tygr-warning text-2xl font-bold">{mediumVulnerabilities.length}</div>
                <div className="text-tygr-warning text-sm">Medium</div>
              </div>
              <div className="bg-tygr-low/10 border border-tygr-low/20 rounded-xl p-4">
                <div className="text-tygr-low text-2xl font-bold">{lowVulnerabilities.length}</div>
                <div className="text-tygr-low text-sm">Low</div>
              </div>
            </div>

            {/* Live Vulnerability Feed */}
            <VulnerabilityFeed huntId={huntId} />

            {/* Static Vulnerabilities Table (for historical data) */}
            <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-tygr-black-700">
                <h3 className="text-lg font-semibold text-white">Historical Vulnerabilities</h3>
              </div>
              
              <div className="divide-y divide-tygr-black-700">
                {currentVulnerabilities.map((vuln) => (
                  <div key={vuln.id} className="p-4 hover:bg-tygr-black-700/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            vuln.severity === 'critical' ? 'bg-tygr-critical/20 text-tygr-critical' :
                            vuln.severity === 'high' ? 'bg-tygr-orange-500/20 text-tygr-orange-400' :
                            vuln.severity === 'medium' ? 'bg-tygr-warning/20 text-tygr-warning' :
                            'bg-tygr-low/20 text-tygr-low'
                          }`}>
                            {vuln.severity.toUpperCase()}
                          </span>
                          <h4 className="font-semibold text-white">{vuln.title}</h4>
                        </div>
                        
                        <p className="text-tygr-black-300 text-sm mb-3">{vuln.description}</p>
                        
                        <div className="flex items-center space-x-4 text-xs text-tygr-black-400">
                          {vuln.location.endpoint && (
                            <span>Endpoint: {vuln.location.endpoint}</span>
                          )}
                          {vuln.location.file && (
                            <span>File: {vuln.location.file}:{vuln.location.line}</span>
                          )}
                          {vuln.cvssScore && (
                            <span>CVSS: {vuln.cvssScore}</span>
                          )}
                          <span>Found by: {vuln.discoveredBy}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <button className="px-3 py-1 bg-tygr-orange-500 text-white rounded-lg hover:bg-tygr-orange-600 transition-colors text-sm">
                          View PoC
                        </button>
                        <button className="px-3 py-1 bg-tygr-low text-white rounded-lg hover:bg-tygr-low/80 transition-colors text-sm">
                          Generate Fix
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {currentVulnerabilities.length === 0 && (
                  <div className="p-8 text-center text-tygr-black-400">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No vulnerabilities found yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'agents' && (
          <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Agent Coordination Graph</h3>
            {agentGraph ? (
              <div className="space-y-4">
                {Object.values(agentGraph.nodes).map((agent: any) => (
                  <div key={agent.id} className="bg-tygr-black-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-semibold text-white">{agent.name}</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          agent.status === 'running' ? 'bg-tygr-orange-500/20 text-tygr-orange-400' :
                          agent.status === 'completed' ? 'bg-tygr-low/20 text-tygr-low' :
                          agent.status === 'error' ? 'bg-tygr-critical/20 text-tygr-critical' :
                          'bg-tygr-black-600 text-tygr-black-300'
                        }`}>
                          {agent.status}
                        </span>
                      </div>
                      <div className="text-sm text-tygr-black-400">
                        Vulnerabilities: {agent.vulnerabilities_found || 0}
                      </div>
                    </div>
                    
                    <p className="text-tygr-black-300 text-sm mb-3">{agent.task}</p>
                    
                    <div className="flex items-center space-x-4 text-xs text-tygr-black-400">
                      <span>Created: {new Date(agent.createdAt).toLocaleTimeString()}</span>
                      <span>Tool Executions: {agent.toolExecutions || 0}</span>
                      <span>Iteration: {agent.iteration}/{agent.maxIterations}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-tygr-black-400">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No agent coordination data available yet</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="space-y-6">
            {/* Resource Usage */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
                <h4 className="font-semibold text-white mb-4">CPU Usage</h4>
                <div className="w-full bg-tygr-black-700 rounded-full h-2">
                  <div 
                    className="bg-tygr-orange-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${hunt.resourceUsage?.cpu || 0}%` }}
                  ></div>
                </div>
                <p className="text-tygr-black-400 text-sm mt-2">{hunt.resourceUsage?.cpu || 0}%</p>
              </div>

              <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
                <h4 className="font-semibold text-white mb-4">Memory Usage</h4>
                <div className="w-full bg-tygr-black-700 rounded-full h-2">
                  <div 
                    className="bg-tygr-low h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(hunt.resourceUsage?.memory || 0) / 100}%` }}
                  ></div>
                </div>
                <p className="text-tygr-black-400 text-sm mt-2">{hunt.resourceUsage?.memory || 0} MB</p>
              </div>

              <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
                <h4 className="font-semibold text-white mb-4">Network I/O</h4>
                <div className="w-full bg-tygr-black-700 rounded-full h-2">
                  <div 
                    className="bg-tygr-warning h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(hunt.resourceUsage?.network || 0) / 10}%` }}
                  ></div>
                </div>
                <p className="text-tygr-black-400 text-sm mt-2">{hunt.resourceUsage?.network || 0} MB/s</p>
              </div>
            </div>

            {/* Configuration Details */}
            <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Hunt Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-tygr-black-200 mb-2">Targets</h4>
                  <div className="space-y-2">
                    {hunt.config.targets.map((target, index) => (
                      <div key={index} className="text-sm text-tygr-black-300">
                        {target.type}: {target.value}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-tygr-black-200 mb-2">Agents</h4>
                  <div className="text-sm text-tygr-black-300">
                    {hunt.config.agentComposition.join(', ')}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-tygr-black-200 mb-2">LLM Provider</h4>
                  <div className="text-sm text-tygr-black-300 capitalize">
                    {hunt.config.llmProvider}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-tygr-black-200 mb-2">Profile</h4>
                  <div className="text-sm text-tygr-black-300 capitalize">
                    {hunt.config.profile.replace('_', ' ')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}