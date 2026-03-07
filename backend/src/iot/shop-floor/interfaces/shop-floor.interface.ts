/**
 * MechMind OS - Shop Floor Interfaces
 */

export enum BayStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  MAINTENANCE = 'MAINTENANCE',
  CLEANING = 'CLEANING',
}

export enum SensorType {
  RFID = 'RFID',
  BLUETOOTH_BEACON = 'BLUETOOTH_BEACON',
  ULTRASONIC = 'ULTRASONIC',
  PIR = 'PIR',
  CAMERA = 'CAMERA',
  PRESSURE = 'PRESSURE',
  MAGNETIC = 'MAGNETIC',
}

export enum JobStatus {
  PENDING = 'PENDING',
  CHECKED_IN = 'CHECKED_IN',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_PARTS = 'WAITING_PARTS',
  QUALITY_CHECK = 'QUALITY_CHECK',
  COMPLETED = 'COMPLETED',
}

export interface ServiceBay {
  id: string;
  name: string;
  type: 'LIFT' | 'PIT' | 'HOIST' | 'DYNO' | 'ALIGNMENT' | 'DETAIL';
  status: BayStatus;
  currentVehicle?: {
    vehicleId: string;
    licensePlate: string;
    make: string;
    model: string;
    workOrderId: string;
    technicianIds: string[];
    checkInTime: Date;
    estimatedCompletion?: Date;
  };
  sensors: BaySensor[];
  location: {
    x: number;
    y: number;
    floor: number;
  };
  capabilities: string[];
  maxVehicleWeight: number;
  liftCapacity?: number;
}

export interface BaySensor {
  id: string;
  type: SensorType;
  name: string;
  isActive: boolean;
  lastReading?: Date;
  batteryLevel?: number;
  config: Record<string, any>;
}

export interface SensorReading {
  sensorId: string;
  bayId: string;
  timestamp: Date;
  type: SensorType;
  data: {
    presence?: boolean;
    distance?: number;
    rfidTag?: string;
    beaconId?: string;
    pressure?: number;
    imageUrl?: string;
    licensePlate?: string;
    technicianId?: string;
    confidence?: number;
  };
}

export interface TechnicianLocation {
  technicianId: string;
  name: string;
  currentBayId?: string;
  lastSeenAt: Date;
  location: {
    x: number;
    y: number;
    floor: number;
  };
  beaconId: string;
  status: 'AVAILABLE' | 'WORKING' | 'BREAK' | 'OFFLINE';
}

export interface ShopFloorEvent {
  id: string;
  type: 'VEHICLE_ENTRY' | 'VEHICLE_EXIT' | 'BAY_ASSIGNMENT' | 'STATUS_CHANGE' | 'TECHNICIAN_MOVE';
  timestamp: Date;
  bayId?: string;
  vehicleId?: string;
  technicianId?: string;
  workOrderId?: string;
  fromStatus?: string;
  toStatus?: string;
  metadata?: Record<string, any>;
}

export interface WorkOrderProgress {
  workOrderId: string;
  vehicleId: string;
  licensePlate: string;
  status: JobStatus;
  currentBayId?: string;
  assignedTechnicians: string[];
  services: {
    serviceId: string;
    name: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
    estimatedMinutes: number;
    actualMinutes: number;
    technicianId?: string;
  }[];
  startTime?: Date;
  estimatedCompletion?: Date;
  actualCompletion?: Date;
  progressPercentage: number;
}

export interface ParkingSpot {
  id: string;
  name: string;
  type: 'WAITING' | 'COMPLETED' | 'CUSTOMER' | 'STAFF';
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
  vehicleId?: string;
  licensePlate?: string;
  location: {
    x: number;
    y: number;
  };
}

export interface FloorPlan {
  id: string;
  name: string;
  floor: number;
  width: number;
  height: number;
  bays: ServiceBay[];
  parkingSpots: ParkingSpot[];
  walkways: {
    id: string;
    path: { x: number; y: number }[];
  }[];
}
