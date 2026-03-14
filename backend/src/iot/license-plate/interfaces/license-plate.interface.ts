/**
 * MechMind OS - License Plate Recognition Interfaces
 */

export enum OcrProvider {
  GOOGLE_VISION = 'GOOGLE_VISION',
  AZURE_COMPUTER_VISION = 'AZURE_COMPUTER_VISION',
  AWS_REKOGNITION = 'AWS_REKOGNITION',
  OPENALPR = 'OPENALPR',
  CUSTOM_ML = 'CUSTOM_ML',
}

export enum EntryExitType {
  ENTRY = 'ENTRY',
  EXIT = 'EXIT',
}

export interface LicensePlateDetection {
  id: string;
  imageUrl: string;
  detectedText: string;
  confidence: number;
  country?: string;
  region?: string;
  vehicleType?: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  processedAt: Date;
  provider: OcrProvider;
  rawResponse?: Record<string, unknown>;
}

export interface VehicleEntryExit {
  id: string;
  type: EntryExitType;
  licensePlate: string;
  detectionId: string;
  imageUrl: string;
  confidence: number;
  timestamp: Date;
  location?: string;
  cameraId?: string;
  vehicleId?: string;
  workOrderId?: string;
  bayId?: string;
  isAuthorized: boolean;
  authorizedBy?: string;
}

export interface ParkingSession {
  id: string;
  licensePlate: string;
  entry: VehicleEntryExit;
  exit?: VehicleEntryExit;
  vehicleId?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'OVERSTAY';
  entryTime: Date;
  exitTime?: Date;
  durationMinutes?: number;
  parkingSpotId?: string;
  fees?: number;
}

export interface LprCamera {
  id: string;
  name: string;
  location: string;
  direction: EntryExitType;
  isActive: boolean;
  provider: OcrProvider;
  config: {
    minConfidence: number;
    imageQuality: 'LOW' | 'MEDIUM' | 'HIGH';
    captureTrigger: 'ALWAYS' | 'MOTION' | 'LOOP';
    loopInterval?: number;
    cropRegion?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
  lastCapture?: Date;
}

export interface PlateValidationResult {
  isValid: boolean;
  normalizedPlate: string;
  country?: string;
  state?: string;
  vehicleInfo?: {
    make?: string;
    model?: string;
    year?: number;
    color?: string;
    vin?: string;
  };
  errors?: string[];
}

export interface LprStats {
  totalDetections: number;
  avgConfidence: number;
  falsePositives: number;
  processingTimeMs: number;
  byProvider: Record<
    OcrProvider,
    {
      count: number;
      avgConfidence: number;
    }
  >;
  byHour: Record<number, number>;
}
