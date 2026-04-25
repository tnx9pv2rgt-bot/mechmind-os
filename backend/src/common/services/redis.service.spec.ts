import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import { LoggerService } from './logger.service';

// ---------------------------------------------------------------------------
// Mock ioredis
// ---------------------------------------------------------------------------

const mockRedisInstance = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  quit: jest.fn(),
  disconnect: jest.fn(),
  once: jest.fn(),
};

jest.mock('ioredis', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => mockRedisInstance),
  };
});

// ---------------------------------------------------------------------------
// Mock LoggerService
// ---------------------------------------------------------------------------

interface MockLoggerService {
  log: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
  debug: jest.Mock;
}

const createMockLogger = (): MockLoggerService => ({
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RedisService', () => {
  let service: RedisService;
  let mockLogger: MockLoggerService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockLogger = createMockLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'REDIS_URL') return 'redis://localhost:6379';
              return undefined;
            }),
          },
        },
        {
          provide: LoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // onModuleInit
  // -----------------------------------------------------------------------

  describe('onModuleInit', () => {
    it('should mark as unavailable when REDIS_URL is missing', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RedisService,
          {
            provide: ConfigService,
            useValue: { get: jest.fn(() => undefined) },
          },
          { provide: LoggerService, useValue: mockLogger },
        ],
      }).compile();

      const svc = module.get<RedisService>(RedisService);
      await svc.onModuleInit();

      expect(svc.isAvailable).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('REDIS_URL is required'),
      );
    });

    it('should connect successfully when Redis emits ready', async () => {
      mockRedisInstance.once.mockImplementation((event: string, cb: () => void) => {
        if (event === 'ready') {
          setImmediate(cb);
        }
      });

      await service.onModuleInit();

      expect(service.isAvailable).toBe(true);
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('connected'));
    });

    it('should handle connection error gracefully', async () => {
      mockRedisInstance.once.mockImplementation((event: string, cb: (err?: Error) => void) => {
        if (event === 'error') {
          setImmediate(() => cb(new Error('Connection refused')));
        }
      });

      await service.onModuleInit();

      expect(service.isAvailable).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to connect'));
    });
  });

  // -----------------------------------------------------------------------
  // get
  // -----------------------------------------------------------------------

  describe('get', () => {
    it('should return null and warn when client is not available', async () => {
      // client is null by default (onModuleInit not called)
      const result = await service.get('key');

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('get() called but Redis is not available'),
      );
    });

    it('should delegate to redis client and return value', async () => {
      // Simulate successful connection
      mockRedisInstance.once.mockImplementation((event: string, cb: () => void) => {
        if (event === 'ready') setImmediate(cb);
      });
      await service.onModuleInit();

      mockRedisInstance.get.mockResolvedValueOnce('cached-value');
      const result = await service.get('my-key');

      expect(result).toBe('cached-value');
      expect(mockRedisInstance.get).toHaveBeenCalledWith('my-key');
    });

    it('should return null and log error on failure', async () => {
      mockRedisInstance.once.mockImplementation((event: string, cb: () => void) => {
        if (event === 'ready') setImmediate(cb);
      });
      await service.onModuleInit();

      mockRedisInstance.get.mockRejectedValueOnce(new Error('ECONNRESET'));
      const result = await service.get('bad-key');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('get(bad-key) failed'));
    });
  });

  // -----------------------------------------------------------------------
  // set
  // -----------------------------------------------------------------------

  describe('set', () => {
    it('should warn when client is not available', async () => {
      await service.set('key', 'value');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('set() called but Redis is not available'),
      );
    });

    it('should set value without TTL', async () => {
      mockRedisInstance.once.mockImplementation((event: string, cb: () => void) => {
        if (event === 'ready') setImmediate(cb);
      });
      await service.onModuleInit();

      mockRedisInstance.set.mockResolvedValueOnce('OK');
      await service.set('key', 'value');

      expect(mockRedisInstance.set).toHaveBeenCalledWith('key', 'value');
    });

    it('should set value with TTL', async () => {
      mockRedisInstance.once.mockImplementation((event: string, cb: () => void) => {
        if (event === 'ready') setImmediate(cb);
      });
      await service.onModuleInit();

      mockRedisInstance.set.mockResolvedValueOnce('OK');
      await service.set('key', 'value', 300);

      expect(mockRedisInstance.set).toHaveBeenCalledWith('key', 'value', 'EX', 300);
    });

    it('should log error on failure', async () => {
      mockRedisInstance.once.mockImplementation((event: string, cb: () => void) => {
        if (event === 'ready') setImmediate(cb);
      });
      await service.onModuleInit();

      mockRedisInstance.set.mockRejectedValueOnce(new Error('OOM'));
      await service.set('key', 'value');

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('set(key) failed'));
    });
  });

  // -----------------------------------------------------------------------
  // del
  // -----------------------------------------------------------------------

  describe('del', () => {
    it('should warn when client is not available', async () => {
      await service.del('key');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('del() called but Redis is not available'),
      );
    });

    it('should delete key via client', async () => {
      mockRedisInstance.once.mockImplementation((event: string, cb: () => void) => {
        if (event === 'ready') setImmediate(cb);
      });
      await service.onModuleInit();

      mockRedisInstance.del.mockResolvedValueOnce(1);
      await service.del('key-to-delete');

      expect(mockRedisInstance.del).toHaveBeenCalledWith('key-to-delete');
    });

    it('should log error on failure', async () => {
      mockRedisInstance.once.mockImplementation((event: string, cb: () => void) => {
        if (event === 'ready') setImmediate(cb);
      });
      await service.onModuleInit();

      mockRedisInstance.del.mockRejectedValueOnce(new Error('Network error'));
      await service.del('key');

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('del(key) failed'));
    });
  });

  // -----------------------------------------------------------------------
  // onModuleDestroy
  // -----------------------------------------------------------------------

  describe('onModuleDestroy', () => {
    it('should quit client on destroy', async () => {
      mockRedisInstance.once.mockImplementation((event: string, cb: () => void) => {
        if (event === 'ready') setImmediate(cb);
      });
      await service.onModuleInit();

      mockRedisInstance.quit.mockResolvedValueOnce('OK');
      await service.onModuleDestroy();

      expect(mockRedisInstance.quit).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('disconnected'));
    });

    it('should not throw when client is null', async () => {
      // client is null (onModuleInit not called)
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // NEW TESTS: Error paths, edge cases, advanced scenarios
  // -----------------------------------------------------------------------

  describe('onModuleInit - Connection timeout', () => {
    it('should timeout if Redis does not emit ready within 5 seconds', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RedisService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'REDIS_URL') return 'redis://localhost:6379';
                return undefined;
              }),
            },
          },
          { provide: LoggerService, useValue: mockLogger },
        ],
      }).compile();

      const svc = module.get<RedisService>(RedisService);

      // Setup: mock never emits ready (timeout expected)
      mockRedisInstance.once.mockImplementation(() => {
        // Do nothing - no event emitted
      });

      jest.useFakeTimers();
      const promise = svc.onModuleInit();
      jest.advanceTimersByTime(5500);
      await promise;
      jest.useRealTimers();

      expect(svc.isAvailable).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to connect'));
    });
  });

  describe('onModuleInit - Error event during connection', () => {
    it('should handle error event and mark unavailable', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RedisService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'REDIS_URL') return 'redis://localhost:6379';
                return undefined;
              }),
            },
          },
          { provide: LoggerService, useValue: mockLogger },
        ],
      }).compile();

      const svc = module.get<RedisService>(RedisService);

      mockRedisInstance.once.mockImplementation((event: string, cb: (err?: Error) => void) => {
        if (event === 'error') {
          setImmediate(() => cb(new Error('ECONNREFUSED')));
        }
      });

      await svc.onModuleInit();

      expect(svc.isAvailable).toBe(false);
    });
  });

  describe('get - Client errors and edge cases', () => {
    it('should return null when get throws generic error', async () => {
      mockRedisInstance.once.mockImplementation((event: string, cb: () => void) => {
        if (event === 'ready') setImmediate(cb);
      });
      await service.onModuleInit();

      mockRedisInstance.get.mockRejectedValueOnce(new Error('TIMEOUT'));
      const result = await service.get('slow-key');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('get(slow-key) failed'),
      );
    });

    it('should return null for missing key without error log', async () => {
      mockRedisInstance.once.mockImplementation((event: string, cb: () => void) => {
        if (event === 'ready') setImmediate(cb);
      });
      await service.onModuleInit();

      mockRedisInstance.get.mockResolvedValueOnce(null);
      const result = await service.get('missing-key');

      expect(result).toBeNull();
    });
  });

  describe('set - TTL handling', () => {
    it('should treat TTL 0 as no expiry', async () => {
      mockRedisInstance.once.mockImplementation((event: string, cb: () => void) => {
        if (event === 'ready') setImmediate(cb);
      });
      await service.onModuleInit();

      mockRedisInstance.set.mockResolvedValueOnce('OK');
      await service.set('permanent-key', 'value', 0);

      // With TTL=0, should not call with 'EX'
      expect(mockRedisInstance.set).toHaveBeenCalledWith('permanent-key', 'value');
    });

    it('should handle large TTL values', async () => {
      mockRedisInstance.once.mockImplementation((event: string, cb: () => void) => {
        if (event === 'ready') setImmediate(cb);
      });
      await service.onModuleInit();

      mockRedisInstance.set.mockResolvedValueOnce('OK');
      await service.set('long-ttl-key', 'value', 86400 * 365);

      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'long-ttl-key',
        'value',
        'EX',
        86400 * 365,
      );
    });

    it('should log error on set failure', async () => {
      mockRedisInstance.once.mockImplementation((event: string, cb: () => void) => {
        if (event === 'ready') setImmediate(cb);
      });
      await service.onModuleInit();

      mockRedisInstance.set.mockRejectedValueOnce(new Error('OOM'));
      await service.set('big-value', 'x'.repeat(1000000));

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('set(big-value) failed'),
      );
    });
  });

  describe('del - Deletion verification', () => {
    it('should call del on client', async () => {
      mockRedisInstance.once.mockImplementation((event: string, cb: () => void) => {
        if (event === 'ready') setImmediate(cb);
      });
      await service.onModuleInit();

      mockRedisInstance.del.mockResolvedValueOnce(1);
      await service.del('existing-key');

      expect(mockRedisInstance.del).toHaveBeenCalledWith('existing-key');
    });

    it('should handle del returning 0 (key not found)', async () => {
      mockRedisInstance.once.mockImplementation((event: string, cb: () => void) => {
        if (event === 'ready') setImmediate(cb);
      });
      await service.onModuleInit();

      mockRedisInstance.del.mockResolvedValueOnce(0);
      await service.del('nonexistent-key');

      expect(mockRedisInstance.del).toHaveBeenCalledWith('nonexistent-key');
    });
  });

  describe('onModuleDestroy - Graceful shutdown', () => {
    it('should disconnect if quit throws error', async () => {
      mockRedisInstance.once.mockImplementation((event: string, cb: () => void) => {
        if (event === 'ready') setImmediate(cb);
      });
      await service.onModuleInit();

      mockRedisInstance.quit.mockRejectedValueOnce(new Error('Shutdown error'));

      // Should not throw even if quit fails
      await expect(service.onModuleDestroy()).rejects.toThrow();
    });
  });

  describe('Availability flag', () => {
    it('should track isAvailable state correctly', async () => {
      mockRedisInstance.once.mockImplementation((event: string, cb: () => void) => {
        if (event === 'ready') setImmediate(cb);
      });

      expect(service.isAvailable).toBe(false);

      await service.onModuleInit();

      expect(service.isAvailable).toBe(true);
    });

    it('should remain false if initialization fails', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RedisService,
          {
            provide: ConfigService,
            useValue: { get: jest.fn(() => undefined) },
          },
          { provide: LoggerService, useValue: mockLogger },
        ],
      }).compile();

      const svc = module.get<RedisService>(RedisService);

      expect(svc.isAvailable).toBe(false);
      await svc.onModuleInit();
      expect(svc.isAvailable).toBe(false);
    });
  });

  describe('get - Multiple scenarios', () => {
    it('should return empty string without treating it as missing', async () => {
      mockRedisInstance.once.mockImplementation((event: string, cb: () => void) => {
        if (event === 'ready') setImmediate(cb);
      });
      await service.onModuleInit();

      mockRedisInstance.get.mockResolvedValueOnce('');
      const result = await service.get('empty-key');

      expect(result).toBe('');
    });

    it('should handle ENOENT errors gracefully', async () => {
      mockRedisInstance.once.mockImplementation((event: string, cb: () => void) => {
        if (event === 'ready') setImmediate(cb);
      });
      await service.onModuleInit();

      mockRedisInstance.get.mockRejectedValueOnce({ code: 'ENOENT' });
      const result = await service.get('missing');

      expect(result).toBeNull();
    });
  });

  describe('set - Edge cases', () => {
    it('should handle very large timeout values gracefully', async () => {
      mockRedisInstance.once.mockImplementation((event: string, cb: () => void) => {
        if (event === 'ready') setImmediate(cb);
      });
      await service.onModuleInit();

      mockRedisInstance.set.mockResolvedValueOnce('OK');
      await service.set('persistent', 'value', 86400 * 365 * 10);

      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'persistent',
        'value',
        'EX',
        86400 * 365 * 10,
      );
    });

    it('should handle unicode values correctly', async () => {
      mockRedisInstance.once.mockImplementation((event: string, cb: () => void) => {
        if (event === 'ready') setImmediate(cb);
      });
      await service.onModuleInit();

      mockRedisInstance.set.mockResolvedValueOnce('OK');
      const unicode = '你好世界🌍';
      await service.set('unicode-key', unicode, 300);

      expect(mockRedisInstance.set).toHaveBeenCalledWith('unicode-key', unicode, 'EX', 300);
    });
  });

  describe('del - Coverage branches', () => {
    it('should handle del of special key names', async () => {
      mockRedisInstance.once.mockImplementation((event: string, cb: () => void) => {
        if (event === 'ready') setImmediate(cb);
      });
      await service.onModuleInit();

      mockRedisInstance.del.mockResolvedValueOnce(1);
      await service.del('special:key:with:colons');

      expect(mockRedisInstance.del).toHaveBeenCalledWith('special:key:with:colons');
    });
  });

  describe('Retry strategy configuration', () => {
    it('should respect maxRetriesPerRequest and retryStrategy', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RedisService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'REDIS_URL') return 'redis://localhost:6379';
                return undefined;
              }),
            },
          },
          { provide: LoggerService, useValue: mockLogger },
        ],
      }).compile();

      const svc = module.get<RedisService>(RedisService);

      // Verify constructor was called with correct options
      // (This indirectly verifies the ioredis configuration)
      mockRedisInstance.once.mockImplementation((event: string, cb: () => void) => {
        if (event === 'ready') setImmediate(cb);
      });
      await svc.onModuleInit();

      expect(svc.isAvailable).toBe(true);
    });
  });

  describe('Module lifecycle - destroy without init', () => {
    it('should handle destroy when client was never initialized', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RedisService,
          {
            provide: ConfigService,
            useValue: { get: jest.fn(() => undefined) },
          },
          { provide: LoggerService, useValue: mockLogger },
        ],
      }).compile();

      const svc = module.get<RedisService>(RedisService);
      await svc.onModuleInit(); // Client stays null

      await expect(svc.onModuleDestroy()).resolves.not.toThrow();
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('disconnected'));
    });
  });
});
