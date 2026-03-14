/**
 * Warranty API Routes
 * GET /api/inspections/[id]/warranty - Get warranty for inspection
 * POST /api/inspections/[id]/warranty - Create warranty for inspection
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  createWarranty,
  getWarrantyByInspection,
  WarrantyError,
  WarrantyNotFoundError,
  InvalidWarrantyDataError,
} from '@/lib/services/warrantyService'
import { TRPCClientError } from '@/lib/api-errors'
import { WarrantyType } from '@/lib/services/warrantyService'
import type { CreateWarrantyDTO } from '@/lib/services/warrantyService'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/inspections/[id]/warranty
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Inspection ID is required' },
        { status: 400 }
      )
    }

    const warranty = await getWarrantyByInspection(id)

    if (!warranty) {
      return NextResponse.json(
        { 
          success: true,
          data: null,
          message: 'No warranty found for this inspection'
        },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { 
        success: true,
        data: warranty 
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get warranty error:', error)

    if (error instanceof WarrantyNotFoundError) {
      return NextResponse.json(
        { 
          success: true,
          data: null 
        },
        { status: 200 }
      )
    }

    if (error instanceof WarrantyError) {
      return NextResponse.json(
        { 
          error: 'Warranty service error',
          details: error.message,
          code: error.code
        },
        { status: error.statusCode || 500 }
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

// POST /api/inspections/[id]/warranty
export async function POST(request: NextRequest, { params }: RouteParams) {
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
      type,
      provider,
      startDate,
      expirationDate,
      maxCoverage,
      deductible,
      currentKm,
      mileageLimit,
      alertDaysBeforeExpiry,
      sendEmail,
      sendSMS,
      startMileage,
    } = body

    // Validate required fields
    if (!type || !startDate || !expirationDate || maxCoverage === undefined) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: 'type, startDate, expirationDate, and maxCoverage are required'
        },
        { status: 400 }
      )
    }

    // Validate warranty type
    const validTypes: WarrantyType[] = [WarrantyType.MANUFACTURER, WarrantyType.EXTENDED, WarrantyType.AS_IS]
    if (!validTypes.includes(type as WarrantyType)) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: 'type must be one of: MANUFACTURER, EXTENDED, AS_IS'
        },
        { status: 400 }
      )
    }

    // Validate dates
    const start = new Date(startDate)
    const expiration = new Date(expirationDate)

    if (isNaN(start.getTime()) || isNaN(expiration.getTime())) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: 'Invalid date format'
        },
        { status: 400 }
      )
    }

    if (expiration <= start) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: 'Expiration date must be after start date'
        },
        { status: 400 }
      )
    }

    // Validate maxCoverage
    if (maxCoverage < 0) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: 'maxCoverage cannot be negative'
        },
        { status: 400 }
      )
    }

    const warrantyData: CreateWarrantyDTO = {
      vehicleId: id,
      type: type as WarrantyType,
      provider: provider || 'Unknown',
      startDate,
      expirationDate,
      maxCoverage: Number(maxCoverage),
      deductible: Number(deductible) || 0,
      currentKm: Number(currentKm) || 0,
      ...(mileageLimit !== undefined && { coverageKm: Number(mileageLimit) }),
      ...(alertDaysBeforeExpiry !== undefined && { alertDaysBeforeExpiry: Number(alertDaysBeforeExpiry) }),
      ...(sendEmail !== undefined && { sendEmail: Boolean(sendEmail) }),
      ...(sendSMS !== undefined && { sendSMS: Boolean(sendSMS) }),
      ...(startMileage !== undefined && { startMileage: Number(startMileage) }),
    }

    const warranty = await createWarranty(warrantyData)

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
          details: error.message
        },
        { status: 400 }
      )
    }

    if (error instanceof WarrantyError) {
      return NextResponse.json(
        { 
          error: 'Warranty service error',
          details: error.message,
          code: error.code
        },
        { status: error.statusCode || 500 }
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
