/**
 * Vehicle Management Module - Type Definitions
 * Production-grade types for MechMind OS Enterprise
 */

// Vehicle Status
export type VehicleStatus = 'active' | 'in_service' | 'pending_service' | 'overdue' | 'inactive'

// Fuel Types
export type FuelType = 'petrol' | 'diesel' | 'electric' | 'hybrid' | 'lpg' | 'cng'

// Service Types
export type ServiceType = 
  | 'oil_change' 
  | 'tire_rotation' 
  | 'brake_service' 
  | 'inspection' 
  | 'diagnostic' 
  | 'repair' 
  | 'maintenance' 
  | 'other'

// Maintenance Alert Status
export type MaintenanceAlertStatus = 'due_soon' | 'overdue' | 'scheduled' | 'completed'

// Alert Trigger Type
export type AlertTriggerType = 'mileage' | 'time' | 'both'

// Owner Interface
export interface Owner {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  address?: string
}

// Vehicle Interface
export interface Vehicle {
  id: string
  licensePlate: string
  vin: string
  make: string
  model: string
  year: number
  color: string
  fuelType: FuelType
  currentKm: number
  owner: Owner
  status: VehicleStatus
  lastServiceDate?: string
  lastServiceKm?: number
  nextServiceDue?: string
  nextServiceKm?: number
  registrationDate: string
  insuranceExpiry?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

// Service History Entry
export interface ServiceHistoryEntry {
  id: string
  vehicleId: string
  date: string
  km: number
  serviceType: ServiceType
  description: string
  mechanic: string
  cost: number
  parts: string[]
  notes?: string
  beforePhotos?: string[]
  afterPhotos?: string[]
  duration?: number
  createdAt: string
}

// Maintenance Alert
export interface MaintenanceAlert {
  id: string
  vehicleId: string
  title: string
  description: string
  serviceType: ServiceType
  status: MaintenanceAlertStatus
  triggerType: AlertTriggerType
  dueDate?: string
  dueKm?: number
  currentKm: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  createdAt: string
  completedAt?: string
}

// Document
export interface VehicleDocument {
  id: string
  vehicleId: string
  name: string
  type: 'registration' | 'insurance' | 'inspection' | 'invoice' | 'other'
  url: string
  uploadedAt: string
  expiryDate?: string
}

// Vehicle Stats
export interface VehicleStats {
  total: number
  active: number
  inService: number
  pendingService: number
  overdue: number
}

// Filter Options
export interface VehicleFilters {
  make?: string
  model?: string
  year?: number
  status?: VehicleStatus
  search?: string
}

// Form Data
export interface VehicleFormData {
  licensePlate: string
  vin: string
  make: string
  model: string
  year: number
  color: string
  fuelType: FuelType
  currentKm: number
  ownerId: string
  notes?: string
}
