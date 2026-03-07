/**
 * POST /api/inspections/[id]/warranty/claims
 * Create a warranty claim
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  createWarrantyClaim,
  WarrantyError,
  WarrantyNotFoundError,
  InvalidWarrantyDataError,
} from '@/lib/services/warrantyService'
import { TRPCClientError } from '@/lib/trpc-client'
interface CreateWarrantyClaimData {
  issueDescription: string
  estimatedCost: number
  evidence?: string[]
  notes?: string
  inspectionItemId?: string
}

interface RouteParams {
  params: Promise<{ id: string }>
}

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
      warrantyId,
      amount,
      description,
      evidence,
      notes,
      inspectionItemId,
    } = body

    // Validate required fields
    if (!warrantyId) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: 'warrantyId is required'
        },
        { status: 400 }
      )
    }

    if (amount === undefined || amount === null) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: 'amount is required'
        },
        { status: 400 }
      )
    }

    if (!description || description.trim().length === 0) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: 'description is required'
        },
        { status: 400 }
      )
    }

    // Validate amount
    if (amount <= 0) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: 'amount must be greater than zero'
        },
        { status: 400 }
      )
    }

    // Validate description length
    if (description.length > 2000) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: 'description cannot exceed 2000 characters'
        },
        { status: 400 }
      )
    }

    // Validate evidence if provided
    if (evidence && !Array.isArray(evidence)) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: 'evidence must be an array of URLs'
        },
        { status: 400 }
      )
    }

    const claimData: CreateWarrantyClaimData = {
      estimatedCost: Number(amount),
      issueDescription: description.trim(),
      ...(evidence && { evidence }),
      ...(notes && { notes: notes.trim() }),
      ...(inspectionItemId && { inspectionItemId }),
    }

    const claim = await createWarrantyClaim(warrantyId, claimData)

    return NextResponse.json(
      { 
        success: true,
        data: claim 
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create warranty claim error:', error)

    if (error instanceof WarrantyNotFoundError) {
      return NextResponse.json(
        { error: 'Warranty not found' },
        { status: 404 }
      )
    }

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
