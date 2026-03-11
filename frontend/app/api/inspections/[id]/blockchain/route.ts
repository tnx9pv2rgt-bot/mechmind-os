/**
 * Blockchain API Routes
 * POST /api/inspections/[id]/blockchain - Deploy inspection contract to blockchain
 * GET /api/inspections/[id]/blockchain - Verify inspection on blockchain
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import {
  deployInspectionContract,
  verifyInspection,
} from '@/lib/services/blockchainService'
import type { InspectionData } from '@/lib/services/blockchainService'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/inspections/[id]/blockchain - Deploy contract
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
      vin,
      inspectorAddress,
      timestamp,
      result,
      notes,
      mileage,
      location,
      checklistItems,
      photos,
      pdfDocument,
    } = body

    // Validate required fields
    if (!vin || !inspectorAddress || !timestamp || !result) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: 'vin, inspectorAddress, timestamp, and result are required'
        },
        { status: 400 }
      )
    }

    // Validate inspectorAddress format
    if (!/^0x[a-fA-F0-9]{40}$/.test(inspectorAddress)) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: 'inspectorAddress must be a valid Ethereum address (0x...)'
        },
        { status: 400 }
      )
    }

    // Validate result
    const validResults = ['passed', 'failed', 'pending']
    if (!validResults.includes(result)) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: 'result must be one of: passed, failed, pending'
        },
        { status: 400 }
      )
    }

    // Build inspection data
    const inspectionData: InspectionData = {
      id,
      vin,
      inspectorAddress: inspectorAddress as `0x${string}`,
      timestamp,
      result: result as 'passed' | 'failed' | 'pending',
      ...(notes && { notes }),
      ...(mileage !== undefined && { mileage: Number(mileage) }),
      ...(location && { location }),
      ...(checklistItems && { checklistItems }),
      ...(photos && { photos }),
      ...(pdfDocument && { pdfDocument }),
    }

    // Deploy contract
    const deploymentResult = await deployInspectionContract(inspectionData)

    return NextResponse.json(
      { 
        success: true,
        data: {
          inspectionId: id,
          contractAddress: deploymentResult.contractAddress,
          transactionHash: deploymentResult.transactionHash,
          blockNumber: deploymentResult.blockNumber.toString(),
          gasUsed: deploymentResult.gasUsed.toString(),
          inspectionHash: deploymentResult.inspectionHash,
          deployedAt: deploymentResult.deployedAt,
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Deploy blockchain contract error:', error)

    if (error instanceof Error && error.message.includes('Ethereum provider not found')) {
      return NextResponse.json(
        { 
          error: 'Wallet not connected',
          details: 'Please connect your wallet (MetaMask or similar) to deploy the contract'
        },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message.includes('Factory contract address not configured')) {
      return NextResponse.json(
        { 
          error: 'Configuration error',
          details: 'Factory contract address not configured'
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Blockchain deployment failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET /api/inspections/[id]/blockchain - Verify inspection
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Inspection ID is required' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const contractAddress = searchParams.get('contractAddress')

    if (!contractAddress) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: 'contractAddress query parameter is required'
        },
        { status: 400 }
      )
    }

    // Validate contract address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: 'contractAddress must be a valid Ethereum address (0x...)'
        },
        { status: 400 }
      )
    }

    // Get current inspection data from request body or query params
    // In a real implementation, you'd fetch this from your database
    const body = await request.json().catch(() => null)
    
    if (!body || !body.vin || !body.inspectorAddress || !body.timestamp || !body.result) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: 'Inspection data (vin, inspectorAddress, timestamp, result) is required in request body for verification'
        },
        { status: 400 }
      )
    }

    const inspectionData: InspectionData = {
      id,
      vin: body.vin,
      inspectorAddress: body.inspectorAddress as `0x${string}`,
      timestamp: body.timestamp,
      result: body.result as 'passed' | 'failed' | 'pending',
      ...(body.notes && { notes: body.notes }),
      ...(body.mileage !== undefined && { mileage: body.mileage }),
      ...(body.location && { location: body.location }),
      ...(body.checklistItems && { checklistItems: body.checklistItems }),
      ...(body.photos && { photos: body.photos }),
    }

    // Verify inspection
    const verificationResult = await verifyInspection(
      contractAddress as `0x${string}`,
      inspectionData
    )

    return NextResponse.json(
      { 
        success: true,
        data: {
          inspectionId: id,
          contractAddress: verificationResult.contractAddress,
          isValid: verificationResult.isValid,
          match: verificationResult.match,
          blockchainHash: verificationResult.blockchainHash,
          calculatedHash: verificationResult.calculatedHash,
          inspectorAddress: verificationResult.inspectorAddress,
          timestamp: verificationResult.timestamp,
          verifiedAt: verificationResult.verifiedAt,
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Verify blockchain inspection error:', error)

    if (error instanceof Error && error.message.includes('Inspection contract not found')) {
      return NextResponse.json(
        { 
          error: 'Contract not found',
          details: 'No inspection contract found at the provided address'
        },
        { status: 404 }
      )
    }

    if (error instanceof Error && error.message.includes('No contract found at address')) {
      return NextResponse.json(
        { 
          error: 'Contract not found',
          details: 'No contract deployed at the provided address'
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Blockchain verification failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
