/**
 * POST /api/inspections/[id]/ai
 * Analyze damage using AI
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getAIService,
  AIAnalysisError,
} from '@/lib/services/aiService'

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
      imageBase64,
      analysisType,
      inspectionData,
    } = body

    // Validate required fields
    if (!analysisType) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: 'analysisType is required (damage, tire, maintenance)'
        },
        { status: 400 }
      )
    }

    const aiService = getAIService()
    await aiService.initialize()

    let result

    switch (analysisType) {
      case 'damage': {
        if (!imageBase64) {
          return NextResponse.json(
            { 
              error: 'Validation failed',
              details: 'imageBase64 is required for damage analysis'
            },
            { status: 400 }
          )
        }
        result = await aiService.analyzeDamage(imageBase64)
        break
      }

      case 'tire': {
        if (!imageBase64) {
          return NextResponse.json(
            { 
              error: 'Validation failed',
              details: 'imageBase64 is required for tire wear analysis'
            },
            { status: 400 }
          )
        }
        result = await aiService.analyzeTireWear(imageBase64)
        break
      }

      case 'maintenance': {
        if (!inspectionData) {
          return NextResponse.json(
            { 
              error: 'Validation failed',
              details: 'inspectionData is required for maintenance prediction'
            },
            { status: 400 }
          )
        }

        // Validate inspection data
        const { vehicleAge, totalKm, previousIssues } = inspectionData
        if (vehicleAge === undefined || totalKm === undefined || !previousIssues) {
          return NextResponse.json(
            { 
              error: 'Validation failed',
              details: 'inspectionData must include vehicleAge, totalKm, and previousIssues'
            },
            { status: 400 }
          )
        }

        result = await aiService.predictMaintenance({
          vehicleAge: Number(vehicleAge),
          totalKm: Number(totalKm),
          previousIssues: previousIssues as string[],
          ...(inspectionData.lastServiceDate && { 
            lastServiceDate: inspectionData.lastServiceDate 
          }),
          ...(inspectionData.vehicleModel && { 
            vehicleModel: inspectionData.vehicleModel 
          }),
          ...(inspectionData.engineType && { 
            engineType: inspectionData.engineType 
          }),
          ...(inspectionData.drivingConditions && { 
            drivingConditions: inspectionData.drivingConditions 
          }),
          ...(inspectionData.currentDamage && { 
            currentDamage: inspectionData.currentDamage 
          }),
        })
        break
      }

      default:
        return NextResponse.json(
          { 
            error: 'Validation failed',
            details: 'analysisType must be one of: damage, tire, maintenance'
          },
          { status: 400 }
        )
    }

    return NextResponse.json(
      { 
        success: true,
        data: result,
        analysisType
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('AI analysis error:', error)

    if (error instanceof AIAnalysisError) {
      return NextResponse.json(
        { 
          error: 'AI analysis failed',
          details: error.message,
          code: error.code
        },
        { status: 400 }
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
