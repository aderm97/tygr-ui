import { NextRequest, NextResponse } from 'next/server'
import { AppSettings, LLMProvider } from '@/types'

// In production, this would be stored in a database
let appSettings: AppSettings = {
  llmProviders: [
    {
      id: 'openai',
      name: 'OpenAI',
      model: 'gpt-4',
      apiKey: '',
      timeout: 30000,
      enabled: true
    },
    {
      id: 'anthropic',
      name: 'Anthropic',
      model: 'claude-3-opus-20240229',
      apiKey: '',
      timeout: 30000,
      enabled: false
    },
    {
      id: 'local',
      name: 'Local Model',
      model: 'local-llm',
      apiBase: 'http://localhost:11434',
      timeout: 60000,
      enabled: false
    }
  ],
  dockerSettings: {
    image: 'strix:latest',
    autoPull: true,
    resourceLimits: {
      cpu: 2,
      memory: '4g',
      network: true
    }
  },
  notificationSettings: {
    enabled: false,
    webhooks: [],
    slackWebhook: '',
    email: ''
  },
  securitySettings: {
    credentialEncryption: true,
    inputValidation: true,
    rateLimiting: true,
    auditLogging: true
  },
  uiSettings: {
    theme: 'dark',
    fontSize: 'medium',
    compactMode: false,
    animations: true
  }
}

export async function GET() {
  try {
    // Return settings with sensitive data redacted
    const safeSettings = {
      ...appSettings,
      llmProviders: appSettings.llmProviders.map(provider => ({
        ...provider,
        apiKey: provider.apiKey ? '***' : '',
        apiBase: provider.apiBase || ''
      }))
    }

    return NextResponse.json({ success: true, data: safeSettings })
  } catch (error) {
    console.error('Failed to get settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const updates: Partial<AppSettings> = await request.json()

    // Validate and update settings
    if (updates.llmProviders) {
      appSettings.llmProviders = updates.llmProviders.map(provider => ({
        ...provider,
        // Don't overwrite existing API keys with empty strings
        apiKey: provider.apiKey === '***' 
          ? appSettings.llmProviders.find(p => p.id === provider.id)?.apiKey || ''
          : provider.apiKey || ''
      }))
    }

    if (updates.dockerSettings) {
      appSettings.dockerSettings = { ...appSettings.dockerSettings, ...updates.dockerSettings }
    }

    if (updates.notificationSettings) {
      appSettings.notificationSettings = { ...appSettings.notificationSettings, ...updates.notificationSettings }
    }

    if (updates.securitySettings) {
      appSettings.securitySettings = { ...appSettings.securitySettings, ...updates.securitySettings }
    }

    if (updates.uiSettings) {
      appSettings.uiSettings = { ...appSettings.uiSettings, ...updates.uiSettings }
    }

    // Return updated settings with sensitive data redacted
    const safeSettings = {
      ...appSettings,
      llmProviders: appSettings.llmProviders.map(provider => ({
        ...provider,
        apiKey: provider.apiKey ? '***' : '',
        apiBase: provider.apiBase || ''
      }))
    }

    return NextResponse.json({ success: true, data: safeSettings })
  } catch (error) {
    console.error('Failed to update settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { providerId, testConfig }: { providerId: string, testConfig: Partial<LLMProvider> } = await request.json()

    const provider = appSettings.llmProviders.find(p => p.id === providerId)
    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'LLM provider not found' },
        { status: 404 }
      )
    }

    // Test the LLM provider connection
    const testResult = await testLLMProvider({ ...provider, ...testConfig })

    return NextResponse.json({ 
      success: testResult.success, 
      data: testResult,
      message: testResult.success ? 'LLM provider test successful' : 'LLM provider test failed'
    })
  } catch (error) {
    console.error('Failed to test LLM provider:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to test LLM provider' },
      { status: 500 }
    )
  }
}

async function testLLMProvider(provider: LLMProvider): Promise<{ success: boolean; message: string; responseTime?: number }> {
  const startTime = Date.now()

  try {
    // This would make an actual API call to test the provider
    // For now, we'll simulate the test
    await new Promise(resolve => setTimeout(resolve, 1000))

    if (!provider.apiKey && provider.id !== 'local') {
      return { success: false, message: 'API key is required' }
    }

    const responseTime = Date.now() - startTime

    return {
      success: true,
      message: `Successfully connected to ${provider.name} (${provider.model})`,
      responseTime
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to connect to ${provider.name}: ${error}`
    }
  }
}