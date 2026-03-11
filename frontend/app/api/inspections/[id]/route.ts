/**
 * Inspection Single Resource API Routes
 * GET /api/inspections/[id] - Get inspection by ID
 * PUT /api/inspections/[id] - Update inspection
 * DELETE /api/inspections/[id] - Delete inspection
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import {
  getInspectionById,
  updateInspection,
  deleteInspection,
  InspectionNotFoundError,
  InspectionValidationError,
} from '@/lib/services/inspectionService'
import { TRPCClientError, ServerError } from '@/lib/trpc-client'
import type { UpdateInspectionInput } from '@/lib/services/inspectionService'
import type { InspectionStatus, InspectionItemStatus, FindingSeverity, FuelLevel } from '@prisma/client'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/inspections/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Inspection ID is required' },
        { status: 400 }
      )
    }

    const inspection = await getInspectionById(id)

    return NextResponse.json(
      { 
        success: true,
        data: inspection 
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get inspection error:', error)

    if (error instanceof InspectionNotFoundError) {
      return NextResponse.json(
        { error: 'Inspection not found' },
        { status: 404 }
      )
    }

    if (error instanceof InspectionValidationError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.message 
        },
        { status: 400 }
      )
    }

    if (error instanceof TRPCClientError) {
      return NextResponse.json(
        { 
          error: 'Service error',
          details: error.message,
          code: error.code
        },
        { status: error.statusCode || 500 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT /api/inspections/[id]
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Inspection ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { 
      status, 
      mileage, 
      fuelLevel, 
      notes,
      items 
    } = body

    // Build update data
    const updateData: UpdateInspectionInput = {}
    
    if (status) updateData.status = status as InspectionStatus
    if (mileage !== undefined) updateData.mileage = Number(mileage)
    if (fuelLevel) updateData.fuelLevel = fuelLevel as FuelLevel
    if (notes !== undefined) updateData.notes = notes
    if (items && Array.isArray(items)) {
      updateData.items = items.map((item: {
        templateItemId: string
        status: string
        notes?: string
        severity?: string
      }) => ({
        templateItemId: item.templateItemId,
        status: item.status as InspectionItemStatus,
        ...(item.notes && { notes: item.notes }),
        ...(item.severity && { severity: item.severity as FindingSeverity })
      }))
    }

    const inspection = await updateInspection(id, updateData)

    return NextResponse.json(
      { 
        success: true,
        data: inspection 
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update inspection error:', error)

    if (error instanceof InspectionNotFoundError) {
      return NextResponse.json(
        { error: 'Inspection not found' },
        { status: 404 }
      )
    }

    if (error instanceof InspectionValidationError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.message,
          field: error.field
        },
        { status: 400 }
      )
    }

    if (error instanceof TRPCClientError) {
      return NextResponse.json(
        { 
          error: 'Service error',
          details: error.message,
          code: error.code
        },
        { status: error.statusCode || 500 }
      )
    }

    if (error instanceof ServerError) {
      return NextResponse.json(
        { 
          error: 'Server error',
          details: error.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/inspections/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Inspection ID is required' },
        { status: 400 }
      )
    }

    // Get deletedBy from request body or headers
    let deletedBy: string | undefined
    try {
      const body = await request.json()
      deletedBy = body.deletedBy
    } catch {
      // No body provided, try header
      deletedBy = request.headers.get('x-user-id') || undefined
    }

    if (!deletedBy) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: 'deletedBy user ID is required in body or x-user-id header'
        },
        { status: 400 }
      )
    }

    const result = await deleteInspection(id, deletedBy)

    return NextResponse.json(
      { 
        success: true,
        data: result 
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete inspection error:', error)

    if (error instanceof InspectionNotFoundError) {
      return NextResponse.json(
        { error: 'Inspection not found' },
        { status: 404 }
      )
    }

    if (error instanceof InspectionValidationError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.message 
        },
        { status: 400 }
      )
    }

    if (error instanceof TRPCClientError) {
      return NextResponse.json(
        { 
          error: 'Service error',
          details: error.message,
          code: error.code
        },
        { status: error.statusCode || 500 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
