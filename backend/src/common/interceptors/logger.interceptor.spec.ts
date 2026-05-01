import { LoggerInterceptor } from './logger.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { of, throwError, lastValueFrom } from 'rxjs';
import { LoggerService } from '../services/logger.service';

describe('LoggerInterceptor', () => {
  let interceptor: LoggerInterceptor;
  let logger: {
    log: jest.Mock;
    error: jest.Mock;
    warn: jest.Mock;
    debug: jest.Mock;
    setStructuredContext: jest.Mock;
  };
  let configService: { get: jest.Mock };

  function createContext(method = 'GET', url = '/test'): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          url,
          headers: { 'x-correlation-id': 'test-corr-id' },
          user: { tenantId: 'tenant-1', userId: 'user-1' },
        }),
        getResponse: () => ({ statusCode: 200 }),
      }),
      getClass: () => ({ name: 'TestController' }),
      getHandler: () => ({ name: 'testMethod' }),
    } as unknown as ExecutionContext;
  }

  describe('development mode', () => {
    beforeEach(() => {
      logger = {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        setStructuredContext: jest.fn(),
      };
      configService = { get: jest.fn().mockReturnValue('development') };
      interceptor = new LoggerInterceptor(
        logger as unknown as LoggerService,
        configService as unknown as ConfigService,
      );
    });

    it('should log request and response', async () => {
      const context = createContext('POST', '/api/bookings');
      const next: CallHandler = { handle: () => of({ id: 1 }) };

      const result$ = interceptor.intercept(context, next);
      await lastValueFrom(result$);

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('[REQUEST] POST /api/bookings - TestController.testMethod'),
        'LoggerInterceptor',
      );
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('[RESPONSE] POST /api/bookings'),
        'LoggerInterceptor',
      );
    });

    it('should set structured context with request info', async () => {
      const context = createContext('GET', '/api/test');
      const next: CallHandler = { handle: () => of('data') };

      const result$ = interceptor.intercept(context, next);
      await lastValueFrom(result$);

      expect(logger.setStructuredContext).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'test-corr-id',
          tenantId: 'tenant-1',
          userId: 'user-1',
          method: 'GET',
          url: '/api/test',
        }),
      );
    });

    it('should log error with stack trace in development', async () => {
      const context = createContext('GET', '/api/fail');
      const error = new Error('Test failure');
      const next: CallHandler = { handle: () => throwError(() => error) };

      const result$ = interceptor.intercept(context, next);

      await expect(lastValueFrom(result$)).rejects.toThrow('Test failure');

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] GET /api/fail'),
        undefined,
        'LoggerInterceptor',
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Test failure'),
        undefined,
        'LoggerInterceptor',
      );
    });

    it('should include duration in response log', async () => {
      const context = createContext();
      const next: CallHandler = { handle: () => of('data') };

      const result$ = interceptor.intercept(context, next);
      await lastValueFrom(result$);

      const responseLog = logger.log.mock.calls.find((call: string[]) =>
        call[0].includes('[RESPONSE]'),
      );
      expect(responseLog).toBeDefined();
      expect(responseLog[0]).toMatch(/\d+ms/);
    });
  });

  describe('production mode', () => {
    beforeEach(() => {
      logger = {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        setStructuredContext: jest.fn(),
      };
      configService = { get: jest.fn().mockReturnValue('production') };
      interceptor = new LoggerInterceptor(
        logger as unknown as LoggerService,
        configService as unknown as ConfigService,
      );
    });

    it('should log error without stack trace in production', async () => {
      const context = createContext('POST', '/api/data');
      const error = new Error('Prod error');
      error.stack = 'Error: Prod error\n    at Object.<anonymous> (/src/test.ts:1:1)';
      const next: CallHandler = { handle: () => throwError(() => error) };

      const result$ = interceptor.intercept(context, next);

      await expect(lastValueFrom(result$)).rejects.toThrow('Prod error');

      const errorLog = logger.error.mock.calls[0][0];
      expect(errorLog).toContain('Prod error');
      expect(errorLog).not.toContain('at Object');
    });
  });

  describe('Branch coverage: user context and headers', () => {
    beforeEach(() => {
      logger = {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        setStructuredContext: jest.fn(),
      };
      configService = { get: jest.fn().mockReturnValue('development') };
    });

    it('should handle missing x-correlation-id header gracefully', async () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'GET',
            url: '/test',
            headers: {},
            user: { tenantId: 'tenant-1', userId: 'user-1' },
          }),
          getResponse: () => ({ statusCode: 200 }),
        }),
        getClass: () => ({ name: 'TestController' }),
        getHandler: () => ({ name: 'testMethod' }),
      } as unknown as ExecutionContext;

      interceptor = new LoggerInterceptor(
        logger as unknown as LoggerService,
        configService as unknown as ConfigService,
      );

      const next: CallHandler = { handle: () => of('data') };
      const result$ = interceptor.intercept(context, next);
      await lastValueFrom(result$);

      expect(logger.setStructuredContext).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: undefined,
          tenantId: 'tenant-1',
          userId: 'user-1',
        }),
      );
    });

    it('should handle missing user object (no tenantId/userId)', async () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            url: '/public',
            headers: { 'x-correlation-id': 'corr-123' },
          }),
          getResponse: () => ({ statusCode: 201 }),
        }),
        getClass: () => ({ name: 'PublicController' }),
        getHandler: () => ({ name: 'publicMethod' }),
      } as unknown as ExecutionContext;

      interceptor = new LoggerInterceptor(
        logger as unknown as LoggerService,
        configService as unknown as ConfigService,
      );

      const next: CallHandler = { handle: () => of('result') };
      const result$ = interceptor.intercept(context, next);
      await lastValueFrom(result$);

      expect(logger.setStructuredContext).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'corr-123',
          tenantId: undefined,
          userId: undefined,
        }),
      );
    });

    it('should handle error with status code property', async () => {
      const context = createContext('DELETE', '/api/resource');
      const error = new Error('Forbidden');
      (error as any).status = 403;
      const next: CallHandler = { handle: () => throwError(() => error) };

      interceptor = new LoggerInterceptor(
        logger as unknown as LoggerService,
        configService as unknown as ConfigService,
      );

      const result$ = interceptor.intercept(context, next);
      await expect(lastValueFrom(result$)).rejects.toThrow('Forbidden');

      expect(logger.setStructuredContext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 403 }),
      );
    });

    it('should handle error without status code (default 500)', async () => {
      const context = createContext('GET', '/api/crash');
      const error = new Error('Unexpected error');
      const next: CallHandler = { handle: () => throwError(() => error) };

      interceptor = new LoggerInterceptor(
        logger as unknown as LoggerService,
        configService as unknown as ConfigService,
      );

      const result$ = interceptor.intercept(context, next);
      await expect(lastValueFrom(result$)).rejects.toThrow('Unexpected error');

      expect(logger.setStructuredContext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 500 }),
      );
    });

    it('should log different HTTP methods', async () => {
      interceptor = new LoggerInterceptor(
        logger as unknown as LoggerService,
        configService as unknown as ConfigService,
      );

      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
      for (const method of methods) {
        const context = createContext(method, `/api/${method.toLowerCase()}`);
        const next: CallHandler = { handle: () => of('ok') };
        const result$ = interceptor.intercept(context, next);
        await lastValueFrom(result$);

        expect(logger.log).toHaveBeenCalledWith(
          expect.stringContaining(`[REQUEST] ${method}`),
          'LoggerInterceptor',
        );
      }
    });
  });
});
