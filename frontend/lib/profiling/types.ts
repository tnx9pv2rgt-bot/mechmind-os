/**
 * Progressive Profiling Types
 * Definizioni dei tipi per il sistema di profilazione progressiva
 */

export type ProfilingStageId = 'onboarding' | 'week1' | 'week2' | 'month1' | 'complete'

export interface ProfilingStage {
  id: ProfilingStageId
  fields: string[]
  required: boolean
  incentive: string | null
  trigger: string
  description: string
}

export interface ProfilingField {
  name: string
  label: string
  type: 'text' | 'email' | 'tel' | 'select' | 'checkbox' | 'address'
  placeholder?: string
  validation?: RegExp
  icon?: string
  priority: 'high' | 'medium' | 'low'
  category: 'contact' | 'billing' | 'marketing' | 'business'
}

export interface CustomerProfile {
  // Onboarding fields
  email?: string
  password?: string
  firstName?: string
  lastName?: string
  
  // Week 1 fields
  companyName?: string
  vat?: string
  fiscalCode?: string
  
  // Week 2 fields
  address?: {
    street?: string
    city?: string
    zipCode?: string
    province?: string
    country?: string
  }
  phone?: string
  pec?: string
  sdi?: string
  
  // Month 1 fields
  marketingPrefs?: {
    email?: boolean
    sms?: boolean
    phone?: boolean
  }
  industry?: string
  companySize?: string
  
  // Metadata
  createdAt?: string
  updatedAt?: string
  completedStages?: ProfilingStageId[]
}

export interface ProfilingState {
  profile: CustomerProfile
  missingFields: string[]
  currentStage: ProfilingStageId
  completionPercentage: number
  isLoading: boolean
  error: string | null
}

export interface FieldPriorityConfig {
  high: string[]
  medium: string[]
  low: string[]
}

export interface UserContext {
  hasOrders?: boolean
  hasInvoices?: boolean
  lastLoginAt?: string
  signupDate?: string
  preferredChannel?: 'email' | 'sms' | 'phone'
}

export interface ReminderSchedule {
  stage: ProfilingStageId
  delay: string
  template: string
  subject: string
}
