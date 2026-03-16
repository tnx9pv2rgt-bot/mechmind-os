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
});
