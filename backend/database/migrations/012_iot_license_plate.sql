-- MechMind OS - License Plate Recognition Migration

-- LPR Cameras
CREATE TABLE IF NOT EXISTS "LprCamera" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "direction" TEXT NOT NULL CHECK ("direction" IN ('ENTRY', 'EXIT')),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "provider" TEXT NOT NULL CHECK ("provider" IN ('GOOGLE_VISION', 'AZURE_COMPUTER_VISION', 'AWS_REKOGNITION', 'OPENALPR', 'CUSTOM_ML')),
    "config" JSONB DEFAULT '{}',
    "lastCapture" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_lpr_camera_tenant" ON "LprCamera"("tenantId");
CREATE INDEX IF NOT EXISTS "idx_lpr_camera_active" ON "LprCamera"("isActive") WHERE "isActive" = true;

-- License Plate Detections
CREATE TABLE IF NOT EXISTS "LicensePlateDetection" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "cameraId" UUID REFERENCES "LprCamera"("id"),
    "imageUrl" TEXT NOT NULL,
    "detectedText" TEXT NOT NULL,
    "confidence" DECIMAL(3, 2) NOT NULL CHECK ("confidence" >= 0 AND "confidence" <= 1),
    "country" TEXT,
    "region" TEXT,
    "vehicleType" TEXT,
    "boundingBox" JSONB,
    "provider" TEXT NOT NULL,
    "rawResponse" JSONB,
    "processedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_lpd_camera" ON "LicensePlateDetection"("cameraId");
CREATE INDEX IF NOT EXISTS "idx_lpd_text" ON "LicensePlateDetection"("detectedText");
CREATE INDEX IF NOT EXISTS "idx_lpd_confidence" ON "LicensePlateDetection"("confidence");
CREATE INDEX IF NOT EXISTS "idx_lpd_processed" ON "LicensePlateDetection"("processedAt");

-- Vehicle Entry/Exit Log
CREATE TABLE IF NOT EXISTS "VehicleEntryExit" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "type" TEXT NOT NULL CHECK ("type" IN ('ENTRY', 'EXIT')),
    "licensePlate" TEXT NOT NULL,
    "detectionId" UUID NOT NULL REFERENCES "LicensePlateDetection"("id"),
    "imageUrl" TEXT NOT NULL,
    "confidence" DECIMAL(3, 2) NOT NULL,
    "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location" TEXT,
    "cameraId" UUID REFERENCES "LprCamera"("id"),
    "vehicleId" UUID REFERENCES "Vehicle"("id"),
    "workOrderId" UUID REFERENCES "WorkOrder"("id"),
    "bayId" UUID REFERENCES "ServiceBay"("id"),
    "isAuthorized" BOOLEAN NOT NULL DEFAULT false,
    "authorizedBy" UUID REFERENCES "User"("id"),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_vee_plate" ON "VehicleEntryExit"("licensePlate");
CREATE INDEX IF NOT EXISTS "idx_vee_type" ON "VehicleEntryExit"("type");
CREATE INDEX IF NOT EXISTS "idx_vee_timestamp" ON "VehicleEntryExit"("timestamp");
CREATE INDEX IF NOT EXISTS "idx_vee_vehicle" ON "VehicleEntryExit"("vehicleId");
CREATE INDEX IF NOT EXISTS "idx_vee_camera" ON "VehicleEntryExit"("cameraId");

-- Parking Sessions
CREATE TABLE IF NOT EXISTS "ParkingSession" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "licensePlate" TEXT NOT NULL,
    "entryId" UUID NOT NULL REFERENCES "VehicleEntryExit"("id"),
    "exitId" UUID REFERENCES "VehicleEntryExit"("id"),
    "vehicleId" UUID REFERENCES "Vehicle"("id"),
    "status" TEXT NOT NULL CHECK ("status" IN ('ACTIVE', 'COMPLETED', 'OVERSTAY')) DEFAULT 'ACTIVE',
    "entryTime" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitTime" TIMESTAMP WITH TIME ZONE,
    "durationMinutes" INTEGER,
    "parkingSpotId" UUID REFERENCES "ParkingSpot"("id"),
    "fees" DECIMAL(10, 2),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_parking_session_plate" ON "ParkingSession"("licensePlate");
CREATE INDEX IF NOT EXISTS "idx_parking_session_status" ON "ParkingSession"("status");
CREATE INDEX IF NOT EXISTS "idx_parking_session_active" ON "ParkingSession"("status") WHERE "status" = 'ACTIVE';
CREATE INDEX IF NOT EXISTS "idx_parking_session_vehicle" ON "ParkingSession"("vehicleId");

-- Add RFID tag to vehicles
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "rfidTag" TEXT;
CREATE INDEX IF NOT EXISTS "idx_vehicle_rfid" ON "Vehicle"("rfidTag") WHERE "rfidTag" IS NOT NULL;
