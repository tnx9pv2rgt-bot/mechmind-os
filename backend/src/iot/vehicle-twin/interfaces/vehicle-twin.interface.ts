/**
 * MechMind OS - Vehicle Twin Interfaces
 */

export interface VehicleComponent {
  id: string;
  name: string;
  category:
    | 'ENGINE'
    | 'TRANSMISSION'
    | 'BRAKES'
    | 'SUSPENSION'
    | 'ELECTRICAL'
    | 'BODY'
    | 'HVAC'
    | 'FUEL'
    | 'EXHAUST';
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'REPLACED' | 'REPAIRING';
  healthScore: number;
  lastServiceDate?: Date;
  nextServiceDue?: Date;
  estimatedLifespan?: number; // percentage
  position: {
    x: number;
    y: number;
    z: number;
  };
  modelPartId?: string;
  metadata: Record<string, unknown>;
}

export interface ComponentHistory {
  id: string;
  componentId: string;
  eventType: 'INSPECTION' | 'REPAIR' | 'REPLACEMENT' | 'DAMAGE' | 'MAINTENANCE';
  date: Date;
  description: string;
  technicianId?: string;
  cost?: number;
  partsUsed?: string[];
  photos?: string[];
  documents?: string[];
  odometer?: number;
}

export interface PredictiveAlert {
  id: string;
  componentId: string;
  componentName: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  predictedFailureDate: Date;
  confidence: number;
  recommendedAction: string;
  estimatedCost: number;
  reasoning: string[];
}

export interface DamageRecord {
  id: string;
  componentId: string;
  type: 'DENT' | 'SCRATCH' | 'CRACK' | 'CORROSION' | 'WEAR' | 'IMPACT';
  severity: 'MINOR' | 'MODERATE' | 'SEVERE';
  description: string;
  location: {
    x: number;
    y: number;
    z: number;
  };
  photos: string[];
  reportedAt: Date;
  repairedAt?: Date;
  repairCost?: number;
}

export interface VehicleTwinState {
  vehicleId: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  overallHealth: number;
  lastUpdated: Date;
  components: VehicleComponent[];
  activeAlerts: PredictiveAlert[];
  recentHistory: ComponentHistory[];
  damageRecords: DamageRecord[];
  mileage: number;
  engineHours: number;
}

export interface TwinVisualizationConfig {
  vehicleId: string;
  modelFormat: 'GLTF' | 'GLB' | 'OBJ' | 'FBX';
  modelUrl: string;
  componentMappings: {
    componentId: string;
    meshName: string;
    materialName?: string;
  }[];
  defaultCameraPosition: {
    x: number;
    y: number;
    z: number;
  };
  hotspots: {
    id: string;
    componentId: string;
    position: { x: number; y: number; z: number };
    label: string;
  }[];
}

export interface ComponentWearPrediction {
  componentId: string;
  currentWear: number;
  predictedWear: {
    date: Date;
    wearPercentage: number;
  }[];
  factors: {
    drivingStyle: number;
    mileage: number;
    age: number;
    maintenanceHistory: number;
    environment: number;
  };
}
