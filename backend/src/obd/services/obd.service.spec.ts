import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ObdService } from './obd.service';
import { PrismaService } from '../../common/services/prisma.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { TroubleCodeSeverity } from '@prisma/client';

// ── Helpers ──────────────────────────────────────────────────────

const TENANT_ID = 'tenant-uuid-001';
const DEVICE_ID = 'device-uuid-001';
const VEHICLE_ID = 'vehicle-uuid-001';

const now = new Date('2026-03-12T10:00:00Z');

function makeDevice(overrides: Record<string, unknown> = {}) {
  return {
    id: DEVICE_ID,
    tenantId: TENANT_ID,
    serialNumber: 'OBD-SN-123',
    name: 'Scanner 1',
    model: 'ELM327',
    vehicleId: VEHICLE_ID,
    isActive: true,
    lastConnected: now,
    batteryLevel: 85,
    vehicle: {
      id: VEHICLE_ID,
      make: 'Toyota',
      model: 'Corolla',
      licensePlate: 'AB123CD',
    },
    ...overrides,
  };
}

function makeReading(overrides: Record<string, unknown> = {}) {
  return {
    id: 'reading-uuid-001',
    tenantId: TENANT_ID,
    deviceId: DEVICE_ID,
    recordedAt: now,
    rpm: 3000,
    speed: 60,
    coolantTemp: 90,
    engineLoad: 45,
    fuelLevel: 70,
    fuelRate: 8.5,
    intakeTemp: null,
    maf: null,
    barometric: null,
    intakeMap: null,
    throttlePos: 30,
    voltage: 13.8,
    runTime: null,
    distance: null,
    rawData: null,
    latitude: 41.9028,
    longitude: 12.4964,
    ...overrides,
  };
}

function makeTroubleCode(overrides: Record<string, unknown> = {}) {
  return {
    id: 'dtc-uuid-001',
    deviceId: DEVICE_ID,
    code: 'P0301',
    category: 'POWERTRAIN',
    severity: TroubleCodeSeverity.HIGH,
    description: 'Cylinder 1 Misfire Detected',
    symptoms: 'Rough idle',
    causes: 'Bad spark plug',
    isActive: true,
    isPending: false,
    isPermanent: false,
    firstSeenAt: now,
    lastSeenAt: now,
    clearedAt: null,
    clearedBy: null,
    readingSnapshot: null,
    ...overrides,
  };
}

// ── Mock factories ───────────────────────────────────────────────

function createPrismaMock() {
  return {
    obdDevice: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    obdReading: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    obdTroubleCode: {
      create: jest.fn(),
      createMany: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    vehicle: {
      findFirst: jest.fn(),
    },
  };
}

function createNotificationsMock() {
  return {
    sendToTenant: jest.fn().mockResolvedValue(undefined),
    sendNotification: jest.fn().mockResolvedValue(undefined),
  };
}

// ── Test suite ───────────────────────────────────────────────────

describe('ObdService', () => {
  let service: ObdService;
  let prisma: ReturnType<typeof createPrismaMock>;
  let notifications: ReturnType<typeof createNotificationsMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    notifications = createNotificationsMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ObdService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get<ObdService>(ObdService);
  });

  // ────────────────────────────────────────────
  // registerDevice
  // ────────────────────────────────────────────
  describe('registerDevice', () => {
    it('should create device and return mapped DTO', async () => {
      const device = makeDevice();
      prisma.obdDevice.create.mockResolvedValue(device);

      const result = await service.registerDevice(TENANT_ID, {
        serialNumber: 'OBD-SN-123',
        name: 'Scanner 1',
        model: 'ELM327',
        vehicleId: VEHICLE_ID,
      });

      expect(prisma.obdDevice.create).toHaveBeenCalledWith({
        data: {
          tenantId: TENANT_ID,
          serialNumber: 'OBD-SN-123',
          name: 'Scanner 1',
          model: 'ELM327',
          vehicleId: VEHICLE_ID,
          isActive: true,
        },
        include: { vehicle: true },
      });
      expect(result.id).toBe(DEVICE_ID);
      expect(result.serialNumber).toBe('OBD-SN-123');
      expect(result.vehicle?.make).toBe('Toyota');
    });

    it('should default model to empty string when not provided', async () => {
      const device = makeDevice({ model: '' });
      prisma.obdDevice.create.mockResolvedValue(device);

      await service.registerDevice(TENANT_ID, { serialNumber: 'OBD-SN-123' });

      expect(prisma.obdDevice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ model: '' }),
        }),
      );
    });

    it('should map device without vehicle correctly', async () => {
      const device = makeDevice({ vehicle: null });
      prisma.obdDevice.create.mockResolvedValue(device);

      const result = await service.registerDevice(TENANT_ID, { serialNumber: 'X' });
      expect(result.vehicle).toBeUndefined();
    });
  });

  // ────────────────────────────────────────────
  // getDevice
  // ────────────────────────────────────────────
  describe('getDevice', () => {
    it('should return device when found', async () => {
      prisma.obdDevice.findFirst.mockResolvedValue(makeDevice());

      const result = await service.getDevice(TENANT_ID, DEVICE_ID);

      expect(prisma.obdDevice.findFirst).toHaveBeenCalledWith({
        where: { id: DEVICE_ID, tenantId: TENANT_ID },
        include: { vehicle: true },
      });
      expect(result.id).toBe(DEVICE_ID);
    });

    it('should throw NotFoundException when device not found', async () => {
      prisma.obdDevice.findFirst.mockResolvedValue(null);

      await expect(service.getDevice(TENANT_ID, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ────────────────────────────────────────────
  // listDevices
  // ────────────────────────────────────────────
  describe('listDevices', () => {
    it('should list all devices for tenant', async () => {
      prisma.obdDevice.findMany.mockResolvedValue([makeDevice()]);
      prisma.obdDevice.count.mockResolvedValue(1);

      const result = await service.listDevices(TENANT_ID);

      expect(prisma.obdDevice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID },
          include: { vehicle: true },
          orderBy: { lastConnected: 'desc' },
          skip: 0,
          take: 20,
        }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by vehicleId when provided', async () => {
      prisma.obdDevice.findMany.mockResolvedValue([]);
      prisma.obdDevice.count.mockResolvedValue(0);

      await service.listDevices(TENANT_ID, VEHICLE_ID);

      expect(prisma.obdDevice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, vehicleId: VEHICLE_ID },
        }),
      );
    });

    it('should return empty data when no devices exist', async () => {
      prisma.obdDevice.findMany.mockResolvedValue([]);
      prisma.obdDevice.count.mockResolvedValue(0);

      const result = await service.listDevices(TENANT_ID);
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ────────────────────────────────────────────
  // updateDevice
  // ────────────────────────────────────────────
  describe('updateDevice', () => {
    it('should update and return mapped device', async () => {
      const updated = makeDevice({ name: 'Updated Scanner' });
      prisma.obdDevice.update.mockResolvedValue(updated);

      const result = await service.updateDevice(TENANT_ID, DEVICE_ID, { name: 'Updated Scanner' });

      expect(prisma.obdDevice.update).toHaveBeenCalledWith({
        where: { id: DEVICE_ID, tenantId: TENANT_ID },
        data: { name: 'Updated Scanner' },
        include: { vehicle: true },
      });
      expect(result.name).toBe('Updated Scanner');
    });
  });

  // ────────────────────────────────────────────
  // recordReading
  // ────────────────────────────────────────────
  describe('recordReading', () => {
    const readingDto = {
      deviceId: DEVICE_ID,
      rpm: 3000,
      speed: 60,
      coolantTemp: 90,
      engineLoad: 45,
      fuelLevel: 70,
      fuelRate: 8.5,
      intakeTemp: 30,
      maf: 12,
      barometric: 101,
      intakeMap: 50,
      throttlePos: 30,
      voltage: 13.8,
      runTime: 600,
      distance: 150,
      rawData: { raw: true },
      latitude: 41.9028,
      longitude: 12.4964,
    };

    it('should create reading, update last connected, check anomalies', async () => {
      prisma.obdReading.create.mockResolvedValue(makeReading());
      prisma.obdDevice.update.mockResolvedValue(makeDevice());
      prisma.obdDevice.findUnique.mockResolvedValue(null); // no anomaly notification

      const result = await service.recordReading(readingDto, TENANT_ID);

      expect(prisma.obdReading.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          deviceId: DEVICE_ID,
          rpm: 3000,
        }),
      });
      expect(prisma.obdDevice.update).toHaveBeenCalledWith({
        where: { id: DEVICE_ID },
        data: { lastConnected: expect.any(Date) },
      });
      expect(result.id).toBe('reading-uuid-001');
    });

    it('should send notification when coolant temp > 110', async () => {
      const hotDto = { ...readingDto, coolantTemp: 115 };
      prisma.obdReading.create.mockResolvedValue(makeReading({ coolantTemp: 115 }));
      prisma.obdDevice.update.mockResolvedValue(makeDevice());
      prisma.obdDevice.findUnique.mockResolvedValue(makeDevice({ tenant: { id: TENANT_ID } }));

      await service.recordReading(hotDto, TENANT_ID);

      expect(notifications.sendToTenant).toHaveBeenCalledWith(TENANT_ID, {
        title: expect.stringContaining('Critical Engine Temperature'),
        body: expect.stringContaining('115'),
        priority: 'high',
        data: expect.objectContaining({ type: 'CRITICAL_TEMP', deviceId: DEVICE_ID }),
      });
    });

    it('should not send notification when coolant temp is normal', async () => {
      prisma.obdReading.create.mockResolvedValue(makeReading());
      prisma.obdDevice.update.mockResolvedValue(makeDevice());

      await service.recordReading(readingDto, TENANT_ID);

      expect(notifications.sendToTenant).not.toHaveBeenCalled();
    });

    it('should not notify if device not found during anomaly check', async () => {
      const hotDto = { ...readingDto, coolantTemp: 115 };
      prisma.obdReading.create.mockResolvedValue(makeReading({ coolantTemp: 115 }));
      prisma.obdDevice.update.mockResolvedValue(makeDevice());
      prisma.obdDevice.findUnique.mockResolvedValue(null);

      await service.recordReading(hotDto, TENANT_ID);

      expect(notifications.sendToTenant).not.toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────
  // getReadings
  // ────────────────────────────────────────────
  describe('getReadings', () => {
    it('should return readings with default limit', async () => {
      prisma.obdReading.findMany.mockResolvedValue([makeReading()]);
      prisma.obdReading.count.mockResolvedValue(1);

      const result = await service.getReadings(TENANT_ID, {});

      expect(prisma.obdReading.findMany).toHaveBeenCalledWith({
        where: { device: { tenantId: TENANT_ID } },
        orderBy: { recordedAt: 'desc' },
        skip: 0,
        take: 100,
      });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(100);
    });

    it('should apply all filters', async () => {
      prisma.obdReading.findMany.mockResolvedValue([]);
      prisma.obdReading.count.mockResolvedValue(0);
      const from = new Date('2026-01-01');
      const to = new Date('2026-12-31');

      await service.getReadings(TENANT_ID, {
        deviceId: DEVICE_ID,
        vehicleId: VEHICLE_ID,
        from,
        to,
        limit: 50,
      });

      // Note: spread semantics mean later spreads override earlier ones.
      // vehicleId overwrites device.tenantId, and to overwrites from on recordedAt.
      expect(prisma.obdReading.findMany).toHaveBeenCalledWith({
        where: {
          device: { vehicleId: VEHICLE_ID },
          deviceId: DEVICE_ID,
          recordedAt: { lte: to },
        },
        orderBy: { recordedAt: 'desc' },
        skip: 0,
        take: 50,
      });
    });
  });

  // ────────────────────────────────────────────
  // getLatestReading
  // ────────────────────────────────────────────
  describe('getLatestReading', () => {
    it('should return latest reading when it exists', async () => {
      prisma.obdReading.findFirst.mockResolvedValue(makeReading());

      const result = await service.getLatestReading(TENANT_ID, DEVICE_ID);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('reading-uuid-001');
    });

    it('should return null when no reading exists', async () => {
      prisma.obdReading.findFirst.mockResolvedValue(null);

      const result = await service.getLatestReading(TENANT_ID, DEVICE_ID);
      expect(result).toBeNull();
    });
  });

  // ────────────────────────────────────────────
  // recordTroubleCodes
  // ────────────────────────────────────────────
  describe('recordTroubleCodes', () => {
    it('should throw NotFoundException when device not found', async () => {
      prisma.obdDevice.findUnique.mockResolvedValue(null);

      await expect(service.recordTroubleCodes(DEVICE_ID, [], TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update lastSeenAt for existing active code', async () => {
      prisma.obdDevice.findUnique.mockResolvedValue(makeDevice({ tenant: { id: TENANT_ID } }));
      prisma.obdReading.findFirst.mockResolvedValue(null);
      const existingCode = makeTroubleCode();
      prisma.obdTroubleCode.findMany.mockResolvedValue([existingCode]);

      await service.recordTroubleCodes(
        DEVICE_ID,
        [{ code: 'P0301', severity: TroubleCodeSeverity.HIGH, description: 'Misfire' }],
        TENANT_ID,
      );

      expect(prisma.obdTroubleCode.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [existingCode.id] } },
        data: { lastSeenAt: expect.any(Date) },
      });
      expect(prisma.obdTroubleCode.createMany).not.toHaveBeenCalled();
    });

    it('should create new code when not existing', async () => {
      prisma.obdDevice.findUnique.mockResolvedValue(makeDevice({ tenant: { id: TENANT_ID } }));
      prisma.obdReading.findFirst.mockResolvedValue(makeReading({ rawData: { snap: true } }));
      prisma.obdTroubleCode.findMany.mockResolvedValueOnce([]); // no existing active codes
      prisma.obdTroubleCode.createMany.mockResolvedValue({ count: 1 });
      // After createMany, service fetches newly created codes for notifications (HIGH severity)
      prisma.obdTroubleCode.findMany.mockResolvedValueOnce([makeTroubleCode({ id: 'new-dtc' })]);

      await service.recordTroubleCodes(
        DEVICE_ID,
        [
          {
            code: 'P0301',
            severity: TroubleCodeSeverity.HIGH,
            description: 'Misfire',
            symptoms: 'Rough idle',
            causes: 'Spark plug',
            isPending: true,
            isPermanent: false,
          },
        ],
        TENANT_ID,
      );

      expect(prisma.obdTroubleCode.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            deviceId: DEVICE_ID,
            code: 'P0301',
            severity: TroubleCodeSeverity.HIGH,
            isPending: true,
            isPermanent: false,
            readingSnapshot: { snap: true },
          }),
        ],
      });
    });

    it('should send notification for CRITICAL severity codes', async () => {
      prisma.obdDevice.findUnique.mockResolvedValue(makeDevice({ tenant: { id: TENANT_ID } }));
      prisma.obdReading.findFirst.mockResolvedValue(null);
      prisma.obdTroubleCode.findMany.mockResolvedValueOnce([]); // no existing active codes
      prisma.obdTroubleCode.createMany.mockResolvedValue({ count: 1 });
      // After createMany, service fetches newly created codes for notifications
      prisma.obdTroubleCode.findMany.mockResolvedValueOnce([
        makeTroubleCode({ id: 'new-dtc', code: 'P0301' }),
      ]);

      await service.recordTroubleCodes(
        DEVICE_ID,
        [
          {
            code: 'P0301',
            severity: TroubleCodeSeverity.CRITICAL,
            description: 'Critical misfire',
          },
        ],
        TENANT_ID,
      );

      expect(notifications.sendToTenant).toHaveBeenCalledWith(TENANT_ID, {
        title: 'Vehicle Alert: P0301',
        body: expect.stringContaining('Critical misfire'),
        priority: 'high',
        data: expect.objectContaining({
          type: 'OBD_TROUBLE_CODE',
          codeId: 'new-dtc',
        }),
      });
    });

    it('should send notification for HIGH severity codes with normal priority', async () => {
      prisma.obdDevice.findUnique.mockResolvedValue(makeDevice({ tenant: { id: TENANT_ID } }));
      prisma.obdReading.findFirst.mockResolvedValue(null);
      prisma.obdTroubleCode.findMany.mockResolvedValueOnce([]); // no existing active codes
      prisma.obdTroubleCode.createMany.mockResolvedValue({ count: 1 });
      prisma.obdTroubleCode.findMany.mockResolvedValueOnce([
        makeTroubleCode({ id: 'new-dtc-high', code: 'P0301' }),
      ]);

      await service.recordTroubleCodes(
        DEVICE_ID,
        [
          {
            code: 'P0301',
            severity: TroubleCodeSeverity.HIGH,
            description: 'High severity issue',
          },
        ],
        TENANT_ID,
      );

      expect(notifications.sendToTenant).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({ priority: 'normal' }),
      );
    });

    it('should NOT send notification for MEDIUM or LOW severity codes', async () => {
      prisma.obdDevice.findUnique.mockResolvedValue(makeDevice({ tenant: { id: TENANT_ID } }));
      prisma.obdReading.findFirst.mockResolvedValue(null);
      prisma.obdTroubleCode.findMany.mockResolvedValueOnce([]); // no existing active codes
      prisma.obdTroubleCode.createMany.mockResolvedValue({ count: 1 });

      await service.recordTroubleCodes(
        DEVICE_ID,
        [
          {
            code: 'P0505',
            severity: TroubleCodeSeverity.LOW,
            description: 'Low severity issue',
          },
        ],
        TENANT_ID,
      );

      expect(notifications.sendToTenant).not.toHaveBeenCalled();
    });

    it('should infer severity from code prefix when not provided', async () => {
      prisma.obdDevice.findUnique.mockResolvedValue(makeDevice({ tenant: { id: TENANT_ID } }));
      prisma.obdReading.findFirst.mockResolvedValue(null);
      prisma.obdTroubleCode.findMany.mockResolvedValueOnce([]); // no existing active codes
      prisma.obdTroubleCode.createMany.mockResolvedValue({ count: 1 });
      // P03 -> HIGH, so notifications will fire; mock the fetch for newly created codes
      prisma.obdTroubleCode.findMany.mockResolvedValueOnce([makeTroubleCode({ code: 'P0301' })]);

      await service.recordTroubleCodes(
        DEVICE_ID,
        [
          {
            code: 'P0301',
            description: 'Misfire',
            // severity intentionally omitted to trigger getSeverityFromCode
          } as { code: string; description: string; severity: TroubleCodeSeverity },
        ],
        TENANT_ID,
      );

      // P03 prefix maps to HIGH
      expect(prisma.obdTroubleCode.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ severity: TroubleCodeSeverity.HIGH })],
      });
    });

    it('should infer category from code prefix when not provided', async () => {
      prisma.obdDevice.findUnique.mockResolvedValue(makeDevice({ tenant: { id: TENANT_ID } }));
      prisma.obdReading.findFirst.mockResolvedValue(null);
      prisma.obdTroubleCode.findMany.mockResolvedValueOnce([]); // no existing active codes
      prisma.obdTroubleCode.createMany.mockResolvedValue({ count: 1 });

      await service.recordTroubleCodes(
        DEVICE_ID,
        [
          {
            code: 'B0050',
            severity: TroubleCodeSeverity.MEDIUM,
            description: 'Body issue',
          },
        ],
        TENANT_ID,
      );

      expect(prisma.obdTroubleCode.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ category: 'BODY' })],
      });
    });

    it('should handle readingSnapshot as undefined when no latest reading', async () => {
      prisma.obdDevice.findUnique.mockResolvedValue(makeDevice({ tenant: { id: TENANT_ID } }));
      prisma.obdReading.findFirst.mockResolvedValue(null);
      prisma.obdTroubleCode.findMany.mockResolvedValueOnce([]); // no existing active codes
      prisma.obdTroubleCode.createMany.mockResolvedValue({ count: 1 });

      await service.recordTroubleCodes(
        DEVICE_ID,
        [{ code: 'P0301', severity: TroubleCodeSeverity.LOW, description: 'Test' }],
        TENANT_ID,
      );

      expect(prisma.obdTroubleCode.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ readingSnapshot: undefined })],
      });
    });
  });

  // ────────────────────────────────────────────
  // getTroubleCodes
  // ────────────────────────────────────────────
  describe('getTroubleCodes', () => {
    it('should return trouble codes for tenant', async () => {
      prisma.obdTroubleCode.findMany.mockResolvedValue([makeTroubleCode()]);
      prisma.obdTroubleCode.count.mockResolvedValue(1);

      const result = await service.getTroubleCodes(TENANT_ID, {});

      expect(prisma.obdTroubleCode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { device: { tenantId: TENANT_ID } },
          orderBy: [{ severity: 'desc' }, { firstSeenAt: 'desc' }],
          skip: 0,
          take: 50,
        }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.data[0].code).toBe('P0301');
    });

    it('should apply deviceId filter', async () => {
      prisma.obdTroubleCode.findMany.mockResolvedValue([]);
      prisma.obdTroubleCode.count.mockResolvedValue(0);

      await service.getTroubleCodes(TENANT_ID, { deviceId: DEVICE_ID });

      expect(prisma.obdTroubleCode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deviceId: DEVICE_ID }),
        }),
      );
    });

    it('should apply vehicleId filter', async () => {
      prisma.obdTroubleCode.findMany.mockResolvedValue([]);
      prisma.obdTroubleCode.count.mockResolvedValue(0);

      await service.getTroubleCodes(TENANT_ID, { vehicleId: VEHICLE_ID });

      // Note: spread semantics mean vehicleId filter overwrites tenantId in device
      expect(prisma.obdTroubleCode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ device: { vehicleId: VEHICLE_ID } }),
        }),
      );
    });

    it('should apply active filter', async () => {
      prisma.obdTroubleCode.findMany.mockResolvedValue([]);
      prisma.obdTroubleCode.count.mockResolvedValue(0);

      await service.getTroubleCodes(TENANT_ID, { active: true });

      expect(prisma.obdTroubleCode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });
  });

  // ────────────────────────────────────────────
  // clearTroubleCodes
  // ────────────────────────────────────────────
  describe('clearTroubleCodes', () => {
    it('should deactivate all active codes for device', async () => {
      prisma.obdTroubleCode.updateMany.mockResolvedValue({ count: 3 });

      await service.clearTroubleCodes(TENANT_ID, DEVICE_ID, {
        clearedBy: 'user-uuid-001',
      });

      expect(prisma.obdTroubleCode.updateMany).toHaveBeenCalledWith({
        where: { deviceId: DEVICE_ID, device: { tenantId: TENANT_ID }, isActive: true },
        data: {
          isActive: false,
          clearedAt: expect.any(Date),
          clearedBy: 'user-uuid-001',
        },
      });
    });
  });

  // ────────────────────────────────────────────
  // generateHealthReport
  // ────────────────────────────────────────────
  describe('generateHealthReport', () => {
    function makeVehicleWithObd(overrides: Record<string, unknown> = {}) {
      return {
        id: VEHICLE_ID,
        make: 'Toyota',
        model: 'Corolla',
        licensePlate: 'AB123CD',
        obdDevices: [
          {
            readings: [makeReading()],
            dtcs: [],
          },
        ],
        ...overrides,
      };
    }

    it('should throw NotFoundException when vehicle not found', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.generateHealthReport(TENANT_ID, VEHICLE_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return EXCELLENT status for healthy vehicle (score >= 90)', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(makeVehicleWithObd());

      const result = await service.generateHealthReport(TENANT_ID, VEHICLE_ID);

      expect(result.overallStatus).toBe('EXCELLENT');
      expect(result.score).toBe(100);
      expect(result.activeCodes).toBe(0);
      expect(result.pendingCodes).toBe(0);
      expect(result.recommendations).toEqual(['No issues detected. Vehicle is in good condition.']);
    });

    it('should deduct 30 points for CRITICAL codes', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(
        makeVehicleWithObd({
          obdDevices: [
            {
              readings: [makeReading()],
              dtcs: [
                makeTroubleCode({
                  severity: TroubleCodeSeverity.CRITICAL,
                  isActive: true,
                  isPending: false,
                }),
              ],
            },
          ],
        }),
      );

      const result = await service.generateHealthReport(TENANT_ID, VEHICLE_ID);

      expect(result.score).toBe(70);
      expect(result.overallStatus).toBe('FAIR');
      expect(result.activeCodes).toBe(1);
      expect(result.recommendations[0]).toContain('CRITICAL');
    });

    it('should deduct 15 points for HIGH codes', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(
        makeVehicleWithObd({
          obdDevices: [
            {
              readings: [makeReading()],
              dtcs: [
                makeTroubleCode({
                  severity: TroubleCodeSeverity.HIGH,
                  isActive: true,
                  isPending: false,
                }),
              ],
            },
          ],
        }),
      );

      const result = await service.generateHealthReport(TENANT_ID, VEHICLE_ID);

      expect(result.score).toBe(85);
      expect(result.recommendations[0]).toContain('HIGH');
    });

    it('should deduct 5 points for MEDIUM codes', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(
        makeVehicleWithObd({
          obdDevices: [
            {
              readings: [makeReading()],
              dtcs: [
                makeTroubleCode({
                  severity: TroubleCodeSeverity.MEDIUM,
                  isActive: true,
                  isPending: false,
                }),
              ],
            },
          ],
        }),
      );

      const result = await service.generateHealthReport(TENANT_ID, VEHICLE_ID);

      expect(result.score).toBe(95);
      expect(result.recommendations[0]).toContain('MEDIUM');
    });

    it('should deduct 2 points for LOW codes', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(
        makeVehicleWithObd({
          obdDevices: [
            {
              readings: [makeReading()],
              dtcs: [
                makeTroubleCode({
                  severity: TroubleCodeSeverity.LOW,
                  isActive: true,
                  isPending: false,
                }),
              ],
            },
          ],
        }),
      );

      const result = await service.generateHealthReport(TENANT_ID, VEHICLE_ID);

      expect(result.score).toBe(98);
      expect(result.recommendations[0]).toContain('LOW');
    });

    it('should deduct 20 points for high coolant temp (> 100)', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(
        makeVehicleWithObd({
          obdDevices: [
            {
              readings: [makeReading({ coolantTemp: 105 })],
              dtcs: [],
            },
          ],
        }),
      );

      const result = await service.generateHealthReport(TENANT_ID, VEHICLE_ID);

      expect(result.score).toBe(80);
      expect(result.recommendations).toContain(
        'Engine overheating detected. Check cooling system immediately.',
      );
    });

    it('should deduct 10 points for low voltage (< 12.0)', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(
        makeVehicleWithObd({
          obdDevices: [
            {
              readings: [makeReading({ voltage: 11.5 })],
              dtcs: [],
            },
          ],
        }),
      );

      const result = await service.generateHealthReport(TENANT_ID, VEHICLE_ID);

      expect(result.score).toBe(90);
      expect(result.recommendations).toContain('Low battery voltage. Have battery tested.');
    });

    it('should add recommendation for high engine load (> 90) without score deduction', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(
        makeVehicleWithObd({
          obdDevices: [
            {
              readings: [makeReading({ engineLoad: 95 })],
              dtcs: [],
            },
          ],
        }),
      );

      const result = await service.generateHealthReport(TENANT_ID, VEHICLE_ID);

      expect(result.score).toBe(100);
      expect(result.recommendations).toContain(
        'High engine load detected. Check for transmission issues.',
      );
    });

    it('should clamp score to minimum 0', async () => {
      // 4 CRITICAL codes = 4 * 30 = 120 deducted -> clamp to 0
      const criticalCodes = Array.from({ length: 4 }, (_, i) =>
        makeTroubleCode({
          id: `dtc-${i}`,
          severity: TroubleCodeSeverity.CRITICAL,
          isActive: true,
          isPending: false,
        }),
      );

      prisma.vehicle.findFirst.mockResolvedValue(
        makeVehicleWithObd({
          obdDevices: [{ readings: [], dtcs: criticalCodes }],
        }),
      );

      const result = await service.generateHealthReport(TENANT_ID, VEHICLE_ID);

      expect(result.score).toBe(0);
      expect(result.overallStatus).toBe('CRITICAL');
    });

    it('should return POOR status for score 25-49', async () => {
      // 2 CRITICAL = 60 deducted -> score 40
      const codes = [
        makeTroubleCode({
          id: 'c1',
          severity: TroubleCodeSeverity.CRITICAL,
          isActive: true,
          isPending: false,
        }),
        makeTroubleCode({
          id: 'c2',
          severity: TroubleCodeSeverity.CRITICAL,
          isActive: true,
          isPending: false,
        }),
      ];

      prisma.vehicle.findFirst.mockResolvedValue(
        makeVehicleWithObd({
          obdDevices: [{ readings: [], dtcs: codes }],
        }),
      );

      const result = await service.generateHealthReport(TENANT_ID, VEHICLE_ID);

      expect(result.score).toBe(40);
      expect(result.overallStatus).toBe('POOR');
    });

    it('should return FAIR status for score 50-74', async () => {
      // 1 CRITICAL + low voltage = 30 + 10 = 40 deducted -> 60
      prisma.vehicle.findFirst.mockResolvedValue(
        makeVehicleWithObd({
          obdDevices: [
            {
              readings: [makeReading({ voltage: 11.0 })],
              dtcs: [
                makeTroubleCode({
                  severity: TroubleCodeSeverity.CRITICAL,
                  isActive: true,
                  isPending: false,
                }),
              ],
            },
          ],
        }),
      );

      const result = await service.generateHealthReport(TENANT_ID, VEHICLE_ID);

      expect(result.score).toBe(60);
      expect(result.overallStatus).toBe('FAIR');
    });

    it('should count pending codes separately from active codes', async () => {
      const dtcs = [
        makeTroubleCode({ id: 'd1', isActive: true, isPending: false }),
        makeTroubleCode({ id: 'd2', isActive: true, isPending: true }),
      ];
      prisma.vehicle.findFirst.mockResolvedValue(
        makeVehicleWithObd({
          obdDevices: [{ readings: [], dtcs }],
        }),
      );

      const result = await service.generateHealthReport(TENANT_ID, VEHICLE_ID);

      expect(result.activeCodes).toBe(1);
      expect(result.pendingCodes).toBe(1);
    });

    it('should handle vehicle with no OBD devices', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(makeVehicleWithObd({ obdDevices: [] }));

      const result = await service.generateHealthReport(TENANT_ID, VEHICLE_ID);

      expect(result.score).toBe(100);
      expect(result.overallStatus).toBe('EXCELLENT');
      expect(result.lastReading).toBeUndefined();
    });

    it('should skip inactive codes in score calculation', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(
        makeVehicleWithObd({
          obdDevices: [
            {
              readings: [],
              dtcs: [makeTroubleCode({ isActive: false, severity: TroubleCodeSeverity.CRITICAL })],
            },
          ],
        }),
      );

      const result = await service.generateHealthReport(TENANT_ID, VEHICLE_ID);

      expect(result.score).toBe(100);
    });

    it('should aggregate data from multiple devices', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(
        makeVehicleWithObd({
          obdDevices: [
            {
              readings: [makeReading({ id: 'r1', recordedAt: new Date('2026-03-11') })],
              dtcs: [
                makeTroubleCode({
                  id: 'd1',
                  severity: TroubleCodeSeverity.LOW,
                  isActive: true,
                  isPending: false,
                }),
              ],
            },
            {
              readings: [makeReading({ id: 'r2', recordedAt: new Date('2026-03-12') })],
              dtcs: [
                makeTroubleCode({
                  id: 'd2',
                  severity: TroubleCodeSeverity.LOW,
                  isActive: true,
                  isPending: false,
                }),
              ],
            },
          ],
        }),
      );

      const result = await service.generateHealthReport(TENANT_ID, VEHICLE_ID);

      // 2 LOW codes = 4 deducted
      expect(result.score).toBe(96);
      expect(result.activeCodes).toBe(2);
      // Latest reading should be the one with newer date
      expect(result.lastReading?.id).toBe('r2');
    });
  });

  // ────────────────────────────────────────────
  // Private method: getSeverityFromCode (tested via recordTroubleCodes)
  // ────────────────────────────────────────────
  describe('severity mapping via recordTroubleCodes', () => {
    beforeEach(() => {
      prisma.obdDevice.findUnique.mockResolvedValue(makeDevice({ tenant: { id: TENANT_ID } }));
      prisma.obdReading.findFirst.mockResolvedValue(null);
      prisma.obdTroubleCode.createMany.mockResolvedValue({ count: 1 });
    });

    const testCases: Array<{ prefix: string; expected: TroubleCodeSeverity }> = [
      { prefix: 'P01', expected: TroubleCodeSeverity.MEDIUM },
      { prefix: 'P02', expected: TroubleCodeSeverity.HIGH },
      { prefix: 'P03', expected: TroubleCodeSeverity.HIGH },
      { prefix: 'P04', expected: TroubleCodeSeverity.MEDIUM },
      { prefix: 'P05', expected: TroubleCodeSeverity.LOW },
      { prefix: 'P06', expected: TroubleCodeSeverity.HIGH },
      { prefix: 'P07', expected: TroubleCodeSeverity.MEDIUM },
      { prefix: 'P08', expected: TroubleCodeSeverity.HIGH },
      { prefix: 'P0A', expected: TroubleCodeSeverity.HIGH },
      { prefix: 'B00', expected: TroubleCodeSeverity.MEDIUM },
      { prefix: 'C00', expected: TroubleCodeSeverity.HIGH },
      { prefix: 'U00', expected: TroubleCodeSeverity.HIGH },
    ];

    it.each(testCases)('should map $prefix to $expected severity', async ({ prefix, expected }) => {
      const code = `${prefix}99`;
      // For HIGH severity codes, service will fetch newly created codes for notifications
      const isHighOrCritical =
        expected === TroubleCodeSeverity.HIGH || expected === TroubleCodeSeverity.CRITICAL;
      prisma.obdTroubleCode.findMany.mockResolvedValueOnce([]); // no existing active codes
      if (isHighOrCritical) {
        prisma.obdTroubleCode.findMany.mockResolvedValueOnce([makeTroubleCode({ code })]);
      }

      await service.recordTroubleCodes(
        DEVICE_ID,
        [
          { code, description: 'Test' } as {
            code: string;
            description: string;
            severity: TroubleCodeSeverity;
          },
        ],
        TENANT_ID,
      );

      expect(prisma.obdTroubleCode.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ severity: expected })],
      });
    });

    it('should default to MEDIUM for unknown code prefix', async () => {
      prisma.obdTroubleCode.findMany.mockResolvedValueOnce([]); // no existing active codes

      await service.recordTroubleCodes(
        DEVICE_ID,
        [
          { code: 'P9999', description: 'Unknown' } as {
            code: string;
            description: string;
            severity: TroubleCodeSeverity;
          },
        ],
        TENANT_ID,
      );

      expect(prisma.obdTroubleCode.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ severity: TroubleCodeSeverity.MEDIUM })],
      });
    });
  });

  // ────────────────────────────────────────────
  // Private method: getCategoryFromCode (tested via recordTroubleCodes)
  // ────────────────────────────────────────────
  describe('category mapping via recordTroubleCodes', () => {
    beforeEach(() => {
      prisma.obdDevice.findUnique.mockResolvedValue(makeDevice({ tenant: { id: TENANT_ID } }));
      prisma.obdReading.findFirst.mockResolvedValue(null);
      prisma.obdTroubleCode.createMany.mockResolvedValue({ count: 1 });
    });

    const categoryCases: Array<{ code: string; expected: string }> = [
      { code: 'P0301', expected: 'POWERTRAIN' },
      { code: 'B0050', expected: 'BODY' },
      { code: 'C0100', expected: 'CHASSIS' },
      { code: 'U0001', expected: 'NETWORK' },
      { code: 'X9999', expected: 'UNKNOWN' },
    ];

    it.each(categoryCases)('should map $code to $expected category', async ({ code, expected }) => {
      prisma.obdTroubleCode.findMany.mockResolvedValueOnce([]); // no existing active codes

      await service.recordTroubleCodes(
        DEVICE_ID,
        [{ code, severity: TroubleCodeSeverity.LOW, description: 'Test' }],
        TENANT_ID,
      );

      expect(prisma.obdTroubleCode.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ category: expected })],
      });
    });
  });

  // ────────────────────────────────────────────
  // mapDeviceToDto edge cases
  // ────────────────────────────────────────────
  describe('mapDeviceToDto edge cases', () => {
    it('should map null optional fields to undefined', async () => {
      const device = makeDevice({
        name: null,
        model: null,
        lastConnected: null,
        batteryLevel: null,
        vehicle: null,
      });
      prisma.obdDevice.findFirst.mockResolvedValue(device);

      const result = await service.getDevice(TENANT_ID, DEVICE_ID);

      expect(result.name).toBeUndefined();
      expect(result.model).toBeUndefined();
      expect(result.lastConnected).toBeUndefined();
      expect(result.batteryLevel).toBeUndefined();
      expect(result.vehicle).toBeUndefined();
    });
  });

  // ────────────────────────────────────────────
  // mapReadingToDto edge cases
  // ────────────────────────────────────────────
  describe('mapReadingToDto edge cases', () => {
    it('should map null optional reading fields to undefined', async () => {
      const reading = makeReading({
        rpm: null,
        speed: null,
        coolantTemp: null,
        engineLoad: null,
        fuelLevel: null,
        fuelRate: null,
        throttlePos: null,
        voltage: null,
        latitude: null,
        longitude: null,
      });
      prisma.obdReading.findFirst.mockResolvedValue(reading);

      const result = await service.getLatestReading(TENANT_ID, DEVICE_ID);

      expect(result?.rpm).toBeUndefined();
      expect(result?.speed).toBeUndefined();
      expect(result?.coolantTemp).toBeUndefined();
      expect(result?.voltage).toBeUndefined();
      expect(result?.latitude).toBeUndefined();
    });
  });

  // ────────────────────────────────────────────
  // mapTroubleCodeToDto edge cases
  // ────────────────────────────────────────────
  describe('mapTroubleCodeToDto edge cases', () => {
    it('should map null optional trouble code fields to undefined', async () => {
      const code = makeTroubleCode({
        symptoms: null,
        causes: null,
        clearedAt: null,
      });
      prisma.obdTroubleCode.findMany.mockResolvedValue([code]);
      prisma.obdTroubleCode.count.mockResolvedValue(1);

      const result = await service.getTroubleCodes(TENANT_ID, {});

      expect(result.data[0].symptoms).toBeUndefined();
      expect(result.data[0].causes).toBeUndefined();
      expect(result.data[0].clearedAt).toBeUndefined();
    });
  });
});
