/**
 * GET /api/maintenance/overdue
 * Get all overdue maintenance schedules
 */

import { NextRequest, NextResponse } from 'next/server'
import { getOverdueItems } from '@/lib/services/maintenanceService'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vehicleId = searchParams.get('vehicleId') || undefined
    
    const items = await getOverdueItems(vehicleId)
    
    return NextResponse.json({
      success: true,
      data: items,
      count: items.length
    })
  } catch (error) {
    console.error('Get overdue items error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch overdue maintenance items',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
