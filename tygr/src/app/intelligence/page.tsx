'use client'

import { useState, useMemo } from 'react'
import { useHuntStore } from '@/stores/hunt-store'
import { Vulnerability, Hunt } from '@/types'
import { 
  Shield, Search, BarChart3, Filter, Download, AlertTriangle, 
  CheckCircle, XCircle, TrendingUp, Users, Target, Clock,
  Eye, EyeOff, Copy, ExternalLink, FileText, Database
} from 'lucide-react'

export default function IntelligenceCenter() {
  const { hunts, vulnerabilities } = useHuntStore()
  const [activeTab, setActiveTab] = useState<'overview' | 'vulnerabilities' | 'compliance' | 'trends'>('overview')
  const [severityFilter, setSeverityFilter] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedHunt, setSelectedHunt] = useState<string>('all')

  // Aggregate all vulnerabilities from all hunts
  const allVulnerabilities = useMemo(() => {
    return Object.values(vulnerabilities).flat()
  }, [vulnerabilities])

  // Filter vulnerabilities based on current filters
  const filteredVulnerabilities = useMemo(() => {
    return allVulnerabilities.filter(vuln => {
      // Severity filter
      if (severityFilter.length > 0 && !severityFilter.includes(vuln.severity)) {
        return false
      }
      
      // Status filter
      if (statusFilter.length > 0 && !statusFilter.includes(vuln.status)) {
        return false
      }
      
      // Search query
      if (searchQuery && !vuln.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !vuln.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !vuln.location.endpoint?.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !vuln.location.file?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      
      // Hunt filter
      if (selectedHunt !== 'all') {
        // This would require mapping vulnerabilities to hunts, which we don't have directly
        // For now, we'll skip hunt filtering until we have that data structure
        return true
      }
      
      return true
    })
  }, [allVulnerabilities, severityFilter, statusFilter, searchQuery, selectedHunt])

  // Statistics
  const stats = useMemo(() => {
    const critical = allVulnerabilities.filter(v => v.severity === 'critical').length
    const high = allVulnerabilities.filter(v => v.severity === 'high').length
    const medium = allVulnerabilities.filter(v => v.severity === 'medium').length
    const low = allVulnerabilities.filter(v => v.severity === 'low').length
    const info = allVulnerabilities.filter(v => v.severity === 'info').length
    
    const newCount = allVulnerabilities.filter(v => v.status === 'new').length
    const confirmedCount = allVulnerabilities.filter(v => v.status === 'confirmed').length
    const falsePositiveCount = allVulnerabilities.filter(v => v.status === 'false_positive').length
    const remediatedCount = allVulnerabilities.filter(v => v.status === 'remediated').length
    
    const totalCVSS = allVulnerabilities.reduce((sum, v) => sum + (v.cvssScore || 0), 0)
    const averageCVSS = allVulnerabilities.length > 0 ? totalCVSS / allVulnerabilities.length : 0
    
    return {
      critical, high, medium, low, info,
      newCount, confirmedCount, falsePositiveCount, remediatedCount,
      averageCVSS: averageCVSS.toFixed(1),
      total: allVulnerabilities.length
    }
  }, [allVulnerabilities])

  // Vulnerability trends by type
  const vulnerabilityTypes = useMemo(() => {
    const types: Record<string, number> = {}
    allVulnerabilities.forEach(vuln => {
      const type = vuln.title.split(' ')[0] // Simple type extraction
      types[type] = (types[type] || 0) + 1
    })
    return Object.entries(types)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
  }, [allVulnerabilities])

  // Compliance mapping
  const complianceData = useMemo(() => {
    const owasp: Record<string, number> = {}
    const cwe: Record<string, number> = {}
    
    allVulnerabilities.forEach(vuln => {
      // Map OWASP categories
      if (vuln.owaspCategory) {
        owasp[vuln.owaspCategory] = (owasp[vuln.owaspCategory] || 0) + 1
      }
      
      // Map CWE IDs
      if (vuln.cweIds) {
        vuln.cweIds.forEach(cweId => {
          cwe[cweId] = (cwe[cweId] || 0) + 1
        })
      }
    })
    
    return { owasp, cwe }
  }, [allVulnerabilities])

  const toggleSeverityFilter = (severity: string) => {
    setSeverityFilter(prev => 
      prev.includes(severity) 
        ? prev.filter(s => s !== severity)
        : [...prev, severity]
    )
  }

  const toggleStatusFilter = (status: string) => {
    setStatusFilter(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    )
  }

  const exportVulnerabilities = () => {
    const data = {
      exportDate: new Date().toISOString(),
      totalVulnerabilities: filteredVulnerabilities.length,
      vulnerabilities: filteredVulnerabilities
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tygr-vulnerabilities-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-tygr-black-900">
      {/* Header */}
      <header className="border-b border-tygr-black-700 bg-tygr-black-800/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-tygr-gradient rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-heading font-bold text-white">
                  TYGR Intelligence Center
                </h1>
                <p className="text-sm text-tygr-black-400">
                  Comprehensive vulnerability analysis and reporting
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button 
                onClick={exportVulnerabilities}
                className="flex items-center space-x-2 px-4 py-2 bg-tygr-orange-500 text-white rounded-lg hover:bg-tygr-orange-600 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export Data</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 mt-6">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'vulnerabilities', label: 'Vulnerability Library', icon: Shield },
              { id: 'compliance', label: 'Compliance', icon: CheckCircle },
              { id: 'trends', label: 'Trends', icon: TrendingUp }
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
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-tygr-black-400 text-sm">Total Vulnerabilities</p>
                    <p className="text-3xl font-bold text-white mt-1">{stats.total}</p>
                  </div>
                  <div className="w-12 h-12 bg-tygr-orange-500/20 rounded-lg flex items-center justify-center">
                    <Shield className="w-6 h-6 text-tygr-orange-400" />
                  </div>
                </div>
              </div>

              <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-tygr-black-400 text-sm">Critical & High</p>
                    <p className="text-3xl font-bold text-tygr-critical mt-1">{stats.critical + stats.high}</p>
                  </div>
                  <div className="w-12 h-12 bg-tygr-critical/20 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-tygr-critical" />
                  </div>
                </div>
              </div>

              <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-tygr-black-400 text-sm">Average CVSS</p>
                    <p className="text-3xl font-bold text-white mt-1">{stats.averageCVSS}</p>
                  </div>
                  <div className="w-12 h-12 bg-tygr-warning/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-tygr-warning" />
                  </div>
                </div>
              </div>

              <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-tygr-black-400 text-sm">Remediated</p>
                    <p className="text-3xl font-bold text-tygr-low mt-1">{stats.remediatedCount}</p>
                  </div>
                  <div className="w-12 h-12 bg-tygr-low/20 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-tygr-low" />
                  </div>
                </div>
              </div>
            </div>

            {/* Severity Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Severity Distribution</h3>
                <div className="space-y-4">
                  {[
                    { severity: 'critical', count: stats.critical, color: 'bg-tygr-critical', text: 'text-tygr-critical' },
                    { severity: 'high', count: stats.high, color: 'bg-tygr-orange-500', text: 'text-tygr-orange-400' },
                    { severity: 'medium', count: stats.medium, color: 'bg-tygr-warning', text: 'text-tygr-warning' },
                    { severity: 'low', count: stats.low, color: 'bg-tygr-low', text: 'text-tygr-low' },
                    { severity: 'info', count: stats.info, color: 'bg-tygr-black-600', text: 'text-tygr-black-300' }
                  ].map(({ severity, count, color, text }) => (
                    <div key={severity} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 ${color} rounded-full`}></div>
                        <span className="text-sm font-medium text-white capitalize">{severity}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="w-32 bg-tygr-black-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${color} transition-all duration-300`}
                            style={{ width: `${(count / stats.total) * 100}%` }}
                          ></div>
                        </div>
                        <span className={`text-sm font-medium ${text} w-8 text-right`}>{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Distribution */}
              <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Status Distribution</h3>
                <div className="space-y-4">
                  {[
                    { status: 'new', count: stats.newCount, color: 'bg-tygr-orange-500', text: 'text-tygr-orange-400' },
                    { status: 'confirmed', count: stats.confirmedCount, color: 'bg-tygr-critical', text: 'text-tygr-critical' },
                    { status: 'false_positive', count: stats.falsePositiveCount, color: 'bg-tygr-black-600', text: 'text-tygr-black-300' },
                    { status: 'remediated', count: stats.remediatedCount, color: 'bg-tygr-low', text: 'text-tygr-low' }
                  ].map(({ status, count, color, text }) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 ${color} rounded-full`}></div>
                        <span className="text-sm font-medium text-white capitalize">{status.replace('_', ' ')}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="w-32 bg-tygr-black-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${color} transition-all duration-300`}
                            style={{ width: `${(count / stats.total) * 100}%` }}
                          ></div>
                        </div>
                        <span className={`text-sm font-medium ${text} w-8 text-right`}>{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Vulnerability Types */}
            <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Top Vulnerability Types</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {vulnerabilityTypes.map(([type, count]) => (
                  <div key={type} className="bg-tygr-black-700 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-white mb-1">{count}</div>
                    <div className="text-sm text-tygr-black-300 truncate" title={type}>
                      {type}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'vulnerabilities' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-tygr-black-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search vulnerabilities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-tygr-black-700 border border-tygr-black-600 rounded-lg text-white placeholder-tygr-black-400 focus:outline-none focus:border-tygr-orange-500"
                  />
                </div>

                {/* Severity Filters */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-tygr-black-400">Severity:</span>
                  {['critical', 'high', 'medium', 'low', 'info'].map(severity => (
                    <button
                      key={severity}
                      onClick={() => toggleSeverityFilter(severity)}
                      className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                        severityFilter.includes(severity)
                          ? severity === 'critical' ? 'bg-tygr-critical text-white' :
                            severity === 'high' ? 'bg-tygr-orange-500 text-white' :
                            severity === 'medium' ? 'bg-tygr-warning text-white' :
                            severity === 'low' ? 'bg-tygr-low text-white' :
                            'bg-tygr-black-600 text-white'
                          : 'bg-tygr-black-700 text-tygr-black-400 hover:bg-tygr-black-600'
                      }`}
                    >
                      {severity}
                    </button>
                  ))}
                </div>

                {/* Status Filters */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-tygr-black-400">Status:</span>
                  {['new', 'confirmed', 'false_positive', 'remediated'].map(status => (
                    <button
                      key={status}
                      onClick={() => toggleStatusFilter(status)}
                      className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                        statusFilter.includes(status)
                          ? status === 'new' ? 'bg-tygr-orange-500 text-white' :
                            status === 'confirmed' ? 'bg-tygr-critical text-white' :
                            status === 'false_positive' ? 'bg-tygr-black-600 text-white' :
                            'bg-tygr-low text-white'
                          : 'bg-tygr-black-700 text-tygr-black-400 hover:bg-tygr-black-600'
                      }`}
                    >
                      {status.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Results Count */}
            <div className="flex items-center justify-between">
              <p className="text-tygr-black-400">
                Showing {filteredVulnerabilities.length} of {allVulnerabilities.length} vulnerabilities
              </p>
              
              <div className="flex items-center space-x-4">
                <select
                  value={selectedHunt}
                  onChange={(e) => setSelectedHunt(e.target.value)}
                  className="px-3 py-2 bg-tygr-black-800 border border-tygr-black-600 rounded-lg text-white focus:outline-none focus:border-tygr-orange-500"
                >
                  <option value="all">All Hunts</option>
                  {hunts.map(hunt => (
                    <option key={hunt.id} value={hunt.id}>{hunt.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Vulnerabilities Grid */}
            <div className="grid grid-cols-1 gap-4">
              {filteredVulnerabilities.map((vuln) => (
                <div key={vuln.id} className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6 hover:border-tygr-orange-500/50 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          vuln.severity === 'critical' ? 'bg-tygr-critical/20 text-tygr-critical' :
                          vuln.severity === 'high' ? 'bg-tygr-orange-500/20 text-tygr-orange-400' :
                          vuln.severity === 'medium' ? 'bg-tygr-warning/20 text-tygr-warning' :
                          vuln.severity === 'low' ? 'bg-tygr-low/20 text-tygr-low' :
                          'bg-tygr-black-600 text-tygr-black-300'
                        }`}>
                          {vuln.severity.toUpperCase()}
                        </span>
                        
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          vuln.status === 'new' ? 'bg-tygr-orange-500/20 text-tygr-orange-400' :
                          vuln.status === 'confirmed' ? 'bg-tygr-critical/20 text-tygr-critical' :
                          vuln.status === 'false_positive' ? 'bg-tygr-black-600 text-tygr-black-300' :
                          'bg-tygr-low/20 text-tygr-low'
                        }`}>
                          {vuln.status.replace('_', ' ')}
                        </span>
                        
                        {vuln.cvssScore && (
                          <span className="px-2 py-1 bg-tygr-black-700 text-tygr-black-300 rounded text-xs">
                            CVSS: {vuln.cvssScore}
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-xl font-semibold text-white mb-2">{vuln.title}</h3>
                      <p className="text-tygr-black-300 mb-4">{vuln.description}</p>
                      
                      <div className="flex items-center space-x-6 text-sm text-tygr-black-400">
                        {vuln.location.endpoint && (
                          <div className="flex items-center space-x-1">
                            <Target className="w-4 h-4" />
                            <span>{vuln.location.endpoint}</span>
                          </div>
                        )}
                        
                        {vuln.location.file && (
                          <div className="flex items-center space-x-1">
                            <FileText className="w-4 h-4" />
                            <span>{vuln.location.file}:{vuln.location.line}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(vuln.discoveredAt).toLocaleDateString()}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4" />
                          <span>{vuln.discoveredBy}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button 
                        className="p-2 text-tygr-black-400 hover:text-tygr-orange-400 transition-colors"
                        title="View Proof of Concept"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        className="p-2 text-tygr-black-400 hover:text-tygr-low transition-colors"
                        title="Generate Fix"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button 
                        className="p-2 text-tygr-black-400 hover:text-tygr-critical transition-colors"
                        title="Mark as False Positive"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Tags and Compliance */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {vuln.tags?.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-tygr-black-700 text-tygr-black-300 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                      
                      {vuln.owaspCategory && (
                        <span className="px-2 py-1 bg-tygr-orange-500/20 text-tygr-orange-400 rounded text-xs">
                          OWASP: {vuln.owaspCategory}
                        </span>
                      )}
                      
                      {vuln.cweIds?.map(cweId => (
                        <span key={cweId} className="px-2 py-1 bg-tygr-low/20 text-tygr-low rounded text-xs">
                          CWE-{cweId}
                        </span>
                      ))}
                    </div>
                    
                    <button className="text-tygr-orange-400 hover:text-tygr-orange-300 transition-colors text-sm flex items-center space-x-1">
                      <span>View Details</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              
              {filteredVulnerabilities.length === 0 && (
                <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-12 text-center">
                  <Shield className="w-16 h-16 text-tygr-black-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-tygr-black-400 mb-2">No Vulnerabilities Found</h3>
                  <p className="text-tygr-black-500">Try adjusting your filters or search criteria.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'compliance' && (
          <div className="space-y-6">
            {/* OWASP Top 10 */}
            <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">OWASP Top 10 Coverage</h3>
              <div className="space-y-3">
                {Object.entries(complianceData.owasp)
                  .sort(([,a], [,b]) => b - a)
                  .map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between p-3 bg-tygr-black-700 rounded-lg">
                      <span className="text-white font-medium">{category}</span>
                      <div className="flex items-center space-x-4">
                        <div className="w-32 bg-tygr-black-600 rounded-full h-2">
                          <div 
                            className="bg-tygr-orange-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(count / stats.total) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-tygr-orange-400 font-medium w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                
                {Object.keys(complianceData.owasp).length === 0 && (
                  <p className="text-tygr-black-400 text-center py-4">No OWASP compliance data available</p>
                )}
              </div>
            </div>

            {/* CWE Top 25 */}
            <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">CWE Top 25 Coverage</h3>
              <div className="space-y-3">
                {Object.entries(complianceData.cwe)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 10)
                  .map(([cweId, count]) => (
                    <div key={cweId} className="flex items-center justify-between p-3 bg-tygr-black-700 rounded-lg">
                      <span className="text-white font-medium">CWE-{cweId}</span>
                      <div className="flex items-center space-x-4">
                        <div className="w-32 bg-tygr-black-600 rounded-full h-2">
                          <div 
                            className="bg-tygr-low h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(count / stats.total) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-tygr-low font-medium w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                
                {Object.keys(complianceData.cwe).length === 0 && (
                  <p className="text-tygr-black-400 text-center py-4">No CWE compliance data available</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trends' && (
          <div className="space-y-6">
            <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Vulnerability Trends Over Time</h3>
              <div className="text-center py-12 text-tygr-black-400">
                <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Trend analysis and historical data visualization coming soon</p>
                <p className="text-sm mt-2">This feature will show vulnerability trends across multiple hunts over time</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}