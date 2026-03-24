import { Test, TestingModule } from '@nestjs/testing';
import { ObdStreamingController } from './obd-streaming.controller';
import { ObdStreamingService } from '../services/obd-streaming.service';

describe('ObdStreamingController', () => {
  let controller: ObdStreamingController;
  let service: jest.Mocked<ObdStreamingService>;

  const mockStream = {
    id: 'stream-001',
    deviceId: 'device-001',
    adapterType: 'ELM327',
    protocol: 'AUTO',
    isActive: true,
    startTime: new Date(),
    config: { sensors: ['RPM', 'SPEED'], interval: 500 },
  };

  const mockStreamResponse = {
    streamId: mockStream.id,
    deviceId: mockStream.deviceId,
    adapterType: mockStream.adapterType,
    protocol: mockStream.protocol,
    isActive: mockStream.isActive,
    startTime: mockStream.startTime,
    config: mockStream.config,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ObdStreamingController],
      providers: [
        {
          provide: ObdStreamingService,
          useValue: {
            startStreaming: jest.fn(),
            stopStreaming: jest.fn(),
            getAllActiveStreams: jest.fn(),
            getActiveStream: jest.fn(),
            captureFreezeFrame: jest.fn(),
            getMode06Tests: jest.fn(),
            executeEvapTest: jest.fn(),
            getSensorHistory: jest.fn(),
            applyRetentionPolicy: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ObdStreamingController>(ObdStreamingController);
    service = module.get(ObdStreamingService) as jest.Mocked<ObdStreamingService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('startStreaming', () => {
    it('should delegate to service and return stream response', async () => {
      service.startStreaming.mockResolvedValue(mockStream as never);
      const dto = {
        deviceId: 'device-001',
        adapterType: 'ELM327',
        protocol: 'AUTO',
        sensors: ['RPM', 'SPEED'],
        interval: 500,
      };

      const result = await controller.startStreaming('tenant-test', dto as never);

      expect(service.startStreaming).toHaveBeenCalledWith('tenant-test', 'device-001', {
        adapterType: 'ELM327',
        protocol: 'AUTO',
        sensors: ['RPM', 'SPEED'],
        interval: 500,
      });
      expect(result).toEqual(mockStreamResponse);
    });
  });

  describe('stopStreaming', () => {
    it('should delegate to service with stream id', async () => {
      service.stopStreaming.mockResolvedValue(undefined);

      await controller.stopStreaming('tenant-test', 'stream-001');

      expect(service.stopStreaming).toHaveBeenCalledWith('tenant-test', 'stream-001');
    });
  });

  describe('getActiveStreams', () => {
    it('should return all active streams mapped to response DTOs', async () => {
      service.getAllActiveStreams.mockReturnValue([mockStream, mockStream] as never);

      const result = await controller.getActiveStreams('tenant-test');

      expect(service.getAllActiveStreams).toHaveBeenCalledWith('tenant-test');
      expect(result).toEqual([mockStreamResponse, mockStreamResponse]);
    });

    it('should return empty array when no active streams', async () => {
      service.getAllActiveStreams.mockReturnValue([] as never);

      const result = await controller.getActiveStreams('tenant-test');

      expect(result).toEqual([]);
    });
  });

  describe('getDeviceStream', () => {
    it('should return stream response for active device', async () => {
      service.getActiveStream.mockReturnValue(mockStream as never);

      const result = await controller.getDeviceStream('tenant-test', 'device-001');

      expect(service.getActiveStream).toHaveBeenCalledWith('tenant-test', 'device-001');
      expect(result).toEqual(mockStreamResponse);
    });

    it('should return null when device has no active stream', async () => {
      service.getActiveStream.mockReturnValue(undefined as never);

      const result = await controller.getDeviceStream('tenant-test', 'device-999');

      expect(service.getActiveStream).toHaveBeenCalledWith('tenant-test', 'device-999');
      expect(result).toBeNull();
    });
  });

  describe('captureFreezeFrame', () => {
    it('should delegate to service and return freeze frame data', async () => {
      const mockFreezeFrame = {
        id: 'ff-001',
        deviceId: 'device-001',
        dtcCode: 'P0301',
        capturedAt: new Date(),
        data: { rpm: 2500, speed: 60 },
      };
      service.captureFreezeFrame.mockResolvedValue(mockFreezeFrame as never);

      const result = await controller.captureFreezeFrame('tenant-test', {
        deviceId: 'device-001',
        dtcCode: 'P0301',
      } as never);

      expect(service.captureFreezeFrame).toHaveBeenCalledWith('tenant-test', 'device-001', 'P0301');
      expect(result).toEqual({
        id: 'ff-001',
        deviceId: 'device-001',
        dtcCode: 'P0301',
        capturedAt: mockFreezeFrame.capturedAt,
        data: { rpm: 2500, speed: 60 },
      });
    });
  });

  describe('getMode06Tests', () => {
    it('should delegate to service and return test results', async () => {
      const mockResults = [{ testId: '01', value: 100, min: 0, max: 200, status: 'PASS' }];
      service.getMode06Tests.mockResolvedValue(mockResults as never);

      const result = await controller.getMode06Tests('tenant-test', 'device-001');

      expect(service.getMode06Tests).toHaveBeenCalledWith('tenant-test', 'device-001');
      expect(result).toEqual(mockResults);
    });
  });

  describe('executeEvapTest', () => {
    it('should delegate to service and return evap test response', async () => {
      const mockEvapTest = {
        id: 'evap-001',
        deviceId: 'device-001',
        testType: 'LEAK_TEST',
        startedAt: new Date(),
        completedAt: new Date(),
        status: 'COMPLETED',
        results: { passed: true },
      };
      service.executeEvapTest.mockResolvedValue(mockEvapTest as never);

      const result = await controller.executeEvapTest('tenant-test', {
        deviceId: 'device-001',
        testType: 'LEAK_TEST',
      } as never);

      expect(service.executeEvapTest).toHaveBeenCalledWith(
        'tenant-test',
        'device-001',
        'LEAK_TEST',
      );
      expect(result).toEqual({
        id: 'evap-001',
        deviceId: 'device-001',
        testType: 'LEAK_TEST',
        startedAt: mockEvapTest.startedAt,
        completedAt: mockEvapTest.completedAt,
        status: 'COMPLETED',
        results: { passed: true },
      });
    });
  });

  describe('getSensorHistory', () => {
    it('should delegate to service with parsed query params', async () => {
      const mockHistory = [
        { timestamp: new Date('2026-01-01T00:00:00Z'), value: 2500 },
        { timestamp: new Date('2026-01-01T00:01:00Z'), value: 2600 },
      ];
      service.getSensorHistory.mockResolvedValue(mockHistory as never);

      const query = {
        deviceId: 'device-001',
        sensor: 'RPM',
        from: '2026-01-01T00:00:00Z',
        to: '2026-01-01T01:00:00Z',
        aggregation: 'avg',
      };

      const result = await controller.getSensorHistory('tenant-test', query as never);

      expect(service.getSensorHistory).toHaveBeenCalledWith(
        'tenant-test',
        'device-001',
        'RPM',
        new Date('2026-01-01T00:00:00Z'),
        new Date('2026-01-01T01:00:00Z'),
        'avg',
      );
      expect(result).toEqual(mockHistory);
    });
  });

  describe('applyRetentionPolicy', () => {
    it('should delegate to service and return deleted count', async () => {
      service.applyRetentionPolicy.mockResolvedValue(42 as never);

      const result = await controller.applyRetentionPolicy('tenant-test', 'device-001', 30);

      expect(service.applyRetentionPolicy).toHaveBeenCalledWith('tenant-test', 'device-001', 30);
      expect(result).toEqual({ deleted: 42 });
    });
  });
});
