-- MechMind OS - Shop Floor Tracking Migration

-- Shop Floor
CREATE TABLE IF NOT EXISTS "ShopFloor" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_shop_floor_tenant" ON "ShopFloor"("tenantId");

-- Service Bays
CREATE TABLE IF NOT EXISTS "ServiceBay" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "shopFloorId" UUID NOT NULL REFERENCES "ShopFloor"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL CHECK ("type" IN ('LIFT', 'PIT', 'HOIST', 'DYNO', 'ALIGNMENT', 'DETAIL')),
    "status" TEXT NOT NULL CHECK ("status" IN ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE', 'CLEANING')) DEFAULT 'AVAILABLE',
    "currentVehicleId" UUID REFERENCES "Vehicle"("id"),
    "currentWorkOrderId" UUID REFERENCES "WorkOrder"("id"),
    "checkInTime" TIMESTAMP WITH TIME ZONE,
    "locationX" DECIMAL(6, 2) NOT NULL DEFAULT 0,
    "locationY" DECIMAL(6, 2) NOT NULL DEFAULT 0,
    "floor" INTEGER NOT NULL DEFAULT 1,
    "capabilities" TEXT[] DEFAULT '{}',
    "maxVehicleWeight" INTEGER NOT NULL DEFAULT 3000,
    "liftCapacity" INTEGER,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_service_bay_floor" ON "ServiceBay"("shopFloorId");
CREATE INDEX IF NOT EXISTS "idx_service_bay_status" ON "ServiceBay"("status");
CREATE INDEX IF NOT EXISTS "idx_service_bay_vehicle" ON "ServiceBay"("currentVehicleId");
CREATE INDEX IF NOT EXISTS "idx_service_bay_work_order" ON "ServiceBay"("currentWorkOrderId");

-- Bay Sensors
CREATE TABLE IF NOT EXISTS "BaySensor" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "bayId" UUID NOT NULL REFERENCES "ServiceBay"("id") ON DELETE CASCADE,
    "type" TEXT NOT NULL CHECK ("type" IN ('RFID', 'BLUETOOTH_BEACON', 'ULTRASONIC', 'PIR', 'CAMERA', 'PRESSURE', 'MAGNETIC')),
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastReading" TIMESTAMP WITH TIME ZONE,
    "batteryLevel" INTEGER CHECK ("batteryLevel" >= 0 AND "batteryLevel" <= 100),
    "config" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_bay_sensor_bay" ON "BaySensor"("bayId");
CREATE INDEX IF NOT EXISTS "idx_bay_sensor_type" ON "BaySensor"("type");
CREATE INDEX IF NOT EXISTS "idx_bay_sensor_active" ON "BaySensor"("isActive") WHERE "isActive" = true;

-- Sensor Readings
CREATE TABLE IF NOT EXISTS "SensorReading" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "sensorId" UUID NOT NULL REFERENCES "BaySensor"("id") ON DELETE CASCADE,
    "bayId" UUID NOT NULL REFERENCES "ServiceBay"("id") ON DELETE CASCADE,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_sensor_reading_sensor" ON "SensorReading"("sensorId");
CREATE INDEX IF NOT EXISTS "idx_sensor_reading_bay" ON "SensorReading"("bayId");
CREATE INDEX IF NOT EXISTS "idx_sensor_reading_timestamp" ON "SensorReading"("timestamp");

-- Shop Floor Events
CREATE TABLE IF NOT EXISTS "ShopFloorEvent" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "type" TEXT NOT NULL CHECK ("type" IN ('VEHICLE_ENTRY', 'VEHICLE_EXIT', 'BAY_ASSIGNMENT', 'STATUS_CHANGE', 'TECHNICIAN_MOVE')),
    "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bayId" UUID REFERENCES "ServiceBay"("id"),
    "vehicleId" UUID REFERENCES "Vehicle"("id"),
    "technicianId" UUID REFERENCES "User"("id"),
    "workOrderId" UUID REFERENCES "WorkOrder"("id"),
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_shop_floor_event_tenant" ON "ShopFloorEvent"("tenantId");
CREATE INDEX IF NOT EXISTS "idx_shop_floor_event_type" ON "ShopFloorEvent"("type");
CREATE INDEX IF NOT EXISTS "idx_shop_floor_event_timestamp" ON "ShopFloorEvent"("timestamp");
CREATE INDEX IF NOT EXISTS "idx_shop_floor_event_bay" ON "ShopFloorEvent"("bayId");

-- Technician Beacons
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "beaconId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isTechnician" BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS "idx_user_beacon" ON "User"("beaconId") WHERE "beaconId" IS NOT NULL;

-- Parking Spots
CREATE TABLE IF NOT EXISTS "ParkingSpot" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "shopFloorId" UUID NOT NULL REFERENCES "ShopFloor"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL CHECK ("type" IN ('WAITING', 'COMPLETED', 'CUSTOMER', 'STAFF')),
    "status" TEXT NOT NULL CHECK ("status" IN ('AVAILABLE', 'OCCUPIED', 'RESERVED')) DEFAULT 'AVAILABLE',
    "vehicleId" UUID REFERENCES "Vehicle"("id"),
    "locationX" DECIMAL(6, 2) NOT NULL DEFAULT 0,
    "locationY" DECIMAL(6, 2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_parking_spot_floor" ON "ParkingSpot"("shopFloorId");
CREATE INDEX IF NOT EXISTS "idx_parking_spot_status" ON "ParkingSpot"("status");
CREATE INDEX IF NOT EXISTS "idx_parking_spot_vehicle" ON "ParkingSpot"("vehicleId");
