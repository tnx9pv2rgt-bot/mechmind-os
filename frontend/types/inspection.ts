/**
 * Digital Vehicle Inspection (DVI) Types
 * Best practices 2026: Tekmetric/Shopmonkey/AutoVitals standard
 */

export type InspectionStatus = 'pending' | 'in_progress' | 'completed' | 'approved' | 'declined'
export type InspectionItemStatus = 'good' | 'fair' | 'needs_attention' | 'urgent' | 'not_checked'

export interface InspectionPhoto {
  id: string
  url: string
  thumbnailUrl: string
  annotations: PhotoAnnotation[]
  description?: string
  takenAt: Date
  takenBy: string
}

export interface PhotoAnnotation {
  id: string
  x: number  // percentage 0-100
  y: number  // percentage 0-100
  text: string
  color: string
  arrowDirection?: 'up' | 'down' | 'left' | 'right'
}

export interface InspectionItem {
  id: string
  category: InspectionCategory
  name: string
  status: InspectionItemStatus
  description: string
  photos: InspectionPhoto[]
  videoUrl?: string
  technicianNotes: string
  customerNotes?: string
  estimatedCost?: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  oemPartNumber?: string
  laborHours?: number
}

export type InspectionCategory = 
  | 'tires_brakes'
  | 'fluids'
  | 'suspension_steering'
  | 'exhaust'
  | 'electrical'
  | 'body_exterior'
  | 'interior'
  | 'engine_transmission'
  | 'hvac'
  | 'safety_systems'

export interface DigitalInspection {
  id: string
  bookingId: string
  vehicleId: string
  customerId: string
  tenantId: string
  status: InspectionStatus
  startedAt: Date
  completedAt?: Date
  technicianId: string
  technicianName: string
  items: InspectionItem[]
  summary: {
    totalItems: number
    goodCount: number
    needsAttentionCount: number
    urgentCount: number
    estimatedTotal: number
  }
  customerSharedAt?: Date
  customerViewedAt?: Date
  customerApprovedAt?: Date
  declinedReason?: string
  pdfUrl?: string
  emailSent: boolean
  smsSent: boolean
}

export interface InspectionTemplate {
  id: string
  name: string
  description: string
  categories: InspectionCategory[]
  isDefault: boolean
  tenantId?: string
}

// Color coding system (Tekmetric/Shopmonkey standard)
export const STATUS_COLORS: Record<InspectionItemStatus, { bg: string; text: string; border: string; label: string }> = {
  good: { 
    bg: 'bg-green-100', 
    text: 'text-green-800', 
    border: 'border-green-300',
    label: 'Buono'
  },
  fair: { 
    bg: 'bg-blue-100', 
    text: 'text-blue-800', 
    border: 'border-blue-300',
    label: 'Discreto'
  },
  needs_attention: { 
    bg: 'bg-yellow-100', 
    text: 'text-yellow-800', 
    border: 'border-yellow-300',
    label: 'Da monitorare'
  },
  urgent: { 
    bg: 'bg-red-100', 
    text: 'text-red-800', 
    border: 'border-red-300',
    label: 'Urgente'
  },
  not_checked: { 
    bg: 'bg-gray-100', 
    text: 'text-gray-600', 
    border: 'border-gray-300',
    label: 'Non verificato'
  },
}

export const CATEGORY_LABELS: Record<InspectionCategory, string> = {
  tires_brakes: 'Pneumatici & Freni',
  fluids: 'Liquidi',
  suspension_steering: 'Sospensioni & Sterzo',
  exhaust: 'Scarico',
  electrical: 'Impianto Elettrico',
  body_exterior: 'Carrozzeria',
  interior: 'Interni',
  engine_transmission: 'Motore & Cambio',
  hvac: 'Climatizzazione',
  safety_systems: 'Sistemi di Sicurezza',
}
