/**
 * POST /api/inspections
 * Create a new vehicle inspection
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  createInspection,
  InspectionValidationError 
} from '@/lib/services/inspectionService'
import { TRPCClientError, ServerError } from '@/lib/trpc-client'
import type { CreateInspectionInput } from '@/lib/services/inspectionService'
type FuelLevel = 'EMPTY' | 'QUARTER' | 'HALF' | 'THREE_QUARTERS' | 'FULL'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    const { 
      templateId, 
      vehicleId, 
      customerId, 
      mechanicId,
      mileage,
      fuelLevel,
      notes 
    } = body

    if (!templateId || !vehicleId || !customerId || !mechanicId) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          details: 'templateId, vehicleId, customerId, and mechanicId are required'
        },
        { status: 400 }
      )
    }

    // Build input data
    const input: CreateInspectionInput = {
      templateId,
      vehicleId,
      customerId,
      mechanicId,
      ...(mileage !== undefined && { mileage: Number(mileage) }),
      ...(fuelLevel && { fuelLevel: fuelLevel as FuelLevel }),
      ...(notes && { notes })
    }

    // Create inspection
    const inspection = await createInspection(input)

    return NextResponse.json(
      { 
        success: true,
        data: inspection 
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create inspection error:', error)

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
