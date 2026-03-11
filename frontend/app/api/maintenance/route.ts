/**
 * GET /api/maintenance
 * List maintenance schedules with filtering and pagination
 *
 * POST /api/maintenance
 * Create a new maintenance schedule
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import {
  listMaintenanceSchedules,
  createMaintenanceSchedule,
  getMaintenanceSummary,
  MaintenanceValidationError,
  VehicleNotFoundError
} from '@/lib/services/maintenanceService'
import type { MaintenanceType, NotificationLevel } from '@prisma/client'

// GET handler - List maintenance schedules
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse pagination params
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sortBy = searchParams.get('sortBy') || 'nextDueDate'
    const sortOrder = (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc'
    
    // Parse filter params
    const vehicleId = searchParams.get('vehicleId') || undefined
    const type = searchParams.get('type') as MaintenanceType | undefined
    const isOverdue = searchParams.get('isOverdue') === 'true' ? true :
                      searchParams.get('isOverdue') === 'false' ? false : undefined
    const notificationLevel = searchParams.get('notificationLevel') as NotificationLevel | undefined
    
    const dueBefore = searchParams.get('dueBefore') 
      ? new Date(searchParams.get('dueBefore')!) 
      : undefined
    const dueAfter = searchParams.get('dueAfter') 
      ? new Date(searchParams.get('dueAfter')!) 
      : undefined
    
    // Check if summary is requested
    if (searchParams.get('summary') === 'true') {
      const summary = await getMaintenanceSummary()
      return NextResponse.json({ success: true, data: summary })
    }
    
    // Build filters
    const filters = {
      ...(vehicleId && { vehicleId }),
      ...(type && { type }),
      ...(isOverdue !== undefined && { isOverdue }),
      ...(notificationLevel && { notificationLevel }),
      ...(dueBefore && { dueBefore }),
      ...(dueAfter && { dueAfter })
    }
    
    const pagination = { page, limit, sortBy: sortBy as any, sortOrder }
    
    const result = await listMaintenanceSchedules(filters, pagination)
    
    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('List maintenance schedules error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch maintenance schedules',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST handler - Create maintenance schedule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      vehicleId,
      type,
      intervalKm,
      intervalMonths,
      lastServiceDate,
      lastServiceKm,
      notificationLevel
    } = body
    
    // Validate required fields
    if (!vehicleId || !type || !intervalKm || !intervalMonths || !lastServiceDate || lastServiceKm === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          details: 'vehicleId, type, intervalKm, intervalMonths, lastServiceDate, and lastServiceKm are required'
        },
        { status: 400 }
      )
    }
    
    // Validate type
    const validTypes = ['OIL_CHANGE', 'TIRE_ROTATION', 'BRAKE_CHECK', 'FILTER', 'INSPECTION', 'BELTS', 'BATTERY']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid maintenance type',
          details: `Type must be one of: ${validTypes.join(', ')}`
        },
        { status: 400 }
      )
    }
    
    // Build input
    const input = {
      vehicleId,
      type: type as MaintenanceType,
      intervalKm: Number(intervalKm),
      intervalMonths: Number(intervalMonths),
      lastServiceDate: new Date(lastServiceDate),
      lastServiceKm: Number(lastServiceKm),
      ...(notificationLevel && { notificationLevel: notificationLevel as NotificationLevel })
    }
    
    const schedule = await createMaintenanceSchedule(input)
    
    return NextResponse.json(
      {
        success: true,
        data: schedule
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create maintenance schedule error:', error)
    
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
    
    if (error instanceof VehicleNotFoundError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Vehicle not found',
          details: error.message
        },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create maintenance schedule',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
