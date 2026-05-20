import { ShutdownService } from './shutdown.service';
import { LoggerService } from './logger.service';
import { INestApplication } from '@nestjs/common';

describe('ShutdownService', () => {
  let service: ShutdownService;
  let loggerService: LoggerService;
  let mockApp: INestApplication;

  beforeEach(() => {
    loggerService = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as LoggerService;

    service = new ShutdownService(loggerService);

    mockApp = {
      close: jest.fn(),
    } as unknown as INestApplication;
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should start with shuttingDown = false', () => {
      expect(service.isShuttingDown).toBe(false);
    });

    it('should accept setApp call', () => {
      expect(() => {
        service.setApp(mockApp);
      }).not.toThrow();
    });
  });

  describe('happy path', () => {
    it('should set isShuttingDown to true on shutdown', async () => {
      await service.onApplicationShutdown('SIGTERM');
      expect(service.isShuttingDown).toBe(true);
    });

    it('should log shutdown message with signal', async () => {
      await service.onApplicationShutdown('SIGTERM');

      expect(loggerService.log).toHaveBeenCalledWith(
        'Shutdown initiated (signal: SIGTERM). Readiness probe now returns 503.',
      );
    });

    it('should handle SIGINT signal', async () => {
      await service.onApplicationShutdown('SIGINT');

      expect(loggerService.log).toHaveBeenCalledWith(
        'Shutdown initiated (signal: SIGINT). Readiness probe now returns 503.',
      );
      expect(service.isShuttingDown).toBe(true);
    });

    it('should handle other signals', async () => {
      await service.onApplicationShutdown('SIGHUP');

      expect(loggerService.log).toHaveBeenCalledWith(
        'Shutdown initiated (signal: SIGHUP). Readiness probe now returns 503.',
      );
      expect(service.isShuttingDown).toBe(true);
    });

    it('should persist shutting down state across multiple calls', async () => {
      expect(service.isShuttingDown).toBe(false);

      await service.onApplicationShutdown('SIGTERM');
      expect(service.isShuttingDown).toBe(true);

      // Call again - should still be true
      await service.onApplicationShutdown('SIGTERM');
      expect(service.isShuttingDown).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined signal', async () => {
      await service.onApplicationShutdown(undefined);

      expect(loggerService.log).toHaveBeenCalledWith(
        'Shutdown initiated (signal: unknown). Readiness probe now returns 503.',
      );
      expect(service.isShuttingDown).toBe(true);
    });

    it('should handle signal without onApplicationShutdown being called', () => {
      expect(service.isShuttingDown).toBe(false);
    });

    it('should allow multiple setApp calls', () => {
      const mockApp2 = { close: jest.fn() } as unknown as INestApplication;

      expect(() => {
        service.setApp(mockApp);
        service.setApp(mockApp2);
      }).not.toThrow();
    });

    it('should handle setApp with null', () => {
      expect(() => {
        service.setApp(null as unknown as INestApplication);
      }).not.toThrow();
    });
  });

  describe('readiness probe behavior', () => {
    it('should return false for healthy status', () => {
      expect(service.isShuttingDown).toBe(false);
    });

    it('should return true after shutdown initiated', async () => {
      expect(service.isShuttingDown).toBe(false);
      await service.onApplicationShutdown('SIGTERM');
      expect(service.isShuttingDown).toBe(true);
    });

    it('should indicate graceful shutdown state', async () => {
      // Simulate readiness probe checking before shutdown
      expect(service.isShuttingDown).toBe(false);

      // Shutdown signal received
      await service.onApplicationShutdown('SIGTERM');

      // Readiness probe should now return 503
      expect(service.isShuttingDown).toBe(true);
    });
  });

  describe('logger integration', () => {
    it('should call logger.log with proper format', async () => {
      const signal = 'SIGTERM';
      await service.onApplicationShutdown(signal);

      expect(loggerService.log).toHaveBeenCalledTimes(1);
      const logCall = (loggerService.log as jest.Mock).mock.calls[0][0];
      expect(logCall).toContain('Shutdown initiated');
      expect(logCall).toContain('SIGTERM');
      expect(logCall).toContain('Readiness probe now returns 503');
    });

    it('should log different signals differently', async () => {
      const signals = ['SIGTERM', 'SIGINT', 'SIGHUP'];

      for (const signal of signals) {
        const newService = new ShutdownService(loggerService);
        await newService.onApplicationShutdown(signal);

        const lastCall = (loggerService.log as jest.Mock).mock.calls[
          (loggerService.log as jest.Mock).mock.calls.length - 1
        ][0];
        expect(lastCall).toContain(signal);
      }
    });
  });

  describe('concurrent access', () => {
    it('should handle concurrent getter calls', async () => {
      await service.onApplicationShutdown('SIGTERM');

      const results = await Promise.all([
        Promise.resolve(service.isShuttingDown),
        Promise.resolve(service.isShuttingDown),
        Promise.resolve(service.isShuttingDown),
      ]);

      expect(results).toEqual([true, true, true]);
    });
  });

  describe('lifecycle', () => {
    it('should follow shutdown lifecycle', async () => {
      // 1. App is running
      expect(service.isShuttingDown).toBe(false);

      // 2. App receives shutdown signal
      await service.onApplicationShutdown('SIGTERM');
      expect(service.isShuttingDown).toBe(true);

      // 3. Readiness probe immediately starts returning 503
      expect(service.isShuttingDown).toBe(true);

      // 4. Logger has been notified
      expect(loggerService.log).toHaveBeenCalled();
    });
  });
});
