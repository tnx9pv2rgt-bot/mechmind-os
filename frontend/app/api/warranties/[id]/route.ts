/**
 * GET /api/warranties/[id]
 * Get warranty by ID
 * 
 * PUT /api/warranties/[id]
 * Update warranty
 * 
 * DELETE /api/warranties/[id]
 * Delete warranty
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  warrantyService,
  WarrantyError,
  InvalidWarrantyDataError,
  WarrantyNotFoundError 
} from '@/lib/services/warrantyService'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/warranties/[id]
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const warranty = await warrantyService.getWarranty(id)

    if (!warranty) {
      return NextResponse.json(
        { 
          error: 'Warranty not found',
          code: 'WARRANTY_NOT_FOUND'
        },
        { status: 404 }
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

// PUT /api/warranties/[id]
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const body = await request.json()

    const warranty = await warrantyService.updateWarranty(id, body)

    return NextResponse.json(
      { 
        success: true,
        data: warranty 
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update warranty error:', error)

    if (error instanceof WarrantyNotFoundError) {
      return NextResponse.json(
        { 
          error: error.message,
          code: error.code
        },
        { status: 404 }
      )
    }

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

// DELETE /api/warranties/[id]
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    await warrantyService.deleteWarranty(id)

    return NextResponse.json(
      { 
        success: true,
        message: 'Warranty deleted successfully'
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete warranty error:', error)

    if (error instanceof WarrantyNotFoundError) {
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
