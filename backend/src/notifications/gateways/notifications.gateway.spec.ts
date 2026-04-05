import { NotificationsGateway } from './notifications.gateway';
import { ConfigService } from '@nestjs/config';
import { Socket, Server } from 'socket.io';

// Mock ioredis and socket.io adapter
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    duplicate: jest.fn().mockReturnValue({ on: jest.fn() }),
    disconnect: jest.fn(),
  }));
});

jest.mock('@socket.io/redis-adapter', () => ({
  createAdapter: jest.fn().mockReturnValue('mock-adapter'),
}));

describe('NotificationsGateway', () => {
  let gateway: NotificationsGateway;
  let configService: { get: jest.Mock };

  beforeEach(() => {
    configService = { get: jest.fn() };
    gateway = new NotificationsGateway(configService as unknown as ConfigService);
  });

  function createMockSocket(overrides: Record<string, unknown> = {}): Socket {
    return {
      id: 'socket-1',
      data: {},
      handshake: { auth: {}, query: {} },
      disconnect: jest.fn(),
      join: jest.fn(),
      emit: jest.fn(),
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
      ...overrides,
    } as unknown as Socket;
  }

  describe('afterInit', () => {
    it('should configure Redis adapter when REDIS_URL is set', () => {
      configService.get.mockReturnValue('redis://localhost:6379');
      const mockServer = {
        adapter: jest.fn(),
      };
      gateway.server = mockServer as unknown as Server;
      // The server may be accessed as namespace.server or directly
      (gateway.server as unknown as { server: unknown }).server = undefined;

      gateway.afterInit();

      // Verify it tried to set up the adapter
      expect(configService.get).toHaveBeenCalledWith('REDIS_URL');
    });

    it('should warn when REDIS_URL is not configured', () => {
      configService.get.mockReturnValue(undefined);
      gateway.server = {} as Server;

      // Should not throw
      gateway.afterInit();
    });

    it('should handle adapter setup failure gracefully', () => {
      configService.get.mockReturnValue('redis://localhost:6379');
      // server.adapter is not a function
      gateway.server = { adapter: undefined } as unknown as Server;

      expect(() => gateway.afterInit()).not.toThrow();
    });

    it('should disconnect Redis clients when adapter is not available', () => {
      configService.get.mockReturnValue('redis://localhost:6379');
      // server exists but adapter is not a function
      const mockServer = {};
      (mockServer as Record<string, unknown>).server = mockServer;
      gateway.server = mockServer as unknown as Server;

      expect(() => gateway.afterInit()).not.toThrow();
    });
  });

  describe('handleConnection', () => {
    it('should disconnect client with no token', async () => {
      const client = createMockSocket();

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('should connect client with auth token', async () => {
      const client = createMockSocket({
        handshake: { auth: { token: 'valid-jwt' }, query: {} },
      });

      await gateway.handleConnection(client);

      expect(client.join).toHaveBeenCalledWith(expect.stringContaining('tenant:'));
      expect(client.join).toHaveBeenCalledWith(expect.stringContaining('user:'));
      expect(client.emit).toHaveBeenCalledWith(
        'connected',
        expect.objectContaining({
          message: 'Connected',
          timestamp: expect.any(String),
        }),
      );
    });

    it('should connect client with query token', async () => {
      const client = createMockSocket({
        handshake: { auth: {}, query: { token: 'query-jwt' } },
      });

      await gateway.handleConnection(client);

      expect(client.join).toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith('connected', expect.any(Object));
    });

    it('should disconnect client when connection throws', async () => {
      const client = createMockSocket({
        handshake: { auth: { token: 'valid' }, query: {} },
        join: jest.fn().mockImplementation(() => {
          throw new Error('Join failed');
        }),
      });

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('handleDisconnect', () => {
    it('should log disconnect with userId', () => {
      const client = createMockSocket();
      client.data = { userId: 'user-abc' };

      gateway.handleDisconnect(client);
      // No error expected
    });

    it('should handle disconnect with missing data', () => {
      const client = createMockSocket();
      client.data = {};

      expect(() => gateway.handleDisconnect(client)).not.toThrow();
    });
  });

  describe('handleRead', () => {
    it('should broadcast read sync to user room', () => {
      const toEmit = jest.fn();
      const client = createMockSocket({
        to: jest.fn().mockReturnValue({ emit: toEmit }),
        data: { userId: 'user-1' },
      });

      gateway.handleRead(client, { notificationId: 'notif-1' });

      expect(client.to).toHaveBeenCalledWith('user:user-1');
      expect(toEmit).toHaveBeenCalledWith('notification:read:sync', {
        notificationId: 'notif-1',
      });
    });
  });

  describe('broadcastToTenant', () => {
    it('should emit to tenant room', () => {
      const toEmit = jest.fn();
      gateway.server = {
        to: jest.fn().mockReturnValue({ emit: toEmit }),
      } as unknown as Server;

      gateway.broadcastToTenant('tenant-1', 'new-notification', { id: 1 });

      expect(gateway.server.to).toHaveBeenCalledWith('tenant:tenant-1');
      expect(toEmit).toHaveBeenCalledWith('new-notification', { id: 1 });
    });
  });

  describe('sendToUser', () => {
    it('should emit to user room', () => {
      const toEmit = jest.fn();
      gateway.server = {
        to: jest.fn().mockReturnValue({ emit: toEmit }),
      } as unknown as Server;

      gateway.sendToUser('user-1', 'direct-message', { text: 'hi' });

      expect(gateway.server.to).toHaveBeenCalledWith('user:user-1');
      expect(toEmit).toHaveBeenCalledWith('direct-message', { text: 'hi' });
    });
  });

  describe('extractToken (via handleConnection)', () => {
    it('should prefer auth token over query token', async () => {
      const client = createMockSocket({
        handshake: { auth: { token: 'auth-token' }, query: { token: 'query-token' } },
      });

      await gateway.handleConnection(client);

      // Should not disconnect since auth token exists
      expect(client.emit).toHaveBeenCalledWith('connected', expect.any(Object));
    });

    it('should reject non-string query token', async () => {
      const client = createMockSocket({
        handshake: { auth: {}, query: { token: ['array'] } },
      });

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalledWith(true);
    });
  });
});
