/**
 * GET /api/warranties/expiring
 * Get warranties expiring within specified days
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  warrantyService,
  WarrantyError,
  InvalidWarrantyDataError 
} from '@/lib/services/warrantyService'

// GET /api/warranties/expiring?days=60
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const daysParam = searchParams.get('days')
    const days = daysParam ? parseInt(daysParam, 10) : 60

    if (isNaN(days) || days < 0) {
      return NextResponse.json(
        { 
          error: 'Invalid days parameter',
          details: 'days must be a positive number'
        },
        { status: 400 }
      )
    }

    const warranties = await warrantyService.getExpiringWarranties(days)

    return NextResponse.json(
      { 
        success: true,
        data: warranties,
        count: warranties.length,
        days
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get expiring warranties error:', error)

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
