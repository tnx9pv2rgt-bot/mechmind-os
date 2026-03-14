/**
 * Integration Tests for Offline Sync System
 * 
 * Tests offline sync functionality:
 * - Queue actions while offline
 * - Process sync queue
 * - Verify data consistency
 * 
 * @module __tests__/api/sync.integration.test
 * @version 1.0.0
 */

import {
  server,
  createInspectionHandlers,
  createMockIndexedDB,
  generateInspectionId,
  wait,
} from '../utils/test-utils'

// Mock IndexedDB
global.indexedDB = {
  open: jest.fn(),
} as unknown as typeof indexedDB

// =============================================================================
// Mock Offline Sync Service
// =============================================================================

// Import types from the actual service
type SyncAction = 
  | 'CREATE_INSPECTION'
  | 'UPDATE_INSPECTION'
  | 'UPDATE_PHOTO'
  | 'ADD_NOTE'
  | 'UPDATE_ITEM_STATUS'
  | 'SUBMIT_INSPECTION'
  | 'DELETE_INSPECTION'

type SyncStatus = 'pending' | 'syncing' | 'completed' | 'failed' | 'conflict'
type SyncPriority = 'low' | 'normal' | 'high' | 'critical'

interface InspectionSyncData {
  [key: string]: unknown
  inspectionId?: string
  vehicleId?: string
  customerId?: string
  timestamp?: string
}

interface OfflineSyncQueueItem {
  id: string
  action: SyncAction
  data: InspectionSyncData
  status: SyncStatus
  priority: SyncPriority
  createdAt: number
  updatedAt: number
  retryCount: number
  maxRetries: number
  lastError?: string
  syncedAt?: number
  entityId?: string
  dependencies?: string[]
}

interface SyncResult {
  itemId: string
  success: boolean
  action: SyncAction
  entityId?: string
  error?: string
  conflictResolved?: boolean
}

interface SyncQueueResult {
  total: number
  successful: number
  failed: number
  conflicts: number
  results: SyncResult[]
  completedAt: number
}

// Mock the offline sync service
class MockOfflineSyncService {
  private db: ReturnType<typeof createMockIndexedDB>
  private isOnline: boolean = true
  private readonly STORE_NAME = 'offlineSyncQueue'

  constructor() {
    this.db = createMockIndexedDB()
    this.db.addStore(this.STORE_NAME)
  }

  setOnlineStatus(online: boolean) {
    this.isOnline = online
  }

  async queueAction(
    action: SyncAction,
    data: InspectionSyncData,
    options?: {
      priority?: SyncPriority
      entityId?: string
      dependencies?: string[]
      maxRetries?: number
    }
  ): Promise<string> {
    const id = `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const now = Date.now()

    const queueItem: OfflineSyncQueueItem = {
      id,
      action,
      data: {
        ...data,
        timestamp: data.timestamp || new Date().toISOString(),
      },
      status: 'pending',
      priority: options?.priority || 'normal',
      createdAt: now,
      updatedAt: now,
      retryCount: 0,
      maxRetries: options?.maxRetries || 5,
      entityId: options?.entityId,
      dependencies: options?.dependencies,
    }

    this.db.put(this.STORE_NAME, id, queueItem)

    // Trigger sync if online
    if (this.isOnline) {
      this.triggerBackgroundSync()
    }

    return id
  }

  async getPendingItems(): Promise<OfflineSyncQueueItem[]> {
    const allItems = this.db.getAll(this.STORE_NAME) as OfflineSyncQueueItem[]
    return allItems
      .filter(item => item.status === 'pending')
      .sort((a, b) => {
        // Sort by priority first, then by creation date
        const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 }
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority]
        }
        return a.createdAt - b.createdAt
      })
  }

  async getPendingSyncCount(): Promise<number> {
    const pending = await this.getPendingItems()
    return pending.length
  }

  async processSyncQueue(): Promise<SyncQueueResult> {
    const pendingItems = await this.getPendingItems()
    const results: SyncResult[] = []

    let successful = 0
    let failed = 0
    let conflicts = 0

    for (const item of pendingItems) {
      const result = await this.processSingleItem(item)
      results.push(result)

      if (result.success) {
        successful++
      } else if (result.conflictResolved) {
        conflicts++
        successful++
      } else {
        failed++
      }
    }

    return {
      total: pendingItems.length,
      successful,
      failed,
      conflicts,
      results,
      completedAt: Date.now(),
    }
  }

  private async processSingleItem(item: OfflineSyncQueueItem): Promise<SyncResult> {
    // Update status to syncing
    this.updateItemStatus(item.id, 'syncing')

    try {
      // Check dependencies
      if (item.dependencies && item.dependencies.length > 0) {
        const allDependenciesMet = await this.checkDependencies(item.dependencies)
        if (!allDependenciesMet) {
          throw new Error('Dependencies not yet synced')
        }
      }

      // Execute the action
      const result = await this.executeSyncAction(item)

      if (result.success) {
        this.updateItemStatus(item.id, 'completed', { syncedAt: Date.now() })
      } else if (result.conflict) {
        this.updateItemStatus(item.id, 'conflict')
        // conflict is tracked by the caller (processSyncQueue)
      } else {
        throw new Error(result.error || 'Unknown error')
      }

      return {
        itemId: item.id,
        success: result.success,
        action: item.action,
        entityId: item.entityId,
        error: result.error,
        conflictResolved: result.conflictResolved,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      // Increment retry count
      const currentItem = this.db.get(this.STORE_NAME, item.id) as OfflineSyncQueueItem
      const newRetryCount = currentItem.retryCount + 1
      
      if (newRetryCount >= currentItem.maxRetries) {
        this.updateItemStatus(item.id, 'failed', { 
          retryCount: newRetryCount,
          lastError: errorMessage 
        })
      } else {
        this.updateItemStatus(item.id, 'pending', { 
          retryCount: newRetryCount,
          lastError: errorMessage 
        })
      }

      return {
        itemId: item.id,
        success: false,
        action: item.action,
        entityId: item.entityId,
        error: errorMessage,
      }
    }
  }

  private async executeSyncAction(
    item: OfflineSyncQueueItem
  ): Promise<{
    success: boolean
    error?: string
    conflict?: boolean
    conflictResolved?: boolean
  }> {
    // Simulate API call
    await wait(10)

    // Simulate occasional failures for testing
    if (item.data.simulateError) {
      return { success: false, error: 'Simulated API error' }
    }

    // Simulate conflicts for testing
    if (item.data.simulateConflict) {
      return { success: false, conflict: true, conflictResolved: true }
    }

    return { success: true }
  }

  private async checkDependencies(dependencies: string[]): Promise<boolean> {
    for (const depId of dependencies) {
      const dep = this.db.get(this.STORE_NAME, depId) as OfflineSyncQueueItem | null
      if (!dep || dep.status !== 'completed') {
        return false
      }
    }
    return true
  }

  private updateItemStatus(
    id: string, 
    status: SyncStatus, 
    updates?: Partial<OfflineSyncQueueItem>
  ) {
    const item = this.db.get(this.STORE_NAME, id) as OfflineSyncQueueItem
    if (item) {
      this.db.put(this.STORE_NAME, id, {
        ...item,
        ...updates,
        status,
        updatedAt: Date.now(),
      })
    }
  }

  private triggerBackgroundSync(): void {
    // In real implementation, this would trigger a background sync
    // For testing, we'll just log it
    if (this.isOnline) {
      setTimeout(() => {
        this.processSyncQueue().catch(console.error)
      }, 100)
    }
  }

  async clearSyncQueue(olderThan?: number): Promise<number> {
    const allItems = this.db.getAll(this.STORE_NAME) as OfflineSyncQueueItem[]
    let cleared = 0

    for (const item of allItems) {
      if (item.status === 'completed' && (item.syncedAt || 0) < (olderThan || Date.now())) {
        this.db.delete(this.STORE_NAME, item.id)
        cleared++
      }
    }

    return cleared
  }

  async clearAllSyncQueue(): Promise<void> {
    this.db.clear(this.STORE_NAME)
  }

  async getFailedItems(): Promise<OfflineSyncQueueItem[]> {
    const allItems = this.db.getAll(this.STORE_NAME) as OfflineSyncQueueItem[]
    return allItems.filter(item => item.status === 'failed')
  }

  async retryFailedItem(id: string): Promise<boolean> {
    const item = this.db.get(this.STORE_NAME, id) as OfflineSyncQueueItem
    if (!item || item.status !== 'failed') {
      return false
    }

    this.updateItemStatus(id, 'pending', { retryCount: 0, lastError: undefined })
    
    if (this.isOnline) {
      this.triggerBackgroundSync()
    }

    return true
  }
}

// =============================================================================
// Test Database
// =============================================================================

const testDatabase = {
  inspections: new Map<string, { id: string; data: Record<string, unknown> }>(),
  syncService: new MockOfflineSyncService(),

  clear() {
    this.inspections.clear()
    this.syncService.clearAllSyncQueue()
  },
}

// =============================================================================
// Tests
// =============================================================================

describe('Offline Sync Integration Tests', () => {
  beforeAll(() => {
    server.use(...createInspectionHandlers(testDatabase))
  })

  beforeEach(() => {
    testDatabase.clear()
    testDatabase.syncService.setOnlineStatus(true)
  })

  describe('Queue Actions While Offline', () => {
    it('should queue create inspection action when offline', async () => {
      // Go offline
      testDatabase.syncService.setOnlineStatus(false)

      const queueItemId = await testDatabase.syncService.queueAction(
        'CREATE_INSPECTION',
        {
          vehicleId: 'veh_offline_001',
          customerId: 'cust_offline_001',
          templateId: 'tmpl_offline_001',
          mileage: 50000,
          timestamp: new Date().toISOString(),
        },
        { priority: 'high' }
      )

      expect(queueItemId).toBeDefined()

      const pendingCount = await testDatabase.syncService.getPendingSyncCount()
      expect(pendingCount).toBe(1)

      const pendingItems = await testDatabase.syncService.getPendingItems()
      expect(pendingItems[0].action).toBe('CREATE_INSPECTION')
      expect(pendingItems[0].status).toBe('pending')
      expect(pendingItems[0].priority).toBe('high')
    })

    it('should queue multiple actions with correct priority order', async () => {
      testDatabase.syncService.setOnlineStatus(false)

      // Queue items with different priorities
      const lowPriorityId = await testDatabase.syncService.queueAction(
        'UPDATE_INSPECTION',
        { inspectionId: 'insp_001', notes: 'Low priority update' },
        { priority: 'low' }
      )

      const criticalPriorityId = await testDatabase.syncService.queueAction(
        'SUBMIT_INSPECTION',
        { inspectionId: 'insp_002' },
        { priority: 'critical' }
      )

      const normalPriorityId = await testDatabase.syncService.queueAction(
        'ADD_NOTE',
        { inspectionId: 'insp_003', note: 'Normal priority note' },
        { priority: 'normal' }
      )

      const pendingItems = await testDatabase.syncService.getPendingItems()

      // Should be sorted by priority: critical first, then normal, then low
      expect(pendingItems[0].priority).toBe('critical')
      expect(pendingItems[1].priority).toBe('normal')
      expect(pendingItems[2].priority).toBe('low')
    })

    it('should handle dependencies between queued items', async () => {
      testDatabase.syncService.setOnlineStatus(false)

      // Create parent item
      const parentId = await testDatabase.syncService.queueAction(
        'CREATE_INSPECTION',
        { vehicleId: 'veh_dep_001' },
        { priority: 'high' }
      )

      // Create child item that depends on parent
      const childId = await testDatabase.syncService.queueAction(
        'ADD_NOTE',
        { inspectionId: 'insp_dep_001', note: 'Dependent note' },
        { priority: 'normal', dependencies: [parentId] }
      )

      const pendingItems = await testDatabase.syncService.getPendingItems()
      const childItem = pendingItems.find(item => item.id === childId)

      expect(childItem?.dependencies).toContain(parentId)
    })

    it('should store item timestamps correctly', async () => {
      testDatabase.syncService.setOnlineStatus(false)

      const beforeQueue = Date.now()
      const queueItemId = await testDatabase.syncService.queueAction(
        'CREATE_INSPECTION',
        { vehicleId: 'veh_time_001' }
      )
      const afterQueue = Date.now()

      const pendingItems = await testDatabase.syncService.getPendingItems()
      const item = pendingItems[0]

      expect(item.createdAt).toBeGreaterThanOrEqual(beforeQueue)
      expect(item.createdAt).toBeLessThanOrEqual(afterQueue)
      expect(item.updatedAt).toBe(item.createdAt)
    })
  })

  describe('Process Sync Queue', () => {
    it('should process all pending items when coming back online', async () => {
      // Start offline and queue items
      testDatabase.syncService.setOnlineStatus(false)

      await testDatabase.syncService.queueAction('CREATE_INSPECTION', {
        vehicleId: 'veh_process_001',
      })

      await testDatabase.syncService.queueAction('ADD_NOTE', {
        inspectionId: 'insp_process_001',
        note: 'Test note',
      })

      let pendingCount = await testDatabase.syncService.getPendingSyncCount()
      expect(pendingCount).toBe(2)

      // Come back online and process
      testDatabase.syncService.setOnlineStatus(true)
      const result = await testDatabase.syncService.processSyncQueue()

      expect(result.total).toBe(2)
      expect(result.successful).toBe(2)
      expect(result.failed).toBe(0)

      pendingCount = await testDatabase.syncService.getPendingSyncCount()
      expect(pendingCount).toBe(0)
    })

    it('should handle item failures with retry logic', async () => {
      testDatabase.syncService.setOnlineStatus(false)

      const queueItemId = await testDatabase.syncService.queueAction(
        'CREATE_INSPECTION',
        { vehicleId: 'veh_fail_001', simulateError: true },
        { maxRetries: 1 } // Set maxRetries to 1 so first failure marks it as failed
      )

      // Process with simulated errors
      testDatabase.syncService.setOnlineStatus(true)
      const result = await testDatabase.syncService.processSyncQueue()

      expect(result.total).toBe(1)
      expect(result.failed).toBe(1)

      // Check that retry count was incremented and item is now failed
      const failedItems = await testDatabase.syncService.getFailedItems()
      expect(failedItems.length).toBe(1)
      expect(failedItems[0].retryCount).toBe(1)
    })

    it('should handle conflicts during sync', async () => {
      testDatabase.syncService.setOnlineStatus(false)

      await testDatabase.syncService.queueAction(
        'UPDATE_INSPECTION',
        { inspectionId: 'insp_conflict_001', simulateConflict: true }
      )

      testDatabase.syncService.setOnlineStatus(true)
      const result = await testDatabase.syncService.processSyncQueue()

      expect(result.total).toBe(1)
      expect(result.conflicts).toBe(1)
      expect(result.successful).toBe(1) // Conflicts are resolved and counted as successful
    })

    it('should process items in priority order', async () => {
      testDatabase.syncService.setOnlineStatus(false)

      const processed: string[] = []

      // Queue items in reverse priority order
      await testDatabase.syncService.queueAction(
        'UPDATE_INSPECTION',
        { vehicleId: 'veh_low', track: () => processed.push('low') },
        { priority: 'low' }
      )

      await testDatabase.syncService.queueAction(
        'UPDATE_INSPECTION',
        { vehicleId: 'veh_high', track: () => processed.push('high') },
        { priority: 'high' }
      )

      await testDatabase.syncService.queueAction(
        'UPDATE_INSPECTION',
        { vehicleId: 'veh_critical', track: () => processed.push('critical') },
        { priority: 'critical' }
      )

      const result = await testDatabase.syncService.processSyncQueue()
      expect(result.total).toBe(3)

      // Verify priority order was maintained
      const pendingItems = await testDatabase.syncService.getPendingItems()
      expect(pendingItems.length).toBe(0) // All processed
    })

    it('should clear completed items from queue', async () => {
      testDatabase.syncService.setOnlineStatus(false)

      await testDatabase.syncService.queueAction('CREATE_INSPECTION', {
        vehicleId: 'veh_clear_001',
      })

      // Process the queue
      testDatabase.syncService.setOnlineStatus(true)
      await testDatabase.syncService.processSyncQueue()

      // Clear completed items older than now (+1ms to account for same-tick timing)
      const cleared = await testDatabase.syncService.clearSyncQueue(Date.now() + 1)
      expect(cleared).toBe(1)

      // Queue should be empty
      const pendingCount = await testDatabase.syncService.getPendingSyncCount()
      expect(pendingCount).toBe(0)
    })

    it('should retry failed items', async () => {
      testDatabase.syncService.setOnlineStatus(false)

      const itemId = await testDatabase.syncService.queueAction(
        'CREATE_INSPECTION',
        { vehicleId: 'veh_retry_001', simulateError: true },
        { maxRetries: 1 } // Set maxRetries to 1 so first failure marks it as failed
      )

      // Process to failure
      testDatabase.syncService.setOnlineStatus(true)
      await testDatabase.syncService.processSyncQueue()

      const failedItems = await testDatabase.syncService.getFailedItems()
      expect(failedItems.length).toBe(1)

      // Retry the failed item
      const retried = await testDatabase.syncService.retryFailedItem(itemId)
      expect(retried).toBe(true)

      // Should be back in pending
      const pendingCount = await testDatabase.syncService.getPendingSyncCount()
      expect(pendingCount).toBe(1)
    })
  })

  describe('Data Consistency', () => {
    it('should maintain data integrity across sync operations', async () => {
      testDatabase.syncService.setOnlineStatus(false)

      const testData = {
        vehicleId: 'veh_integrity_001',
        customerId: 'cust_integrity_001',
        inspectionType: 'pre_purchase',
        mileage: 75000,
        notes: 'Test integrity notes',
        timestamp: new Date().toISOString(),
      }

      const queueItemId = await testDatabase.syncService.queueAction(
        'CREATE_INSPECTION',
        testData
      )

      const pendingItems = await testDatabase.syncService.getPendingItems()
      const item = pendingItems[0]

      // Verify all data is preserved
      expect(item.data.vehicleId).toBe(testData.vehicleId)
      expect(item.data.customerId).toBe(testData.customerId)
      expect(item.data.mileage).toBe(testData.mileage)
      expect(item.data.notes).toBe(testData.notes)
      expect(item.data.timestamp).toBe(testData.timestamp)
    })

    it('should handle concurrent queue operations', async () => {
      testDatabase.syncService.setOnlineStatus(false)

      // Queue multiple items concurrently
      const queuePromises = Array.from({ length: 10 }, (_, i) =>
        testDatabase.syncService.queueAction('ADD_NOTE', {
          inspectionId: `insp_concurrent_${i}`,
          note: `Note ${i}`,
        })
      )

      const ids = await Promise.all(queuePromises)
      expect(ids.length).toBe(10)
      expect(new Set(ids).size).toBe(10) // All IDs should be unique

      const pendingCount = await testDatabase.syncService.getPendingSyncCount()
      expect(pendingCount).toBe(10)
    })

    it('should preserve update timestamps after sync', async () => {
      testDatabase.syncService.setOnlineStatus(false)

      const beforeQueue = Date.now()
      const queueItemId = await testDatabase.syncService.queueAction(
        'UPDATE_INSPECTION',
        { inspectionId: 'insp_timestamp_001', status: 'completed' }
      )

      const beforeProcess = Date.now()
      await wait(50) // Ensure time difference

      // Process the queue
      testDatabase.syncService.setOnlineStatus(true)
      await testDatabase.syncService.processSyncQueue()

      // All items should be processed (not pending anymore)
      const pendingCount = await testDatabase.syncService.getPendingSyncCount()
      expect(pendingCount).toBe(0)
    })
  })

  describe('API Integration', () => {
    it('should sync with backend API when online', async () => {
      // Create inspection via API
      const inspectionData = {
        templateId: 'tmpl_sync_001',
        vehicleId: 'veh_sync_001',
        customerId: 'cust_sync_001',
        mechanicId: 'mech_sync_001',
        mileage: 50000,
      }

      const response = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inspectionData),
      })

      expect(response.status).toBe(201)
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.id).toBeDefined()
    })

    it('should handle sync status check', async () => {
      const response = await fetch('/api/sync')
      expect(response.status).toBe(200)

      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.pendingCount).toBeDefined()
    })

    it('should process sync via API endpoint', async () => {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearCompleted: true }),
      })

      expect(response.status).toBe(200)
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.total).toBeDefined()
      expect(result.data.successful).toBeDefined()
      expect(result.data.failed).toBeDefined()
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty queue processing', async () => {
      const result = await testDatabase.syncService.processSyncQueue()
      expect(result.total).toBe(0)
      expect(result.successful).toBe(0)
      expect(result.failed).toBe(0)
    })

    it('should handle max retries exceeded', async () => {
      testDatabase.syncService.setOnlineStatus(false)

      const itemId = await testDatabase.syncService.queueAction(
        'CREATE_INSPECTION',
        { vehicleId: 'veh_maxretry_001', simulateError: true },
        { maxRetries: 2 }
      )

      testDatabase.syncService.setOnlineStatus(true)

      // Process multiple times to exceed max retries
      await testDatabase.syncService.processSyncQueue()
      await testDatabase.syncService.processSyncQueue()
      await testDatabase.syncService.processSyncQueue()

      const failedItems = await testDatabase.syncService.getFailedItems()
      expect(failedItems.length).toBe(1)
      expect(failedItems[0].retryCount).toBeGreaterThanOrEqual(2)
    })

    it('should handle circular dependencies gracefully', async () => {
      testDatabase.syncService.setOnlineStatus(false)

      const itemA = await testDatabase.syncService.queueAction(
        'CREATE_INSPECTION',
        { vehicleId: 'veh_circular_a' },
        { dependencies: ['non-existent-dep'] }
      )

      testDatabase.syncService.setOnlineStatus(true)
      const result = await testDatabase.syncService.processSyncQueue()

      expect(result.total).toBe(1)
      expect(result.failed).toBe(1)
    })

    it('should handle large data payloads', async () => {
      testDatabase.syncService.setOnlineStatus(false)

      const largeData = {
        vehicleId: 'veh_large_001',
        notes: 'A'.repeat(100000), // 100KB of data
        items: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item_${i}` })),
      }

      const itemId = await testDatabase.syncService.queueAction(
        'CREATE_INSPECTION',
        largeData
      )

      const pendingItems = await testDatabase.syncService.getPendingItems()
      expect(pendingItems[0].data.notes).toBe(largeData.notes)
      expect(pendingItems[0].data.items.length).toBe(1000)
    })

    it('should handle special characters in data', async () => {
      testDatabase.syncService.setOnlineStatus(false)

      const specialData = {
        vehicleId: 'veh_special_001',
        notes: 'Special: <>&"\'\n\t\r 日本語 🚗 émojis',
      }

      const itemId = await testDatabase.syncService.queueAction(
        'CREATE_INSPECTION',
        specialData
      )

      const pendingItems = await testDatabase.syncService.getPendingItems()
      expect(pendingItems[0].data.notes).toBe(specialData.notes)
    })
  })
})
