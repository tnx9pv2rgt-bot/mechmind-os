/**
 * OBD-II Integration & Predictive Maintenance Types
 * Real-time vehicle diagnostics and ML-powered failure prediction
 */

export type OBDConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'
export type OBDProtocol = 'CAN' | 'ISO9141' | 'KWP2000' | 'J1850PWM' | 'J1850VPW'

export interface OBDDevice {
  id: string
  name: string
  macAddress: string
  protocol: OBDProtocol
  status: OBDConnectionStatus
  batteryVoltage?: number
  lastConnectedAt?: Date
  vehicleId?: string
  firmwareVersion?: string
}

export interface OBDDataPoint {
  timestamp: Date
  pid: string  // Parameter ID (e.g., "010C" = RPM)
  name: string
  value: number
  unit: string
  min?: number
  max?: number
  normalRange?: { min: number; max: number }
}

// Standard OBD-II PIDs
export const STANDARD_PIDS = {
  ENGINE_RPM: { code: '010C', name: 'RPM Motore', unit: 'rpm' },
  VEHICLE_SPEED: { code: '010D', name: 'Velocità', unit: 'km/h' },
  THROTTLE_POS: { code: '0111', name: 'Posizione Farfalla', unit: '%' },
  ENGINE_LOAD: { code: '0104', name: 'Carico Motore', unit: '%' },
  COOLANT_TEMP: { code: '0105', name: 'Temp. Refrigerante', unit: '°C' },
  INTAKE_TEMP: { code: '010F', name: 'Temp. Aspirazione', unit: '°C' },
  MAF_RATE: { code: '0110', name: 'Flusso Aria MAF', unit: 'g/s' },
  O2_VOLTAGE: { code: '0114', name: 'Voltaggio O2 B1S1', unit: 'V' },
  FUEL_LEVEL: { code: '012F', name: 'Livello Carburante', unit: '%' },
  RUNTIME: { code: '011F', name: 'Tempo Motore Acceso', unit: 'min' },
  DISTANCE_MIL: { code: '0121', name: 'Distanza con MIL', unit: 'km' },
  BAROMETRIC_PRESSURE: { code: '0133', name: 'Pressione Barometrica', unit: 'kPa' },
  CATALYST_TEMP: { code: '013C', name: 'Temp. Catalizzatore', unit: '°C' },
  CONTROL_MODULE_VOLT: { code: '0142', name: 'Voltaggio Modulo', unit: 'V' },
  ABSOLUTE_LOAD: { code: '0143', name: 'Carico Assoluto', unit: '%' },
  COMMANDED_EQ_RATIO: { code: '0144', name: 'Rapporto Aria/Carburante', unit: '' },
  RELATIVE_THROTTLE: { code: '0145', name: 'Farfalla Relativa', unit: '%' },
  AMBIENT_TEMP: { code: '0146', name: 'Temp. Ambiente', unit: '°C' },
  THROTTLE_B: { code: '0147', name: 'Farfalla B', unit: '%' },
  ACCEL_PEDAL_D: { code: '0149', name: 'Pedale Acceleratore D', unit: '%' },
  ACCEL_PEDAL_E: { code: '014A', name: 'Pedale Acceleratore E', unit: '%' },
  COMMANDED_THROTTLE: { code: '014C', name: 'Farfalla Comandata', unit: '%' },
  ETHANOL_FUEL: { code: '0152', name: '% Etanolo Carburante', unit: '%' },
  ABS_EVAP_PRESSURE: { code: '0153', name: 'Pressione Evap Assoluta', unit: 'kPa' },
  ODOMETER: { code: '01A6', name: 'Odometro', unit: 'km' },
} as const

export interface DTCCode {
  code: string  // e.g., "P0301"
  description: string
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical'
  isPending: boolean
  isPermanent: boolean
  system: 'powertrain' | 'chassis' | 'body' | 'network'
  timestamp: Date
}

export interface VehicleHealthScore {
  overall: number  // 0-100
  engine: number
  transmission: number
  electrical: number
  brakes: number
  cooling: number
  exhaust: number
  lastCalculatedAt: Date
  trend: 'improving' | 'stable' | 'degrading'
  factors: {
    positive: string[]
    negative: string[]
  }
}

export interface PredictiveAlert {
  id: string
  component: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  probability: number  // 0-1
  predictedFailureMileage?: number
  predictedFailureDate?: Date
  description: string
  recommendedAction: string
  estimatedRepairCost: { min: number; max: number }
  confidence: number  // ML model confidence 0-1
  sensorData: OBDDataPoint[]
  createdAt: Date
  acknowledgedAt?: Date
}

export interface MaintenancePrediction {
  id: string
  serviceType: string
  component: string
  currentWear: number  // 0-100%
  remainingMileage: number
  remainingDays: number
  urgency: 'low' | 'medium' | 'high' | 'urgent'
  mlConfidence: number
  factors: string[]
}

export interface OBDSession {
  id: string
  vehicleId: string
  startedAt: Date
  endedAt?: Date
  duration: number  // seconds
  dataPoints: number
  dtcsFound: DTCCode[]
  alerts: PredictiveAlert[]
  snapshots: OBDDataSnapshot[]
}

export interface OBDDataSnapshot {
  timestamp: Date
  data: OBDDataPoint[]
  gpsLocation?: { lat: number; lng: number }
  drivingStyle: 'aggressive' | 'normal' | 'conservative'
}

export interface DrivingBehavior {
  score: number  // 0-100
  acceleration: number
  braking: number
  cornering: number
  speeding: number
  idling: number
  ecoScore: number
  monthlyTrend: number[]
}

export interface RemoteDiagnostic {
  id: string
  vehicleId: string
  triggeredAt: Date
  completedAt?: Date
  status: 'pending' | 'running' | 'completed' | 'failed'
  requestedPids: string[]
  results: OBDDataPoint[]
  findings: string[]
}
