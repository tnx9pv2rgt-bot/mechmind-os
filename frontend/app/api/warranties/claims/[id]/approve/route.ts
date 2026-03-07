/**
 * POST /api/warranties/claims/[id]/approve
 * Approve a claim
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

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Validate required fields
    const { approvedAmount, reviewedBy } = body

    if (approvedAmount === undefined || approvedAmount === null) {
      return NextResponse.json(
        { 
          error: 'Missing required field',
          details: 'approvedAmount is required'
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
      'APPROVE',
      Number(approvedAmount),
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
    console.error('Approve claim error:', error)

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
