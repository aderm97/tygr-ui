'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useHuntStore } from '@/stores/hunt-store'
import { useHuntActions } from '@/stores/hunt-store'
import { HuntConfigurationWizard } from '@/components/hunt-configuration-wizard'
import { Shield, Search, Activity, BarChart3, Play, Plus, Trash2, AlertTriangle, ExternalLink } from 'lucide-react'

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'hunts' | 'results' | 'settings'>('dashboard')
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const { hunts, removeHunt, clearQueue, huntEvents, vulnerabilities } = useHuntStore()
  const { startHunt, failHunt } = useHuntActions()

  const runningHunts = hunts.filter(hunt => hunt.status === 'running')
  const completedHunts = hunts.filter(hunt => hunt.status === 'completed')
  const criticalVulnerabilities = Object.values(useHuntStore.getState().vulnerabilities).flat().filter(v => v.severity === 'critical')

  const handleHuntStarted = (huntId: string) => {
    console.log('Hunt started:', huntId)
    // Navigate to the hunt monitor page
    window.location.href = `/hunts/${huntId}`
  }

  const handleDeleteHunt = (huntId: string) => {
    if (confirm('Are you sure you want to delete this hunt?')) {
      removeHunt(huntId)
      // Also clear related events and vulnerabilities
      const store = useHuntStore.getState()
      store.clearHuntEvents?.(huntId)
      // Note: We would need to add a method to clear vulnerabilities by huntId
    }
  }

  const handleClearAllScans = () => {
    if (confirm('Are you sure you want to clear all scans? This action cannot be undone.')) {
      // Clear all hunts by setting the hunts array to empty
      useHuntStore.setState({
        hunts: [],
        huntEvents: {},
        vulnerabilities: {},
        queuedHunts: [],
        currentHunt: null,
        selectedHuntId: null
      })
      clearQueue()
    }
  }

  const quickActions = [
    {
      title: 'Quick Prowl',
      description: 'Fast security assessment',
      icon: Search,
      color: 'bg-tygr-orange-500',
      action: () => {
        const target = prompt('Enter target URL (e.g., https://example.com):')
        if (!target) return
        
        startHunt({
          name: `Quick Prowl - ${new Date().toLocaleDateString()}`,
          targets: [{ type: 'url', value: target }],
          instruction: 'Perform a quick security assessment focusing on common vulnerabilities and misconfigurations.',
          profile: 'quick_prowl',
          llmProvider: 'openai',
          agentComposition: ['reconnaissance', 'vulnerability_scanner'],
          credentials: {},
          notifications: { enabled: false },
          nonInteractive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }).catch(error => {
          console.error('Failed to start hunt:', error)
          alert(`Failed to start hunt: ${error.message}`)
        })
      }
    },
    {
      title: 'Deep Stalk',
      description: 'Comprehensive penetration test',
      icon: Activity,
      color: 'bg-tygr-critical',
      action: () => {
        const target = prompt('Enter target URL (e.g., https://example.com):')
        if (!target) return
        
        startHunt({
          name: `Deep Stalk - ${new Date().toLocaleDateString()}`,
          targets: [{ type: 'url', value: target }],
          instruction: 'Perform comprehensive penetration testing including reconnaissance, vulnerability scanning, exploitation, and validation.',
          profile: 'deep_stalk',
          llmProvider: 'openai',
          agentComposition: ['reconnaissance', 'vulnerability_scanner', 'exploitation', 'validation'],
          credentials: {},
          notifications: { enabled: false },
          nonInteractive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }).catch(error => {
          console.error('Failed to start hunt:', error)
          alert(`Failed to start hunt: ${error.message}`)
        })
      }
    },
    {
      title: 'New Hunt',
      description: 'Custom configuration',
      icon: Plus,
      color: 'bg-tygr-black-700',
      action: () => setIsWizardOpen(true)
    }
  ]

  return (
    <div className="min-h-screen bg-tygr-black-900">
      {/* Header */}
      <header className="border-b border-tygr-black-700 bg-tygr-black-800/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-8 h-8 bg-tygr-gradient rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -inset-1 bg-tygr-orange-500/20 rounded-lg blur-sm animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-xl font-heading font-bold text-white">
                  TYGR Security Agent
                </h1>
                <p className="text-sm text-tygr-black-400">
                  Enterprise Security Testing Platform
                </p>
              </div>
            </div>
            
            <nav className="flex space-x-1">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                { id: 'hunts', label: 'Hunts', icon: Activity },
                { id: 'results', label: 'Results', icon: Shield },
                { id: 'settings', label: 'Settings', icon: Search }
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
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Welcome Banner */}
            <div className="bg-security-gradient border border-tygr-black-700 rounded-xl p-8 text-center">
              <h2 className="text-3xl font-heading font-bold text-white mb-4">
                Welcome to TYGR Security Agent
              </h2>
              <p className="text-tygr-black-300 text-lg max-w-2xl mx-auto">
                Enterprise-grade security testing with AI-powered vulnerability detection. 
                Start your first security hunt or explore existing results.
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-tygr-black-400 text-sm">Running Hunts</p>
                    <p className="text-2xl font-bold text-white mt-1">{runningHunts.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-tygr-orange-500/20 rounded-lg flex items-center justify-center">
                    <Activity className="w-6 h-6 text-tygr-orange-400" />
                  </div>
                </div>
              </div>

              <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-tygr-black-400 text-sm">Completed Hunts</p>
                    <p className="text-2xl font-bold text-white mt-1">{completedHunts.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-tygr-low/20 rounded-lg flex items-center justify-center">
                    <Shield className="w-6 h-6 text-tygr-low" />
                  </div>
                </div>
              </div>

              <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-tygr-black-400 text-sm">Critical Vulnerabilities</p>
                    <p className="text-2xl font-bold text-tygr-critical mt-1">{criticalVulnerabilities.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-tygr-critical/20 rounded-lg flex items-center justify-center">
                    <Shield className="w-6 h-6 text-tygr-critical" />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="text-xl font-heading font-bold text-white mb-4">Quick Hunt Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6 text-left hover:border-tygr-orange-500/50 transition-all hover:scale-105 group"
                  >
                    <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <action.icon className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="text-lg font-semibold text-white mb-2">{action.title}</h4>
                    <p className="text-tygr-black-400 text-sm">{action.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Hunts */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-heading font-bold text-white">Recent Hunts</h3>
                {hunts.length > 0 && (
                  <button
                    onClick={handleClearAllScans}
                    className="flex items-center space-x-2 px-3 py-2 bg-tygr-critical/20 text-tygr-critical border border-tygr-critical/30 rounded-lg hover:bg-tygr-critical/30 transition-colors text-sm"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Clear All Scans</span>
                  </button>
                )}
              </div>
              <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl overflow-hidden">
                {hunts.length === 0 ? (
                  <div className="p-8 text-center text-tygr-black-400">
                    <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No hunts yet. Start your first security hunt!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-tygr-black-700">
                    {hunts.slice(0, 5).map((hunt) => (
                      <div key={hunt.id} className="p-4 hover:bg-tygr-black-700/50 transition-colors group">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <h4 className="font-semibold text-white">{hunt.name}</h4>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                hunt.status === 'running'
                                  ? 'bg-tygr-orange-500/20 text-tygr-orange-400'
                                  : hunt.status === 'completed'
                                  ? 'bg-tygr-low/20 text-tygr-low'
                                  : hunt.status === 'failed'
                                  ? 'bg-tygr-critical/20 text-tygr-critical'
                                  : 'bg-tygr-black-600 text-tygr-black-300'
                              }`}>
                                {hunt.status}
                              </span>
                            </div>
                            <p className="text-sm text-tygr-black-400 mt-1">{hunt.target}</p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className="text-sm text-tygr-black-400">
                              {hunt.vulnerabilityCount || 0} findings
                            </span>
                            <Link
                              href={`/hunts/${hunt.id}`}
                              className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-tygr-orange-500 text-white rounded-lg hover:bg-tygr-orange-600 transition-all text-sm"
                              title="View Hunt"
                            >
                              View
                            </Link>
                            <button
                              onClick={() => handleDeleteHunt(hunt.id)}
                              className="opacity-0 group-hover:opacity-100 p-2 text-tygr-black-400 hover:text-tygr-critical transition-all hover:bg-tygr-black-700 rounded-lg"
                              title="Delete Hunt"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'hunts' && (
          <div className="text-center py-12">
            <Activity className="w-16 h-16 text-tygr-black-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-tygr-black-400 mb-2">Hunt Management</h3>
            <p className="text-tygr-black-500">Coming soon - Advanced hunt configuration and management</p>
          </div>
        )}

        {activeTab === 'results' && (
          <div className="text-center py-12">
            <Shield className="w-16 h-16 text-tygr-black-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-tygr-black-400 mb-2">Results Analysis</h3>
            <p className="text-tygr-black-500">Coming soon - Comprehensive vulnerability analysis and reporting</p>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-tygr-black-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-tygr-black-400 mb-2">Settings & Configuration</h3>
            <p className="text-tygr-black-500">Coming soon - LLM providers, Docker settings, and team management</p>
          </div>
        )}
      </main>

      <HuntConfigurationWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onHuntStarted={handleHuntStarted}
      />
    </div>
  )
}
