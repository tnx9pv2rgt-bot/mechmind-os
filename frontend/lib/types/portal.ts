/**
 * Customer Portal Types
 * Type definitions for the Customer Self-Service Portal
 */

// ============================================
// CUSTOMER
// ============================================

export interface Customer {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string
  createdAt: Date
  updatedAt: Date
  emailVerified: boolean
  phoneVerified: boolean
  marketingConsent: boolean
  gdprConsent: boolean
  gdprConsentDate?: Date
  avatarUrl?: string
}

export interface CustomerProfile extends Customer {
  vehicles: CustomerVehicle[]
  defaultVehicleId?: string
  notificationPreferences: NotificationPreferences
  twoFactorEnabled: boolean
  lastLoginAt?: Date
}

// ============================================
// VEHICLES
// ============================================

export interface CustomerVehicle {
  id: string
  customerId: string
  make: string
  model: string
  year: number
  licensePlate: string
  vin?: string
  mileage: number
  color?: string
  fuelType: 'petrol' | 'diesel' | 'electric' | 'hybrid' | 'lpg'
  lastServiceDate?: Date
  nextServiceDue?: Date
  nextServiceMileage?: number
  warrantyExpiry?: Date
  insuranceExpiry?: Date
  imageUrl?: string
}

// ============================================
// BOOKINGS
// ============================================

export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
export type BookingType = 'maintenance' | 'repair' | 'inspection' | 'warranty' | 'consultation' | 'emergency'

export interface Booking {
  id: string
  customerId: string
  vehicleId: string
  vehicle: CustomerVehicle
  status: BookingStatus
  type: BookingType
  scheduledDate: Date
  scheduledTime: string
  duration: number // in minutes
  notes?: string
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
  cancelledAt?: Date
  cancellationReason?: string
  estimatedCost?: number
  finalCost?: number
  technicianName?: string
  location: string
}

export interface BookingCreateDTO {
  vehicleId: string
  type: BookingType
  scheduledDate: string
  scheduledTime: string
  notes?: string
}

// ============================================
// INSPECTIONS
// ============================================

export interface CustomerInspection {
  id: string
  customerId: string
  vehicleId: string
  vehicle: CustomerVehicle
  bookingId: string
  score: number // 0-10
  status: 'pending' | 'completed' | 'approved' | 'declined'
  completedAt: Date
  technicianName: string
  summary: string
  findings: InspectionFinding[]
  photos: InspectionPhoto[]
  pdfUrl?: string
  approvedAt?: Date
  declinedAt?: Date
  declinedReason?: string
}

export interface InspectionFinding {
  id: string
  category: string
  severity: 'good' | 'fair' | 'needs_attention' | 'urgent'
  description: string
  recommendation?: string
  estimatedCost?: number
}

export interface InspectionPhoto {
  id: string
  url: string
  thumbnailUrl: string
  description?: string
  takenAt: Date
}

// ============================================
// DOCUMENTS
// ============================================

export type DocumentType = 'invoice' | 'receipt' | 'inspection_report' | 'warranty_claim' | 'maintenance_record'

export interface Document {
  id: string
  customerId: string
  vehicleId?: string
  bookingId?: string
  type: DocumentType
  documentNumber: string
  title: string
  description?: string
  amount?: number
  issueDate: Date
  dueDate?: Date
  paidAt?: Date
  fileUrl: string
  fileSize: number
  fileType: string
  status: 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled'
}

// ============================================
// MAINTENANCE
// ============================================

export interface MaintenanceSchedule {
  id: string
  customerId: string
  vehicleId: string
  vehicle: CustomerVehicle
  serviceType: string
  description: string
  dueDate: Date
  dueMileage?: number
  estimatedCost?: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'upcoming' | 'due' | 'overdue' | 'completed'
  completedAt?: Date
  completedMileage?: number
  notes?: string
}

// ============================================
// WARRANTY
// ============================================

export interface WarrantyInfo {
  id: string
  customerId: string
  vehicleId: string
  vehicle: CustomerVehicle
  warrantyType: 'manufacturer' | 'extended' | 'third_party'
  provider: string
  policyNumber: string
  startDate: Date
  endDate: Date
  coverageType: 'powertrain' | 'comprehensive' | 'corrosion' | 'emissions' | 'hybrid'
  maxMileage?: number
  currentMileage: number
  status: 'active' | 'expired' | 'expiring_soon' | 'claimed'
  claims: WarrantyClaim[]
  documents: Document[]
}

export interface WarrantyClaim {
  id: string
  warrantyId: string
  claimNumber: string
  description: string
  status: 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed'
  filedAt: Date
  resolvedAt?: Date
  amount?: number
  notes?: string
}

// ============================================
// NOTIFICATIONS
// ============================================

export interface NotificationPreferences {
  email: {
    enabled: boolean
    bookingReminders: boolean
    maintenanceAlerts: boolean
    inspectionReports: boolean
    promotions: boolean
    newsletter: boolean
  }
  sms: {
    enabled: boolean
    bookingReminders: boolean
    urgentAlerts: boolean
  }
  whatsapp: {
    enabled: boolean
    bookingReminders: boolean
    statusUpdates: boolean
  }
  push: {
    enabled: boolean
    all: boolean
  }
}

// ============================================
// AUTH
// ============================================

export interface RegisterDTO {
  email: string
  password: string
  firstName: string
  lastName: string
  phone: string
  gdprConsent: boolean
  marketingConsent?: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  customer: Customer
  expiresAt: Date
}

export interface PasswordResetRequest {
  email: string
}

export interface PasswordResetConfirm {
  token: string
  newPassword: string
}

// ============================================
// DASHBOARD
// ============================================

export interface DashboardData {
  customer: Customer
  upcomingBooking?: Booking
  maintenanceDue: MaintenanceSchedule[]
  recentInspection?: CustomerInspection
  warrantyStatus: {
    total: number
    active: number
    expiringSoon: number
    expired: number
  }
  recentDocuments: Document[]
  unreadNotifications: number
}

// ============================================
// API RESPONSES
// ============================================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, string[]>
  }
  meta?: {
    page?: number
    limit?: number
    total?: number
    totalPages?: number
  }
}

// ============================================
// SETTINGS
// ============================================

export interface ProfileUpdateDTO {
  firstName?: string
  lastName?: string
  phone?: string
  avatarUrl?: string
}

export interface PasswordChangeDTO {
  currentPassword: string
  newPassword: string
}

export interface NotificationPreferencesUpdateDTO {
  email?: Partial<NotificationPreferences['email']>
  sms?: Partial<NotificationPreferences['sms']>
  whatsapp?: Partial<NotificationPreferences['whatsapp']>
  push?: Partial<NotificationPreferences['push']>
}
