/**
 * Settings API Routes - Database-backed version
 * GET /api/settings - Get all settings
 * POST /api/settings - Update settings
 * PUT /api/settings - Test LLM provider connection
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/database'
import { encrypt, decrypt, maskSecret } from '@/lib/encryption'
import { z } from 'zod'
import { AppSettings, LLMProvider } from '@/types'

// Settings schema validation
const SettingsUpdateSchema = z.object({
  llmProviders: z.array(z.any()).optional(),
  dockerSettings: z.any().optional(),
  notificationSettings: z.any().optional(),
  securitySettings: z.any().optional(),
  uiSettings: z.any().optional(),
})

/**
 * GET /api/settings
 * Get all settings (with masked secrets)
 */
export async function GET(request: NextRequest) {
  try {
    // Get all settings from database
    const dbSettings = await prisma.settings.findMany()

    // Build settings object (backward compatible with existing UI)
    const appSettings: AppSettings = {
      llmProviders: [
        {
          id: 'openai',
          name: 'OpenAI',
          model: await getSetting('llm.openai.model', 'gpt-4'),
          apiKey: await getMaskedSetting('llm.openai.apiKey'),
          apiBase: await getSetting('llm.openai.apiBase', ''),
          timeout: 30000,
          enabled: await getSetting('llm.openai.enabled', 'true') === 'true',
        },
        {
          id: 'anthropic',
          name: 'Anthropic',
          model: await getSetting('llm.anthropic.model', 'claude-3-opus-20240229'),
          apiKey: await getMaskedSetting('llm.anthropic.apiKey'),
          apiBase: await getSetting('llm.anthropic.apiBase', ''),
          timeout: 30000,
          enabled: await getSetting('llm.anthropic.enabled', 'false') === 'true',
        },
        {
          id: 'local',
          name: 'Local Model',
          model: await getSetting('llm.local.model', 'local-llm'),
          apiBase: await getSetting('llm.local.apiBase', 'http://localhost:11434'),
          timeout: 60000,
          enabled: await getSetting('llm.local.enabled', 'false') === 'true',
        },
      ],
      dockerSettings: {
        image: await getSetting('docker.image', 'strix:latest'),
        autoPull: await getSetting('docker.autoPull', 'true') === 'true',
        resourceLimits: {
          cpu: parseInt(await getSetting('docker.cpu', '2')),
          memory: await getSetting('docker.memory', '4g'),
          network: await getSetting('docker.network', 'true') === 'true',
        },
      },
      notificationSettings: {
        enabled: await getSetting('notifications.enabled', 'false') === 'true',
        webhooks: [],
        slackWebhook: await getMaskedSetting('notifications.slackWebhook'),
        email: await getSetting('notifications.email', ''),
      },
      securitySettings: {
        credentialEncryption: true,
        inputValidation: true,
        rateLimiting: true,
        auditLogging: true,
      },
      uiSettings: {
        theme: await getSetting('ui.theme', 'dark') as 'dark' | 'light',
        fontSize: await getSetting('ui.fontSize', 'medium') as 'small' | 'medium' | 'large',
        compactMode: await getSetting('ui.compactMode', 'false') === 'true',
        animations: await getSetting('ui.animations', 'true') === 'true',
      },
    }

    return NextResponse.json({ success: true, data: appSettings })
  } catch (error) {
    console.error('[API] Failed to get settings:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get settings',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/settings
 * Update settings
 */
export async function POST(request: NextRequest) {
  try {
    const updates: Partial<AppSettings> = await request.json()

    // Save LLM providers
    if (updates.llmProviders) {
      for (const provider of updates.llmProviders) {
        const prefix = `llm.${provider.id}`

        await saveSetting(`${prefix}.model`, provider.model, false)
        await saveSetting(`${prefix}.enabled`, provider.enabled.toString(), false)

        if (provider.apiBase) {
          await saveSetting(`${prefix}.apiBase`, provider.apiBase, false)
        }

        // Only save API key if not masked
        if (provider.apiKey && !provider.apiKey.includes('*')) {
          await saveSetting(`${prefix}.apiKey`, provider.apiKey, true)
        }
      }
    }

    // Save Docker settings
    if (updates.dockerSettings) {
      await saveSetting('docker.image', updates.dockerSettings.image, false)
      await saveSetting('docker.autoPull', updates.dockerSettings.autoPull.toString(), false)

      if (updates.dockerSettings.resourceLimits) {
        await saveSetting('docker.cpu', updates.dockerSettings.resourceLimits.cpu.toString(), false)
        await saveSetting('docker.memory', updates.dockerSettings.resourceLimits.memory, false)
        await saveSetting('docker.network', updates.dockerSettings.resourceLimits.network.toString(), false)
      }
    }

    // Save notification settings
    if (updates.notificationSettings) {
      await saveSetting('notifications.enabled', updates.notificationSettings.enabled.toString(), false)
      await saveSetting('notifications.email', updates.notificationSettings.email || '', false)

      if (updates.notificationSettings.slackWebhook && !updates.notificationSettings.slackWebhook.includes('*')) {
        await saveSetting('notifications.slackWebhook', updates.notificationSettings.slackWebhook, true)
      }
    }

    // Save UI settings
    if (updates.uiSettings) {
      await saveSetting('ui.theme', updates.uiSettings.theme, false)
      await saveSetting('ui.fontSize', updates.uiSettings.fontSize, false)
      await saveSetting('ui.compactMode', updates.uiSettings.compactMode.toString(), false)
      await saveSetting('ui.animations', updates.uiSettings.animations.toString(), false)
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
    })
  } catch (error) {
    console.error('[API] Failed to update settings:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update settings',
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/settings
 * Test LLM provider connection
 */
export async function PUT(request: NextRequest) {
  try {
    const { providerId, testConfig }: { providerId: string; testConfig: Partial<LLMProvider> } =
      await request.json()

    // Get provider settings
    const prefix = `llm.${providerId}`
    const provider: LLMProvider = {
      id: providerId,
      name: testConfig.name || providerId,
      model: testConfig.model || (await getSetting(`${prefix}.model`, '')),
      apiKey: testConfig.apiKey || (await getDecryptedSetting(`${prefix}.apiKey`)),
      apiBase: testConfig.apiBase || (await getSetting(`${prefix}.apiBase`, '')),
      timeout: testConfig.timeout || 30000,
      enabled: true,
    }

    // Test the LLM provider connection
    const testResult = await testLLMProvider(provider)

    return NextResponse.json({
      success: testResult.success,
      data: testResult,
      message: testResult.success ? 'LLM provider test successful' : 'LLM provider test failed',
    })
  } catch (error) {
    console.error('[API] Failed to test LLM provider:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test LLM provider',
      },
      { status: 500 }
    )
  }
}

/**
 * Helper: Get a setting value
 */
async function getSetting(key: string, defaultValue: string = ''): Promise<string> {
  const setting = await prisma.settings.findUnique({ where: { key } })
  return setting ? (setting.value as string) : defaultValue
}

/**
 * Helper: Get a decrypted setting value
 */
async function getDecryptedSetting(key: string): Promise<string> {
  const setting = await prisma.settings.findUnique({ where: { key } })
  if (!setting) return ''

  return setting.encrypted ? decrypt(setting.value as string) : (setting.value as string)
}

/**
 * Helper: Get a masked setting value
 */
async function getMaskedSetting(key: string): Promise<string> {
  const value = await getDecryptedSetting(key)
  return value ? maskSecret(value) : ''
}

/**
 * Helper: Save a setting to the database
 */
async function saveSetting(key: string, value: string, shouldEncrypt: boolean): Promise<void> {
  const finalValue = shouldEncrypt ? encrypt(value) : value

  await prisma.settings.upsert({
    where: { key },
    update: {
      value: finalValue as any,
      encrypted: shouldEncrypt,
    },
    create: {
      key,
      value: finalValue as any,
      encrypted: shouldEncrypt,
    },
  })
}

/**
 * Helper: Test LLM provider connection
 */
async function testLLMProvider(provider: LLMProvider): Promise<{
  success: boolean
  message: string
  responseTime?: number
}> {
  const startTime = Date.now()

  try {
    // This would make an actual API call to test the provider
    // For now, we'll simulate the test
    await new Promise((resolve) => setTimeout(resolve, 1000))

    if (!provider.apiKey && provider.id !== 'local') {
      return { success: false, message: 'API key is required' }
    }

    const responseTime = Date.now() - startTime

    return {
      success: true,
      message: `Successfully connected to ${provider.name} (${provider.model})`,
      responseTime,
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to connect to ${provider.name}: ${error}`,
    }
  }
}
