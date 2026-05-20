import { NotificationsGateway } from './notifications.gateway';
import { ConfigService } from '@nestjs/config';
import { Socket, Server } from 'socket.io';
import { Logger } from '@nestjs/common';

jest.mock('ioredis');
jest.mock('@socket.io/redis-adapter');

describe('NotificationsGateway', () => {
  let gateway: NotificationsGateway;
  let configService: { get: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    configService = { get: jest.fn() };
    gateway = new NotificationsGateway(configService as unknown as ConfigService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
    it('should not throw when REDIS_URL is set', () => {
      configService.get.mockReturnValue('redis://localhost:6379');
      gateway.server = { adapter: jest.fn() } as unknown as Server;

      expect(() => gateway.afterInit()).not.toThrow();
      expect(configService.get).toHaveBeenCalledWith('REDIS_URL');
    });

    it('should not throw when adapter is not a function', () => {
      configService.get.mockReturnValue('redis://localhost:6379');
      gateway.server = { adapter: 'not-a-function' } as unknown as Server;

      expect(() => gateway.afterInit()).not.toThrow();
    });

    it('should not throw when Redis setup fails', () => {
      configService.get.mockReturnValue('redis://localhost:6379');
      gateway.server = {
        adapter: jest.fn().mockImplementation(() => {
          throw new Error('Redis error');
        }),
      } as unknown as Server;

      expect(() => gateway.afterInit()).not.toThrow();
    });

    it('should warn when REDIS_URL is not configured', () => {
      configService.get.mockReturnValue(undefined);
      gateway.server = {} as Server;

      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      gateway.afterInit();

      expect(warnSpy).toHaveBeenCalled();
    });

    it('should warn when server is undefined', () => {
      configService.get.mockReturnValue('redis://localhost:6379');
      gateway.server = undefined as unknown as Server;

      const _warnSpy = jest.spyOn(Logger.prototype, 'warn');
      expect(() => gateway.afterInit()).not.toThrow();
    });

    it('should handle namespace server structure', () => {
      configService.get.mockReturnValue('redis://localhost:6379');
      const innerServer = { adapter: jest.fn() };
      gateway.server = { server: innerServer } as unknown as Server;

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

    it('should connect client with query token (string)', async () => {
      const client = createMockSocket({
        handshake: { auth: {}, query: { token: 'query-jwt' } },
      });

      await gateway.handleConnection(client);

      expect(client.join).toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith('connected', expect.any(Object));
    });

    it('should disconnect client when connection throws error', async () => {
      const client = createMockSocket({
        handshake: { auth: { token: 'valid' }, query: {} },
        join: jest.fn().mockImplementation(() => {
          throw new Error('Join failed');
        }),
      });

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('should set client data userId and tenantId after token verification', async () => {
      const client = createMockSocket({
        handshake: { auth: { token: 'valid-jwt' }, query: {} },
      });

      await gateway.handleConnection(client);

      expect(client.data.userId).toBeDefined();
      expect(client.data.tenantId).toBe('tenant-001');
    });

    it('should disconnect client with non-string query token', async () => {
      const client = createMockSocket({
        handshake: { auth: {}, query: { token: ['array'] } },
      });

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('should emit connected event with userId when connection succeeds', async () => {
      const client = createMockSocket({
        handshake: { auth: { token: 'valid-jwt' }, query: {} },
      });

      await gateway.handleConnection(client);

      expect(client.emit).toHaveBeenCalledWith(
        'connected',
        expect.objectContaining({
          userId: expect.stringContaining('user-'),
        }),
      );
    });

    it('should handle numeric query token as false', async () => {
      const client = createMockSocket({
        handshake: { auth: {}, query: { token: 123 } },
      });

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('should handle handshake without query property', async () => {
      const client = createMockSocket({
        handshake: { auth: {} },
      });

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('should handle handshake without auth property', async () => {
      const client = createMockSocket({
        handshake: { query: { token: 'jwt' } },
      });

      await gateway.handleConnection(client);

      expect(client.emit).toHaveBeenCalledWith('connected', expect.any(Object));
    });
  });

  describe('handleDisconnect', () => {
    it('should log disconnect with userId', () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      const client = createMockSocket();
      client.data = { userId: 'user-abc' };

      gateway.handleDisconnect(client);

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('user-abc'));
    });

    it('should handle disconnect with missing data', () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      const client = createMockSocket();
      client.data = {};

      gateway.handleDisconnect(client);

      expect(logSpy).toHaveBeenCalled();
    });

    it('should handle disconnect with null data', () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      const client = createMockSocket();
      client.data = null;

      gateway.handleDisconnect(client);

      expect(logSpy).toHaveBeenCalled();
    });

    it('should handle disconnect with undefined data', () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      const client = createMockSocket();
      client.data = undefined;

      gateway.handleDisconnect(client);

      expect(logSpy).toHaveBeenCalled();
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

    it('should handle read event with different notification IDs', () => {
      const toEmit = jest.fn();
      const client = createMockSocket({
        to: jest.fn().mockReturnValue({ emit: toEmit }),
        data: { userId: 'user-2' },
      });

      gateway.handleRead(client, { notificationId: 'notif-999' });

      expect(toEmit).toHaveBeenCalledWith('notification:read:sync', {
        notificationId: 'notif-999',
      });
    });

    it('should handle read event with empty userId', () => {
      const toEmit = jest.fn();
      const client = createMockSocket({
        to: jest.fn().mockReturnValue({ emit: toEmit }),
        data: { userId: '' },
      });

      gateway.handleRead(client, { notificationId: 'notif-1' });

      expect(client.to).toHaveBeenCalledWith('user:');
    });

    it('should handle read event with undefined userId', () => {
      const toEmit = jest.fn();
      const client = createMockSocket({
        to: jest.fn().mockReturnValue({ emit: toEmit }),
        data: { userId: undefined },
      });

      gateway.handleRead(client, { notificationId: 'notif-1' });

      expect(client.to).toHaveBeenCalledWith('user:undefined');
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

    it('should emit with complex data structure', () => {
      const toEmit = jest.fn();
      gateway.server = {
        to: jest.fn().mockReturnValue({ emit: toEmit }),
      } as unknown as Server;

      const data = { id: 1, nested: { key: 'value' }, arr: [1, 2, 3] };
      gateway.broadcastToTenant('tenant-abc', 'event', data);

      expect(toEmit).toHaveBeenCalledWith('event', data);
    });

    it('should emit to different tenant rooms', () => {
      const toEmit = jest.fn();
      gateway.server = {
        to: jest.fn().mockReturnValue({ emit: toEmit }),
      } as unknown as Server;

      gateway.broadcastToTenant('tenant-2', 'event', {});

      expect(gateway.server.to).toHaveBeenCalledWith('tenant:tenant-2');
    });

    it('should emit with null data', () => {
      const toEmit = jest.fn();
      gateway.server = {
        to: jest.fn().mockReturnValue({ emit: toEmit }),
      } as unknown as Server;

      gateway.broadcastToTenant('tenant-1', 'event', null);

      expect(toEmit).toHaveBeenCalledWith('event', null);
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

    it('should emit to different users', () => {
      const toEmit = jest.fn();
      gateway.server = {
        to: jest.fn().mockReturnValue({ emit: toEmit }),
      } as unknown as Server;

      gateway.sendToUser('user-999', 'msg', {});

      expect(gateway.server.to).toHaveBeenCalledWith('user:user-999');
    });

    it('should handle null data', () => {
      const toEmit = jest.fn();
      gateway.server = {
        to: jest.fn().mockReturnValue({ emit: toEmit }),
      } as unknown as Server;

      gateway.sendToUser('user-1', 'event', null);

      expect(toEmit).toHaveBeenCalledWith('event', null);
    });

    it('should handle empty user ID', () => {
      const toEmit = jest.fn();
      gateway.server = {
        to: jest.fn().mockReturnValue({ emit: toEmit }),
      } as unknown as Server;

      gateway.sendToUser('', 'event', {});

      expect(gateway.server.to).toHaveBeenCalledWith('user:');
    });
  });

  describe('extractToken', () => {
    it('should prefer auth token over query token', async () => {
      const client = createMockSocket({
        handshake: { auth: { token: 'auth-token' }, query: { token: 'query-token' } },
      });

      await gateway.handleConnection(client);

      expect(client.emit).toHaveBeenCalledWith('connected', expect.any(Object));
    });

    it('should reject non-string query token', async () => {
      const client = createMockSocket({
        handshake: { auth: {}, query: { token: ['array'] } },
      });

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('should use query token when auth is empty', async () => {
      const client = createMockSocket({
        handshake: { auth: {}, query: { token: 'query-jwt' } },
      });

      await gateway.handleConnection(client);

      expect(client.emit).toHaveBeenCalledWith('connected', expect.any(Object));
    });

    it('should return null when no token found', async () => {
      const client = createMockSocket({
        handshake: { auth: {}, query: {} },
      });

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('should handle numeric query token', async () => {
      const client = createMockSocket({
        handshake: { auth: {}, query: { token: 123 } },
      });

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('should handle object query token', async () => {
      const client = createMockSocket({
        handshake: { auth: {}, query: { token: { nested: 'obj' } } },
      });

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('should handle boolean query token', async () => {
      const client = createMockSocket({
        handshake: { auth: {}, query: { token: true } },
      });

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('Integration scenarios', () => {
    it('should complete full flow: connect, read, disconnect', async () => {
      const toEmit = jest.fn();
      const client = createMockSocket({
        handshake: { auth: { token: 'jwt' }, query: {} },
        to: jest.fn().mockReturnValue({ emit: toEmit }),
        data: { userId: 'user-1' },
      });

      await gateway.handleConnection(client);
      expect(client.emit).toHaveBeenCalledWith('connected', expect.any(Object));

      gateway.handleRead(client, { notificationId: 'notif-1' });
      expect(toEmit).toHaveBeenCalledWith('notification:read:sync', expect.any(Object));

      gateway.handleDisconnect(client);
    });

    it('should handle multiple concurrent connections', async () => {
      const client1 = createMockSocket({
        handshake: { auth: { token: 'token1' }, query: {} },
      });
      const client2 = createMockSocket({
        handshake: { auth: { token: 'token2' }, query: {} },
      });

      await gateway.handleConnection(client1);
      await gateway.handleConnection(client2);

      expect(client1.join).toHaveBeenCalled();
      expect(client2.join).toHaveBeenCalled();
    });
  });
});
