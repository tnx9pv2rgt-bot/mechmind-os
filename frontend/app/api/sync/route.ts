/**
 * POST /api/sync
 * Process the offline sync queue
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  processSyncQueue,
  getPendingItems,
  getPendingSyncCount,
  clearSyncQueue,
} from '@/lib/services/offlineSyncService'

// GET /api/sync - Get sync queue status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeItems = searchParams.get('includeItems') === 'true'

    const pendingCount = await getPendingSyncCount()
    
    const response: {
      success: boolean
      data: {
        pendingCount: number
        items?: unknown[]
      }
    } = {
      success: true,
      data: {
        pendingCount,
      }
    }

    if (includeItems && pendingCount > 0) {
      const items = await getPendingItems()
      response.data.items = items
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('Get sync status error:', error)

    return NextResponse.json(
      { 
        error: 'Failed to get sync status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST /api/sync - Process sync queue
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { 
      clearCompleted,
      olderThan,
    } = body

    // Process the sync queue
    const result = await processSyncQueue()

    // Clear completed items if requested
    let clearedCount = 0
    if (clearCompleted) {
      const cutoff = olderThan 
        ? Date.now() - (Number(olderThan) * 24 * 60 * 60 * 1000) // Convert days to ms
        : Date.now() - (7 * 24 * 60 * 60 * 1000) // Default: 7 days ago
      
      clearedCount = await clearSyncQueue(cutoff)
    }

    return NextResponse.json(
      { 
        success: true,
        data: {
          total: result.total,
          successful: result.successful,
          failed: result.failed,
          conflicts: result.conflicts,
          cleared: clearedCount,
          completedAt: new Date(result.completedAt).toISOString(),
          results: result.results.map(r => ({
            itemId: r.itemId,
            success: r.success,
            action: r.action,
            entityId: r.entityId,
            error: r.error,
            conflictResolved: r.conflictResolved,
          }))
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Process sync queue error:', error)

    return NextResponse.json(
      { 
        error: 'Sync processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
