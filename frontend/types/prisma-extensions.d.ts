/**
 * Prisma Client Extensions
 * Types that exist in the backend schema but not in the frontend's Prisma schema.
 */

import '@prisma/client'

declare module '@prisma/client' {
  // SubscriptionPlan is an alias for SubscriptionTier used by the service layer
  export type SubscriptionPlan = SubscriptionTier

  export enum InspectionItemStatus {
    PENDING = 'PENDING',
    CHECKED = 'CHECKED',
    ISSUE_FOUND = 'ISSUE_FOUND',
    NOT_APPLICABLE = 'NOT_APPLICABLE',
  }

  export enum FindingSeverity {
    CRITICAL = 'CRITICAL',
    HIGH = 'HIGH',
    MEDIUM = 'MEDIUM',
    LOW = 'LOW',
    OK = 'OK',
  }

  export enum FindingStatus {
    REPORTED = 'REPORTED',
    PENDING_APPROVAL = 'PENDING_APPROVAL',
    APPROVED = 'APPROVED',
    DECLINED = 'DECLINED',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
  }

  export enum FuelLevel {
    EMPTY = 'EMPTY',
    QUARTER = 'QUARTER',
    HALF = 'HALF',
    THREE_QUARTERS = 'THREE_QUARTERS',
    FULL = 'FULL',
  }

  export enum FeatureFlag {
    AI_INSPECTIONS = 'AI_INSPECTIONS',
    MULTI_LOCATION = 'MULTI_LOCATION',
    API_ACCESS = 'API_ACCESS',
    ADVANCED_REPORTS = 'ADVANCED_REPORTS',
    CUSTOM_BRANDING = 'CUSTOM_BRANDING',
    PRIORITY_SUPPORT = 'PRIORITY_SUPPORT',
    WHITE_LABEL = 'WHITE_LABEL',
    BLOCKCHAIN_VERIFICATION = 'BLOCKCHAIN_VERIFICATION',
    VOICE_ASSISTANT = 'VOICE_ASSISTANT',
    OBD_INTEGRATION = 'OBD_INTEGRATION',
    INVENTORY_MANAGEMENT = 'INVENTORY_MANAGEMENT',
    CUSTOM_INTEGRATIONS = 'CUSTOM_INTEGRATIONS',
    DEDICATED_MANAGER = 'DEDICATED_MANAGER',
    SLA_GUARANTEE = 'SLA_GUARANTEE',
  }

  export interface WarrantyClaim {
    id: string
    tenantId: string
    claimNumber: string
    description: string
    amount: number
    approvedAmount?: number | null
    laborHours: number | null
    partsCost: number | null
    laborCost: number | null
    status: ClaimStatus
    submittedDate: Date
    reviewedDate: Date | null
    resolvedDate: Date | null
    evidencePhotos: string[]
    documents: string[]
    warrantyId: string
    metadata?: Record<string, unknown>
    createdAt: Date
    updatedAt: Date
  }
}
