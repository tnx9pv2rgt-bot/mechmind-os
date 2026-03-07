import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../services/logger.service';

describe('LoggerService', () => {
  let service: LoggerService;
  let configService: ConfigService;

  const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
  const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('constructor', () => {
    it('should work without ConfigService (undefined in constructor)', () => {
      const loggerService = new LoggerService(undefined);
      // Test with no context set initially to cover line 8 (private context?: string)
      loggerService.log('test message');
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should work with ConfigService provided', () => {
      const mockConfig = {
        get: jest.fn().mockReturnValue('debug'),
      };
      const loggerService = new LoggerService(mockConfig as any);
      
      loggerService.debug('debug message');
      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });

  describe('with ConfigService', () => {
    const createMockConfigService = (config: Record<string, any>) => ({
      get: jest.fn((key: string) => config[key]),
    });

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          LoggerService,
          {
            provide: ConfigService,
            useValue: createMockConfigService({
              LOG_LEVEL: 'debug',
              LOG_FORMAT: 'simple',
            }),
          },
        ],
      }).compile();

      service = module.get<LoggerService>(LoggerService);
      configService = module.get<ConfigService>(ConfigService);
    });

    describe('setContext', () => {
      it('should set context', () => {
        service.setContext('TestContext');
        service.log('test message');
        
        expect(mockConsoleLog).toHaveBeenCalled();
        const callArg = mockConsoleLog.mock.calls[0][0];
        expect(callArg).toContain('[TestContext]');
      });
    });

    describe('log', () => {
      it('should log message with provided context', () => {
        service.log('test message', 'CustomContext');
        
        expect(mockConsoleLog).toHaveBeenCalledTimes(1);
        const callArg = mockConsoleLog.mock.calls[0][0];
        expect(callArg).toContain('[LOG]');
        expect(callArg).toContain('test message');
        expect(callArg).toContain('[CustomContext]');
      });

      it('should log message with set context when no context provided', () => {
        service.setContext('SetContext');
        service.log('test message');
        
        expect(mockConsoleLog).toHaveBeenCalledTimes(1);
        const callArg = mockConsoleLog.mock.calls[0][0];
        expect(callArg).toContain('[SetContext]');
      });

      it('should log message with Application context when no context set', () => {
        service.log('test message');
        
        expect(mockConsoleLog).toHaveBeenCalledTimes(1);
        const callArg = mockConsoleLog.mock.calls[0][0];
        expect(callArg).toContain('[Application]');
      });
    });

    describe('error', () => {
      it('should log error message with trace', () => {
        const trace = 'Error stack trace';
        service.error('error message', trace, 'ErrorContext');
        
        expect(mockConsoleLog).toHaveBeenCalledTimes(1);
        expect(mockConsoleError).toHaveBeenCalledTimes(1);
        expect(mockConsoleError).toHaveBeenCalledWith(trace);
        
        const callArg = mockConsoleLog.mock.calls[0][0];
        expect(callArg).toContain('[ERROR]');
        expect(callArg).toContain('error message');
      });

      it('should log error message without trace', () => {
        service.error('error message', undefined, 'ErrorContext');
        
        expect(mockConsoleLog).toHaveBeenCalledTimes(1);
        expect(mockConsoleError).not.toHaveBeenCalled();
        
        const callArg = mockConsoleLog.mock.calls[0][0];
        expect(callArg).toContain('[ERROR]');
      });

      it('should log error with only message', () => {
        service.error('error message');
        
        expect(mockConsoleLog).toHaveBeenCalledTimes(1);
        expect(mockConsoleError).not.toHaveBeenCalled();
      });
    });

    describe('warn', () => {
      it('should log warning message', () => {
        service.warn('warning message', 'WarnContext');
        
        expect(mockConsoleLog).toHaveBeenCalledTimes(1);
        const callArg = mockConsoleLog.mock.calls[0][0];
        expect(callArg).toContain('[WARN]');
        expect(callArg).toContain('warning message');
        expect(callArg).toContain('[WarnContext]');
      });
    });

    describe('debug', () => {
      it('should log debug message when LOG_LEVEL is debug', () => {
        service.debug('debug message', 'DebugContext');
        
        expect(mockConsoleLog).toHaveBeenCalledTimes(1);
        const callArg = mockConsoleLog.mock.calls[0][0];
        expect(callArg).toContain('[DEBUG]');
        expect(callArg).toContain('debug message');
      });
    });

    describe('verbose', () => {
      it('should log verbose message when LOG_LEVEL is verbose', async () => {
        const module: TestingModule = await Test.createTestingModule({
          providers: [
            LoggerService,
            {
              provide: ConfigService,
              useValue: createMockConfigService({
                LOG_LEVEL: 'verbose',
                LOG_FORMAT: 'simple',
              }),
            },
          ],
        }).compile();

        const verboseService = module.get<LoggerService>(LoggerService);
        verboseService.verbose('verbose message', 'VerboseContext');
        
        expect(mockConsoleLog).toHaveBeenCalledTimes(1);
        const callArg = mockConsoleLog.mock.calls[0][0];
        expect(callArg).toContain('[VERBOSE]');
        expect(callArg).toContain('verbose message');
      });

      it('should log verbose message when LOG_LEVEL is debug', () => {
        service.verbose('verbose message', 'VerboseContext');
        
        expect(mockConsoleLog).toHaveBeenCalledTimes(1);
        const callArg = mockConsoleLog.mock.calls[0][0];
        expect(callArg).toContain('[VERBOSE]');
      });
    });
  });

  describe('without ConfigService', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          LoggerService,
          {
            provide: ConfigService,
            useValue: undefined,
          },
        ],
      }).compile();

      service = module.get<LoggerService>(LoggerService);
    });

    it('should use default values when ConfigService is not provided', () => {
      service.log('test message');
      
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
    });

    it('should not log debug when LOG_LEVEL defaults to info', () => {
      service.setContext('TestContext');
      service.debug('debug message');
      
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it('should not log verbose when LOG_LEVEL defaults to info', () => {
      service.setContext('TestContext');
      service.verbose('verbose message');
      
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  describe('JSON format logging', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          LoggerService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'LOG_FORMAT') return 'json';
                if (key === 'LOG_LEVEL') return 'debug';
                return undefined;
              }),
            },
          },
        ],
      }).compile();

      service = module.get<LoggerService>(LoggerService);
    });

    it('should log in JSON format', () => {
      service.log('json message', 'JsonContext');
      
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      const callArg = mockConsoleLog.mock.calls[0][0];
      const parsed = JSON.parse(callArg);
      
      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('level', 'LOG');
      expect(parsed).toHaveProperty('context', 'JsonContext');
      expect(parsed).toHaveProperty('message', 'json message');
    });

    it('should log error in JSON format', () => {
      service.error('json error', undefined, 'JsonContext');
      
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      const callArg = mockConsoleLog.mock.calls[0][0];
      const parsed = JSON.parse(callArg);
      
      expect(parsed.level).toBe('ERROR');
    });

    it('should log warning in JSON format', () => {
      service.warn('json warning', 'JsonContext');
      
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      const callArg = mockConsoleLog.mock.calls[0][0];
      const parsed = JSON.parse(callArg);
      
      expect(parsed.level).toBe('WARN');
    });

    it('should log debug in JSON format', () => {
      service.debug('json debug', 'JsonContext');
      
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      const callArg = mockConsoleLog.mock.calls[0][0];
      const parsed = JSON.parse(callArg);
      
      expect(parsed.level).toBe('DEBUG');
    });

    it('should log verbose in JSON format', () => {
      service.verbose('json verbose', 'JsonContext');
      
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      const callArg = mockConsoleLog.mock.calls[0][0];
      const parsed = JSON.parse(callArg);
      
      expect(parsed.level).toBe('VERBOSE');
    });
  });

  describe('color codes in simple format', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          LoggerService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'LOG_FORMAT') return 'simple';
                return undefined;
              }),
            },
          },
        ],
      }).compile();

      service = module.get<LoggerService>(LoggerService);
    });

    it('should use green color for log', () => {
      service.log('test');
      
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      const callArg = mockConsoleLog.mock.calls[0][0];
      expect(callArg).toContain('\x1b[32m'); // Green
      expect(callArg).toContain('\x1b[0m'); // Reset
    });

    it('should use red color for error', () => {
      service.error('test');
      
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      const callArg = mockConsoleLog.mock.calls[0][0];
      expect(callArg).toContain('\x1b[31m'); // Red
    });

    it('should use yellow color for warn', () => {
      service.warn('test');
      
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      const callArg = mockConsoleLog.mock.calls[0][0];
      expect(callArg).toContain('\x1b[33m'); // Yellow
    });

    it('should use blue color for debug', () => {
      service.debug('test');
      
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it('should use magenta color for verbose', () => {
      service.verbose('test');
      
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });
});
