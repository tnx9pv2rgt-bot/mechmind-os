/**
 * GET /api/warranties
 * List all warranties with optional filters
 * 
 * POST /api/warranties
 * Create a new warranty
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  warrantyService,
  WarrantyError,
  InvalidWarrantyDataError,
  WarrantyNotFoundError,
  WarrantyType,
} from '@/lib/services/warrantyService'
import { WarrantyStatus } from '@prisma/client'

// GET /api/warranties
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse filters
    const vehicleId = searchParams.get('vehicleId') || undefined
    const status = searchParams.get('status') as WarrantyStatus | undefined
    const type = searchParams.get('type') as WarrantyType | undefined

    // Validate status if provided
    if (status && !Object.values(WarrantyStatus).includes(status)) {
      return NextResponse.json(
        { 
          error: 'Invalid status',
          details: `Status must be one of: ${Object.values(WarrantyStatus).join(', ')}`
        },
        { status: 400 }
      )
    }

    // Validate type if provided
    if (type && !Object.values(WarrantyType).includes(type as WarrantyType)) {
      return NextResponse.json(
        { 
          error: 'Invalid type',
          details: `Type must be one of: ${Object.values(WarrantyType).join(', ')}`
        },
        { status: 400 }
      )
    }

    const warranties = await warrantyService.listWarranties({
      vehicleId,
      status,
      type,
    })

    return NextResponse.json(
      { 
        success: true,
        data: warranties,
        count: warranties.length
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('List warranties error:', error)

    if (error instanceof WarrantyError) {
      return NextResponse.json(
        { 
          error: error.message,
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

// POST /api/warranties
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const {
      vehicleId,
      type,
      provider,
      startDate,
      expirationDate,
      currentKm,
      maxCoverage,
      deductible,
    } = body

    if (!vehicleId || !type || !provider || !startDate || !expirationDate || 
        currentKm === undefined || maxCoverage === undefined || deductible === undefined) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          details: 'vehicleId, type, provider, startDate, expirationDate, currentKm, maxCoverage, and deductible are required'
        },
        { status: 400 }
      )
    }

    // Create warranty
    const warranty = await warrantyService.createWarranty({
      vehicleId,
      type,
      provider,
      startDate,
      expirationDate,
      coverageKm: body.coverageKm,
      currentKm: Number(currentKm),
      maxCoverage: Number(maxCoverage),
      deductible: Number(deductible),
      terms: body.terms,
      certificateUrl: body.certificateUrl,
    })

    return NextResponse.json(
      { 
        success: true,
        data: warranty 
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create warranty error:', error)

    if (error instanceof InvalidWarrantyDataError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.message,
          code: error.code
        },
        { status: 400 }
      )
    }

    if (error instanceof WarrantyError) {
      return NextResponse.json(
        { 
          error: error.message,
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
