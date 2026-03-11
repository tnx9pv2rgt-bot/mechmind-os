/**
 * GET /api/maintenance/upcoming
 * Get upcoming maintenance schedules due within specified days
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { getUpcomingItems } from '@/lib/services/maintenanceService'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    const vehicleId = searchParams.get('vehicleId') || undefined
    
    // Validate days parameter
    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid days parameter',
          details: 'Days must be a number between 1 and 365'
        },
        { status: 400 }
      )
    }
    
    const items = await getUpcomingItems(days, vehicleId)
    
    return NextResponse.json({
      success: true,
      data: items,
      count: items.length,
      days
    })
  } catch (error) {
    console.error('Get upcoming items error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch upcoming maintenance items',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
