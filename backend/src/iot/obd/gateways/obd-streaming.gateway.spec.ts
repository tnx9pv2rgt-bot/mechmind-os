import { ObdStreamingGateway } from './obd-streaming.gateway';
import { Socket, Server } from 'socket.io';
import { ObdStreamingService } from '../services/obd-streaming.service';
import { AdapterType, ObdProtocol, ObdSensorData } from '../interfaces/obd-streaming.interface';
import Redis from 'ioredis';

describe('ObdStreamingGateway', () => {
  let gateway: ObdStreamingGateway;
  let streamingService: Record<string, jest.Mock>;
  let redis: Record<string, jest.Mock>;
  let redisSubscriber: Record<string, jest.Mock>;

  beforeEach(() => {
    streamingService = {
      startStreaming: jest.fn(),
      stopStreaming: jest.fn(),
      getActiveStream: jest.fn(),
      processSensorData: jest.fn(),
      captureFreezeFrame: jest.fn(),
      getMode06Tests: jest.fn(),
      executeEvapTest: jest.fn(),
    };

    redisSubscriber = {
      on: jest.fn(),
      subscribe: jest.fn().mockResolvedValue(undefined),
      unsubscribe: jest.fn().mockResolvedValue(undefined),
    };

    redis = {
      get: jest.fn(),
      duplicate: jest.fn().mockReturnValue(redisSubscriber),
    };

    gateway = new ObdStreamingGateway(
      streamingService as unknown as ObdStreamingService,
      redis as unknown as Redis,
    );
    gateway.server = {} as Server;
  });

  function createMockSocket(id = 'sock-1', userData = { tenantId: 't1', userId: 'u1' }): Socket {
    return {
      id,
      data: { user: userData },
      emit: jest.fn(),
      disconnect: jest.fn(),
    } as unknown as Socket;
  }

  describe('afterInit', () => {
    it('should log initialization', () => {
      expect(() => gateway.afterInit({} as Server)).not.toThrow();
    });
  });

  describe('handleConnection', () => {
    it('should register client and emit connected', async () => {
      const client = createMockSocket('c1');

      await gateway.handleConnection(client);

      expect(client.emit).toHaveBeenCalledWith('connected', {
        message: 'Connected to OBD streaming gateway',
        clientId: 'c1',
      });
    });

    it('should disconnect client on error', async () => {
      const client = {
        id: 'c-err',
        data: { user: undefined },
        emit: jest.fn(),
        disconnect: jest.fn(),
      } as unknown as Socket;

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should clean up client and unsubscribe from devices', async () => {
      const client = createMockSocket('c-disc');
      await gateway.handleConnection(client);

      // Simulate subscribed device
      await gateway.handleSubscribeDevice(client, { deviceId: 'dev-1' });

      gateway.handleDisconnect(client);

      expect(redisSubscriber.unsubscribe).toHaveBeenCalledWith('obd:live:dev-1');
    });

    it('should handle disconnect for unknown client', () => {
      const client = createMockSocket('unknown');
      expect(() => gateway.handleDisconnect(client)).not.toThrow();
    });
  });

  describe('handleStartStreaming', () => {
    it('should start streaming and subscribe to device channel', async () => {
      const client = createMockSocket('c-stream');
      await gateway.handleConnection(client);

      streamingService.startStreaming.mockResolvedValue({
        id: 'stream-1',
        config: { interval: 1000 },
      });

      await gateway.handleStartStreaming(client, {
        deviceId: 'dev-1',
        adapterType: AdapterType.ELM327_USB,
        protocol: ObdProtocol.AUTO,
        sensors: ['RPM'],
        interval: 1000,
      });

      expect(streamingService.startStreaming).toHaveBeenCalledWith('t1', 'dev-1', {
        adapterType: 'ELM327_USB',
        protocol: 'AUTO',
        sensors: ['RPM'],
        interval: 1000,
      });
      expect(client.emit).toHaveBeenCalledWith('streaming-started', {
        streamId: 'stream-1',
        deviceId: 'dev-1',
        config: { interval: 1000 },
      });
    });

    it('should emit error when streaming fails', async () => {
      const client = createMockSocket('c-fail');
      await gateway.handleConnection(client);
      streamingService.startStreaming.mockRejectedValue(new Error('Device offline'));

      await gateway.handleStartStreaming(client, {
        deviceId: 'dev-off',
        adapterType: AdapterType.ELM327_USB,
      });

      expect(client.emit).toHaveBeenCalledWith('error', { message: 'Device offline' });
    });

    it('should return early if client not found', async () => {
      const client = createMockSocket('unknown');

      await gateway.handleStartStreaming(client, {
        deviceId: 'dev-1',
        adapterType: AdapterType.ELM327_USB,
      });

      expect(streamingService.startStreaming).not.toHaveBeenCalled();
    });
  });

  describe('handleStopStreaming', () => {
    it('should stop streaming and unsubscribe', async () => {
      const client = createMockSocket('c-stop');
      await gateway.handleConnection(client);
      await gateway.handleSubscribeDevice(client, { deviceId: 'dev-1' });

      streamingService.getActiveStream.mockReturnValue({ id: 'stream-1' });

      await gateway.handleStopStreaming(client, { streamId: 'stream-1' });

      expect(streamingService.stopStreaming).toHaveBeenCalledWith('t1', 'stream-1');
      expect(client.emit).toHaveBeenCalledWith('streaming-stopped', { streamId: 'stream-1' });
    });

    it('should emit error on failure', async () => {
      const client = createMockSocket('c-stop-err');
      await gateway.handleConnection(client);
      streamingService.stopStreaming.mockRejectedValue(new Error('Not found'));

      await gateway.handleStopStreaming(client, { streamId: 'bad-stream' });

      expect(client.emit).toHaveBeenCalledWith('error', { message: 'Not found' });
    });

    it('should return early if client not found', async () => {
      const client = createMockSocket('nope');

      await gateway.handleStopStreaming(client, { streamId: 's1' });

      expect(streamingService.stopStreaming).not.toHaveBeenCalled();
    });
  });

  describe('handleSubscribeDevice', () => {
    it('should subscribe and send latest reading if available', async () => {
      const client = createMockSocket('c-sub');
      await gateway.handleConnection(client);
      redis.get.mockResolvedValue(JSON.stringify({ rpm: 3000 }));

      await gateway.handleSubscribeDevice(client, { deviceId: 'dev-2' });

      expect(redisSubscriber.subscribe).toHaveBeenCalledWith('obd:live:dev-2');
      expect(client.emit).toHaveBeenCalledWith('sensor-data', { rpm: 3000 });
      expect(client.emit).toHaveBeenCalledWith('subscribed', { deviceId: 'dev-2' });
    });

    it('should subscribe without latest reading when none exists', async () => {
      const client = createMockSocket('c-sub2');
      await gateway.handleConnection(client);
      redis.get.mockResolvedValue(null);

      await gateway.handleSubscribeDevice(client, { deviceId: 'dev-3' });

      expect(client.emit).toHaveBeenCalledWith('subscribed', { deviceId: 'dev-3' });
      // Should NOT have emitted sensor-data (beyond the connected emit)
      const sensorDataCalls = (client.emit as jest.Mock).mock.calls.filter(
        (c: string[]) => c[0] === 'sensor-data',
      );
      expect(sensorDataCalls).toHaveLength(0);
    });

    it('should emit error on failure', async () => {
      const client = createMockSocket('c-sub-err');
      await gateway.handleConnection(client);
      redisSubscriber.subscribe.mockRejectedValue(new Error('Redis down'));

      await gateway.handleSubscribeDevice(client, { deviceId: 'dev-err' });

      expect(client.emit).toHaveBeenCalledWith('error', { message: 'Redis down' });
    });
  });

  describe('handleUnsubscribeDevice', () => {
    it('should unsubscribe from device', async () => {
      const client = createMockSocket('c-unsub');
      await gateway.handleConnection(client);

      await gateway.handleUnsubscribeDevice(client, { deviceId: 'dev-4' });

      expect(redisSubscriber.unsubscribe).toHaveBeenCalledWith('obd:live:dev-4');
      expect(client.emit).toHaveBeenCalledWith('unsubscribed', { deviceId: 'dev-4' });
    });

    it('should return early if client not found', async () => {
      const client = createMockSocket('unknown');

      await gateway.handleUnsubscribeDevice(client, { deviceId: 'dev-4' });

      expect(redisSubscriber.unsubscribe).not.toHaveBeenCalled();
    });

    it('should emit error on unsubscribe failure', async () => {
      const client = createMockSocket('c-unsub-err');
      await gateway.handleConnection(client);

      // Reset mock to track new calls
      (redisSubscriber.unsubscribe as jest.Mock).mockReset();
      (redisSubscriber.unsubscribe as jest.Mock).mockRejectedValue(new Error('Redis disconnected'));

      await gateway.handleUnsubscribeDevice(client, { deviceId: 'dev-err' });

      expect(client.emit).toHaveBeenCalledWith('error', { message: 'Redis disconnected' });
    });
  });

  describe('handleSensorData', () => {
    it('should process sensor data', async () => {
      const client = createMockSocket('c-data');
      const data = { pid: '010C', value: 3000, unit: 'RPM' };

      await gateway.handleSensorData(client, { streamId: 's1', data: data as ObdSensorData });

      expect(streamingService.processSensorData).toHaveBeenCalledWith('s1', data);
    });

    it('should emit error on failure', async () => {
      const client = createMockSocket('c-data-err');
      streamingService.processSensorData.mockRejectedValue(new Error('Processing failed'));

      await gateway.handleSensorData(client, { streamId: 's1', data: {} as ObdSensorData });

      expect(client.emit).toHaveBeenCalledWith('error', { message: 'Processing failed' });
    });
  });

  describe('handleCaptureFreezeFrame', () => {
    it('should capture and emit freeze frame', async () => {
      const client = createMockSocket('c-ff');
      await gateway.handleConnection(client);
      const freezeData = { dtcCode: 'P0301', data: {} };
      streamingService.captureFreezeFrame.mockResolvedValue(freezeData);

      await gateway.handleCaptureFreezeFrame(client, { deviceId: 'dev-5', dtcCode: 'P0301' });

      expect(streamingService.captureFreezeFrame).toHaveBeenCalledWith('t1', 'dev-5', 'P0301');
      expect(client.emit).toHaveBeenCalledWith('freeze-frame-captured', freezeData);
    });

    it('should return early if client not found', async () => {
      const client = createMockSocket('nope');

      await gateway.handleCaptureFreezeFrame(client, { deviceId: 'd', dtcCode: 'P0' });

      expect(streamingService.captureFreezeFrame).not.toHaveBeenCalled();
    });

    it('should emit error on freeze frame capture failure', async () => {
      const client = createMockSocket('c-ff-err');
      await gateway.handleConnection(client);
      streamingService.captureFreezeFrame.mockRejectedValueOnce(new Error('Device timeout'));

      await gateway.handleCaptureFreezeFrame(client, { deviceId: 'dev-timeout', dtcCode: 'P0401' });

      expect(client.emit).toHaveBeenCalledWith('error', { message: 'Device timeout' });
    });
  });

  describe('handleGetMode06Tests', () => {
    it('should get and emit mode06 results', async () => {
      const client = createMockSocket('c-m06');
      await gateway.handleConnection(client);
      const results = [{ testId: '01', value: 10 }];
      streamingService.getMode06Tests.mockResolvedValue(results);

      await gateway.handleGetMode06Tests(client, { deviceId: 'dev-6' });

      expect(client.emit).toHaveBeenCalledWith('mode06-results', {
        deviceId: 'dev-6',
        results,
      });
    });

    it('should return early if client not found', async () => {
      const client = createMockSocket('nope');

      await gateway.handleGetMode06Tests(client, { deviceId: 'd' });

      expect(streamingService.getMode06Tests).not.toHaveBeenCalled();
    });

    it('should emit error on mode06 test failure', async () => {
      const client = createMockSocket('c-m06-err');
      await gateway.handleConnection(client);
      streamingService.getMode06Tests.mockRejectedValueOnce(new Error('Test not supported'));

      await gateway.handleGetMode06Tests(client, { deviceId: 'dev-old' });

      expect(client.emit).toHaveBeenCalledWith('error', { message: 'Test not supported' });
    });
  });

  describe('handleExecuteEvapTest', () => {
    it('should execute and emit evap test', async () => {
      const client = createMockSocket('c-evap');
      await gateway.handleConnection(client);
      const testResult = { status: 'STARTED', testType: 'LEAK' };
      streamingService.executeEvapTest.mockResolvedValue(testResult);

      await gateway.handleExecuteEvapTest(client, { deviceId: 'dev-7', testType: 'LEAK' });

      expect(streamingService.executeEvapTest).toHaveBeenCalledWith('t1', 'dev-7', 'LEAK');
      expect(client.emit).toHaveBeenCalledWith('evap-test-started', testResult);
    });

    it('should return early if client not found', async () => {
      const client = createMockSocket('nope');

      await gateway.handleExecuteEvapTest(client, { deviceId: 'd', testType: 'LEAK' });

      expect(streamingService.executeEvapTest).not.toHaveBeenCalled();
    });

    it('should emit error on evap test execution failure', async () => {
      const client = createMockSocket('c-evap-err');
      await gateway.handleConnection(client);
      streamingService.executeEvapTest.mockRejectedValueOnce(new Error('Test in progress'));

      await gateway.handleExecuteEvapTest(client, { deviceId: 'dev-busy', testType: 'PRESSURE' });

      expect(client.emit).toHaveBeenCalledWith('error', { message: 'Test in progress' });
    });
  });

  describe('handleRequestSnapshot', () => {
    it('should return cached snapshot data', async () => {
      const client = createMockSocket('c-snap');
      redis.get.mockResolvedValue(JSON.stringify({ rpm: 2500 }));

      await gateway.handleRequestSnapshot(client, { deviceId: 'dev-8' });

      expect(client.emit).toHaveBeenCalledWith('snapshot', {
        deviceId: 'dev-8',
        data: { rpm: 2500 },
        timestamp: expect.any(Date),
      });
    });

    it('should return null data when no cache exists', async () => {
      const client = createMockSocket('c-snap2');
      redis.get.mockResolvedValue(null);

      await gateway.handleRequestSnapshot(client, { deviceId: 'dev-9' });

      expect(client.emit).toHaveBeenCalledWith('snapshot', {
        deviceId: 'dev-9',
        data: null,
        timestamp: expect.any(Date),
      });
    });

    it('should emit error on failure', async () => {
      const client = createMockSocket('c-snap-err');
      redis.get.mockRejectedValue(new Error('Redis timeout'));

      await gateway.handleRequestSnapshot(client, { deviceId: 'dev-err' });

      expect(client.emit).toHaveBeenCalledWith('error', { message: 'Redis timeout' });
    });
  });

  describe('setupRedisSubscription', () => {
    it('should broadcast messages to subscribed clients', async () => {
      // Get the message handler from the constructor
      const messageHandler = redisSubscriber.on.mock.calls.find(
        (c: string[]) => c[0] === 'message',
      )?.[1];
      expect(messageHandler).toBeDefined();

      // Register a client with a subscribed device
      const client = createMockSocket('c-redis');
      await gateway.handleConnection(client);
      await gateway.handleSubscribeDevice(client, { deviceId: 'dev-redis' });

      // Simulate Redis message
      messageHandler('obd:live:dev-redis', JSON.stringify({ rpm: 4000 }));

      expect(client.emit).toHaveBeenCalledWith('sensor-data', { rpm: 4000 });
    });

    it('should not broadcast to clients not subscribed to that device', async () => {
      const messageHandler = redisSubscriber.on.mock.calls.find(
        (c: string[]) => c[0] === 'message',
      )?.[1];

      const client = createMockSocket('c-other');
      await gateway.handleConnection(client);

      const emitCallsBefore = (client.emit as jest.Mock).mock.calls.length;
      messageHandler('obd:live:other-device', JSON.stringify({ rpm: 1000 }));

      // No new emit calls for sensor-data
      const sensorCalls = (client.emit as jest.Mock).mock.calls
        .slice(emitCallsBefore)
        .filter((c: string[]) => c[0] === 'sensor-data');
      expect(sensorCalls).toHaveLength(0);
    });
  });

  describe('handleStartStreaming - error handling branches', () => {
    it('should handle Error exception with non-Error message path', async () => {
      const client = createMockSocket('c-non-error');
      await gateway.handleConnection(client);
      // Throw a non-Error object to test the fallback path
      const fakeError: { toString: () => string; [key: string | symbol]: unknown } = {
        toString: () => 'Custom error object',
      };
      Object.defineProperty(fakeError, Symbol.toStringTag, { value: 'CustomError' });
      streamingService.startStreaming.mockRejectedValue(fakeError);

      await gateway.handleStartStreaming(client, {
        deviceId: 'dev-1',
        adapterType: AdapterType.ELM327_USB,
      });

      // Non-Error objects will hit the else branch of the ternary
      expect(client.emit).toHaveBeenCalledWith('error', {
        message: expect.any(String),
      });
    });
  });

  describe('handleDisconnect - unsubscribe with multiple devices', () => {
    it('should unsubscribe from all subscribed devices on disconnect', async () => {
      const client = createMockSocket('c-multi-unsub');
      await gateway.handleConnection(client);

      // Subscribe to multiple devices
      await gateway.handleSubscribeDevice(client, { deviceId: 'dev-a' });
      await gateway.handleSubscribeDevice(client, { deviceId: 'dev-b' });
      await gateway.handleSubscribeDevice(client, { deviceId: 'dev-c' });

      // Disconnect
      gateway.handleDisconnect(client);

      // Should have unsubscribed from all 3
      expect(redisSubscriber.unsubscribe).toHaveBeenCalledWith('obd:live:dev-a');
      expect(redisSubscriber.unsubscribe).toHaveBeenCalledWith('obd:live:dev-b');
      expect(redisSubscriber.unsubscribe).toHaveBeenCalledWith('obd:live:dev-c');
    });
  });

  describe('handleStopStreaming - device lookup edge cases', () => {
    it('should handle case when stream not found in any device', async () => {
      const client = createMockSocket('c-stream-notfound');
      await gateway.handleConnection(client);
      await gateway.handleSubscribeDevice(client, { deviceId: 'dev-x' });

      // getActiveStream returns nothing
      streamingService.getActiveStream.mockReturnValue(undefined);

      await gateway.handleStopStreaming(client, { streamId: 'nonexistent' });

      // Should not crash, and should emit streaming-stopped
      expect(client.emit).toHaveBeenCalledWith('streaming-stopped', { streamId: 'nonexistent' });
    });

    it('should only unsubscribe from the matching device', async () => {
      const client = createMockSocket('c-selective-unsub');
      await gateway.handleConnection(client);
      await gateway.handleSubscribeDevice(client, { deviceId: 'dev-1' });
      await gateway.handleSubscribeDevice(client, { deviceId: 'dev-2' });

      // Setup: dev-1 has stream-1, dev-2 has stream-2
      streamingService.getActiveStream.mockImplementation((_t, deviceId) => {
        if (deviceId === 'dev-1') {
          return { id: 'stream-1' } as never;
        }
        if (deviceId === 'dev-2') {
          return { id: 'stream-2' } as never;
        }
        return undefined;
      });

      await gateway.handleStopStreaming(client, { streamId: 'stream-1' });

      // Should only unsubscribe from dev-1
      expect(redisSubscriber.unsubscribe).toHaveBeenCalledWith('obd:live:dev-1');
    });
  });

  describe('Message format handling - JSON error branches', () => {
    it('should handle malformed JSON in Redis message subscription', async () => {
      const messageHandler = redisSubscriber.on.mock.calls.find(
        (c: string[]) => c[0] === 'message',
      )?.[1];
      expect(messageHandler).toBeDefined();

      const client = createMockSocket('c-malformed');
      await gateway.handleConnection(client);
      await gateway.handleSubscribeDevice(client, { deviceId: 'dev-bad' });

      // This will throw a JSON.parse error but should be caught in the message handler
      expect(() => {
        messageHandler('obd:live:dev-bad', 'invalid json {]');
      }).toThrow();
    });
  });
});
