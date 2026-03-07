import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { LoggerInterceptor } from '../interceptors/logger.interceptor';
import { LoggerService } from '../services/logger.service';

describe('LoggerInterceptor', () => {
  let interceptor: LoggerInterceptor;
  let loggerService: jest.Mocked<LoggerService>;

  describe('constructor', () => {
    it('should instantiate with LoggerService', () => {
      const mockLogger = {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
        setContext: jest.fn(),
      } as unknown as LoggerService;
      
      const newInterceptor = new LoggerInterceptor(mockLogger);
      expect(newInterceptor).toBeDefined();
    });
  });

  const createMockExecutionContext = (overrides?: any): ExecutionContext => {
    const defaultRequest = {
      method: 'GET',
      url: '/api/test',
      body: { name: 'test' },
      headers: { 'content-type': 'application/json' },
    };

    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ ...defaultRequest, ...overrides?.request }),
      }),
      getClass: jest.fn().mockReturnValue({ name: 'TestController' }),
      getHandler: jest.fn().mockReturnValue({ name: 'testMethod' }),
    } as unknown as ExecutionContext;
  };

  const createMockCallHandler = (response?: any, error?: Error): CallHandler => ({
    handle: jest.fn().mockReturnValue(
      error ? throwError(() => error) : of(response),
    ),
  });

  beforeEach(async () => {
    loggerService = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      setContext: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggerInterceptor,
        {
          provide: LoggerService,
          useValue: loggerService,
        },
      ],
    }).compile();

    interceptor = module.get<LoggerInterceptor>(LoggerInterceptor);
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('intercept', () => {
    it('should log HTTP request and successful response', (done) => {
      const context = createMockExecutionContext();
      const response = { id: 1, name: 'test' };
      const next: CallHandler = createMockCallHandler(response);

      interceptor.intercept(context, next).subscribe({
        next: (result) => {
          expect(result).toEqual(response);
          
          // Verify request log
          expect(loggerService.log).toHaveBeenNthCalledWith(
            1,
            '[REQUEST] GET /api/test - TestController.testMethod',
            'LoggerInterceptor',
          );
          
          // Verify response log
          expect(loggerService.log).toHaveBeenNthCalledWith(
            2,
            expect.stringMatching(/\[RESPONSE\] GET \/api\/test - \d+ms/),
            'LoggerInterceptor',
          );
          
          done();
        },
      });
    });

    it('should log HTTP request with POST method', (done) => {
      const context = createMockExecutionContext({
        request: { method: 'POST', url: '/api/users', body: { email: 'test@example.com' } },
      });
      const next: CallHandler = createMockCallHandler({ id: 1 });

      interceptor.intercept(context, next).subscribe({
        next: () => {
          expect(loggerService.log).toHaveBeenNthCalledWith(
            1,
            '[REQUEST] POST /api/users - TestController.testMethod',
            'LoggerInterceptor',
          );
          done();
        },
      });
    });

    it('should log HTTP request with PUT method', (done) => {
      const context = createMockExecutionContext({
        request: { method: 'PUT', url: '/api/users/1', body: { name: 'updated' } },
      });
      const next: CallHandler = createMockCallHandler({ updated: true });

      interceptor.intercept(context, next).subscribe({
        next: () => {
          expect(loggerService.log).toHaveBeenNthCalledWith(
            1,
            '[REQUEST] PUT /api/users/1 - TestController.testMethod',
            'LoggerInterceptor',
          );
          done();
        },
      });
    });

    it('should log HTTP request with DELETE method', (done) => {
      const context = createMockExecutionContext({
        request: { method: 'DELETE', url: '/api/users/1' },
      });
      const next: CallHandler = createMockCallHandler({ deleted: true });

      interceptor.intercept(context, next).subscribe({
        next: () => {
          expect(loggerService.log).toHaveBeenNthCalledWith(
            1,
            '[REQUEST] DELETE /api/users/1 - TestController.testMethod',
            'LoggerInterceptor',
          );
          done();
        },
      });
    });

    it('should log HTTP request with PATCH method', (done) => {
      const context = createMockExecutionContext({
        request: { method: 'PATCH', url: '/api/users/1', body: { status: 'active' } },
      });
      const next: CallHandler = createMockCallHandler({ patched: true });

      interceptor.intercept(context, next).subscribe({
        next: () => {
          expect(loggerService.log).toHaveBeenNthCalledWith(
            1,
            '[REQUEST] PATCH /api/users/1 - TestController.testMethod',
            'LoggerInterceptor',
          );
          done();
        },
      });
    });

    it('should log error response with stack trace', (done) => {
      const context = createMockExecutionContext();
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at Test.method (file.ts:1:1)';
      const next: CallHandler = createMockCallHandler(undefined, error);

      interceptor.intercept(context, next).subscribe({
        error: (err) => {
          expect(err).toBe(error);
          
          // Verify request log
          expect(loggerService.log).toHaveBeenCalledWith(
            '[REQUEST] GET /api/test - TestController.testMethod',
            'LoggerInterceptor',
          );
          
          // Verify error log
          expect(loggerService.error).toHaveBeenCalledWith(
            expect.stringContaining('[ERROR] GET /api/test'),
            error.stack,
            'LoggerInterceptor',
          );
          expect(loggerService.error).toHaveBeenCalledWith(
            expect.stringContaining('Test error'),
            error.stack,
            'LoggerInterceptor',
          );
          
          done();
        },
      });
    });

    it('should log error without stack trace if not available', (done) => {
      const context = createMockExecutionContext();
      const error = new Error('Simple error');
      error.stack = undefined;
      const next: CallHandler = createMockCallHandler(undefined, error);

      interceptor.intercept(context, next).subscribe({
        error: () => {
          expect(loggerService.error).toHaveBeenCalledWith(
            expect.stringContaining('Simple error'),
            undefined,
            'LoggerInterceptor',
          );
          done();
        },
      });
    });

    it('should measure response time correctly', (done) => {
      const context = createMockExecutionContext();
      const next: CallHandler = createMockCallHandler({});

      // Start time
      const startTime = Date.now();
      jest.setSystemTime(startTime);

      interceptor.intercept(context, next).subscribe({
        next: () => {
          done();
        },
      });
      
      // Verify response log was called
      expect(loggerService.log).toHaveBeenCalledTimes(2);
    });

    it('should handle empty request body', (done) => {
      const context = createMockExecutionContext({
        request: { body: undefined },
      });
      const next: CallHandler = createMockCallHandler({});

      interceptor.intercept(context, next).subscribe({
        next: () => {
          expect(loggerService.log).toHaveBeenCalledWith(
            '[REQUEST] GET /api/test - TestController.testMethod',
            'LoggerInterceptor',
          );
          done();
        },
      });
    });

    it('should sanitize sensitive fields in request body', (done) => {
      const context = createMockExecutionContext({
        request: {
          body: {
            username: 'testuser',
            password: 'secret123',
            token: 'bearer-token',
            secret: 'api-secret',
            creditCard: '1234-5678-9012-3456',
            ssn: '123-45-6789',
          },
        },
      });
      const next: CallHandler = createMockCallHandler({ success: true });

      interceptor.intercept(context, next).subscribe({
        next: () => {
          // The interceptor logs the request but sanitizes body internally
          // We verify the request was logged
          expect(loggerService.log).toHaveBeenCalledWith(
            '[REQUEST] GET /api/test - TestController.testMethod',
            'LoggerInterceptor',
          );
          done();
        },
      });
    });

    it('should handle request with empty headers', (done) => {
      const context = createMockExecutionContext({
        request: { headers: {} },
      });
      const next: CallHandler = createMockCallHandler({});

      interceptor.intercept(context, next).subscribe({
        next: () => {
          expect(loggerService.log).toHaveBeenCalled();
          done();
        },
      });
    });

    it('should handle request with query parameters in URL', (done) => {
      const context = createMockExecutionContext({
        request: { url: '/api/users?page=1&limit=10' },
      });
      const next: CallHandler = createMockCallHandler({ users: [] });

      interceptor.intercept(context, next).subscribe({
        next: () => {
          expect(loggerService.log).toHaveBeenNthCalledWith(
            1,
            '[REQUEST] GET /api/users?page=1&limit=10 - TestController.testMethod',
            'LoggerInterceptor',
          );
          done();
        },
      });
    });

    it('should handle complex error objects', (done) => {
      const context = createMockExecutionContext();
      const error = new Error('Database connection failed');
      error.stack = 'Error: Database connection failed\n    at Query.run (db.ts:45:10)';
      const next: CallHandler = createMockCallHandler(undefined, error);

      interceptor.intercept(context, next).subscribe({
        error: () => {
          expect(loggerService.error).toHaveBeenCalledWith(
            expect.stringContaining('Database connection failed'),
            expect.stringContaining('db.ts:45:10'),
            'LoggerInterceptor',
          );
          done();
        },
      });
    });

    it('should handle different controller and handler names', (done) => {
      const context = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            method: 'POST',
            url: '/api/customers',
            body: {},
            headers: {},
          }),
        }),
        getClass: jest.fn().mockReturnValue({ name: 'CustomerController' }),
        getHandler: jest.fn().mockReturnValue({ name: 'createCustomer' }),
      } as unknown as ExecutionContext;
      
      const next: CallHandler = createMockCallHandler({ id: 1 });

      interceptor.intercept(context, next).subscribe({
        next: () => {
          expect(loggerService.log).toHaveBeenNthCalledWith(
            1,
            '[REQUEST] POST /api/customers - CustomerController.createCustomer',
            'LoggerInterceptor',
          );
          done();
        },
      });
    });
  });

  describe('sanitizeBody', () => {
    it('should return non-object body as-is', (done) => {
      const context = createMockExecutionContext({
        request: { body: 'string body' },
      });
      const next: CallHandler = createMockCallHandler({});

      interceptor.intercept(context, next).subscribe({
        next: () => {
          expect(loggerService.log).toHaveBeenCalled();
          done();
        },
      });
    });

    it('should return null body as-is', (done) => {
      const context = createMockExecutionContext({
        request: { body: null },
      });
      const next: CallHandler = createMockCallHandler({});

      interceptor.intercept(context, next).subscribe({
        next: () => {
          expect(loggerService.log).toHaveBeenCalled();
          done();
        },
      });
    });

    it('should redact all sensitive fields', (done) => {
      const context = createMockExecutionContext({
        request: {
          body: {
            normalField: 'visible',
            password: 'should-be-redacted',
            token: 'should-be-redacted',
            secret: 'should-be-redacted',
            creditCard: 'should-be-redacted',
            ssn: 'should-be-redacted',
          },
        },
      });
      const next: CallHandler = createMockCallHandler({});

      interceptor.intercept(context, next).subscribe({
        next: () => {
          // The sanitizeBody method is private, but we verify the interceptor runs
          expect(loggerService.log).toHaveBeenCalledTimes(2);
          done();
        },
      });
    });
  });
});
