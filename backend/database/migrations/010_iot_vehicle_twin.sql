-- MechMind OS - Vehicle Twin Migration

-- Vehicle Twin Components
CREATE TABLE IF NOT EXISTS "VehicleTwinComponent" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "vehicleId" UUID NOT NULL REFERENCES "Vehicle"("id") ON DELETE CASCADE,
    "componentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL CHECK ("category" IN ('ENGINE', 'TRANSMISSION', 'BRAKES', 'SUSPENSION', 'ELECTRICAL', 'BODY', 'HVAC', 'FUEL', 'EXHAUST')),
    "status" TEXT NOT NULL CHECK ("status" IN ('HEALTHY', 'WARNING', 'CRITICAL', 'REPLACED', 'REPAIRING')) DEFAULT 'HEALTHY',
    "healthScore" INTEGER NOT NULL DEFAULT 100 CHECK ("healthScore" >= 0 AND "healthScore" <= 100),
    "lastServiceDate" TIMESTAMP WITH TIME ZONE,
    "nextServiceDue" TIMESTAMP WITH TIME ZONE,
    "estimatedLifespan" INTEGER,
    "positionX" DECIMAL(5, 2) DEFAULT 0,
    "positionY" DECIMAL(5, 2) DEFAULT 0,
    "positionZ" DECIMAL(5, 2) DEFAULT 0,
    "modelPartId" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "lastUpdated" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("vehicleId", "componentId")
);

CREATE INDEX IF NOT EXISTS "idx_twin_component_vehicle" ON "VehicleTwinComponent"("vehicleId");
CREATE INDEX IF NOT EXISTS "idx_twin_component_category" ON "VehicleTwinComponent"("category");
CREATE INDEX IF NOT EXISTS "idx_twin_component_status" ON "VehicleTwinComponent"("status");

-- Component History
CREATE TABLE IF NOT EXISTS "ComponentHistory" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "vehicleId" UUID NOT NULL REFERENCES "Vehicle"("id") ON DELETE CASCADE,
    "componentId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL CHECK ("eventType" IN ('INSPECTION', 'REPAIR', 'REPLACEMENT', 'DAMAGE', 'MAINTENANCE')),
    "date" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "technicianId" UUID REFERENCES "User"("id"),
    "cost" DECIMAL(10, 2),
    "partsUsed" TEXT[] DEFAULT '{}',
    "photos" TEXT[] DEFAULT '{}',
    "documents" TEXT[] DEFAULT '{}',
    "odometer" INTEGER,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_component_history_vehicle" ON "ComponentHistory"("vehicleId");
CREATE INDEX IF NOT EXISTS "idx_component_history_component" ON "ComponentHistory"("componentId");
CREATE INDEX IF NOT EXISTS "idx_component_history_date" ON "ComponentHistory"("date");

-- Vehicle Damage Records
CREATE TABLE IF NOT EXISTS "VehicleDamage" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "vehicleId" UUID NOT NULL REFERENCES "Vehicle"("id") ON DELETE CASCADE,
    "componentId" TEXT NOT NULL,
    "type" TEXT NOT NULL CHECK ("type" IN ('DENT', 'SCRATCH', 'CRACK', 'CORROSION', 'WEAR', 'IMPACT')),
    "severity" TEXT NOT NULL CHECK ("severity" IN ('MINOR', 'MODERATE', 'SEVERE')),
    "description" TEXT NOT NULL,
    "locationX" DECIMAL(5, 2) DEFAULT 0,
    "locationY" DECIMAL(5, 2) DEFAULT 0,
    "locationZ" DECIMAL(5, 2) DEFAULT 0,
    "photos" TEXT[] DEFAULT '{}',
    "reportedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "repairedAt" TIMESTAMP WITH TIME ZONE,
    "repairCost" DECIMAL(10, 2),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_damage_vehicle" ON "VehicleDamage"("vehicleId");
CREATE INDEX IF NOT EXISTS "idx_damage_type" ON "VehicleDamage"("type");

-- Vehicle Twin Visualization Config
CREATE TABLE IF NOT EXISTS "VehicleTwinConfig" (
    "vehicleId" UUID PRIMARY KEY REFERENCES "Vehicle"("id") ON DELETE CASCADE,
    "modelFormat" TEXT NOT NULL CHECK ("modelFormat" IN ('GLTF', 'GLB', 'OBJ', 'FBX')) DEFAULT 'GLB',
    "modelUrl" TEXT NOT NULL,
    "componentMappings" JSONB DEFAULT '[]',
    "defaultCameraPosition" JSONB DEFAULT '{"x": 3, "y": 2, "z": 3}',
    "hotspots" JSONB DEFAULT '[]',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Vehicle Health History (for trends)
CREATE TABLE IF NOT EXISTS "VehicleHealthHistory" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "vehicleId" UUID NOT NULL REFERENCES "Vehicle"("id") ON DELETE CASCADE,
    "overallHealth" INTEGER NOT NULL CHECK ("overallHealth" >= 0 AND "overallHealth" <= 100),
    "componentHealth" JSONB DEFAULT '{}',
    "recordedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_health_history_vehicle" ON "VehicleHealthHistory"("vehicleId");
CREATE INDEX IF NOT EXISTS "idx_health_history_recorded" ON "VehicleHealthHistory"("recordedAt");
