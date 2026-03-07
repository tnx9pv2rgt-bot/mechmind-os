import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import { TransformInterceptor, Response } from '../interceptors/transform.interceptor';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<any>;

  const createMockExecutionContext = (): ExecutionContext => ({
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({
        method: 'GET',
        url: '/api/test',
      }),
    }),
    getClass: jest.fn().mockReturnValue({ name: 'TestController' }),
    getHandler: jest.fn().mockReturnValue({ name: 'testMethod' }),
  }) as unknown as ExecutionContext;

  const createMockCallHandler = <T>(data: T): CallHandler => ({
    handle: jest.fn().mockReturnValue(of(data)),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransformInterceptor],
    }).compile();

    interceptor = module.get<TransformInterceptor<any>>(TransformInterceptor);
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('intercept', () => {
    it('should transform plain data to standard response format', async () => {
      const context = createMockExecutionContext();
      const data = { id: 1, name: 'Test Item' };
      const next: CallHandler = createMockCallHandler(data);

      const result$ = interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(result).toEqual({
        success: true,
        data: { id: 1, name: 'Test Item' },
        timestamp: '2024-01-15T10:00:00.000Z',
      });
    });

    it('should transform array data to standard response format', async () => {
      const context = createMockExecutionContext();
      const data = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ];
      const next: CallHandler = createMockCallHandler(data);

      const result$ = interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(result).toEqual({
        success: true,
        data: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' },
        ],
        timestamp: '2024-01-15T10:00:00.000Z',
      });
    });

    it('should transform null data', async () => {
      const context = createMockExecutionContext();
      const next: CallHandler = createMockCallHandler(null);

      const result$ = interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(result).toEqual({
        success: true,
        data: null,
        timestamp: '2024-01-15T10:00:00.000Z',
      });
    });

    it('should transform primitive data (string)', async () => {
      const context = createMockExecutionContext();
      const next: CallHandler = createMockCallHandler('simple string');

      const result$ = interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(result).toEqual({
        success: true,
        data: 'simple string',
        timestamp: '2024-01-15T10:00:00.000Z',
      });
    });

    it('should transform primitive data (number)', async () => {
      const context = createMockExecutionContext();
      const next: CallHandler = createMockCallHandler(42);

      const result$ = interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(result).toEqual({
        success: true,
        data: 42,
        timestamp: '2024-01-15T10:00:00.000Z',
      });
    });

    it('should transform primitive data (boolean)', async () => {
      const context = createMockExecutionContext();
      const next: CallHandler = createMockCallHandler(true);

      const result$ = interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(result).toEqual({
        success: true,
        data: true,
        timestamp: '2024-01-15T10:00:00.000Z',
      });
    });

    it('should extract meta information and include in response', async () => {
      const context = createMockExecutionContext();
      const data = {
        data: [{ id: 1 }, { id: 2 }],
        meta: {
          total: 100,
          limit: 10,
          offset: 0,
          page: 1,
          pages: 10,
        },
      };
      const next: CallHandler = createMockCallHandler(data);

      const result$ = interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(result).toEqual({
        success: true,
        data: [{ id: 1 }, { id: 2 }],
        meta: {
          total: 100,
          limit: 10,
          offset: 0,
          page: 1,
          pages: 10,
        },
        timestamp: '2024-01-15T10:00:00.000Z',
      });
    });

    it('should pass through data that already has success property (standard format)', async () => {
      const context = createMockExecutionContext();
      const data = {
        success: true,
        data: { message: 'Already formatted' },
        customField: 'custom value',
      };
      const next: CallHandler = createMockCallHandler(data);

      const result$ = interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(result).toEqual({
        success: true,
        data: { message: 'Already formatted' },
        customField: 'custom value',
        timestamp: '2024-01-15T10:00:00.000Z',
      });
    });

    it('should pass through error response with success: false', async () => {
      const context = createMockExecutionContext();
      const data = {
        success: false,
        error: 'Validation failed',
        details: ['Field 1 is required'],
      };
      const next: CallHandler = createMockCallHandler(data);

      const result$ = interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(result).toEqual({
        success: false,
        error: 'Validation failed',
        details: ['Field 1 is required'],
        timestamp: '2024-01-15T10:00:00.000Z',
      });
    });

    it('should handle nested data structure', async () => {
      const context = createMockExecutionContext();
      const data = {
        user: {
          id: 1,
          profile: {
            name: 'John',
            settings: {
              theme: 'dark',
            },
          },
        },
      };
      const next: CallHandler = createMockCallHandler(data);

      const result$ = interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(result).toEqual({
        success: true,
        data: {
          user: {
            id: 1,
            profile: {
              name: 'John',
              settings: {
                theme: 'dark',
              },
            },
          },
        },
        timestamp: '2024-01-15T10:00:00.000Z',
      });
    });

    it('should handle empty object', async () => {
      const context = createMockExecutionContext();
      const next: CallHandler = createMockCallHandler({});

      const result$ = interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(result).toEqual({
        success: true,
        data: {},
        timestamp: '2024-01-15T10:00:00.000Z',
      });
    });

    it('should handle empty array', async () => {
      const context = createMockExecutionContext();
      const next: CallHandler = createMockCallHandler([]);

      const result$ = interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(result).toEqual({
        success: true,
        data: [],
        timestamp: '2024-01-15T10:00:00.000Z',
      });
    });

    it('should handle data with only meta field', async () => {
      const context = createMockExecutionContext();
      const data = {
        data: [],
        meta: { total: 0 },
      };
      const next: CallHandler = createMockCallHandler(data);

      const result$ = interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(result).toEqual({
        success: true,
        data: [],
        meta: { total: 0 },
        timestamp: '2024-01-15T10:00:00.000Z',
      });
    });

    it('should handle undefined data field in response', async () => {
      const context = createMockExecutionContext();
      const data = {
        message: 'No data field',
        meta: { count: 0 },
      };
      const next: CallHandler = createMockCallHandler(data);

      const result$ = interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      // When data has a meta field but no data field, meta is extracted and included at top level
      expect(result).toEqual({
        success: true,
        data: {
          message: 'No data field',
          meta: { count: 0 },
        },
        meta: { count: 0 },
        timestamp: '2024-01-15T10:00:00.000Z',
      });
    });

    it('should handle data with data property (nested data structure)', async () => {
      const context = createMockExecutionContext();
      const data = {
        data: {
          items: [{ id: 1 }, { id: 2 }],
          total: 2,
        },
      };
      const next: CallHandler = createMockCallHandler(data);

      const result$ = interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(result).toEqual({
        success: true,
        data: {
          items: [{ id: 1 }, { id: 2 }],
          total: 2,
        },
        timestamp: '2024-01-15T10:00:00.000Z',
      });
    });

    it('should use current timestamp for each request', async () => {
      const context = createMockExecutionContext();
      const next: CallHandler = createMockCallHandler({ test: true });

      // First request at 10:00:00
      jest.setSystemTime(new Date('2024-01-15T10:00:00.000Z'));
      const result1 = await lastValueFrom(interceptor.intercept(context, next));
      expect(result1.timestamp).toBe('2024-01-15T10:00:00.000Z');

      // Second request at 10:05:30
      jest.setSystemTime(new Date('2024-01-15T10:05:30.500Z'));
      const result2 = await lastValueFrom(interceptor.intercept(context, next));
      expect(result2.timestamp).toBe('2024-01-15T10:05:30.500Z');
    });

    it('should handle complex paginated response', async () => {
      const context = createMockExecutionContext();
      const data = {
        data: Array.from({ length: 20 }, (_, i) => ({
          id: i + 1,
          name: `Item ${i + 1}`,
        })),
        meta: {
          total: 100,
          limit: 20,
          offset: 0,
          page: 1,
          pages: 5,
        },
      };
      const next: CallHandler = createMockCallHandler(data);

      const result$ = interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(20);
      expect(result.meta).toEqual({
        total: 100,
        limit: 20,
        offset: 0,
        page: 1,
        pages: 5,
      });
      expect(result.timestamp).toBe('2024-01-15T10:00:00.000Z');
    });

    it('should handle response without meta field', async () => {
      const context = createMockExecutionContext();
      const data = {
        items: [1, 2, 3],
        count: 3,
      };
      const next: CallHandler = createMockCallHandler(data);

      const result$ = interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(result).toEqual({
        success: true,
        data: {
          items: [1, 2, 3],
          count: 3,
        },
        timestamp: '2024-01-15T10:00:00.000Z',
      });
      expect(result.meta).toBeUndefined();
    });
  });

  describe('Response interface', () => {
    it('should properly type the Response interface', () => {
      const response: Response<{ id: number }> = {
        data: { id: 1 },
        meta: {
          total: 10,
          limit: 10,
          offset: 0,
          page: 1,
          pages: 1,
        },
        timestamp: new Date().toISOString(),
      };

      expect(response.data.id).toBe(1);
      expect(response.meta?.total).toBe(10);
      expect(response.timestamp).toBeDefined();
    });

    it('should work without optional meta field', () => {
      const response: Response<string> = {
        data: 'test',
        timestamp: new Date().toISOString(),
      };

      expect(response.data).toBe('test');
      expect(response.meta).toBeUndefined();
    });
  });
});
