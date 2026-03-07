-- MechMind OS - IoT/OBD Streaming Migration

-- OBD Freeze Frame Data
CREATE TABLE IF NOT EXISTS "ObdFreezeFrame" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "deviceId" UUID NOT NULL REFERENCES "ObdDevice"("id") ON DELETE CASCADE,
    "dtcCode" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "capturedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_obd_freeze_frame_device" ON "ObdFreezeFrame"("deviceId");
CREATE INDEX IF NOT EXISTS "idx_obd_freeze_frame_dtc" ON "ObdFreezeFrame"("dtcCode");
CREATE INDEX IF NOT EXISTS "idx_obd_freeze_frame_captured" ON "ObdFreezeFrame"("capturedAt");

-- OBD Mode $06 Test Results
CREATE TABLE IF NOT EXISTS "ObdMode06Result" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "deviceId" UUID NOT NULL REFERENCES "ObdDevice"("id") ON DELETE CASCADE,
    "testId" INTEGER NOT NULL,
    "componentId" INTEGER NOT NULL,
    "testName" TEXT NOT NULL,
    "value" DECIMAL(10, 4) NOT NULL,
    "minValue" DECIMAL(10, 4),
    "maxValue" DECIMAL(10, 4),
    "status" TEXT NOT NULL CHECK ("status" IN ('PASS', 'FAIL', 'INCOMPLETE')),
    "unit" TEXT NOT NULL,
    "recordedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_obd_mode06_device" ON "ObdMode06Result"("deviceId");
CREATE INDEX IF NOT EXISTS "idx_obd_mode06_recorded" ON "ObdMode06Result"("recordedAt");

-- OBD Mode $08 EVAP Tests
CREATE TABLE IF NOT EXISTS "ObdEvapTest" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "deviceId" UUID NOT NULL REFERENCES "ObdDevice"("id") ON DELETE CASCADE,
    "testType" TEXT NOT NULL CHECK ("testType" IN ('LEAK', 'PRESSURE', 'VACUUM')),
    "status" TEXT NOT NULL CHECK ("status" IN ('RUNNING', 'COMPLETED', 'FAILED', 'ABORTED')),
    "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP WITH TIME ZONE,
    "results" JSONB DEFAULT '[]',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_obd_evap_device" ON "ObdEvapTest"("deviceId");
CREATE INDEX IF NOT EXISTS "idx_obd_evap_status" ON "ObdEvapTest"("status");

-- OBD Streaming Sessions (for tracking active streams)
CREATE TABLE IF NOT EXISTS "ObdStreamingSession" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "deviceId" UUID NOT NULL REFERENCES "ObdDevice"("id") ON DELETE CASCADE,
    "adapterType" TEXT NOT NULL,
    "protocol" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startTime" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP WITH TIME ZONE,
    "config" JSONB DEFAULT '{}',
    "stats" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_obd_stream_device" ON "ObdStreamingSession"("deviceId");
CREATE INDEX IF NOT EXISTS "idx_obd_stream_active" ON "ObdStreamingSession"("isActive") WHERE "isActive" = true;
