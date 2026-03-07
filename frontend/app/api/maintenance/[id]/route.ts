/**
 * GET /api/maintenance/[id]
 * Get a single maintenance schedule by ID
 * 
 * PUT /api/maintenance/[id]
 * Update a maintenance schedule
 * 
 * DELETE /api/maintenance/[id]
 * Delete a maintenance schedule
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getMaintenanceScheduleById,
  updateMaintenanceSchedule,
  deleteMaintenanceSchedule,
  MaintenanceNotFoundError,
  MaintenanceValidationError
} from '@/lib/services/maintenanceService'
import type { NotificationLevel } from '@prisma/client'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// GET handler - Get single maintenance schedule
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing schedule ID'
        },
        { status: 400 }
      )
    }
    
    const schedule = await getMaintenanceScheduleById(id)
    
    return NextResponse.json({
      success: true,
      data: schedule
    })
  } catch (error) {
    console.error('Get maintenance schedule error:', error)
    
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
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch maintenance schedule',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT handler - Update maintenance schedule
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing schedule ID'
        },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    
    const {
      intervalKm,
      intervalMonths,
      lastServiceDate,
      lastServiceKm,
      nextDueDate,
      nextDueKm,
      notificationLevel
    } = body
    
    // Build update data (only include defined fields)
    const updateData: {
      intervalKm?: number
      intervalMonths?: number
      lastServiceDate?: Date
      lastServiceKm?: number
      nextDueDate?: Date
      nextDueKm?: number
      notificationLevel?: NotificationLevel
    } = {}
    
    if (intervalKm !== undefined) updateData.intervalKm = Number(intervalKm)
    if (intervalMonths !== undefined) updateData.intervalMonths = Number(intervalMonths)
    if (lastServiceDate !== undefined) updateData.lastServiceDate = new Date(lastServiceDate)
    if (lastServiceKm !== undefined) updateData.lastServiceKm = Number(lastServiceKm)
    if (nextDueDate !== undefined) updateData.nextDueDate = new Date(nextDueDate)
    if (nextDueKm !== undefined) updateData.nextDueKm = Number(nextDueKm)
    if (notificationLevel !== undefined) updateData.notificationLevel = notificationLevel as NotificationLevel
    
    // Validate notificationLevel if provided
    if (notificationLevel) {
      const validLevels = ['ALERT', 'WARNING', 'CRITICAL']
      if (!validLevels.includes(notificationLevel)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid notification level',
            details: `Level must be one of: ${validLevels.join(', ')}`
          },
          { status: 400 }
        )
      }
    }
    
    const schedule = await updateMaintenanceSchedule(id, updateData)
    
    return NextResponse.json({
      success: true,
      data: schedule
    })
  } catch (error) {
    console.error('Update maintenance schedule error:', error)
    
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
        error: 'Failed to update maintenance schedule',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE handler - Delete maintenance schedule
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing schedule ID'
        },
        { status: 400 }
      )
    }
    
    const result = await deleteMaintenanceSchedule(id)
    
    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Delete maintenance schedule error:', error)
    
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
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete maintenance schedule',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
