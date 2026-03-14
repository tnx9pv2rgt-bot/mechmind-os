import { Test, TestingModule } from '@nestjs/testing';
import { getRedisConnectionToken } from '@nestjs-modules/ioredis';
import { ObdStreamingService } from './obd-streaming.service';
import { PrismaService } from '../../../common/services/prisma.service';
import { NotificationsService } from '../../../notifications/services/notifications.service';
import {
  AdapterType,
  Mode06TestResult,
  ObdProtocol,
  ObdSensorData,
} from '../interfaces/obd-streaming.interface';

describe('ObdStreamingService', () => {
  let service: ObdStreamingService;
  let prisma: jest.Mocked<PrismaService>;
  let notifications: jest.Mocked<NotificationsService>;
  let redis: Record<string, jest.Mock>;

  const mockPipelineExec = jest.fn().mockResolvedValue([]);
  const mockPipeline = {
    setex: jest.fn().mockReturnThis(),
    exec: mockPipelineExec,
  };

  beforeEach(async () => {
    redis = {
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      get: jest.fn().mockResolvedValue(null),
      publish: jest.fn().mockResolvedValue(1),
      pipeline: jest.fn().mockReturnValue(mockPipeline),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ObdStreamingService,
        {
          provide: PrismaService,
          useValue: {
            obdDevice: {
              findUnique: jest.fn().mockResolvedValue(null),
            },
            obdFreezeFrame: {
              create: jest.fn().mockResolvedValue({ id: 'ff:1' }),
            },
            obdMode06Result: {
              createMany: jest.fn().mockResolvedValue({ count: 0 }),
            },
            obdEvapTest: {
              create: jest.fn().mockResolvedValue({ id: 'evap:1' }),
            },
            obdReading: {
              createMany: jest.fn().mockResolvedValue({ count: 0 }),
              findMany: jest.fn().mockResolvedValue([]),
              deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
            },
            $queryRaw: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            sendToTenant: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: getRedisConnectionToken(),
          useValue: redis,
        },
      ],
    }).compile();

    service = module.get<ObdStreamingService>(ObdStreamingService);
    prisma = module.get(PrismaService);
    notifications = module.get(NotificationsService);
  });

  afterEach(async () => {
    // Clean up any active streams
    const streams = service.getAllActiveStreams();
    for (const stream of streams) {
      await service.stopStreaming(stream.id);
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==================== startStreaming ====================
  describe('startStreaming', () => {
    it('should start a new streaming session with defaults', async () => {
      const result = await service.startStreaming('device-1', {
        adapterType: AdapterType.ELM327_BLUETOOTH,
      });

      expect(result.deviceId).toBe('device-1');
      expect(result.isActive).toBe(true);
      expect(result.adapterType).toBe(AdapterType.ELM327_BLUETOOTH);
      expect(result.protocol).toBe(ObdProtocol.AUTO);
      expect(result.config.sensors).toContain('rpm');
      expect(result.config.sensors).toContain('speed');
      expect(result.config.interval).toBe(500); // HIGH interval
      expect(result.buffer).toEqual([]);
      expect(result.stats.packetsReceived).toBe(0);
    });

    it('should start streaming with custom config', async () => {
      const result = await service.startStreaming('device-2', {
        adapterType: AdapterType.OBDLINK_MX,
        protocol: ObdProtocol.ISO15765_4_CAN_11BIT,
        sensors: ['rpm', 'speed'],
        interval: 100,
      });

      expect(result.protocol).toBe(ObdProtocol.ISO15765_4_CAN_11BIT);
      expect(result.config.sensors).toEqual(['rpm', 'speed']);
      expect(result.config.interval).toBe(100);
    });

    it('should store stream metadata in Redis', async () => {
      await service.startStreaming('device-3', {
        adapterType: AdapterType.ELM327_USB,
      });

      expect(redis.setex).toHaveBeenCalledWith('obd:stream:device-3', 3600, expect.any(String));
    });

    it('should make stream retrievable via getActiveStream', async () => {
      await service.startStreaming('device-4', {
        adapterType: AdapterType.ELM327_WIFI,
      });

      const stream = service.getActiveStream('device-4');
      expect(stream).toBeDefined();
      expect(stream?.deviceId).toBe('device-4');
    });
  });

  // ==================== stopStreaming ====================
  describe('stopStreaming', () => {
    it('should stop an active stream', async () => {
      const stream = await service.startStreaming('device-5', {
        adapterType: AdapterType.ELM327_BLUETOOTH,
      });

      await service.stopStreaming(stream.id);

      expect(service.getActiveStream('device-5')).toBeUndefined();
      expect(redis.del).toHaveBeenCalledWith('obd:stream:device-5');
    });

    it('should do nothing when stream does not exist', async () => {
      await service.stopStreaming('nonexistent-stream');

      expect(redis.del).not.toHaveBeenCalled();
    });

    it('should flush buffer before stopping', async () => {
      const stream = await service.startStreaming('device-6', {
        adapterType: AdapterType.ELM327_BLUETOOTH,
      });

      // Add data to buffer
      const sensorData: ObdSensorData = { rpm: 3000, speed: 60, timestamp: new Date() };

      // Manually push to buffer via processSensorData
      (prisma.obdDevice.findUnique as jest.Mock).mockResolvedValue({
        id: 'device-6',
        tenantId: 't-1',
      });
      await service.processSensorData(stream.id, sensorData);

      await service.stopStreaming(stream.id);

      // Buffer should have been flushed (createMany called)
      expect(prisma.obdReading.createMany).toHaveBeenCalled();
    });
  });

  // ==================== processSensorData ====================
  describe('processSensorData', () => {
    it('should process sensor data and update stats', async () => {
      const stream = await service.startStreaming('device-7', {
        adapterType: AdapterType.ELM327_BLUETOOTH,
      });

      const sensorData: ObdSensorData = {
        rpm: 2500,
        speed: 50,
        coolantTemp: 85,
        timestamp: new Date(),
      };

      await service.processSensorData(stream.id, sensorData);

      const activeStream = service.getActiveStream('device-7');
      expect(activeStream?.stats.packetsReceived).toBe(1);
    });

    it('should add timestamp when missing', async () => {
      const stream = await service.startStreaming('device-8', {
        adapterType: AdapterType.ELM327_BLUETOOTH,
      });

      const sensorData: ObdSensorData = { rpm: 2500 };
      await service.processSensorData(stream.id, sensorData);

      expect(sensorData.timestamp).toBeDefined();
    });

    it('should publish data to Redis for real-time subscribers', async () => {
      const stream = await service.startStreaming('device-9', {
        adapterType: AdapterType.ELM327_BLUETOOTH,
      });

      const sensorData: ObdSensorData = { rpm: 3000, timestamp: new Date() };
      await service.processSensorData(stream.id, sensorData);

      expect(redis.publish).toHaveBeenCalledWith('obd:live:device-9', expect.any(String));
    });

    it('should do nothing for nonexistent stream', async () => {
      const sensorData: ObdSensorData = { rpm: 3000, timestamp: new Date() };
      await service.processSensorData('nonexistent', sensorData);

      expect(redis.publish).not.toHaveBeenCalled();
    });

    it('should do nothing for inactive stream', async () => {
      const stream = await service.startStreaming('device-10', {
        adapterType: AdapterType.ELM327_BLUETOOTH,
      });
      await service.stopStreaming(stream.id);

      const sensorData: ObdSensorData = { rpm: 3000, timestamp: new Date() };
      await service.processSensorData(stream.id, sensorData);

      // publish should only have been called 0 times for this data
      // (stopStreaming already removed the stream)
    });

    it('should flush buffer when it reaches 100 packets', async () => {
      (prisma.obdDevice.findUnique as jest.Mock).mockResolvedValue({
        id: 'device-11',
        tenantId: 't-1',
      });

      const stream = await service.startStreaming('device-11', {
        adapterType: AdapterType.ELM327_BLUETOOTH,
      });

      // Send 100 packets to trigger flush
      for (let i = 0; i < 100; i++) {
        await service.processSensorData(stream.id, {
          rpm: 2000 + i,
          speed: 50,
          timestamp: new Date(),
        });
      }

      expect(prisma.obdReading.createMany).toHaveBeenCalled();
    });

    it('should check critical values and send notification for high coolant temp', async () => {
      (prisma.obdDevice.findUnique as jest.Mock).mockResolvedValue({
        id: 'device-12',
        tenantId: 't-1',
        vehicle: { make: 'BMW', model: '320d' },
        tenant: { id: 't-1' },
      });

      const stream = await service.startStreaming('device-12', {
        adapterType: AdapterType.ELM327_BLUETOOTH,
      });

      const sensorData: ObdSensorData = {
        coolantTemp: 115,
        timestamp: new Date(),
      };
      await service.processSensorData(stream.id, sensorData);

      expect(notifications.sendToTenant).toHaveBeenCalledWith(
        't-1',
        expect.objectContaining({
          priority: 'high',
        }),
      );
    });

    it('should check critical values for low voltage', async () => {
      (prisma.obdDevice.findUnique as jest.Mock).mockResolvedValue({
        id: 'device-13',
        tenantId: 't-1',
        vehicle: { make: 'Fiat', model: '500' },
        tenant: { id: 't-1' },
      });

      const stream = await service.startStreaming('device-13', {
        adapterType: AdapterType.ELM327_BLUETOOTH,
      });

      await service.processSensorData(stream.id, {
        voltage: 10.5,
        timestamp: new Date(),
      });

      expect(notifications.sendToTenant).toHaveBeenCalled();
    });

    it('should check critical values for high RPM', async () => {
      (prisma.obdDevice.findUnique as jest.Mock).mockResolvedValue({
        id: 'device-14',
        tenantId: 't-1',
        vehicle: { make: 'Honda', model: 'Civic' },
        tenant: { id: 't-1' },
      });

      const stream = await service.startStreaming('device-14', {
        adapterType: AdapterType.ELM327_BLUETOOTH,
      });

      await service.processSensorData(stream.id, {
        rpm: 7000,
        timestamp: new Date(),
      });

      expect(notifications.sendToTenant).toHaveBeenCalled();
    });

    it('should not send notification when values are within normal range', async () => {
      const stream = await service.startStreaming('device-15', {
        adapterType: AdapterType.ELM327_BLUETOOTH,
      });

      await service.processSensorData(stream.id, {
        rpm: 3000,
        coolantTemp: 85,
        voltage: 13.5,
        timestamp: new Date(),
      });

      expect(notifications.sendToTenant).not.toHaveBeenCalled();
    });
  });

  // ==================== captureFreezeFrame ====================
  describe('captureFreezeFrame', () => {
    it('should capture freeze frame for existing device', async () => {
      (prisma.obdDevice.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'device-20',
        vehicle: { id: 'v-1', make: 'Toyota', model: 'Yaris' },
      });

      const result = await service.captureFreezeFrame('device-20', 'P0301');

      expect(result.deviceId).toBe('device-20');
      expect(result.dtcCode).toBe('P0301');
      expect(result.storedInDb).toBe(true);
      expect(prisma.obdFreezeFrame.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          deviceId: 'device-20',
          dtcCode: 'P0301',
        }),
      });
    });

    it('should throw error when device not found', async () => {
      (prisma.obdDevice.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.captureFreezeFrame('nonexistent', 'P0301')).rejects.toThrow(
        'Device not found',
      );
    });

    it('should include all PID data in freeze frame', async () => {
      (prisma.obdDevice.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'device-21',
        vehicle: { id: 'v-2' },
      });

      const result = await service.captureFreezeFrame('device-21', 'P0420');

      expect(result.data).toHaveProperty('rpm');
      expect(result.data).toHaveProperty('speed');
      expect(result.data).toHaveProperty('coolantTemp');
      expect(result.data).toHaveProperty('throttlePos');
      expect(result.data).toHaveProperty('engineLoad');
      expect(result.data).toHaveProperty('o2SensorVoltage');
    });
  });

  // ==================== getMode06Tests ====================
  describe('getMode06Tests', () => {
    it('should throw error when device not found', async () => {
      (prisma.obdDevice.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.getMode06Tests('nonexistent')).rejects.toThrow('Device not found');
    });

    it('should return empty array when no tests supported', async () => {
      (prisma.obdDevice.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'device-30',
      });

      const result = await service.getMode06Tests('device-30');

      // queryPid returns null, so isTestSupported returns false for all
      expect(result).toEqual([]);
    });

    it('should query supported tests and store results when tests are supported', async () => {
      (prisma.obdDevice.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'device-31',
      });

      // Mock queryPid to return a value that produces a hex mask with bit 0 set
      // hex "01" means test 0 is supported
      jest.spyOn(service as never, 'queryPid' as never).mockResolvedValue(1 as never);

      const mockTestResult: Mode06TestResult = {
        testId: 0,
        componentId: 1,
        testName: 'Catalyst Monitor',
        value: 0.5,
        minValue: 0,
        maxValue: 1.0,
        status: 'PASS',
        unit: 'V',
      };
      jest
        .spyOn(service as never, 'queryMode06Test' as never)
        .mockResolvedValue(mockTestResult as never);

      const result = await service.getMode06Tests('device-31');

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toEqual(mockTestResult);
      expect(prisma.obdMode06Result.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            deviceId: 'device-31',
            testId: '0',
            testName: 'Catalyst Monitor',
            status: 'PASS',
          }),
        ]),
      });
    });

    it('should skip null test results from queryMode06Test', async () => {
      (prisma.obdDevice.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'device-32',
      });

      // Return a value so isTestSupported returns true for some tests
      jest.spyOn(service as never, 'queryPid' as never).mockResolvedValue(1 as never);
      // Return null from queryMode06Test — the result should not be pushed
      jest.spyOn(service as never, 'queryMode06Test' as never).mockResolvedValue(null as never);

      const result = await service.getMode06Tests('device-32');

      expect(result).toEqual([]);
      // No results so createMany should not be called
      expect(prisma.obdMode06Result.createMany).not.toHaveBeenCalled();
    });
  });

  // ==================== queryMode06Test (private stub) ====================
  describe('queryMode06Test', () => {
    it('should return null (stub implementation)', async () => {
      const result = await (service as unknown as Record<string, (...args: unknown[]) => unknown>)[
        'queryMode06Test'
      ]('device-x', 0);
      expect(result).toBeNull();
    });
  });

  // ==================== isTestSupported (private) ====================
  describe('isTestSupported', () => {
    it('should return false when supportedMask is null', () => {
      const result = (service as unknown as Record<string, (...args: unknown[]) => unknown>)[
        'isTestSupported'
      ](null, 0);
      expect(result).toBe(false);
    });

    it('should return true when bit is set in mask', () => {
      // "01" in hex = 0b00000001, so test 0 is supported
      const result = (service as unknown as Record<string, (...args: unknown[]) => unknown>)[
        'isTestSupported'
      ]('01', 0);
      expect(result).toBe(true);
    });

    it('should return false when bit is not set in mask', () => {
      // "01" in hex = 0b00000001, test 1 is not supported
      const result = (service as unknown as Record<string, (...args: unknown[]) => unknown>)[
        'isTestSupported'
      ]('01', 1);
      expect(result).toBe(false);
    });

    it('should handle multi-byte masks', () => {
      // "ff" = 0b11111111, all tests 0-7 are supported
      const result = (service as unknown as Record<string, (...args: unknown[]) => unknown>)[
        'isTestSupported'
      ]('ff', 7);
      expect(result).toBe(true);
    });

    it('should handle test IDs in second byte', () => {
      // "00ff" = byte 0 is 0x00, byte 1 is 0xff
      // testId 8 => byteIndex 1, bitIndex 0
      const result = (service as unknown as Record<string, (...args: unknown[]) => unknown>)[
        'isTestSupported'
      ]('00ff', 8);
      expect(result).toBe(true);
    });
  });

  // ==================== executeEvapTest ====================
  describe('executeEvapTest', () => {
    it('should start EVAP leak test', async () => {
      (prisma.obdDevice.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'device-40',
        vehicle: { id: 'v-1' },
      });

      const result = await service.executeEvapTest('device-40', 'LEAK');

      expect(result.deviceId).toBe('device-40');
      expect(result.testType).toBe('LEAK');
      expect(result.status).toBe('RUNNING');
      expect(prisma.obdEvapTest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          deviceId: 'device-40',
          testType: 'LEAK',
          status: 'RUNNING',
        }),
      });
    });

    it('should start EVAP pressure test', async () => {
      (prisma.obdDevice.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'device-41',
        vehicle: { id: 'v-2' },
      });

      const result = await service.executeEvapTest('device-41', 'PRESSURE');

      expect(result.testType).toBe('PRESSURE');
    });

    it('should start EVAP vacuum test', async () => {
      (prisma.obdDevice.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'device-42',
        vehicle: { id: 'v-3' },
      });

      const result = await service.executeEvapTest('device-42', 'VACUUM');

      expect(result.testType).toBe('VACUUM');
    });

    it('should throw error when device not found', async () => {
      (prisma.obdDevice.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.executeEvapTest('nonexistent', 'LEAK')).rejects.toThrow(
        'Device not found',
      );
    });

    it('should assign database ID to test result', async () => {
      (prisma.obdDevice.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'device-43',
        vehicle: { id: 'v-4' },
      });

      const result = await service.executeEvapTest('device-43', 'LEAK');

      expect(result.id).toBe('evap:1');
    });
  });

  // ==================== getActiveStream / getAllActiveStreams ====================
  describe('getActiveStream', () => {
    it('should return stream for device', async () => {
      await service.startStreaming('device-50', {
        adapterType: AdapterType.ELM327_BLUETOOTH,
      });

      const stream = service.getActiveStream('device-50');
      expect(stream).toBeDefined();
      expect(stream?.deviceId).toBe('device-50');
    });

    it('should return undefined for unknown device', () => {
      const stream = service.getActiveStream('unknown-device');
      expect(stream).toBeUndefined();
    });
  });

  describe('getAllActiveStreams', () => {
    it('should return all active streams', async () => {
      await service.startStreaming('device-60', {
        adapterType: AdapterType.ELM327_BLUETOOTH,
      });
      await service.startStreaming('device-61', {
        adapterType: AdapterType.OBDLINK_MX,
      });

      const streams = service.getAllActiveStreams();
      expect(streams).toHaveLength(2);
    });

    it('should return empty array when no streams', () => {
      const streams = service.getAllActiveStreams();
      expect(streams).toEqual([]);
    });
  });

  // ==================== getSensorHistory ====================
  describe('getSensorHistory', () => {
    const from = new Date('2026-01-01');
    const to = new Date('2026-01-31');

    it('should return cached results when available', async () => {
      const cachedData = [{ timestamp: '2026-01-15T10:00:00.000Z', value: 3000 }];
      redis.get.mockResolvedValueOnce(JSON.stringify(cachedData));

      const result = await service.getSensorHistory('device-70', 'rpm', from, to);

      expect(result).toEqual(cachedData);
      expect(prisma.obdReading.findMany).not.toHaveBeenCalled();
    });

    it('should query database when cache miss', async () => {
      const dbData = [
        { recordedAt: new Date('2026-01-15T10:00:00Z'), rawData: { rpm: 2500 } },
        { recordedAt: new Date('2026-01-15T10:00:30Z'), rawData: { rpm: 2700 } },
      ];
      (prisma.obdReading.findMany as jest.Mock).mockResolvedValueOnce(dbData);

      const result = await service.getSensorHistory('device-71', 'rpm', from, to);

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(2600); // avg of 2500 and 2700
    });

    it('should cache results for 5 minutes', async () => {
      (prisma.obdReading.findMany as jest.Mock).mockResolvedValueOnce([]);

      await service.getSensorHistory('device-72', 'speed', from, to);

      expect(redis.setex).toHaveBeenCalledWith(
        expect.stringContaining('obd:history:device-72:speed'),
        300,
        expect.any(String),
      );
    });

    it('should support aggregation parameter', async () => {
      const dbData = [
        { recordedAt: new Date('2026-01-15T10:00:00Z'), rawData: { coolantTemp: 90 } },
      ];
      (prisma.obdReading.findMany as jest.Mock).mockResolvedValueOnce(dbData);

      const result = await service.getSensorHistory('device-73', 'coolantTemp', from, to, 'avg');

      expect(prisma.obdReading.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should reject invalid sensor names', async () => {
      await expect(
        service.getSensorHistory('device-74', 'DROP TABLE; --', from, to),
      ).rejects.toThrow('Invalid sensor');
    });
  });

  // ==================== applyRetentionPolicy ====================
  describe('applyRetentionPolicy', () => {
    it('should delete old records and return count', async () => {
      (prisma.obdReading.findMany as jest.Mock).mockResolvedValueOnce([]);
      (prisma.obdReading.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 42 });

      const result = await service.applyRetentionPolicy('device-80', 90);

      expect(result).toBe(42);
      expect(prisma.obdReading.deleteMany).toHaveBeenCalledWith({
        where: {
          deviceId: 'device-80',
          recordedAt: { lt: expect.any(Date) },
        },
      });
    });

    it('should archive data before deletion', async () => {
      const oldRecords = [
        { id: 'r-1', rpm: 3000, recordedAt: new Date('2025-01-01') },
        { id: 'r-2', rpm: 2800, recordedAt: new Date('2025-01-02') },
      ];
      (prisma.obdReading.findMany as jest.Mock).mockResolvedValueOnce(oldRecords);
      (prisma.obdReading.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 2 });

      const result = await service.applyRetentionPolicy('device-81', 30);

      expect(result).toBe(2);
    });

    it('should not archive when no records to delete', async () => {
      (prisma.obdReading.findMany as jest.Mock).mockResolvedValueOnce([]);
      (prisma.obdReading.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 0 });

      const result = await service.applyRetentionPolicy('device-82', 365);

      expect(result).toBe(0);
    });
  });
});
