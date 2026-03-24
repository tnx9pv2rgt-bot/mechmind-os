import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from './logger.service';

describe('LoggerService', () => {
  let service: LoggerService;
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    configService = { get: jest.fn().mockReturnValue('info') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggerService, { provide: ConfigService, useValue: configService }],
    }).compile();

    service = module.get<LoggerService>(LoggerService);
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
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

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[TestModule]'));
    });
  });

  describe('log', () => {
    it('should output a log message with context', () => {
      service.log('hello world', 'MyContext');

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[MyContext]'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('hello world'));
    });

    it('should default context to Application', () => {
      service.log('test');

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[Application]'));
    });
  });

  describe('error', () => {
    it('should output error message', () => {
      service.error('something failed', undefined, 'ErrorCtx');

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('something failed'));
    });

    it('should print stack trace when provided', () => {
      service.error('fail', 'Error: stack trace here');

      expect(console.error).toHaveBeenCalledWith('Error: stack trace here');
    });
  });

  describe('warn', () => {
    it('should output warning message', () => {
      service.warn('caution', 'WarnCtx');

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('caution'));
    });
  });

  describe('debug', () => {
    it('should output debug message when LOG_LEVEL is debug', () => {
      configService.get.mockReturnValue('debug');
      service.debug('debug info');

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('debug info'));
    });

    it('should suppress debug message when LOG_LEVEL is info', () => {
      configService.get.mockReturnValue('info');
      service.debug('hidden');

      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe('verbose', () => {
    it('should output verbose message when LOG_LEVEL is verbose', () => {
      configService.get.mockReturnValue('verbose');
      service.verbose('verbose info');

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('verbose info'));
    });

    it('should output verbose message when LOG_LEVEL is debug', () => {
      configService.get.mockReturnValue('debug');
      service.verbose('also visible');

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('also visible'));
    });

    it('should suppress verbose message when LOG_LEVEL is info', () => {
      configService.get.mockReturnValue('info');
      service.verbose('hidden');

      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe('JSON log format', () => {
    it('should output JSON when LOG_FORMAT is json', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'LOG_FORMAT') return 'json';
        return 'info';
      });

      service.log('json test', 'JsonCtx');

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('"level":"LOG"'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('"message":"json test"'));
    });
  });
});
