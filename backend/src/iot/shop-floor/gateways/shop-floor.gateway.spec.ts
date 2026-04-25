import { ShopFloorGateway } from './shop-floor.gateway';
import { Socket, Server } from 'socket.io';
import Redis from 'ioredis';

describe('ShopFloorGateway', () => {
  let gateway: ShopFloorGateway;
  let redis: Record<string, jest.Mock>;
  let redisSubscriber: Record<string, jest.Mock>;

  beforeEach(() => {
    redisSubscriber = {
      on: jest.fn(),
      subscribe: jest.fn().mockResolvedValue(undefined),
      unsubscribe: jest.fn().mockResolvedValue(undefined),
    };

    redis = {
      duplicate: jest.fn().mockReturnValue(redisSubscriber),
    };

    gateway = new ShopFloorGateway(redis as unknown as Redis);
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
      const client = createMockSocket('sf-1');

      await gateway.handleConnection(client);

      expect(client.emit).toHaveBeenCalledWith('connected', {
        message: 'Connected to shop floor gateway',
        clientId: 'sf-1',
      });
    });

    it('should disconnect client on error', async () => {
      const client = {
        id: 'sf-err',
        data: { user: undefined },
        emit: jest.fn(),
        disconnect: jest.fn(),
      } as unknown as Socket;

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should clean up and unsubscribe from bays', async () => {
      const client = createMockSocket('sf-disc');
      await gateway.handleConnection(client);
      await gateway.handleSubscribeBay(client, { bayId: 'bay-1' });

      gateway.handleDisconnect(client);

      expect(redisSubscriber.unsubscribe).toHaveBeenCalledWith('shopfloor:sensor:bay-1');
    });

    it('should handle disconnect for unknown client', () => {
      const client = createMockSocket('unknown');
      expect(() => gateway.handleDisconnect(client)).not.toThrow();
    });
  });

  describe('handleSubscribeBay', () => {
    it('should subscribe to bay channel', async () => {
      const client = createMockSocket('sf-sub');
      await gateway.handleConnection(client);

      await gateway.handleSubscribeBay(client, { bayId: 'bay-2' });

      expect(redisSubscriber.subscribe).toHaveBeenCalledWith('shopfloor:sensor:bay-2');
      expect(client.emit).toHaveBeenCalledWith('bay-subscribed', { bayId: 'bay-2' });
    });

    it('should return early if client not found', async () => {
      const client = createMockSocket('unknown');

      await gateway.handleSubscribeBay(client, { bayId: 'bay-2' });

      expect(redisSubscriber.subscribe).not.toHaveBeenCalled();
    });

    it('should emit error on failure', async () => {
      const client = createMockSocket('sf-sub-err');
      await gateway.handleConnection(client);
      redisSubscriber.subscribe.mockRejectedValue(new Error('Redis error'));

      await gateway.handleSubscribeBay(client, { bayId: 'bay-err' });

      expect(client.emit).toHaveBeenCalledWith('error', { message: 'Redis error' });
    });
  });

  describe('handleUnsubscribeBay', () => {
    it('should unsubscribe from bay channel', async () => {
      const client = createMockSocket('sf-unsub');
      await gateway.handleConnection(client);

      await gateway.handleUnsubscribeBay(client, { bayId: 'bay-3' });

      expect(redisSubscriber.unsubscribe).toHaveBeenCalledWith('shopfloor:sensor:bay-3');
      expect(client.emit).toHaveBeenCalledWith('bay-unsubscribed', { bayId: 'bay-3' });
    });

    it('should return early if client not found', async () => {
      const client = createMockSocket('unknown');

      await gateway.handleUnsubscribeBay(client, { bayId: 'bay-3' });

      expect(redisSubscriber.unsubscribe).not.toHaveBeenCalled();
    });

    it('should emit error on failure', async () => {
      const client = createMockSocket('sf-unsub-err');
      await gateway.handleConnection(client);
      redisSubscriber.unsubscribe.mockRejectedValue(new Error('fail'));

      await gateway.handleUnsubscribeBay(client, { bayId: 'bay-err' });

      expect(client.emit).toHaveBeenCalledWith('error', { message: 'fail' });
    });
  });

  describe('handleSubscribeTechnicians', () => {
    it('should subscribe to technicians channel', async () => {
      const client = createMockSocket('sf-tech');
      await gateway.handleConnection(client);

      await gateway.handleSubscribeTechnicians(client);

      expect(redisSubscriber.subscribe).toHaveBeenCalledWith('shopfloor:technicians');
      expect(client.emit).toHaveBeenCalledWith('technicians-subscribed', {});
    });

    it('should return early if client not found', async () => {
      const client = createMockSocket('unknown');

      await gateway.handleSubscribeTechnicians(client);

      expect(redisSubscriber.subscribe).not.toHaveBeenCalled();
    });

    it('should emit error on failure', async () => {
      const client = createMockSocket('sf-tech-err');
      await gateway.handleConnection(client);
      redisSubscriber.subscribe.mockRejectedValue(new Error('Redis fail'));

      await gateway.handleSubscribeTechnicians(client);

      expect(client.emit).toHaveBeenCalledWith('error', { message: 'Redis fail' });
    });
  });

  describe('handleSubscribeEvents', () => {
    it('should subscribe to events channel', async () => {
      const client = createMockSocket('sf-evt');
      await gateway.handleConnection(client);

      await gateway.handleSubscribeEvents(client);

      expect(redisSubscriber.subscribe).toHaveBeenCalledWith('shopfloor:events');
      expect(client.emit).toHaveBeenCalledWith('events-subscribed', {});
    });

    it('should return early if client not found', async () => {
      const client = createMockSocket('unknown');

      await gateway.handleSubscribeEvents(client);

      expect(redisSubscriber.subscribe).not.toHaveBeenCalled();
    });

    it('should emit error on failure', async () => {
      const client = createMockSocket('sf-evt-err');
      await gateway.handleConnection(client);
      redisSubscriber.subscribe.mockRejectedValue(new Error('fail'));

      await gateway.handleSubscribeEvents(client);

      expect(client.emit).toHaveBeenCalledWith('error', { message: 'fail' });
    });
  });

  describe('setupRedisSubscription', () => {
    let messageHandler: (channel: string, message: string) => void;

    beforeEach(() => {
      messageHandler = redisSubscriber.on.mock.calls.find((c: string[]) => c[0] === 'message')?.[1];
    });

    it('should broadcast sensor data to subscribed bay clients', async () => {
      const client = createMockSocket('sf-redis');
      await gateway.handleConnection(client);
      await gateway.handleSubscribeBay(client, { bayId: 'bay-10' });

      messageHandler('shopfloor:sensor:bay-10', JSON.stringify({ temp: 25 }));

      expect(client.emit).toHaveBeenCalledWith('sensor-reading', {
        bayId: 'bay-10',
        data: { temp: 25 },
      });
    });

    it('should not broadcast sensor data to unsubscribed clients', async () => {
      const client = createMockSocket('sf-redis2');
      await gateway.handleConnection(client);

      const emitBefore = (client.emit as jest.Mock).mock.calls.length;
      messageHandler('shopfloor:sensor:bay-99', JSON.stringify({ temp: 30 }));

      const sensorCalls = (client.emit as jest.Mock).mock.calls
        .slice(emitBefore)
        .filter((c: string[]) => c[0] === 'sensor-reading');
      expect(sensorCalls).toHaveLength(0);
    });

    it('should broadcast technician location to all clients', async () => {
      const client = createMockSocket('sf-tech-loc');
      await gateway.handleConnection(client);

      messageHandler('shopfloor:technicians', JSON.stringify({ techId: 't1', bay: 'A1' }));

      expect(client.emit).toHaveBeenCalledWith('technician-location', {
        techId: 't1',
        bay: 'A1',
      });
    });

    it('should broadcast shop floor events to all clients', async () => {
      const client = createMockSocket('sf-event');
      await gateway.handleConnection(client);

      messageHandler('shopfloor:events', JSON.stringify({ type: 'alert', message: 'Fire!' }));

      expect(client.emit).toHaveBeenCalledWith('shop-floor-event', {
        type: 'alert',
        message: 'Fire!',
      });
    });

    it('should ignore unknown channels', async () => {
      const client = createMockSocket('sf-unknown');
      await gateway.handleConnection(client);

      const emitBefore = (client.emit as jest.Mock).mock.calls.length;
      messageHandler('shopfloor:unknown', JSON.stringify({ data: 1 }));

      // No new emissions beyond the connected event
      const newCalls = (client.emit as jest.Mock).mock.calls.slice(emitBefore);
      expect(newCalls).toHaveLength(0);
    });
  });

  describe('Error handling - connection errors', () => {
    it('should handle connection error when user data is missing', async () => {
      const client = {
        id: 'sf-conn-err',
        data: { user: undefined },
        emit: jest.fn(),
        disconnect: jest.fn(),
      } as unknown as Socket;

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
    });
  });

  describe('Disconnect - multiple subscriptions', () => {
    it('should unsubscribe from all bays when client disconnects with multiple subscriptions', async () => {
      const client = createMockSocket('sf-multi-disconnect');
      await gateway.handleConnection(client);

      // Subscribe to multiple bays
      await gateway.handleSubscribeBay(client, { bayId: 'bay-1' });
      await gateway.handleSubscribeBay(client, { bayId: 'bay-2' });
      await gateway.handleSubscribeBay(client, { bayId: 'bay-3' });

      // Reset mock to track unsubscribe calls on disconnect
      (redisSubscriber.unsubscribe as jest.Mock).mockReset();

      gateway.handleDisconnect(client);

      expect(redisSubscriber.unsubscribe).toHaveBeenCalledWith('shopfloor:sensor:bay-1');
      expect(redisSubscriber.unsubscribe).toHaveBeenCalledWith('shopfloor:sensor:bay-2');
      expect(redisSubscriber.unsubscribe).toHaveBeenCalledWith('shopfloor:sensor:bay-3');
    });
  });

  describe('handleSubscribeBay/Unsubscribe - unknown client edge case', () => {
    it('should return early if client not found in handleSubscribeBay', async () => {
      const client = createMockSocket('unknown-client');
      const subscribeSpy = jest.spyOn(redisSubscriber, 'subscribe');

      await gateway.handleSubscribeBay(client, { bayId: 'bay-new' });

      expect(subscribeSpy).not.toHaveBeenCalled();
      subscribeSpy.mockRestore();
    });

    it('should return early if client not found in handleUnsubscribeBay', async () => {
      const client = createMockSocket('unknown-client2');
      const unsubscribeSpy = jest.spyOn(redisSubscriber, 'unsubscribe');

      await gateway.handleUnsubscribeBay(client, { bayId: 'bay-old' });

      expect(unsubscribeSpy).not.toHaveBeenCalled();
      unsubscribeSpy.mockRestore();
    });

    it('should return early if client not found in handleSubscribeTechnicians', async () => {
      const client = createMockSocket('unknown-client3');
      const subscribeSpy = jest.spyOn(redisSubscriber, 'subscribe');

      await gateway.handleSubscribeTechnicians(client);

      expect(subscribeSpy).not.toHaveBeenCalled();
      subscribeSpy.mockRestore();
    });

    it('should return early if client not found in handleSubscribeEvents', async () => {
      const client = createMockSocket('unknown-client4');
      const subscribeSpy = jest.spyOn(redisSubscriber, 'subscribe');

      await gateway.handleSubscribeEvents(client);

      expect(subscribeSpy).not.toHaveBeenCalled();
      subscribeSpy.mockRestore();
    });
  });
});
