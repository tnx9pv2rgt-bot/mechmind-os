/**
 * GET /api/warranties/[id]/claims
 * Get all claims for a warranty
 * 
 * POST /api/warranties/[id]/claims
 * File a new claim for a warranty
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  warrantyService,
  WarrantyError,
  InvalidClaimDataError,
  WarrantyNotFoundError 
} from '@/lib/services/warrantyService'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/warranties/[id]/claims
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const claims = await warrantyService.getClaimsByWarranty(id)

    return NextResponse.json(
      { 
        success: true,
        data: claims,
        count: claims.length
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get warranty claims error:', error)

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

// POST /api/warranties/[id]/claims
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Validate required fields
    const { issueDescription, estimatedCost } = body

    if (!issueDescription || estimatedCost === undefined) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          details: 'issueDescription and estimatedCost are required'
        },
        { status: 400 }
      )
    }

    const claim = await warrantyService.fileClaim(id, {
      issueDescription,
      estimatedCost: Number(estimatedCost),
      evidence: body.evidence,
    })

    return NextResponse.json(
      { 
        success: true,
        data: claim 
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('File claim error:', error)

    if (error instanceof WarrantyNotFoundError) {
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
