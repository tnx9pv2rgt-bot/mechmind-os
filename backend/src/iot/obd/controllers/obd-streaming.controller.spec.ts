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

    it('should handle different adapter types', async () => {
      const stream = { ...mockStream, adapterType: 'VGATE' };
      service.startStreaming.mockResolvedValue(stream as never);
      const dto = {
        deviceId: 'device-002',
        adapterType: 'VGATE',
        protocol: 'CAN',
        sensors: ['TEMP'],
        interval: 1000,
      };

      const result = await controller.startStreaming('tenant-test', dto as never);

      expect(service.startStreaming).toHaveBeenCalledWith('tenant-test', 'device-002', {
        adapterType: 'VGATE',
        protocol: 'CAN',
        sensors: ['TEMP'],
        interval: 1000,
      });
      expect(result.adapterType).toBe('VGATE');
    });

    it('should propagate service errors', async () => {
      service.startStreaming.mockRejectedValue(new Error('Device not found'));
      const dto = {
        deviceId: 'device-bad',
        adapterType: 'ELM327',
        protocol: 'AUTO',
        sensors: [],
        interval: 500,
      };

      await expect(controller.startStreaming('tenant-test', dto as never)).rejects.toThrow(
        'Device not found',
      );
    });
  });

  describe('stopStreaming', () => {
    it('should delegate to service with stream id', async () => {
      service.stopStreaming.mockResolvedValue(undefined);

      await controller.stopStreaming('tenant-test', 'stream-001');

      expect(service.stopStreaming).toHaveBeenCalledWith('tenant-test', 'stream-001');
    });

    it('should propagate service errors', async () => {
      service.stopStreaming.mockRejectedValue(new Error('Stream not found'));

      await expect(controller.stopStreaming('tenant-test', 'stream-999')).rejects.toThrow(
        'Stream not found',
      );
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

    it('should handle different DTC codes', async () => {
      const mockFreezeFrame = {
        id: 'ff-002',
        deviceId: 'device-001',
        dtcCode: 'P0133',
        capturedAt: new Date(),
        data: { lambda: 0.8, timing: 10 },
      };
      service.captureFreezeFrame.mockResolvedValue(mockFreezeFrame as never);

      const result = await controller.captureFreezeFrame('tenant-test', {
        deviceId: 'device-001',
        dtcCode: 'P0133',
      } as never);

      expect(service.captureFreezeFrame).toHaveBeenCalledWith('tenant-test', 'device-001', 'P0133');
      expect(result.dtcCode).toBe('P0133');
    });

    it('should propagate service errors', async () => {
      service.captureFreezeFrame.mockRejectedValue(new Error('Capture failed'));

      await expect(
        controller.captureFreezeFrame('tenant-test', {
          deviceId: 'device-bad',
          dtcCode: 'P0000',
        } as never),
      ).rejects.toThrow('Capture failed');
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

    it('should handle multiple test results', async () => {
      const mockResults = [
        { testId: '01', value: 100, min: 0, max: 200, status: 'PASS' },
        { testId: '02', value: 50, min: 40, max: 100, status: 'PASS' },
        { testId: '03', value: 10, min: 0, max: 20, status: 'FAIL' },
      ];
      service.getMode06Tests.mockResolvedValue(mockResults as never);

      const result = await controller.getMode06Tests('tenant-test', 'device-001');

      expect(result).toHaveLength(3);
      /* eslint-disable @typescript-eslint/no-explicit-any */
      expect(result.some((r: any) => r.status === 'FAIL')).toBe(true);
      /* eslint-enable @typescript-eslint/no-explicit-any */
    });

    it('should handle empty results', async () => {
      service.getMode06Tests.mockResolvedValue([] as never);

      const result = await controller.getMode06Tests('tenant-test', 'device-001');

      expect(result).toEqual([]);
    });

    it('should propagate service errors', async () => {
      service.getMode06Tests.mockRejectedValue(new Error('Test retrieval failed'));

      await expect(controller.getMode06Tests('tenant-test', 'device-999')).rejects.toThrow(
        'Test retrieval failed',
      );
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

    it('should handle PURGE_CONTROL test type', async () => {
      const mockEvapTest = {
        id: 'evap-002',
        deviceId: 'device-001',
        testType: 'PURGE_CONTROL',
        startedAt: new Date(),
        completedAt: new Date(),
        status: 'COMPLETED',
        results: { passed: false, error: 'Below threshold' },
      };
      service.executeEvapTest.mockResolvedValue(mockEvapTest as never);

      const result = await controller.executeEvapTest('tenant-test', {
        deviceId: 'device-001',
        testType: 'PURGE_CONTROL',
      } as never);

      expect(service.executeEvapTest).toHaveBeenCalledWith(
        'tenant-test',
        'device-001',
        'PURGE_CONTROL',
      );
      expect((result.results as unknown as { passed: boolean }).passed).toBe(false);
    });

    it('should handle test in progress', async () => {
      const mockEvapTest = {
        id: 'evap-003',
        deviceId: 'device-001',
        testType: 'LEAK_TEST',
        startedAt: new Date(),
        completedAt: null,
        status: 'IN_PROGRESS',
        results: null,
      };
      service.executeEvapTest.mockResolvedValue(mockEvapTest as never);

      const result = await controller.executeEvapTest('tenant-test', {
        deviceId: 'device-001',
        testType: 'LEAK_TEST',
      } as never);

      expect(result.status).toBe('IN_PROGRESS');
    });

    it('should propagate service errors', async () => {
      service.executeEvapTest.mockRejectedValue(new Error('Test execution failed'));

      await expect(
        controller.executeEvapTest('tenant-test', {
          deviceId: 'device-bad',
          testType: 'LEAK_TEST',
        } as never),
      ).rejects.toThrow('Test execution failed');
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

    it('should handle different sensor types', async () => {
      const mockHistory = [{ timestamp: new Date('2026-01-01T00:00:00Z'), value: 85 }];
      service.getSensorHistory.mockResolvedValue(mockHistory as never);

      const query = {
        deviceId: 'device-001',
        sensor: 'SPEED',
        from: '2026-01-01T00:00:00Z',
        to: '2026-01-01T01:00:00Z',
        aggregation: 'max',
      };

      const result = await controller.getSensorHistory('tenant-test', query as never);

      expect(service.getSensorHistory).toHaveBeenCalledWith(
        'tenant-test',
        'device-001',
        'SPEED',
        new Date('2026-01-01T00:00:00Z'),
        new Date('2026-01-01T01:00:00Z'),
        'max',
      );
      expect(result).toHaveLength(1);
    });

    it('should handle different aggregations', async () => {
      const mockHistory = [{ timestamp: new Date('2026-01-01T00:00:00Z'), value: 50 }];
      service.getSensorHistory.mockResolvedValue(mockHistory as never);

      const query = {
        deviceId: 'device-001',
        sensor: 'TEMP',
        from: '2026-01-01T00:00:00Z',
        to: '2026-01-01T01:00:00Z',
        aggregation: 'min',
      };

      const result = await controller.getSensorHistory('tenant-test', query as never);

      expect(service.getSensorHistory).toHaveBeenCalledWith(
        'tenant-test',
        'device-001',
        'TEMP',
        new Date('2026-01-01T00:00:00Z'),
        new Date('2026-01-01T01:00:00Z'),
        'min',
      );
      expect(result).toEqual(mockHistory);
    });

    it('should propagate service errors', async () => {
      const query = {
        deviceId: 'device-001',
        sensor: 'RPM',
        from: '2026-01-01T00:00:00Z',
        to: '2026-01-01T01:00:00Z',
        aggregation: 'avg',
      };
      service.getSensorHistory.mockRejectedValue(new Error('History fetch failed'));

      await expect(controller.getSensorHistory('tenant-test', query as never)).rejects.toThrow(
        'History fetch failed',
      );
    });
  });

  describe('applyRetentionPolicy', () => {
    it('should delegate to service and return deleted count', async () => {
      service.applyRetentionPolicy.mockResolvedValue(42 as never);

      const result = await controller.applyRetentionPolicy('tenant-test', 'device-001', 30);

      expect(service.applyRetentionPolicy).toHaveBeenCalledWith('tenant-test', 'device-001', 30);
      expect(result).toEqual({ deleted: 42 });
    });

    it('should handle different retention periods', async () => {
      service.applyRetentionPolicy.mockResolvedValue(100 as never);

      const result = await controller.applyRetentionPolicy('tenant-test', 'device-001', 90);

      expect(service.applyRetentionPolicy).toHaveBeenCalledWith('tenant-test', 'device-001', 90);
      expect(result.deleted).toBe(100);
    });

    it('should handle no data to delete', async () => {
      service.applyRetentionPolicy.mockResolvedValue(0 as never);

      const result = await controller.applyRetentionPolicy('tenant-test', 'device-001', 1);

      expect(result).toEqual({ deleted: 0 });
    });

    it('should propagate service errors', async () => {
      service.applyRetentionPolicy.mockRejectedValue(new Error('Retention policy failed'));

      await expect(
        controller.applyRetentionPolicy('tenant-test', 'device-001', 30),
      ).rejects.toThrow('Retention policy failed');
    });
  });

  describe('startStreaming - sensor/protocol combinations', () => {
    it('should handle empty sensors array', async () => {
      service.startStreaming.mockResolvedValue(mockStream as never);
      const dto = {
        deviceId: 'device-001',
        adapterType: 'ELM327',
        protocol: 'AUTO',
        sensors: [],
        interval: 500,
      };

      const result = await controller.startStreaming('tenant-test', dto as never);

      expect(service.startStreaming).toHaveBeenCalledWith('tenant-test', 'device-001', {
        adapterType: 'ELM327',
        protocol: 'AUTO',
        sensors: [],
        interval: 500,
      });
      expect(result).toBeDefined();
    });

    it('should handle multiple sensors', async () => {
      service.startStreaming.mockResolvedValue(mockStream as never);
      const dto = {
        deviceId: 'device-002',
        adapterType: 'OBDLink',
        protocol: 'ISO-TP',
        sensors: ['RPM', 'SPEED', 'TEMP', 'FUEL', 'O2'],
        interval: 250,
      };

      const result = await controller.startStreaming('tenant-test', dto as never);

      expect(service.startStreaming).toHaveBeenCalledWith('tenant-test', 'device-002', {
        adapterType: 'OBDLink',
        protocol: 'ISO-TP',
        sensors: ['RPM', 'SPEED', 'TEMP', 'FUEL', 'O2'],
        interval: 250,
      });
      expect(result).toBeDefined();
    });
  });

  describe('getActiveStreams - multiple streams', () => {
    it('should return multiple active streams', async () => {
      const stream1 = { ...mockStream, id: 's1', deviceId: 'dev-1' };
      const stream2 = { ...mockStream, id: 's2', deviceId: 'dev-2' };
      const stream3 = { ...mockStream, id: 's3', deviceId: 'dev-3' };
      service.getAllActiveStreams.mockReturnValue([stream1, stream2, stream3] as never);

      const result = await controller.getActiveStreams('tenant-test');

      expect(result).toHaveLength(3);
      expect(result[0].streamId).toBe('s1');
      expect(result[1].streamId).toBe('s2');
      expect(result[2].streamId).toBe('s3');
    });
  });

  describe('getDeviceStream - null/undefined handling', () => {
    it('should return null when service returns undefined', async () => {
      service.getActiveStream.mockReturnValue(undefined as never);

      const result = await controller.getDeviceStream('tenant-test', 'device-offline');

      expect(result).toBeNull();
    });

    it('should return stream when service returns valid stream', async () => {
      service.getActiveStream.mockReturnValue(mockStream as never);

      const result = await controller.getDeviceStream('tenant-test', 'device-001');

      expect(result).toBeDefined();
      expect(result?.streamId).toBe('stream-001');
    });
  });

  describe('captureFreezeFrame - multiple DTC codes', () => {
    it('should handle P-series DTC codes', async () => {
      const dtcCodes = ['P0100', 'P0200', 'P0300', 'P0400', 'P0500'];

      for (const dtc of dtcCodes) {
        const mockFF = {
          id: `ff-${dtc}`,
          deviceId: 'device-001',
          dtcCode: dtc,
          capturedAt: new Date(),
          data: { rpm: 2500 },
        };
        service.captureFreezeFrame.mockResolvedValue(mockFF as never);

        const result = await controller.captureFreezeFrame('tenant-test', {
          deviceId: 'device-001',
          dtcCode: dtc,
        } as never);

        expect(result.dtcCode).toBe(dtc);
      }
    });

    it('should handle B and C series DTC codes', async () => {
      const mockFFB = {
        id: 'ff-b001',
        deviceId: 'device-001',
        dtcCode: 'B0100',
        capturedAt: new Date(),
        data: {},
      };
      service.captureFreezeFrame.mockResolvedValue(mockFFB as never);

      const result = await controller.captureFreezeFrame('tenant-test', {
        deviceId: 'device-001',
        dtcCode: 'B0100',
      } as never);

      expect(result.dtcCode).toBe('B0100');
    });
  });

  describe('getMode06Tests - empty/large results', () => {
    it('should handle single test result', async () => {
      const mockResults = [{ testId: '01', value: 150, min: 100, max: 200, status: 'PASS' }];
      service.getMode06Tests.mockResolvedValue(mockResults as never);

      const result = await controller.getMode06Tests('tenant-test', 'device-001');

      expect(result).toHaveLength(1);
      expect(result[0].testId).toBe('01');
    });

    it('should handle many test results', async () => {
      const mockResults = Array.from({ length: 50 }, (_, i) => ({
        testId: String(i + 1).padStart(2, '0'),
        value: Math.random() * 200,
        min: 0,
        max: 200,
        status: Math.random() > 0.2 ? 'PASS' : 'FAIL',
      }));
      service.getMode06Tests.mockResolvedValue(mockResults as never);

      const result = await controller.getMode06Tests('tenant-test', 'device-001');

      expect(result).toHaveLength(50);
    });
  });

  describe('executeEvapTest - different test types', () => {
    it('should handle PRESSURE test type', async () => {
      const mockEvap = {
        id: 'evap-pressure',
        deviceId: 'device-001',
        testType: 'PRESSURE',
        startedAt: new Date(),
        completedAt: new Date(),
        status: 'COMPLETED',
        results: { passed: true, value: 25.5 },
      };
      service.executeEvapTest.mockResolvedValue(mockEvap as never);

      const result = await controller.executeEvapTest('tenant-test', {
        deviceId: 'device-001',
        testType: 'PRESSURE',
      } as never);

      expect(result.testType).toBe('PRESSURE');
    });

    it('should handle test still in progress', async () => {
      const mockEvap = {
        id: 'evap-progress',
        deviceId: 'device-001',
        testType: 'LEAK_TEST',
        startedAt: new Date(),
        completedAt: null,
        status: 'IN_PROGRESS',
        results: null,
      };
      service.executeEvapTest.mockResolvedValue(mockEvap as never);

      const result = await controller.executeEvapTest('tenant-test', {
        deviceId: 'device-001',
        testType: 'LEAK_TEST',
      } as never);

      expect(result.status).toBe('IN_PROGRESS');
      expect(result.completedAt).toBeNull();
    });

    it('should handle test with failure results', async () => {
      const mockEvap = {
        id: 'evap-failed',
        deviceId: 'device-001',
        testType: 'LEAK_TEST',
        startedAt: new Date(),
        completedAt: new Date(),
        status: 'COMPLETED',
        results: { passed: false, error: 'Large leak detected' },
      };
      service.executeEvapTest.mockResolvedValue(mockEvap as never);

      const result = await controller.executeEvapTest('tenant-test', {
        deviceId: 'device-001',
        testType: 'LEAK_TEST',
      } as never);

      expect((result.results as unknown as Record<string, unknown>)?.passed).toBe(false);
    });
  });

  describe('getSensorHistory - aggregation variations', () => {
    it('should handle max aggregation', async () => {
      const mockHistory = [
        { timestamp: new Date('2026-01-01T00:00:00Z'), value: 3500 },
        { timestamp: new Date('2026-01-01T01:00:00Z'), value: 3800 },
      ];
      service.getSensorHistory.mockResolvedValue(mockHistory as never);

      const query = {
        deviceId: 'device-001',
        sensor: 'RPM',
        from: '2026-01-01T00:00:00Z',
        to: '2026-01-01T02:00:00Z',
        aggregation: 'max',
      };

      await controller.getSensorHistory('tenant-test', query as never);

      expect(service.getSensorHistory).toHaveBeenCalledWith(
        'tenant-test',
        'device-001',
        'RPM',
        expect.any(Date),
        expect.any(Date),
        'max',
      );
    });

    it('should handle min aggregation', async () => {
      const mockHistory = [{ timestamp: new Date('2026-01-01T00:00:00Z'), value: 500 }];
      service.getSensorHistory.mockResolvedValue(mockHistory as never);

      const query = {
        deviceId: 'device-001',
        sensor: 'RPM',
        from: '2026-01-01T00:00:00Z',
        to: '2026-01-01T02:00:00Z',
        aggregation: 'min',
      };

      await controller.getSensorHistory('tenant-test', query as never);

      expect(service.getSensorHistory).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(Date),
        expect.any(Date),
        'min',
      );
    });
  });

  describe('applyRetentionPolicy - edge cases', () => {
    it('should handle 1-day retention (minimum)', async () => {
      service.applyRetentionPolicy.mockResolvedValue(1000 as never);

      const result = await controller.applyRetentionPolicy('tenant-test', 'device-001', 1);

      expect(service.applyRetentionPolicy).toHaveBeenCalledWith('tenant-test', 'device-001', 1);
      expect(result.deleted).toBe(1000);
    });

    it('should handle 365-day retention (1 year)', async () => {
      service.applyRetentionPolicy.mockResolvedValue(50000 as never);

      const result = await controller.applyRetentionPolicy('tenant-test', 'device-001', 365);

      expect(service.applyRetentionPolicy).toHaveBeenCalledWith('tenant-test', 'device-001', 365);
      expect(result.deleted).toBe(50000);
    });

    it('should handle zero deleted records', async () => {
      service.applyRetentionPolicy.mockResolvedValue(0 as never);

      const result = await controller.applyRetentionPolicy('tenant-test', 'device-001', 7);

      expect(result.deleted).toBe(0);
    });
  });

  describe('stopStreaming - error propagation', () => {
    it('should propagate stream not found error', async () => {
      service.stopStreaming.mockRejectedValue(new Error('Stream does not exist'));

      await expect(controller.stopStreaming('tenant-test', 'stream-invalid')).rejects.toThrow(
        'Stream does not exist',
      );
    });

    it('should propagate permission error', async () => {
      service.stopStreaming.mockRejectedValue(
        new Error('Unauthorized: stream belongs to different tenant'),
      );

      await expect(controller.stopStreaming('tenant-test', 'stream-001')).rejects.toThrow(
        'Unauthorized',
      );
    });
  });
});
