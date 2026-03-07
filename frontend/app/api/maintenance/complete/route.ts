/**
 * POST /api/maintenance/complete
 * Mark a maintenance schedule as completed
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  markAsCompleted,
  MaintenanceNotFoundError,
  MaintenanceValidationError
} from '@/lib/services/maintenanceService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { scheduleId, currentKm, date, notes } = body
    
    // Validate required fields
    if (!scheduleId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field',
          details: 'scheduleId is required'
        },
        { status: 400 }
      )
    }
    
    if (currentKm === undefined || currentKm === null) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field',
          details: 'currentKm is required'
        },
        { status: 400 }
      )
    }
    
    // Build input
    const input = {
      currentKm: Number(currentKm),
      ...(date && { date: new Date(date) }),
      ...(notes && { notes })
    }
    
    const schedule = await markAsCompleted(scheduleId, input)
    
    return NextResponse.json({
      success: true,
      data: schedule,
      message: 'Maintenance marked as completed successfully'
    })
  } catch (error) {
    console.error('Complete maintenance error:', error)
    
    if (error instanceof MaintenanceNotFoundError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Maintenance schedule not found',
          details: error.message
        },
        { status: 404 }
      )
    }
    
    if (error instanceof MaintenanceValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.message,
          field: error.field
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to complete maintenance',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
