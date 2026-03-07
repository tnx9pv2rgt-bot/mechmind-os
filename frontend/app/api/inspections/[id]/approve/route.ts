/**
 * POST /api/inspections/[id]/approve
 * Submit customer approval for inspection findings
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  submitCustomerApproval,
  InspectionNotFoundError,
  InspectionValidationError,
} from '@/lib/services/inspectionService'
import { TRPCClientError } from '@/lib/trpc-client'
import type { CustomerApprovalInput } from '@/lib/services/inspectionService'

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
      email,
      signature,
      approvedFindingIds,
      declinedFindingIds,
      notes,
    } = body

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: 'email is required'
        },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: 'Invalid email format'
        },
        { status: 400 }
      )
    }

    // Validate approvedFindingIds
    if (!approvedFindingIds || !Array.isArray(approvedFindingIds)) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: 'approvedFindingIds must be an array'
        },
        { status: 400 }
      )
    }

    // Validate declinedFindingIds
    if (!declinedFindingIds || !Array.isArray(declinedFindingIds)) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: 'declinedFindingIds must be an array'
        },
        { status: 400 }
      )
    }

    // Check for overlap between approved and declined
    const overlap = approvedFindingIds.filter((fid: string) => declinedFindingIds.includes(fid))
    if (overlap.length > 0) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: `Finding IDs cannot be both approved and declined: ${overlap.join(', ')}`
        },
        { status: 400 }
      )
    }

    const approvalData: CustomerApprovalInput = {
      email: email.toLowerCase().trim(),
      approvedFindingIds,
      declinedFindingIds,
      ...(signature && { signature }),
      ...(notes && { notes: notes.trim() }),
    }

    const result = await submitCustomerApproval(id, approvalData)

    return NextResponse.json(
      { 
        success: true,
        data: result 
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Submit customer approval error:', error)

    if (error instanceof InspectionNotFoundError) {
      return NextResponse.json(
        { error: 'Inspection not found' },
        { status: 404 }
      )
    }

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

    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
