/**
 * GET /api/warranties/claims
 * Get all claims with optional status filter
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { 
  warrantyService,
  WarrantyError 
} from '@/lib/services/warrantyService'
import { ClaimStatus } from '@prisma/client'

// GET /api/warranties/claims
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as ClaimStatus | undefined

    // Validate status if provided
    if (status && !Object.values(ClaimStatus).includes(status)) {
      return NextResponse.json(
        { 
          error: 'Invalid status',
          details: `Status must be one of: ${Object.values(ClaimStatus).join(', ')}`
        },
        { status: 400 }
      )
    }

    const claims = await warrantyService.getClaims(status)

    return NextResponse.json(
      { 
        success: true,
        data: claims,
        count: claims.length
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get claims error:', error)

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
