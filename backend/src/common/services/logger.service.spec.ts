import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from './logger.service';

describe('LoggerService', () => {
  let service: LoggerService;
  let configService: { get: jest.Mock };
  let stdoutSpy: jest.SpyInstance;

  beforeEach(async () => {
    configService = { get: jest.fn().mockReturnValue('info') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggerService, { provide: ConfigService, useValue: configService }],
    }).compile();

    service = module.get<LoggerService>(LoggerService);
    stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('setContext', () => {
    it('should set the context used in log messages', () => {
      service.setContext('TestModule');
      service.log('test message');

      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('[TestModule]'));
    });
  });

  describe('log', () => {
    it('should output a log message with context', () => {
      service.log('hello world', 'MyContext');

      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('[MyContext]'));
      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('hello world'));
    });

    it('should default context to Application', () => {
      service.log('test');

      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('[Application]'));
    });
  });

  describe('error', () => {
    it('should output error message', () => {
      service.error('something failed', undefined, 'ErrorCtx');

      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('something failed'));
    });

    it('should print stack trace when provided', () => {
      service.error('fail', 'Error: stack trace here');

      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('Error: stack trace here'));
    });
  });

  describe('warn', () => {
    it('should output warning message', () => {
      service.warn('caution', 'WarnCtx');

      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('caution'));
    });
  });

  describe('debug', () => {
    it('should output debug message when LOG_LEVEL is debug', () => {
      configService.get.mockReturnValue('debug');
      service.debug('debug info');

      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('debug info'));
    });

    it('should suppress debug message when LOG_LEVEL is info', () => {
      configService.get.mockReturnValue('info');
      service.debug('hidden');

      expect(stdoutSpy).not.toHaveBeenCalled();
    });
  });

  describe('verbose', () => {
    it('should output verbose message when LOG_LEVEL is verbose', () => {
      configService.get.mockReturnValue('verbose');
      service.verbose('verbose info');

      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('verbose info'));
    });

    it('should output verbose message when LOG_LEVEL is debug', () => {
      configService.get.mockReturnValue('debug');
      service.verbose('also visible');

      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('also visible'));
    });

    it('should suppress verbose message when LOG_LEVEL is info', () => {
      configService.get.mockReturnValue('info');
      service.verbose('hidden');

      expect(stdoutSpy).not.toHaveBeenCalled();
    });
  });

  describe('JSON log format', () => {
    it('should output JSON when LOG_FORMAT is json', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'LOG_FORMAT') return 'json';
        return 'info';
      });

      service.log('json test', 'JsonCtx');

      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('"level":"LOG"'));
      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('"message":"json test"'));
    });

    it('should include structured context fields in JSON', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'LOG_FORMAT') return 'json';
        return 'info';
      });

      service.setStructuredContext({
        traceId: 'trace-123',
        tenantId: 'tenant-abc',
        userId: 'user-xyz',
        requestId: 'req-456',
      });

      service.log('structured test', 'StructCtx');

      const output = stdoutSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed.traceId).toBe('trace-123');
      expect(parsed.tenantId).toBe('tenant-abc');
      expect(parsed.userId).toBe('user-xyz');
      expect(parsed.requestId).toBe('req-456');
      expect(parsed.service).toBe('mechmind-backend');
    });

    it('should include duration_ms in JSON when durationMs is set in structuredCtx (line 102)', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'LOG_FORMAT') return 'json';
        return 'info';
      });

      service.setStructuredContext({
        method: 'GET',
        url: '/api/test',
        statusCode: 200,
        durationMs: 42,
      });

      service.log('duration test');

      const output = stdoutSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed.duration_ms).toBe(42);
      expect(parsed.method).toBe('GET');
      expect(parsed.url).toBe('/api/test');
      expect(parsed.statusCode).toBe(200);
    });
  });

  describe('logWithCorrelation (line 62)', () => {
    it('should output log message with correlationId', () => {
      service.logWithCorrelation('correlated message', 'corr-id-123', 'TestCtx');

      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('correlated message'));
    });

    it('should output log message without correlationId', () => {
      service.logWithCorrelation('no-corr message');

      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('no-corr message'));
    });
  });

  describe('LoggerService without configService (optional parameter branches)', () => {
    let noConfigService: LoggerService;

    beforeEach(() => {
      noConfigService = new LoggerService();
    });

    it('should output log message without configService (line 73 configService?.get fallback)', () => {
      noConfigService.log('no-config log');
      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('no-config log'));
    });

    it('should suppress debug output without configService (line 48 fallback to info)', () => {
      noConfigService.debug('suppressed debug');
      expect(stdoutSpy).not.toHaveBeenCalled();
    });

    it('should suppress verbose output without configService (line 55 fallback to info)', () => {
      noConfigService.verbose('suppressed verbose');
      expect(stdoutSpy).not.toHaveBeenCalled();
    });
  });
});
