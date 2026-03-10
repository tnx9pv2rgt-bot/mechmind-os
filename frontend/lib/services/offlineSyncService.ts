/**
 * Offline Sync Service - MechMind OS Frontend
 * 
 * Offline-first sync service for inspections without internet.
 * Handles queuing, processing, and conflict resolution for inspection data.
 * 
 * Features:
 * - IndexedDB storage for offline data persistence
 * - Action queuing with retry logic
 * - Conflict resolution using timestamp-based priority
 * - Background sync when connection is restored
 * 
 * @module lib/services/offlineSyncService
 * @version 1.0.0
 */

import type { DigitalInspection, InspectionPhoto, InspectionItem } from '@/types/inspection'

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

/** Supported sync actions for inspections */
export type SyncAction = 
  | 'CREATE_INSPECTION'
  | 'UPDATE_INSPECTION'
  | 'UPDATE_PHOTO'
  | 'ADD_NOTE'
  | 'UPDATE_ITEM_STATUS'
  | 'SUBMIT_INSPECTION'
  | 'DELETE_INSPECTION'

/** Priority level for sync queue items */
export type SyncPriority = 'low' | 'normal' | 'high' | 'critical'

/** Status of a sync queue item */
export type SyncStatus = 'pending' | 'syncing' | 'completed' | 'failed' | 'conflict'

/** Generic data payload for sync actions */
export interface SyncData {
  [key: string]: unknown
}

/** Inspection-specific sync data */
export interface InspectionSyncData extends SyncData {
  inspectionId?: string
  vehicleId?: string
  customerId?: string
  tenantId?: string
  photos?: InspectionPhoto[]
  items?: InspectionItem[]
  notes?: string
  status?: string
  timestamp?: string
}

/** Queue item stored in IndexedDB */
export interface OfflineSyncQueueItem {
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

/** Result of processing a single queue item */
export interface SyncResult {
  itemId: string
  success: boolean
  action: SyncAction
  entityId?: string
  error?: string
  conflictResolved?: boolean
  mergedData?: InspectionSyncData
}

/** Overall sync queue processing result */
export interface SyncQueueResult {
  total: number
  successful: number
  failed: number
  conflicts: number
  results: SyncResult[]
  completedAt: number
}

/** IndexedDB configuration */
const DB_NAME = 'MechMindOfflineDB'
const DB_VERSION = 1
const STORE_SYNC_QUEUE = 'offlineSyncQueue'
const STORE_LOCAL_DATA = 'localDataStore'

/** Default configuration */
const DEFAULT_MAX_RETRIES = 5
const DEFAULT_RETRY_DELAY = 1000
const MAX_RETRY_DELAY = 30000
const SYNC_BATCH_SIZE = 10

// ============================================================================
// INDEXEDDB WRAPPER
// ============================================================================

/** Get or create IndexedDB instance */
function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB not available in server environment'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Sync queue store with indexes
      if (!db.objectStoreNames.contains(STORE_SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORE_SYNC_QUEUE, { keyPath: 'id' })
        syncStore.createIndex('status', 'status', { unique: false })
        syncStore.createIndex('createdAt', 'createdAt', { unique: false })
        syncStore.createIndex('priority', 'priority', { unique: false })
        syncStore.createIndex('entityId', 'entityId', { unique: false })
      }

      // Local data store
      if (!db.objectStoreNames.contains(STORE_LOCAL_DATA)) {
        db.createObjectStore(STORE_LOCAL_DATA, { keyPath: 'key' })
      }
    }
  })
}

/** Execute a transaction on a specific store */
async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode)
    const store = transaction.objectStore(storeName)
    const request = operation(store)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

// ============================================================================
// LOCAL DB OPERATIONS
// ============================================================================

/**
 * Save data to IndexedDB local storage
 * 
 * @param key - Unique key for the data
 * @param data - Data to store
 * @returns Promise resolving when data is saved
 * 
 * @example
 * ```typescript
 * await saveToLocalDB('inspection-draft-123', inspectionData)
 * ```
 */
export async function saveToLocalDB<T>(key: string, data: T): Promise<void> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_LOCAL_DATA, 'readwrite')
    const store = transaction.objectStore(STORE_LOCAL_DATA)
    
    const record = {
      key,
      data,
      savedAt: Date.now(),
    }
    
    const request = store.put(record)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

/**
 * Retrieve data from IndexedDB local storage
 * 
 * @param key - Unique key for the data
 * @returns Promise resolving to the stored data or null
 * 
 * @example
 * ```typescript
 * const draft = await getFromLocalDB<DigitalInspection>('inspection-draft-123')
 * if (draft) {
 *   // Restore draft
 * }
 * ```
 */
export async function getFromLocalDB<T>(key: string): Promise<T | null> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_LOCAL_DATA, 'readonly')
    const store = transaction.objectStore(STORE_LOCAL_DATA)
    const request = store.get(key)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const result = request.result
      resolve(result ? (result.data as T) : null)
    }
  })
}

/**
 * Remove data from IndexedDB local storage
 * 
 * @param key - Unique key for the data to remove
 */
export async function removeFromLocalDB(key: string): Promise<void> {
  await withStore(STORE_LOCAL_DATA, 'readwrite', (store) => store.delete(key))
}

/**
 * Get all keys from local data store
 * 
 * @returns Array of keys
 */
export async function getLocalDBKeys(): Promise<string[]> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_LOCAL_DATA, 'readonly')
    const store = transaction.objectStore(STORE_LOCAL_DATA)
    const request = store.getAllKeys()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result as string[])
  })
}

// ============================================================================
// QUEUE OPERATIONS
// ============================================================================

/**
 * Queue an action for later sync
 * 
 * @param action - The action type to queue
 * @param data - The data associated with the action
 * @param options - Optional configuration
 * @returns Promise resolving to the queue item ID
 * 
 * @example
 * ```typescript
 * const queueItemId = await queueAction('CREATE_INSPECTION', {
 *   vehicleId: 'veh-123',
 *   customerId: 'cust-456',
 *   inspectionType: 'pre_sale',
 *   timestamp: new Date().toISOString(),
 * })
 * ```
 */
export async function queueAction(
  action: SyncAction,
  data: InspectionSyncData,
  options?: {
    priority?: SyncPriority
    entityId?: string
    dependencies?: string[]
    maxRetries?: number
  }
): Promise<string> {
  const id = generateQueueItemId()
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
    maxRetries: options?.maxRetries || DEFAULT_MAX_RETRIES,
    entityId: options?.entityId,
    dependencies: options?.dependencies,
  }

  await withStore(STORE_SYNC_QUEUE, 'readwrite', (store) => store.add(queueItem))
  
  // Trigger background sync if online
  if (isOnline()) {
    triggerBackgroundSync()
  }

  return id
}

/**
 * Get all pending (unsynced) items from the queue
 * 
 * @returns Array of pending queue items
 */
export async function getPendingItems(): Promise<OfflineSyncQueueItem[]> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_SYNC_QUEUE, 'readonly')
    const store = transaction.objectStore(STORE_SYNC_QUEUE)
    const index = store.index('status')
    const request = index.getAll('pending')

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const items = request.result as OfflineSyncQueueItem[]
      // Sort by priority and creation date
      resolve(sortItemsByPriority(items))
    }
  })
}

/**
 * Get count of pending (unsynced) items
 * 
 * @returns Number of unsynced items
 */
export async function getPendingSyncCount(): Promise<number> {
  const items = await getPendingItems()
  return items.length
}

/**
 * Update a queue item
 */
async function updateQueueItem(
  id: string,
  updates: Partial<OfflineSyncQueueItem>
): Promise<void> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_SYNC_QUEUE, 'readwrite')
    const store = transaction.objectStore(STORE_SYNC_QUEUE)
    const getRequest = store.get(id)

    getRequest.onerror = () => reject(getRequest.error)
    getRequest.onsuccess = () => {
      const item = getRequest.result as OfflineSyncQueueItem
      if (!item) {
        reject(new Error(`Queue item ${id} not found`))
        return
      }

      const updated = {
        ...item,
        ...updates,
        updatedAt: Date.now(),
      }

      const putRequest = store.put(updated)
      putRequest.onerror = () => reject(putRequest.error)
      putRequest.onsuccess = () => resolve()
    }
  })
}

/**
 * Mark a queue item as completed
 */
async function markItemCompleted(id: string): Promise<void> {
  await updateQueueItem(id, {
    status: 'completed',
    syncedAt: Date.now(),
  })
}

/**
 * Mark a queue item as failed with error
 */
async function markItemFailed(id: string, error: string): Promise<void> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_SYNC_QUEUE, 'readwrite')
    const store = transaction.objectStore(STORE_SYNC_QUEUE)
    const getRequest = store.get(id)

    getRequest.onerror = () => reject(getRequest.error)
    getRequest.onsuccess = () => {
      const item = getRequest.result as OfflineSyncQueueItem
      if (!item) {
        reject(new Error(`Queue item ${id} not found`))
        return
      }

      const newRetryCount = item.retryCount + 1
      const updated: OfflineSyncQueueItem = {
        ...item,
        status: newRetryCount >= item.maxRetries ? 'failed' : 'pending',
        retryCount: newRetryCount,
        lastError: error,
        updatedAt: Date.now(),
      }

      const putRequest = store.put(updated)
      putRequest.onerror = () => reject(putRequest.error)
      putRequest.onsuccess = () => resolve()
    }
  })
}

/**
 * Mark a queue item as having a conflict
 */
async function markItemConflict(id: string): Promise<void> {
  await updateQueueItem(id, { status: 'conflict' })
}

/**
 * Get a queue item by ID
 */
async function getQueueItem(id: string): Promise<OfflineSyncQueueItem | null> {
  const result = await withStore(STORE_SYNC_QUEUE, 'readonly', (store) => store.get(id))
  return result || null
}

// ============================================================================
// SYNC PROCESSING
// ============================================================================

/**
 * Process all pending items in the sync queue
 * 
 * Iterates through unsynced items, attempts to sync each one,
 * updates status, and increments retry count on failure.
 * 
 * @returns Promise resolving to sync results
 * 
 * @example
 * ```typescript
 * const result = await processSyncQueue()
 * console.log(`Synced ${result.successful} of ${result.total} items`)
 * ```
 */
export async function processSyncQueue(): Promise<SyncQueueResult> {
  const pendingItems = await getPendingItems()
  const results: SyncResult[] = []
  
  let successful = 0
  let failed = 0
  let conflicts = 0

  // Process items in batches to avoid overwhelming the server
  const batchSize = SYNC_BATCH_SIZE
  for (let i = 0; i < pendingItems.length; i += batchSize) {
    const batch = pendingItems.slice(i, i + batchSize)
    
    // Process batch items in parallel
    const batchResults = await Promise.all(
      batch.map(item => processSingleItem(item))
    )
    
    results.push(...batchResults)
    
    for (const result of batchResults) {
      if (result.success) {
        successful++
      } else if (result.conflictResolved) {
        conflicts++
        successful++
      } else {
        failed++
      }
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

/**
 * Process a single queue item
 */
async function processSingleItem(item: OfflineSyncQueueItem): Promise<SyncResult> {
  // Check if dependencies are met
  if (item.dependencies && item.dependencies.length > 0) {
    const allDependenciesMet = await checkDependencies(item.dependencies)
    if (!allDependenciesMet) {
      return {
        itemId: item.id,
        success: false,
        action: item.action,
        entityId: item.entityId,
        error: 'Dependencies not yet synced',
      }
    }
  }

  // Mark as syncing
  await updateQueueItem(item.id, { status: 'syncing' })

  try {
    const result = await executeSyncAction(item)
    
    if (result.success) {
      await markItemCompleted(item.id)
    } else if (result.conflict) {
      await markItemConflict(item.id)
    } else {
      await markItemFailed(item.id, result.error || 'Unknown error')
    }

    return {
      itemId: item.id,
      success: result.success,
      action: item.action,
      entityId: item.entityId,
      error: result.error,
      conflictResolved: result.conflictResolved,
      mergedData: result.mergedData,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    await markItemFailed(item.id, errorMessage)
    
    return {
      itemId: item.id,
      success: false,
      action: item.action,
      entityId: item.entityId,
      error: errorMessage,
    }
  }
}

/**
 * Execute a sync action by calling the appropriate API
 */
async function executeSyncAction(
  item: OfflineSyncQueueItem
): Promise<{
  success: boolean
  error?: string
  conflict?: boolean
  conflictResolved?: boolean
  mergedData?: InspectionSyncData
}> {
  // In a real implementation, these would call the actual API endpoints
  // For now, we'll simulate the sync process
  
  const { action, data } = item
  
  switch (action) {
    case 'CREATE_INSPECTION':
      return executeCreateInspection(data)
      
    case 'UPDATE_INSPECTION':
      return executeUpdateInspection(data)
      
    case 'UPDATE_PHOTO':
      return executeUpdatePhoto(data)
      
    case 'ADD_NOTE':
      return executeAddNote(data)
      
    case 'UPDATE_ITEM_STATUS':
      return executeUpdateItemStatus(data)
      
    case 'SUBMIT_INSPECTION':
      return executeSubmitInspection(data)
      
    case 'DELETE_INSPECTION':
      return executeDeleteInspection(data)
      
    default:
      return { success: false, error: `Unknown action: ${action}` }
  }
}

// ============================================================================
// API ACTION HANDLERS (Simulated - replace with actual API calls)
// ============================================================================

async function executeCreateInspection(data: InspectionSyncData) {
  try {
    // TODO: Replace with actual API call
    // const response = await api.inspections.create(data)
    
    // Simulate API call
    await simulateNetworkDelay()
    
    return { success: true }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create inspection' 
    }
  }
}

async function executeUpdateInspection(data: InspectionSyncData) {
  try {
    // TODO: Replace with actual API call
    await simulateNetworkDelay()
    
    return { success: true }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update inspection' 
    }
  }
}

async function executeUpdatePhoto(data: InspectionSyncData) {
  try {
    // Handle photo upload
    if (data.photos && data.photos.length > 0) {
      // TODO: Upload photos to storage
      await simulateNetworkDelay(500) // Photos take longer
    }
    
    return { success: true }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to upload photo' 
    }
  }
}

async function executeAddNote(data: InspectionSyncData) {
  try {
    // TODO: Replace with actual API call
    await simulateNetworkDelay()
    
    return { success: true }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to add note' 
    }
  }
}

async function executeUpdateItemStatus(data: InspectionSyncData) {
  try {
    // TODO: Replace with actual API call
    await simulateNetworkDelay()
    
    return { success: true }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update item status' 
    }
  }
}

async function executeSubmitInspection(data: InspectionSyncData) {
  try {
    // TODO: Replace with actual API call
    await simulateNetworkDelay()
    
    return { success: true }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to submit inspection' 
    }
  }
}

async function executeDeleteInspection(data: InspectionSyncData) {
  try {
    // TODO: Replace with actual API call
    await simulateNetworkDelay()
    
    return { success: true }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete inspection' 
    }
  }
}

// ============================================================================
// CONFLICT RESOLUTION
// ============================================================================

/**
 * Resolve conflicts between server and local data using timestamp-based priority.
 * Latest timestamp wins. If timestamps are equal, server data takes precedence.
 * 
 * @param serverData - Data from the server
 * @param localData - Local data with pending changes
 * @returns Merged data with conflict resolution applied
 * 
 * @example
 * ```typescript
 * const merged = resolveConflict(serverInspection, localInspection)
 * // merged will contain the most recent data
 * ```
 */
export function resolveConflict<T extends InspectionSyncData>(
  serverData: T,
  localData: T
): T {
  const serverTimestamp = new Date(serverData.timestamp || 0).getTime()
  const localTimestamp = new Date(localData.timestamp || 0).getTime()
  
  // If local is newer, merge with server data but keep local changes
  if (localTimestamp > serverTimestamp) {
    return mergeData(serverData, localData)
  }
  
  // Server data is newer or equal - use server data
  return serverData
}

/**
 * Merge two data objects, with source taking precedence for conflicting fields
 */
function mergeData<T extends InspectionSyncData>(base: T, source: T): T {
  const merged = { ...base }
  
  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceValue = source[key]
    const baseValue = base[key]
    
    // Handle arrays (like photos, items, notes)
    if (Array.isArray(sourceValue) && Array.isArray(baseValue)) {
      // Merge arrays by ID where possible
      merged[key] = mergeArrays(baseValue, sourceValue) as T[keyof T]
    }
    // Handle nested objects
    else if (
      typeof sourceValue === 'object' && 
      sourceValue !== null && 
      !Array.isArray(sourceValue) &&
      typeof baseValue === 'object' && 
      baseValue !== null && 
      !Array.isArray(baseValue)
    ) {
      merged[key] = { ...baseValue, ...sourceValue }
    }
    // Simple value override
    else if (sourceValue !== undefined) {
      merged[key] = sourceValue
    }
  }
  
  return merged
}

/**
 * Merge two arrays, using ID to match items
 */
function mergeArrays<T extends { id?: string }>(base: T[], source: T[]): T[] {
  const merged = new Map<string, T>()
  
  // Add all base items
  for (const item of base) {
    if (item.id) {
      merged.set(item.id, item)
    }
  }
  
  // Merge or add source items
  for (const item of source) {
    if (item.id && merged.has(item.id)) {
      merged.set(item.id, { ...merged.get(item.id)!, ...item })
    } else if (item.id) {
      merged.set(item.id, item)
    } else {
      // Items without ID are appended
      merged.set(`temp_${Math.random().toString(36).substr(2, 9)}`, item)
    }
  }
  
  return Array.from(merged.values())
}

// ============================================================================
// QUEUE MANAGEMENT
// ============================================================================

/**
 * Clear completed items from the sync queue
 * 
 * @param olderThan - Optional timestamp to only clear items older than this
 * @returns Number of items cleared
 */
export async function clearSyncQueue(olderThan?: number): Promise<number> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_SYNC_QUEUE, 'readwrite')
    const store = transaction.objectStore(STORE_SYNC_QUEUE)
    const request = store.getAll()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const items = request.result as OfflineSyncQueueItem[]
      const cutoff = olderThan || 0
      
      let cleared = 0
      for (const item of items) {
        if (item.status === 'completed' && (item.syncedAt || 0) < cutoff) {
          store.delete(item.id)
          cleared++
        }
      }
      
      resolve(cleared)
    }
  })
}

/**
 * Clear all items from the sync queue (use with caution)
 */
export async function clearAllSyncQueue(): Promise<void> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_SYNC_QUEUE, 'readwrite')
    const store = transaction.objectStore(STORE_SYNC_QUEUE)
    const request = store.clear()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

/**
 * Get all failed items
 */
export async function getFailedItems(): Promise<OfflineSyncQueueItem[]> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_SYNC_QUEUE, 'readonly')
    const store = transaction.objectStore(STORE_SYNC_QUEUE)
    const index = store.index('status')
    const request = index.getAll('failed')

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result as OfflineSyncQueueItem[])
  })
}

/**
 * Retry a failed item
 */
export async function retryFailedItem(id: string): Promise<boolean> {
  const item = await getQueueItem(id)
  if (!item || item.status !== 'failed') {
    return false
  }

  await updateQueueItem(id, {
    status: 'pending',
    retryCount: 0,
    lastError: undefined,
  })

  // Trigger sync
  if (isOnline()) {
    triggerBackgroundSync()
  }

  return true
}

/**
 * Remove a specific item from the queue
 */
export async function removeQueueItem(id: string): Promise<void> {
  await withStore(STORE_SYNC_QUEUE, 'readwrite', (store) => store.delete(id))
}

// ============================================================================
// NETWORK STATUS
// ============================================================================

/**
 * Check if the device is currently online
 * 
 * @returns true if online, false if offline
 */
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine
}

/**
 * Listen for online/offline events
 * 
 * @param onOnline - Callback when connection is restored
 * @param onOffline - Callback when connection is lost
 * @returns Function to unsubscribe
 * 
 * @example
 * ```typescript
 * const unsubscribe = listenToNetworkChanges(
 *   () => console.log('Back online'),
 *   () => console.log('Gone offline')
 * )
 * // Later: unsubscribe()
 * ```
 */
export function listenToNetworkChanges(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handleOnline = () => {
    onOnline()
    triggerBackgroundSync()
  }
  
  const handleOffline = () => onOffline()

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}

// ============================================================================
// BACKGROUND SYNC
// ============================================================================

let backgroundSyncTimeout: NodeJS.Timeout | null = null

/**
 * Trigger background sync after a delay
 */
function triggerBackgroundSync(): void {
  if (backgroundSyncTimeout) {
    clearTimeout(backgroundSyncTimeout)
  }

  backgroundSyncTimeout = setTimeout(() => {
    if (isOnline()) {
      processSyncQueue().catch(console.error)
    }
  }, 1000) // 1 second debounce
}

/**
 * Register for background sync using the Background Sync API
 * (if supported by the browser)
 */
export async function registerBackgroundSync(tag = 'inspection-sync'): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    await (registration as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register(tag)
    return true
  } catch (error) {
    console.error('[OfflineSync] Background sync registration failed:', error)
    return false
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a unique ID for queue items
 */
function generateQueueItemId(): string {
  return `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Sort items by priority (critical > high > normal > low) and creation date
 */
function sortItemsByPriority(items: OfflineSyncQueueItem[]): OfflineSyncQueueItem[] {
  const priorityOrder: Record<SyncPriority, number> = {
    critical: 0,
    high: 1,
    normal: 2,
    low: 3,
  }

  return items.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
    if (priorityDiff !== 0) return priorityDiff
    return a.createdAt - b.createdAt
  })
}

/**
 * Check if all dependencies have been synced
 */
async function checkDependencies(dependencies: string[]): Promise<boolean> {
  const db = await getDB()
  
  for (const depId of dependencies) {
    const item = await withStore<OfflineSyncQueueItem>(
      STORE_SYNC_QUEUE,
      'readonly',
      (store) => store.get(depId)
    )
    
    if (!item || item.status !== 'completed') {
      return false
    }
  }
  
  return true
}

/**
 * Simulate network delay for testing
 */
function simulateNetworkDelay(ms = 200): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Calculate exponential backoff delay
 */
export function getRetryDelay(retryCount: number): number {
  const delay = DEFAULT_RETRY_DELAY * Math.pow(2, retryCount)
  return Math.min(delay, MAX_RETRY_DELAY)
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default {
  queueAction,
  processSyncQueue,
  isOnline,
  getPendingSyncCount,
  resolveConflict,
  saveToLocalDB,
  getFromLocalDB,
  removeFromLocalDB,
  clearSyncQueue,
  clearAllSyncQueue,
  getPendingItems,
  getFailedItems,
  retryFailedItem,
  removeQueueItem,
  listenToNetworkChanges,
  registerBackgroundSync,
  getRetryDelay,
}
