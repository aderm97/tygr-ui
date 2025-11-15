'use client'

import { useState } from 'react'
import { useHuntActions } from '@/stores/hunt-store'
import { HuntConfig, HuntTarget, HuntProfile, LLMProvider } from '@/types'
import { 
  ArrowRight, ArrowLeft, Target, FileText, Users, Settings, 
  CheckCircle, Globe, GitBranch, Folder, Server, Key, Shield,
  Plus, Trash2, Eye, EyeOff
} from 'lucide-react'

interface HuntConfigurationWizardProps {
  isOpen: boolean
  onClose: () => void
  onHuntStarted: (huntId: string) => void
}

type WizardStep = 'target' | 'profile' | 'agents' | 'llm' | 'credentials' | 'review'

const HUNT_PROFILES: HuntProfile[] = [
  {
    id: 'quick_prowl',
    name: 'Quick Prowl',
    description: 'Fast security assessment for quick results',
    instruction: 'Perform a quick security assessment focusing on common vulnerabilities and misconfigurations.',
    agentComposition: ['reconnaissance', 'vulnerability_scanner'],
    estimatedDuration: '15-30 minutes'
  },
  {
    id: 'deep_stalk',
    name: 'Deep Stalk',
    description: 'Comprehensive penetration testing',
    instruction: 'Perform comprehensive penetration testing including reconnaissance, vulnerability scanning, exploitation, and validation.',
    agentComposition: ['reconnaissance', 'vulnerability_scanner', 'exploitation', 'validation'],
    estimatedDuration: '2-4 hours'
  },
  {
    id: 'api_hunter',
    name: 'API Hunter',
    description: 'Specialized API security testing',
    instruction: 'Focus on API security testing including authentication bypass, injection attacks, and business logic vulnerabilities.',
    agentComposition: ['api_scanner', 'authentication_tester', 'business_logic'],
    estimatedDuration: '1-2 hours'
  },
  {
    id: 'auth_ambush',
    name: 'Auth Ambush',
    description: 'Authentication and authorization testing',
    instruction: 'Comprehensive authentication and authorization testing including session management, privilege escalation, and access control.',
    agentComposition: ['authentication_tester', 'authorization_scanner', 'session_analyzer'],
    estimatedDuration: '1-3 hours'
  },
  {
    id: 'custom',
    name: 'Custom Hunt',
    description: 'Build your own security testing configuration',
    instruction: '',
    agentComposition: [],
    estimatedDuration: 'Varies'
  }
]

const AVAILABLE_AGENTS = [
  { id: 'reconnaissance', name: 'Reconnaissance', description: 'Discovers endpoints, files, and services' },
  { id: 'vulnerability_scanner', name: 'Vulnerability Scanner', description: 'Scans for common security vulnerabilities' },
  { id: 'exploitation', name: 'Exploitation', description: 'Attempts to exploit found vulnerabilities' },
  { id: 'validation', name: 'Validation', description: 'Validates findings and eliminates false positives' },
  { id: 'api_scanner', name: 'API Scanner', description: 'Specialized API security testing' },
  { id: 'authentication_tester', name: 'Auth Tester', description: 'Tests authentication mechanisms' },
  { id: 'authorization_scanner', name: 'Authorization Scanner', description: 'Checks access control and permissions' },
  { id: 'business_logic', name: 'Business Logic', description: 'Tests business logic vulnerabilities' },
  { id: 'session_analyzer', name: 'Session Analyzer', description: 'Analyzes session management' },
  { id: 'file_upload_tester', name: 'File Upload Tester', description: 'Tests file upload functionality' }
]

export function HuntConfigurationWizard({ isOpen, onClose, onHuntStarted }: HuntConfigurationWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('target')
  const [config, setConfig] = useState<Partial<HuntConfig>>({
    name: '',
    targets: [],
    instruction: '',
    profile: 'quick_prowl',
    llmProvider: 'openai',
    agentComposition: ['reconnaissance', 'vulnerability_scanner'],
    credentials: {},
    notifications: { enabled: false },
    nonInteractive: true
  })
  const { startHunt } = useHuntActions()

  const [showCredentials, setShowCredentials] = useState(false)
  const [targetInput, setTargetInput] = useState('')
  const [targetType, setTargetType] = useState<HuntTarget['type']>('url')

  if (!isOpen) return null

  const addTarget = () => {
    if (!targetInput.trim()) return
    
    const newTarget: HuntTarget = {
      type: targetType,
      value: targetInput.trim()
    }
    
    setConfig(prev => ({
      ...prev,
      targets: [...(prev.targets || []), newTarget]
    }))
    setTargetInput('')
  }

  const removeTarget = (index: number) => {
    setConfig(prev => ({
      ...prev,
      targets: prev.targets?.filter((_, i) => i !== index) || []
    }))
  }

  const updateCredentials = (field: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      credentials: {
        ...prev.credentials,
        [field]: value
      }
    }))
  }

  const toggleAgent = (agentId: string) => {
    setConfig(prev => {
      const currentAgents = prev.agentComposition || []
      const newAgents = currentAgents.includes(agentId)
        ? currentAgents.filter(id => id !== agentId)
        : [...currentAgents, agentId]
      
      return { ...prev, agentComposition: newAgents }
    })
  }

  const handleStartHunt = async () => {
    if (!config.name || !config.targets || config.targets.length === 0) {
      alert('Please provide a hunt name and at least one target')
      return
    }

    const fullConfig: HuntConfig = {
      name: config.name,
      targets: config.targets,
      instruction: config.instruction || '',
      profile: config.profile || 'custom',
      llmProvider: config.llmProvider || 'openai',
      agentComposition: config.agentComposition || [],
      credentials: config.credentials,
      notifications: config.notifications || { enabled: false },
      nonInteractive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    try {
      const hunt = await startHunt(fullConfig)
      onHuntStarted(hunt.id)
      onClose()
    } catch (error) {
      console.error('Failed to start hunt:', error)
      alert(`Failed to start hunt: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const steps: { id: WizardStep; label: string; icon: any }[] = [
    { id: 'target', label: 'Target', icon: Target },
    { id: 'profile', label: 'Profile', icon: FileText },
    { id: 'agents', label: 'Agents', icon: Users },
    { id: 'llm', label: 'LLM', icon: Settings },
    { id: 'credentials', label: 'Credentials', icon: Key },
    { id: 'review', label: 'Review', icon: CheckCircle }
  ]

  const renderStepContent = () => {
    switch (currentStep) {
      case 'target':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-tygr-black-200 mb-2">
                Hunt Name
              </label>
              <input
                type="text"
                value={config.name}
                onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Production API Security Scan"
                className="w-full px-3 py-2 bg-tygr-black-800 border border-tygr-black-600 rounded-lg text-white placeholder-tygr-black-400 focus:outline-none focus:border-tygr-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-tygr-black-200 mb-2">
                Add Targets
              </label>
              
              <div className="flex space-x-2 mb-4">
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as HuntTarget['type'])}
                  className="px-3 py-2 bg-tygr-black-800 border border-tygr-black-600 rounded-lg text-white focus:outline-none focus:border-tygr-orange-500"
                >
                  <option value="url">URL</option>
                  <option value="repository">Git Repository</option>
                  <option value="local_directory">Local Directory</option>
                  <option value="domain">Domain</option>
                  <option value="ip_address">IP Address</option>
                </select>
                
                <input
                  type="text"
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  placeholder={getTargetPlaceholder(targetType)}
                  className="flex-1 px-3 py-2 bg-tygr-black-800 border border-tygr-black-600 rounded-lg text-white placeholder-tygr-black-400 focus:outline-none focus:border-tygr-orange-500"
                />
                
                <button
                  onClick={addTarget}
                  className="px-4 py-2 bg-tygr-orange-500 text-white rounded-lg hover:bg-tygr-orange-600 transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </div>

              {/* Current Targets */}
              <div className="space-y-2">
                {config.targets?.map((target, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-tygr-black-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getTargetIcon(target.type)}
                      <div>
                        <div className="text-white text-sm">{target.value}</div>
                        <div className="text-tygr-black-400 text-xs capitalize">{target.type.replace('_', ' ')}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeTarget(index)}
                      className="text-tygr-black-400 hover:text-tygr-critical transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 'profile':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {HUNT_PROFILES.map(profile => (
                <div
                  key={profile.id}
                  onClick={() => setConfig(prev => ({ 
                    ...prev, 
                    profile: profile.id,
                    instruction: profile.instruction,
                    agentComposition: profile.agentComposition
                  }))}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    config.profile === profile.id
                      ? 'border-tygr-orange-500 bg-tygr-orange-500/10'
                      : 'border-tygr-black-600 hover:border-tygr-orange-500/50'
                  }`}
                >
                  <h3 className="font-semibold text-white mb-2">{profile.name}</h3>
                  <p className="text-tygr-black-400 text-sm mb-2">{profile.description}</p>
                  <div className="text-tygr-orange-400 text-xs">
                    Duration: {profile.estimatedDuration}
                  </div>
                </div>
              ))}
            </div>

            {config.profile === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-tygr-black-200 mb-2">
                  Custom Instruction
                </label>
                <textarea
                  value={config.instruction}
                  onChange={(e) => setConfig(prev => ({ ...prev, instruction: e.target.value }))}
                  placeholder="Describe the security testing objectives and scope..."
                  rows={4}
                  className="w-full px-3 py-2 bg-tygr-black-800 border border-tygr-black-600 rounded-lg text-white placeholder-tygr-black-400 focus:outline-none focus:border-tygr-orange-500"
                />
              </div>
            )}
          </div>
        )

      case 'agents':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {AVAILABLE_AGENTS.map(agent => (
                <div
                  key={agent.id}
                  onClick={() => toggleAgent(agent.id)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    config.agentComposition?.includes(agent.id)
                      ? 'border-tygr-orange-500 bg-tygr-orange-500/10'
                      : 'border-tygr-black-600 hover:border-tygr-orange-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-white">{agent.name}</h3>
                    {config.agentComposition?.includes(agent.id) && (
                      <CheckCircle className="w-5 h-5 text-tygr-orange-500" />
                    )}
                  </div>
                  <p className="text-tygr-black-400 text-sm">{agent.description}</p>
                </div>
              ))}
            </div>
          </div>
        )

      case 'llm':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-tygr-black-200 mb-2">
                LLM Provider
              </label>
              <select
                value={config.llmProvider}
                onChange={(e) => setConfig(prev => ({ ...prev, llmProvider: e.target.value }))}
                className="w-full px-3 py-2 bg-tygr-black-800 border border-tygr-black-600 rounded-lg text-white focus:outline-none focus:border-tygr-orange-500"
              >
                <option value="openai">OpenAI (GPT-4)</option>
                <option value="anthropic">Anthropic (Claude 3)</option>
                <option value="local">Local Model</option>
              </select>
            </div>

            {config.llmProvider === 'openai' && (
              <div>
                <label className="block text-sm font-medium text-tygr-black-200 mb-2">
                  OpenAI API Key
                </label>
                <input
                  type="password"
                  placeholder="sk-..."
                  className="w-full px-3 py-2 bg-tygr-black-800 border border-tygr-black-600 rounded-lg text-white placeholder-tygr-black-400 focus:outline-none focus:border-tygr-orange-500"
                />
              </div>
            )}

            {config.llmProvider === 'anthropic' && (
              <div>
                <label className="block text-sm font-medium text-tygr-black-200 mb-2">
                  Anthropic API Key
                </label>
                <input
                  type="password"
                  placeholder="sk-ant-..."
                  className="w-full px-3 py-2 bg-tygr-black-800 border border-tygr-black-600 rounded-lg text-white placeholder-tygr-black-400 focus:outline-none focus:border-tygr-orange-500"
                />
              </div>
            )}
          </div>
        )

      case 'credentials':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Target Credentials</h3>
              <button
                onClick={() => setShowCredentials(!showCredentials)}
                className="flex items-center space-x-2 text-tygr-black-400 hover:text-tygr-black-200 transition-colors"
              >
                {showCredentials ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span className="text-sm">{showCredentials ? 'Hide' : 'Show'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-tygr-black-200 mb-2">
                  Username
                </label>
                <input
                  type={showCredentials ? 'text' : 'password'}
                  value={config.credentials?.username || ''}
                  onChange={(e) => updateCredentials('username', e.target.value)}
                  placeholder="admin"
                  className="w-full px-3 py-2 bg-tygr-black-800 border border-tygr-black-600 rounded-lg text-white placeholder-tygr-black-400 focus:outline-none focus:border-tygr-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-tygr-black-200 mb-2">
                  Password
                </label>
                <input
                  type={showCredentials ? 'text' : 'password'}
                  value={config.credentials?.password || ''}
                  onChange={(e) => updateCredentials('password', e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-tygr-black-800 border border-tygr-black-600 rounded-lg text-white placeholder-tygr-black-400 focus:outline-none focus:border-tygr-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-tygr-black-200 mb-2">
                  API Key
                </label>
                <input
                  type={showCredentials ? 'text' : 'password'}
                  value={config.credentials?.apiKey || ''}
                  onChange={(e) => updateCredentials('apiKey', e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-tygr-black-800 border border-tygr-black-600 rounded-lg text-white placeholder-tygr-black-400 focus:outline-none focus:border-tygr-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-tygr-black-200 mb-2">
                  Token
                </label>
                <input
                  type={showCredentials ? 'text' : 'password'}
                  value={config.credentials?.token || ''}
                  onChange={(e) => updateCredentials('token', e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-tygr-black-800 border border-tygr-black-600 rounded-lg text-white placeholder-tygr-black-400 focus:outline-none focus:border-tygr-orange-500"
                />
              </div>
            </div>
          </div>
        )

      case 'review':
        return (
          <div className="space-y-6">
            <div className="bg-tygr-black-800 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-4">Hunt Configuration Summary</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-tygr-black-400">Name:</span>
                  <span className="text-white">{config.name}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-tygr-black-400">Targets:</span>
                  <span className="text-white">{config.targets?.length || 0}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-tygr-black-400">Profile:</span>
                  <span className="text-white">
                    {HUNT_PROFILES.find(p => p.id === config.profile)?.name}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-tygr-black-400">Agents:</span>
                  <span className="text-white">{config.agentComposition?.length || 0}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-tygr-black-400">LLM Provider:</span>
                  <span className="text-white capitalize">{config.llmProvider}</span>
                </div>
              </div>
            </div>

            <div className="bg-tygr-orange-500/10 border border-tygr-orange-500/30 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-tygr-orange-400 mb-2">
                <Shield className="w-4 h-4" />
                <span className="font-semibold">Security Notice</span>
              </div>
              <p className="text-tygr-black-300 text-sm">
                This security hunt will be executed in an isolated Docker environment. 
                All findings will be logged and available for review upon completion.
              </p>
            </div>
          </div>
        )
    }
  }

  const getTargetIcon = (type: HuntTarget['type']) => {
    switch (type) {
      case 'url': return <Globe className="w-4 h-4 text-tygr-orange-400" />
      case 'repository': return <GitBranch className="w-4 h-4 text-tygr-orange-400" />
      case 'local_directory': return <Folder className="w-4 h-4 text-tygr-orange-400" />
      case 'domain': return <Server className="w-4 h-4 text-tygr-orange-400" />
      case 'ip_address': return <Server className="w-4 h-4 text-tygr-orange-400" />
      default: return <Target className="w-4 h-4 text-tygr-orange-400" />
    }
  }

  const getTargetPlaceholder = (type: HuntTarget['type']) => {
    switch (type) {
      case 'url': return 'https://example.com'
      case 'repository': return 'https://github.com/user/repo.git'
      case 'local_directory': return '/path/to/directory'
      case 'domain': return 'example.com'
      case 'ip_address': return '192.168.1.1'
      default: return 'Enter target'
    }
  }

  const currentStepIndex = steps.findIndex(step => step.id === currentStep)
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === steps.length - 1

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-tygr-black-900 border border-tygr-black-700 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b border-tygr-black-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-heading font-bold text-white">
                Configure Security Hunt
              </h2>
              <p className="text-tygr-black-400 mt-1">
                Step {currentStepIndex + 1} of {steps.length}: {steps[currentStepIndex].label}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-tygr-black-400 hover:text-white transition-colors"
            >
              ×
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex space-x-4 mt-6">
            {steps.map((step, index) => {
              const StepIcon = step.icon
              const isActive = step.id === currentStep
              const isCompleted = index < currentStepIndex
              
              return (
                <div key={step.id} className="flex items-center space-x-2">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    isActive 
                      ? 'border-tygr-orange-500 bg-tygr-orange-500 text-white' 
                      : isCompleted
                      ? 'border-tygr-orange-500 bg-tygr-orange-500 text-white'
                      : 'border-tygr-black-600 text-tygr-black-400'
                  }`}>
                    {isCompleted ? <CheckCircle className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                  </div>
                  <span className={`text-sm font-medium ${
                    isActive || isCompleted ? 'text-white' : 'text-tygr-black-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="border-t border-tygr-black-700 p-6">
          <div className="flex justify-between">
            <button
              onClick={() => {
                if (!isFirstStep) {
                  const prevStep = steps[currentStepIndex - 1].id
                  setCurrentStep(prevStep)
                } else {
                  onClose()
                }
              }}
              className="px-4 py-2 border border-tygr-black-600 text-tygr-black-300 rounded-lg hover:bg-tygr-black-800 transition-colors flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isFirstStep ? 'Cancel' : 'Back'}</span>
            </button>

            <button
              onClick={() => {
                if (!isLastStep) {
                  const nextStep = steps[currentStepIndex + 1].id
                  setCurrentStep(nextStep)
                } else {
                  handleStartHunt()
                }
              }}
              className="px-6 py-2 bg-tygr-orange-500 text-white rounded-lg hover:bg-tygr-orange-600 transition-colors flex items-center space-x-2"
            >
              <span>{isLastStep ? 'Start Hunt' : 'Next'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}