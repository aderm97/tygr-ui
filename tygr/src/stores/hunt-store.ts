import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { Hunt, HuntConfig, HuntEvent, AgentNode, Vulnerability, HuntStatus } from '@/types'

interface HuntState {
  // Current active hunt
  currentHunt: Hunt | null
  setCurrentHunt: (hunt: Hunt | null) => void
  
  // Hunt history
  hunts: Hunt[]
  addHunt: (hunt: Hunt) => void
  updateHunt: (huntId: string, updates: Partial<Hunt>) => void
  removeHunt: (huntId: string) => void
  getHunt: (huntId: string) => Hunt | undefined
  
  // Hunt configurations
  huntConfigs: HuntConfig[]
  saveHuntConfig: (config: HuntConfig) => void
  updateHuntConfig: (configId: string, updates: Partial<HuntConfig>) => void
  deleteHuntConfig: (configId: string) => void
  
  // Real-time hunt data
  huntEvents: Record<string, HuntEvent[]>
  addHuntEvent: (huntId: string, event: HuntEvent) => void
  clearHuntEvents: (huntId: string) => void
  
  // Agent coordination
  agentGraphs: Record<string, any> // Will be typed with AgentGraph
  updateAgentGraph: (huntId: string, graph: any) => void
  
  // Vulnerabilities
  vulnerabilities: Record<string, Vulnerability[]>
  addVulnerability: (huntId: string, vulnerability: Vulnerability) => void
  updateVulnerability: (huntId: string, vulnId: string, updates: Partial<Vulnerability>) => void
  
  // Hunt execution queue
  queuedHunts: HuntConfig[]
  queueHunt: (config: HuntConfig) => void
  dequeueHunt: () => HuntConfig | undefined
  clearQueue: () => void
  
  // UI state
  selectedHuntId: string | null
  setSelectedHuntId: (huntId: string | null) => void
  
  // Filters and search
  huntFilters: {
    status: HuntStatus[]
    severity: string[]
    dateRange: { start: string; end: string } | null
  }
  setHuntFilters: (filters: Partial<HuntState['huntFilters']>) => void
  
  // Statistics
  huntStats: {
    totalHunts: number
    runningHunts: number
    completedHunts: number
    totalVulnerabilities: number
    criticalVulnerabilities: number
    averageDuration: number
  }
  updateHuntStats: () => void
}

export const useHuntStore = create<HuntState>()(
  devtools(
    persist(
      (set, get) => ({
        // Current active hunt
        currentHunt: null,
        setCurrentHunt: (hunt) => set({ currentHunt: hunt }),
        
        // Hunt history
        hunts: [],
        addHunt: (hunt) => set((state) => ({ 
          hunts: [...state.hunts, hunt] 
        })),
        updateHunt: (huntId, updates) => set((state) => ({
          hunts: state.hunts.map(hunt => 
            hunt.id === huntId ? { ...hunt, ...updates } : hunt
          )
        })),
        removeHunt: (huntId) => set((state) => ({
          hunts: state.hunts.filter(hunt => hunt.id !== huntId)
        })),
        getHunt: (huntId) => get().hunts.find(hunt => hunt.id === huntId),
        
        // Hunt configurations
        huntConfigs: [],
        saveHuntConfig: (config) => set((state) => ({
          huntConfigs: [...state.huntConfigs, config]
        })),
        updateHuntConfig: (configId, updates) => set((state) => ({
          huntConfigs: state.huntConfigs.map(config =>
            config.id === configId ? { ...config, ...updates } : config
          )
        })),
        deleteHuntConfig: (configId) => set((state) => ({
          huntConfigs: state.huntConfigs.filter(config => config.id !== configId)
        })),
        
        // Real-time hunt data
        huntEvents: {},
        addHuntEvent: (huntId, event) => set((state) => ({
          huntEvents: {
            ...state.huntEvents,
            [huntId]: [...(state.huntEvents[huntId] || []), event]
          }
        })),
        clearHuntEvents: (huntId) => set((state) => ({
          huntEvents: {
            ...state.huntEvents,
            [huntId]: []
          }
        })),
        
        // Agent coordination
        agentGraphs: {},
        updateAgentGraph: (huntId, graph) => set((state) => ({
          agentGraphs: {
            ...state.agentGraphs,
            [huntId]: graph
          }
        })),
        
        // Vulnerabilities
        vulnerabilities: {},
        addVulnerability: (huntId, vulnerability) => set((state) => ({
          vulnerabilities: {
            ...state.vulnerabilities,
            [huntId]: [...(state.vulnerabilities[huntId] || []), vulnerability]
          }
        })),
        updateVulnerability: (huntId, vulnId, updates) => set((state) => ({
          vulnerabilities: {
            ...state.vulnerabilities,
            [huntId]: (state.vulnerabilities[huntId] || []).map(vuln =>
              vuln.id === vulnId ? { ...vuln, ...updates } : vuln
            )
          }
        })),
        
        // Hunt execution queue
        queuedHunts: [],
        queueHunt: (config) => set((state) => ({
          queuedHunts: [...state.queuedHunts, config]
        })),
        dequeueHunt: () => {
          const state = get()
          if (state.queuedHunts.length === 0) return undefined
          const nextHunt = state.queuedHunts[0]
          set({ queuedHunts: state.queuedHunts.slice(1) })
          return nextHunt
        },
        clearQueue: () => set({ queuedHunts: [] }),
        
        // UI state
        selectedHuntId: null,
        setSelectedHuntId: (huntId) => set({ selectedHuntId: huntId }),
        
        // Filters and search
        huntFilters: {
          status: [],
          severity: [],
          dateRange: null
        },
        setHuntFilters: (filters) => set((state) => ({
          huntFilters: { ...state.huntFilters, ...filters }
        })),
        
        // Statistics
        huntStats: {
          totalHunts: 0,
          runningHunts: 0,
          completedHunts: 0,
          totalVulnerabilities: 0,
          criticalVulnerabilities: 0,
          averageDuration: 0
        },
        updateHuntStats: () => {
          const state = get()
          const hunts = state.hunts
          const totalHunts = hunts.length
          const runningHunts = hunts.filter(h => h.status === 'running').length
          const completedHunts = hunts.filter(h => h.status === 'completed').length
          
          const allVulnerabilities = Object.values(state.vulnerabilities).flat()
          const totalVulnerabilities = allVulnerabilities.length
          const criticalVulnerabilities = allVulnerabilities.filter(v => v.severity === 'critical').length
          
          const completedHuntsWithDuration = hunts.filter(h => h.status === 'completed' && h.duration)
          const averageDuration = completedHuntsWithDuration.length > 0 
            ? completedHuntsWithDuration.reduce((sum, h) => sum + (h.duration || 0), 0) / completedHuntsWithDuration.length
            : 0
            
          set({
            huntStats: {
              totalHunts,
              runningHunts,
              completedHunts,
              totalVulnerabilities,
              criticalVulnerabilities,
              averageDuration
            }
          })
        }
      }),
      {
        name: 'tygr-hunt-store',
        partialize: (state) => ({
          hunts: state.hunts,
          huntConfigs: state.huntConfigs,
          huntFilters: state.huntFilters,
          huntStats: state.huntStats
        })
      }
    )
  )
)

// Helper hooks for common operations
export const useHuntActions = () => {
  const {
    addHunt,
    updateHunt,
    addHuntEvent,
    addVulnerability,
    updateHuntStats
  } = useHuntStore()

  const startHunt = async (config: HuntConfig) => {
    try {
      // Call the backend API to start the hunt
      const response = await fetch('/api/hunts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start hunt')
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to start hunt')
      }

      const hunt: Hunt = result.data
      
      // Add hunt to local store
      addHunt(hunt)
      updateHuntStats()
      return hunt
    } catch (error) {
      console.error('Failed to start hunt:', error)
      throw error
    }
  }

  const completeHunt = (huntId: string, results: any) => {
    updateHunt(huntId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      duration: results.duration,
      vulnerabilityCount: results.vulnerabilityCount,
      agentCount: results.agentCount
    })
    updateHuntStats()
  }

  const failHunt = (huntId: string, error: string) => {
    updateHunt(huntId, {
      status: 'failed',
      completedAt: new Date().toISOString()
    })
    updateHuntStats()
  }

  const recordVulnerability = (huntId: string, vulnerability: Vulnerability) => {
    addVulnerability(huntId, vulnerability)
    updateHunt(huntId, {
      vulnerabilityCount: (get().hunts.find(h => h.id === huntId)?.vulnerabilityCount || 0) + 1
    })
    updateHuntStats()
  }

  const recordHuntEvent = (huntId: string, type: string, data: any) => {
    const event: HuntEvent = {
      type: type as any,
      huntId,
      timestamp: new Date().toISOString(),
      data
    }
    addHuntEvent(huntId, event)
  }

  const get = useHuntStore.getState

  return {
    startHunt,
    completeHunt,
    failHunt,
    recordVulnerability,
    recordHuntEvent,
    get
  }
}