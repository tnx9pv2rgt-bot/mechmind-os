/**
 * PUT /api/inspections/[id]/sensory
 * Update sensory inspection data (moisture, odors, AC)
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  updateSensoryInspection,
  BlockageSeverity,
  FilterCondition,
  SmokeIntensity,
} from '@/lib/services/sensoryService'
import { TRPCClientError } from '@/lib/api-errors'
import type { 
  UpdateSensoryInspectionInput,
  OdorData,
  MoistureData,
  ACData 
} from '@/lib/services/sensoryService'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
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
      sensoryId,
      odors,
      moisture,
      ac,
      notes 
    } = body

    if (!sensoryId) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: 'sensoryId is required'
        },
        { status: 400 }
      )
    }

    // Build update data
    const updateData: UpdateSensoryInspectionInput = {}

    if (odors) {
      updateData.odors = {
        smokeDetected: Boolean(odors.smokeDetected),
        smokeIntensity: odors.smokeIntensity as SmokeIntensity,
        petSmellDetected: Boolean(odors.petSmellDetected),
        moldDetected: Boolean(odors.moldDetected),
        moldLocations: odors.moldLocations,
        mustyDetected: Boolean(odors.mustyDetected),
      } as OdorData
    }

    if (moisture) {
      updateData.moisture = {
        interiorHumidity: Number(moisture.interiorHumidity),
        carpetMoisture: moisture.carpetMoisture || [],
        doorPanelMoisture: moisture.doorPanelMoisture || [],
        measuredAt: moisture.measuredAt ? new Date(moisture.measuredAt) : new Date(),
        ambientTemperature: moisture.ambientTemperature !== undefined 
          ? Number(moisture.ambientTemperature) 
          : undefined,
      } as MoistureData
    }

    if (ac) {
      updateData.ac = {
        acDrainTest: Boolean(ac.acDrainTest),
        acBlockage: (ac.acBlockage as BlockageSeverity) || BlockageSeverity.NONE,
        filterCondition: (ac.filterCondition as FilterCondition) || FilterCondition.GOOD,
        notes: ac.notes,
      } as ACData
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    // Recalculate mold risk if moisture or odors changed
    if (updateData.moisture || updateData.odors) {
      // Note: The service will recalculate based on current data merged with updates
      // We don't set moldRiskLevel here to let the service calculate it
    }

    const sensoryInspection = await updateSensoryInspection(sensoryId, updateData)

    return NextResponse.json(
      { 
        success: true,
        data: sensoryInspection 
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update sensory inspection error:', error)

    if (error instanceof TRPCClientError) {
      if (error.code === 'NOT_FOUND' || error.statusCode === 404) {
        return NextResponse.json(
          { error: 'Sensory inspection not found' },
          { status: 404 }
        )
      }
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
