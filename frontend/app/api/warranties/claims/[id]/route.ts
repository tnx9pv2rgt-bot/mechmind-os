/**
 * GET /api/warranties/claims/[id]
 * Get claim by ID
 * 
 * PUT /api/warranties/claims/[id]
 * Review claim (approve/reject)
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  warrantyService,
  WarrantyError,
  InvalidClaimDataError,
  ClaimNotFoundError 
} from '@/lib/services/warrantyService'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/warranties/claims/[id]
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const claim = await warrantyService.getClaim(id)

    if (!claim) {
      return NextResponse.json(
        { 
          error: 'Claim not found',
          code: 'CLAIM_NOT_FOUND'
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { 
        success: true,
        data: claim 
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get claim error:', error)

    if (error instanceof ClaimNotFoundError) {
      return NextResponse.json(
        { 
          error: error.message,
          code: error.code
        },
        { status: 404 }
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

// PUT /api/warranties/claims/[id]
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Validate required fields
    const { decision, reviewedBy } = body

    if (!decision || !['APPROVE', 'REJECT'].includes(decision)) {
      return NextResponse.json(
        { 
          error: 'Invalid decision',
          details: 'decision must be either APPROVE or REJECT'
        },
        { status: 400 }
      )
    }

    if (!reviewedBy) {
      return NextResponse.json(
        { 
          error: 'Missing required field',
          details: 'reviewedBy is required'
        },
        { status: 400 }
      )
    }

    const claim = await warrantyService.reviewClaim(
      id,
      decision,
      body.amount,
      body.notes,
      reviewedBy
    )

    return NextResponse.json(
      { 
        success: true,
        data: claim 
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Review claim error:', error)

    if (error instanceof ClaimNotFoundError) {
      return NextResponse.json(
        { 
          error: error.message,
          code: error.code
        },
        { status: 404 }
      )
    }

    if (error instanceof InvalidClaimDataError) {
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
