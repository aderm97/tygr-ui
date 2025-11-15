'use client'

import { useState } from 'react'
import { 
  Settings, Key, Server, Shield, Bell, Palette, Users, 
  Save, TestTube, Download, Upload, Trash2, Plus,
  Eye, EyeOff, CheckCircle, XCircle, AlertTriangle
} from 'lucide-react'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'llm' | 'docker' | 'notifications' | 'security' | 'team'>('general')
  const [saving, setSaving] = useState(false)
  
  // Settings state
  const [settings, setSettings] = useState({
    // General Settings
    general: {
      appName: 'TYGR Security Agent',
      appVersion: '1.0.0',
      autoUpdate: true,
      telemetry: false,
      maxConcurrentHunts: 3,
      resultRetentionDays: 30
    },
    
    // LLM Providers
    llmProviders: [
      {
        id: 'openai',
        name: 'OpenAI',
        provider: 'openai',
        model: 'gpt-4',
        apiKey: '',
        apiBase: 'https://api.openai.com/v1',
        timeout: 30000,
        enabled: true,
        verified: false
      },
      {
        id: 'anthropic',
        name: 'Anthropic',
        provider: 'anthropic',
        model: 'claude-3-sonnet-20240229',
        apiKey: '',
        apiBase: 'https://api.anthropic.com',
        timeout: 30000,
        enabled: false,
        verified: false
      },
      {
        id: 'local',
        name: 'Local Model',
        provider: 'local',
        model: 'local-model',
        apiKey: '',
        apiBase: 'http://localhost:11434',
        timeout: 60000,
        enabled: false,
        verified: false
      }
    ],
    
    // Docker Settings
    docker: {
      image: 'strix:latest',
      autoPull: true,
      resourceLimits: {
        cpu: 2,
        memory: '4g',
        network: true
      },
      containerTimeout: 3600,
      cleanupOnExit: true
    },
    
    // Notification Settings
    notifications: {
      enabled: true,
      webhooks: [],
      slackWebhook: '',
      email: '',
      criticalFindings: true,
      huntCompletion: true,
      systemAlerts: false
    },
    
    // Security Settings
    security: {
      credentialEncryption: true,
      inputValidation: true,
      rateLimiting: true,
      auditLogging: true,
      sessionTimeout: 3600,
      twoFactorAuth: false
    },
    
    // UI Settings
    ui: {
      theme: 'dark' as 'light' | 'dark' | 'system',
      fontSize: 'medium' as 'small' | 'medium' | 'large',
      compactMode: false,
      animations: true,
      showTutorial: true
    }
  })

  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({})
  const [newWebhook, setNewWebhook] = useState('')

  const toggleApiKeyVisibility = (providerId: string) => {
    setShowApiKeys(prev => ({
      ...prev,
      [providerId]: !prev[providerId]
    }))
  }

  const updateSetting = (category: keyof typeof settings, path: string, value: any) => {
    setSettings(prev => {
      const keys = path.split('.')
      const lastKey = keys.pop()!
      
      // Create a deep copy of the settings
      const newSettings = JSON.parse(JSON.stringify(prev))
      
      // Navigate to the target object
      let target = newSettings[category]
      for (const key of keys) {
        target = target[key]
      }
      
      // Set the final value
      target[lastKey] = value
      
      return newSettings
    })
  }

  const updateLlmProvider = (index: number, field: string, value: any) => {
    setSettings(prev => {
      const updatedProviders = [...prev.llmProviders]
      updatedProviders[index] = { ...updatedProviders[index], [field]: value }
      return { ...prev, llmProviders: updatedProviders }
    })
  }

  const addLlmProvider = () => {
    setSettings(prev => ({
      ...prev,
      llmProviders: [
        ...prev.llmProviders,
        {
          id: `custom-${Date.now()}`,
          name: 'Custom Provider',
          provider: 'custom',
          model: 'custom-model',
          apiKey: '',
          apiBase: '',
          timeout: 30000,
          enabled: true,
          verified: false
        }
      ]
    }))
  }

  const removeLlmProvider = (index: number) => {
    if (settings.llmProviders[index].provider !== 'openai') {
      setSettings(prev => ({
        ...prev,
        llmProviders: prev.llmProviders.filter((_, i) => i !== index)
      }))
    }
  }

  const addWebhook = () => {
    if (newWebhook.trim()) {
      setSettings(prev => ({
        ...prev,
        notifications: {
          ...prev.notifications,
          webhooks: [...(prev.notifications.webhooks || []), newWebhook.trim()]
        }
      }))
      setNewWebhook('')
    }
  }

  const removeWebhook = (index: number) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        webhooks: prev.notifications.webhooks.filter((_, i) => i !== index)
      }
    }))
  }

  const testLlmProvider = async (index: number) => {
    const provider = settings.llmProviders[index]
    if (!provider.apiKey) {
      alert('Please enter an API key first')
      return
    }

    setSettings(prev => {
      const updatedProviders = [...prev.llmProviders]
      updatedProviders[index].verified = false
      return { ...prev, llmProviders: updatedProviders }
    })

    // Simulate API test
    setTimeout(() => {
      setSettings(prev => {
        const updatedProviders = [...prev.llmProviders]
        updatedProviders[index].verified = true
        return { ...prev, llmProviders: updatedProviders }
      })
    }, 2000)
  }

  const saveSettings = async () => {
    setSaving(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSaving(false)
    alert('Settings saved successfully!')
  }

  const exportSettings = () => {
    const data = {
      exportDate: new Date().toISOString(),
      settings: settings
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tygr-settings-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target?.result as string)
        if (importedSettings.settings) {
          setSettings(importedSettings.settings)
          alert('Settings imported successfully!')
        }
      } catch (error) {
        alert('Failed to import settings: Invalid file format')
      }
    }
    reader.readAsText(file)
    event.target.value = '' // Reset input
  }

  return (
    <div className="min-h-screen bg-tygr-black-900">
      {/* Header */}
      <header className="border-b border-tygr-black-700 bg-tygr-black-800/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-tygr-gradient rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-heading font-bold text-white">
                  TYGR Settings & Configuration
                </h1>
                <p className="text-sm text-tygr-black-400">
                  Manage application settings, LLM providers, and security configurations
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button 
                onClick={exportSettings}
                className="flex items-center space-x-2 px-4 py-2 border border-tygr-black-600 text-tygr-black-300 rounded-lg hover:bg-tygr-black-800 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
              
              <label className="flex items-center space-x-2 px-4 py-2 bg-tygr-orange-500 text-white rounded-lg hover:bg-tygr-orange-600 transition-colors cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Import</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={importSettings}
                  className="hidden"
                />
              </label>
              
              <button 
                onClick={saveSettings}
                disabled={saving}
                className="flex items-center space-x-2 px-4 py-2 bg-tygr-low text-white rounded-lg hover:bg-tygr-low/80 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 mt-6">
            {[
              { id: 'general', label: 'General', icon: Settings },
              { id: 'llm', label: 'LLM Providers', icon: Key },
              { id: 'docker', label: 'Docker', icon: Server },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'security', label: 'Security', icon: Shield },
              { id: 'team', label: 'Team', icon: Users }
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
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Application Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-tygr-black-200 mb-2">
                    Application Name
                  </label>
                  <input
                    type="text"
                    value={settings.general.appName}
                    onChange={(e) => updateSetting('general', 'appName', e.target.value)}
                    className="w-full px-3 py-2 bg-tygr-black-700 border border-tygr-black-600 rounded-lg text-white placeholder-tygr-black-400 focus:outline-none focus:border-tygr-orange-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-tygr-black-200 mb-2">
                    Version
                  </label>
                  <input
                    type="text"
                    value={settings.general.appVersion}
                    disabled
                    className="w-full px-3 py-2 bg-tygr-black-700 border border-tygr-black-600 rounded-lg text-tygr-black-400"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-tygr-black-200 mb-2">
                    Maximum Concurrent Hunts
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.general.maxConcurrentHunts}
                    onChange={(e) => updateSetting('general', 'maxConcurrentHunts', parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-tygr-black-700 border border-tygr-black-600 rounded-lg text-white focus:outline-none focus:border-tygr-orange-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-tygr-black-200 mb-2">
                    Result Retention (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={settings.general.resultRetentionDays}
                    onChange={(e) => updateSetting('general', 'resultRetentionDays', parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-tygr-black-700 border border-tygr-black-600 rounded-lg text-white focus:outline-none focus:border-tygr-orange-500"
                  />
                </div>
              </div>
              
              <div className="mt-6 space-y-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.general.autoUpdate}
                    onChange={(e) => updateSetting('general', 'autoUpdate', e.target.checked)}
                    className="w-4 h-4 text-tygr-orange-500 bg-tygr-black-700 border-tygr-black-600 rounded focus:ring-tygr-orange-500 focus:ring-2"
                  />
                  <span className="text-sm text-white">Automatically check for updates</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.general.telemetry}
                    onChange={(e) => updateSetting('general', 'telemetry', e.target.checked)}
                    className="w-4 h-4 text-tygr-orange-500 bg-tygr-black-700 border-tygr-black-600 rounded focus:ring-tygr-orange-500 focus:ring-2"
                  />
                  <span className="text-sm text-white">Send anonymous usage statistics</span>
                </label>
              </div>
            </div>

            {/* UI Settings */}
            <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Interface Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-tygr-black-200 mb-2">
                    Theme
                  </label>
                  <select
                    value={settings.ui.theme}
                    onChange={(e) => updateSetting('ui', 'theme', e.target.value)}
                    className="w-full px-3 py-2 bg-tygr-black-700 border border-tygr-black-600 rounded-lg text-white focus:outline-none focus:border-tygr-orange-500"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-tygr-black-200 mb-2">
                    Font Size
                  </label>
                  <select
                    value={settings.ui.fontSize}
                    onChange={(e) => updateSetting('ui', 'fontSize', e.target.value)}
                    className="w-full px-3 py-2 bg-tygr-black-700 border border-tygr-black-600 rounded-lg text-white focus:outline-none focus:border-tygr-orange-500"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-6 space-y-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.ui.compactMode}
                    onChange={(e) => updateSetting('ui', 'compactMode', e.target.checked)}
                    className="w-4 h-4 text-tygr-orange-500 bg-tygr-black-700 border-tygr-black-600 rounded focus:ring-tygr-orange-500 focus:ring-2"
                  />
                  <span className="text-sm text-white">Compact mode</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.ui.animations}
                    onChange={(e) => updateSetting('ui', 'animations', e.target.checked)}
                    className="w-4 h-4 text-tygr-orange-500 bg-tygr-black-700 border-tygr-black-600 rounded focus:ring-tygr-orange-500 focus:ring-2"
                  />
                  <span className="text-sm text-white">Enable animations</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.ui.showTutorial}
                    onChange={(e) => updateSetting('ui', 'showTutorial', e.target.checked)}
                    className="w-4 h-4 text-tygr-orange-500 bg-tygr-black-700 border-tygr-black-600 rounded focus:ring-tygr-orange-500 focus:ring-2"
                  />
                  <span className="text-sm text-white">Show tutorial for new features</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'llm' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">LLM Providers</h3>
              <button
                onClick={addLlmProvider}
                className="flex items-center space-x-2 px-4 py-2 bg-tygr-orange-500 text-white rounded-lg hover:bg-tygr-orange-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Provider</span>
              </button>
            </div>

            {settings.llmProviders.map((provider, index) => (
              <div key={provider.id} className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <h4 className="text-lg font-semibold text-white">{provider.name}</h4>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={provider.enabled}
                        onChange={(e) => updateLlmProvider(index, 'enabled', e.target.checked)}
                        className="w-4 h-4 text-tygr-orange-500 bg-tygr-black-700 border-tygr-black-600 rounded focus:ring-tygr-orange-500 focus:ring-2"
                      />
                      <span className="text-sm text-tygr-black-300">Enabled</span>
                    </label>
                    
                    {provider.verified && (
                      <div className="flex items-center space-x-1 text-tygr-low">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm">Verified</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => testLlmProvider(index)}
                      className="flex items-center space-x-2 px-3 py-1 bg-tygr-low text-white rounded-lg hover:bg-tygr-low/80 transition-colors text-sm"
                    >
                      <TestTube className="w-4 h-4" />
                      <span>Test</span>
                    </button>
                    
                    {provider.provider !== 'openai' && (
                      <button
                        onClick={() => removeLlmProvider(index)}
                        className="p-2 text-tygr-black-400 hover:text-tygr-critical transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-tygr-black-200 mb-2">
                      Provider Name
                    </label>
                    <input
                      type="text"
                      value={provider.name}
                      onChange={(e) => updateLlmProvider(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 bg-tygr-black-700 border border-tygr-black-600 rounded-lg text-white placeholder-tygr-black-400 focus:outline-none focus:border-tygr-orange-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-tygr-black-200 mb-2">
                      Model
                    </label>
                    <input
                      type="text"
                      value={provider.model}
                      onChange={(e) => updateLlmProvider(index, 'model', e.target.value)}
                      className="w-full px-3 py-2 bg-tygr-black-700 border border-tygr-black-600 rounded-lg text-white placeholder-tygr-black-400 focus:outline-none focus:border-tygr-orange-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-tygr-black-200 mb-2">
                      API Base URL
                    </label>
                    <input
                      type="text"
                      value={provider.apiBase}
                      onChange={(e) => updateLlmProvider(index, 'apiBase', e.target.value)}
                      className="w-full px-3 py-2 bg-tygr-black-700 border border-tygr-black-600 rounded-lg text-white placeholder-tygr-black-400 focus:outline-none focus:border-tygr-orange-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-tygr-black-200 mb-2">
                      Timeout (ms)
                    </label>
                    <input
                      type="number"
                      value={provider.timeout}
                      onChange={(e) => updateLlmProvider(index, 'timeout', parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-tygr-black-700 border border-tygr-black-600 rounded-lg text-white focus:outline-none focus:border-tygr-orange-500"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-tygr-black-200 mb-2">
                    API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKeys[provider.id] ? 'text' : 'password'}
                      value={provider.apiKey}
                      onChange={(e) => updateLlmProvider(index, 'apiKey', e.target.value)}
                      placeholder="Enter your API key..."
                      className="w-full px-3 py-2 bg-tygr-black-700 border border-tygr-black-600 rounded-lg text-white placeholder-tygr-black-400 focus:outline-none focus:border-tygr-orange-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggleApiKeyVisibility(provider.id)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-tygr-black-400 hover:text-tygr-black-200 transition-colors"
                    >
                      {showApiKeys[provider.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'docker' && (
          <div className="space-y-6">
            <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Docker Configuration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-tygr-black-200 mb-2">
                    Docker Image
                  </label>
                  <input
                    type="text"
                    value={settings.docker.image}
                    onChange={(e) => updateSetting('docker', 'image', e.target.value)}
                    className="w-full px-3 py-2 bg-tygr-black-700 border border-tygr-black-600 rounded-lg text-white placeholder-tygr-black-400 focus:outline-none focus:border-tygr-orange-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-tygr-black-200 mb-2">
                    Container Timeout (seconds)
                  </label>
                  <input
                    type="number"
                    value={settings.docker.containerTimeout}
                    onChange={(e) => updateSetting('docker', 'containerTimeout', parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-tygr-black-700 border border-tygr-black-600 rounded-lg text-white focus:outline-none focus:border-tygr-orange-500"
                  />
                </div>
              </div>
              
              <div className="mt-6 space-y-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.docker.autoPull}
                    onChange={(e) => updateSetting('docker', 'autoPull', e.target.checked)}
                    className="w-4 h-4 text-tygr-orange-500 bg-tygr-black-700 border-tygr-black-600 rounded focus:ring-tygr-orange-500 focus:ring-2"
                  />
                  <span className="text-sm text-white">Automatically pull latest image</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.docker.cleanupOnExit}
                    onChange={(e) => updateSetting('docker', 'cleanupOnExit', e.target.checked)}
                    className="w-4 h-4 text-tygr-orange-500 bg-tygr-black-700 border-tygr-black-600 rounded focus:ring-tygr-orange-500 focus:ring-2"
                  />
                  <span className="text-sm text-white">Clean up containers on exit</span>
                </label>
              </div>
            </div>

            {/* Resource Limits */}
            <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Resource Limits</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-tygr-black-200 mb-2">
                    CPU Cores
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={settings.docker.resourceLimits.cpu}
                    onChange={(e) => updateSetting('docker', 'resourceLimits.cpu', parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-tygr-black-700 border border-tygr-black-600 rounded-lg text-white focus:outline-none focus:border-tygr-orange-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-tygr-black-200 mb-2">
                    Memory Limit
                  </label>
                  <select
                    value={settings.docker.resourceLimits.memory}
                    onChange={(e) => updateSetting('docker', 'resourceLimits.memory', e.target.value)}
                    className="w-full px-3 py-2 bg-tygr-black-700 border border-tygr-black-600 rounded-lg text-white focus:outline-none focus:border-tygr-orange-500"
                  >
                    <option value="1g">1 GB</option>
                    <option value="2g">2 GB</option>
                    <option value="4g">4 GB</option>
                    <option value="8g">8 GB</option>
                    <option value="16g">16 GB</option>
                  </select>
                </div>
                
                <div className="flex items-center">
                  <label className="flex items-center space-x-3 mt-6">
                    <input
                      type="checkbox"
                      checked={settings.docker.resourceLimits.network}
                      onChange={(e) => updateSetting('docker', 'resourceLimits.network', e.target.checked)}
                      className="w-4 h-4 text-tygr-orange-500 bg-tygr-black-700 border-tygr-black-600 rounded focus:ring-tygr-orange-500 focus:ring-2"
                    />
                    <span className="text-sm text-white">Enable Network Access</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Notification Settings</h3>
              
              <div className="space-y-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.notifications.enabled}
                    onChange={(e) => updateSetting('notifications', 'enabled', e.target.checked)}
                    className="w-4 h-4 text-tygr-orange-500 bg-tygr-black-700 border-tygr-black-600 rounded focus:ring-tygr-orange-500 focus:ring-2"
                  />
                  <span className="text-sm text-white">Enable notifications</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.notifications.criticalFindings}
                    onChange={(e) => updateSetting('notifications', 'criticalFindings', e.target.checked)}
                    className="w-4 h-4 text-tygr-orange-500 bg-tygr-black-700 border-tygr-black-600 rounded focus:ring-tygr-orange-500 focus:ring-2"
                  />
                  <span className="text-sm text-white">Notify on critical findings</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.notifications.huntCompletion}
                    onChange={(e) => updateSetting('notifications', 'huntCompletion', e.target.checked)}
                    className="w-4 h-4 text-tygr-orange-500 bg-tygr-black-700 border-tygr-black-600 rounded focus:ring-tygr-orange-500 focus:ring-2"
                  />
                  <span className="text-sm text-white">Notify on hunt completion</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.notifications.systemAlerts}
                    onChange={(e) => updateSetting('notifications', 'systemAlerts', e.target.checked)}
                    className="w-4 h-4 text-tygr-orange-500 bg-tygr-black-700 border-tygr-black-600 rounded focus:ring-tygr-orange-500 focus:ring-2"
                  />
                  <span className="text-sm text-white">System alerts and warnings</span>
                </label>
              </div>
            </div>

            {/* Webhook Configuration */}
            <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Webhook Configuration</h3>
              
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newWebhook}
                    onChange={(e) => setNewWebhook(e.target.value)}
                    placeholder="Enter webhook URL..."
                    className="flex-1 px-3 py-2 bg-tygr-black-700 border border-tygr-black-600 rounded-lg text-white placeholder-tygr-black-400 focus:outline-none focus:border-tygr-orange-500"
                  />
                  <button
                    onClick={addWebhook}
                    className="px-4 py-2 bg-tygr-orange-500 text-white rounded-lg hover:bg-tygr-orange-600 transition-colors"
                  >
                    Add
                  </button>
                </div>
                
                <div className="space-y-2">
                  {settings.notifications.webhooks.map((webhook, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-tygr-black-700 rounded-lg">
                      <span className="text-sm text-tygr-black-300 font-mono">{webhook}</span>
                      <button
                        onClick={() => removeWebhook(index)}
                        className="p-1 text-tygr-black-400 hover:text-tygr-critical transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  
                  {settings.notifications.webhooks.length === 0 && (
                    <p className="text-tygr-black-400 text-center py-4">No webhooks configured</p>
                  )}
                </div>
              </div>
            </div>

            {/* Slack Integration */}
            <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Slack Integration</h3>
              
              <div>
                <label className="block text-sm font-medium text-tygr-black-200 mb-2">
                  Slack Webhook URL
                </label>
                <input
                  type="text"
                  value={settings.notifications.slackWebhook}
                  onChange={(e) => updateSetting('notifications', 'slackWebhook', e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  className="w-full px-3 py-2 bg-tygr-black-700 border border-tygr-black-600 rounded-lg text-white placeholder-tygr-black-400 focus:outline-none focus:border-tygr-orange-500"
                />
              </div>
            </div>

            {/* Email Notifications */}
            <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Email Notifications</h3>
              
              <div>
                <label className="block text-sm font-medium text-tygr-black-200 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={settings.notifications.email}
                  onChange={(e) => updateSetting('notifications', 'email', e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 bg-tygr-black-700 border border-tygr-black-600 rounded-lg text-white placeholder-tygr-black-400 focus:outline-none focus:border-tygr-orange-500"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Security Settings</h3>
              
              <div className="space-y-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.security.credentialEncryption}
                    onChange={(e) => updateSetting('security', 'credentialEncryption', e.target.checked)}
                    className="w-4 h-4 text-tygr-orange-500 bg-tygr-black-700 border-tygr-black-600 rounded focus:ring-tygr-orange-500 focus:ring-2"
                  />
                  <span className="text-sm text-white">Encrypt stored credentials</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.security.inputValidation}
                    onChange={(e) => updateSetting('security', 'inputValidation', e.target.checked)}
                    className="w-4 h-4 text-tygr-orange-500 bg-tygr-black-700 border-tygr-black-600 rounded focus:ring-tygr-orange-500 focus:ring-2"
                  />
                  <span className="text-sm text-white">Enable input validation</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.security.rateLimiting}
                    onChange={(e) => updateSetting('security', 'rateLimiting', e.target.checked)}
                    className="w-4 h-4 text-tygr-orange-500 bg-tygr-black-700 border-tygr-black-600 rounded focus:ring-tygr-orange-500 focus:ring-2"
                  />
                  <span className="text-sm text-white">Enable rate limiting</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.security.auditLogging}
                    onChange={(e) => updateSetting('security', 'auditLogging', e.target.checked)}
                    className="w-4 h-4 text-tygr-orange-500 bg-tygr-black-700 border-tygr-black-600 rounded focus:ring-tygr-orange-500 focus:ring-2"
                  />
                  <span className="text-sm text-white">Enable audit logging</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.security.twoFactorAuth}
                    onChange={(e) => updateSetting('security', 'twoFactorAuth', e.target.checked)}
                    className="w-4 h-4 text-tygr-orange-500 bg-tygr-black-700 border-tygr-black-600 rounded focus:ring-tygr-orange-500 focus:ring-2"
                  />
                  <span className="text-sm text-white">Enable two-factor authentication</span>
                </label>
              </div>
              
              <div className="mt-6">
                <label className="block text-sm font-medium text-tygr-black-200 mb-2">
                  Session Timeout (seconds)
                </label>
                <input
                  type="number"
                  min="300"
                  max="86400"
                  value={settings.security.sessionTimeout}
                  onChange={(e) => updateSetting('security', 'sessionTimeout', parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-tygr-black-700 border border-tygr-black-600 rounded-lg text-white focus:outline-none focus:border-tygr-orange-500"
                />
              </div>
            </div>

            {/* Security Audit Log */}
            <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Security Audit</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-tygr-black-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-tygr-low" />
                    <span className="text-white">API keys are encrypted at rest</span>
                  </div>
                  <span className="text-tygr-low text-sm">Secure</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-tygr-black-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="w-5 h-5 text-tygr-warning" />
                    <span className="text-white">Two-factor authentication disabled</span>
                  </div>
                  <span className="text-tygr-warning text-sm">Warning</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-tygr-black-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-tygr-low" />
                    <span className="text-white">Input validation enabled</span>
                  </div>
                  <span className="text-tygr-low text-sm">Secure</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-tygr-black-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-tygr-low" />
                    <span className="text-white">Rate limiting active</span>
                  </div>
                  <span className="text-tygr-low text-sm">Secure</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="space-y-6">
            <div className="bg-tygr-black-800 border border-tygr-black-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Team Management</h3>
              
              <div className="text-center py-12 text-tygr-black-400">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Team management features coming soon</p>
                <p className="text-sm mt-2">This will include role-based access control, user management, and team collaboration features</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}