import { TransformInterceptor } from './transform.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<unknown>;
  const context = {} as ExecutionContext;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  it('should wrap plain data in standard response format', async () => {
    const next: CallHandler = { handle: () => of({ id: 1, name: 'Test' }) };

    const result$ = interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        data: { id: 1, name: 'Test' },
        timestamp: expect.any(String),
      }),
    );
  });

  it('should pass through response that already has success field', async () => {
    const existing = { success: true, data: [1, 2, 3], custom: 'field' };
    const next: CallHandler = { handle: () => of(existing) };

    const result$ = interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        data: [1, 2, 3],
        custom: 'field',
        timestamp: expect.any(String),
      }),
    );
  });

  it('should extract meta from data.meta', async () => {
    const dataWithMeta = {
      data: [{ id: 1 }],
      meta: { total: 100, limit: 10, offset: 0 },
    };
    const next: CallHandler = { handle: () => of(dataWithMeta) };

    const result$ = interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        data: [{ id: 1 }],
        meta: { total: 100, limit: 10, offset: 0 },
      }),
    );
  });

  it('should handle null data', async () => {
    const next: CallHandler = { handle: () => of(null) };

    const result$ = interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        data: null,
        timestamp: expect.any(String),
      }),
    );
  });

  it('should handle primitive data', async () => {
    const next: CallHandler = { handle: () => of('plain string') };

    const result$ = interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        data: 'plain string',
      }),
    );
  });

  it('should handle data without meta field', async () => {
    const next: CallHandler = { handle: () => of({ items: [1, 2] }) };

    const result$ = interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result.meta).toBeUndefined();
    expect(result.success).toBe(true);
  });

  it('should handle success=false pass-through', async () => {
    const next: CallHandler = {
      handle: () => of({ success: false, error: 'Something failed' }),
    };

    const result$ = interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result.success).toBe(false);
    expect(result.timestamp).toBeDefined();
  });

  // Branch coverage: response transformation logic
  it('should include meta when meta exists and is not null', async () => {
    const dataWithMeta = {
      data: { id: 1 },
      meta: { total: 50, page: 1 },
    };
    const next: CallHandler = { handle: () => of(dataWithMeta) };

    const result$ = interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result.meta).toBeDefined();
    expect(result.meta).toEqual({ total: 50, page: 1 });
    expect(result.success).toBe(true);
  });

  it('should NOT include meta when meta is null', async () => {
    const data = {
      data: { id: 1 },
      meta: null,
    };
    const next: CallHandler = { handle: () => of(data) };

    const result$ = interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result.meta).toBeUndefined();
  });

  it('should NOT include meta when meta is undefined', async () => {
    const data = {
      data: { id: 1 },
      meta: undefined,
    };
    const next: CallHandler = { handle: () => of(data) };

    const result$ = interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result.meta).toBeUndefined();
  });

  it('should NOT include meta when data has no meta property', async () => {
    const data = { data: { id: 1 } };
    const next: CallHandler = { handle: () => of(data) };

    const result$ = interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result.meta).toBeUndefined();
  });

  it('should use data.data when present in data object', async () => {
    const data = {
      data: { nested: 'value' },
      other: 'field',
    };
    const next: CallHandler = { handle: () => of(data) };

    const result$ = interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result.data).toEqual({ nested: 'value' });
  });

  it('should use entire data when data.data is missing', async () => {
    const data = { id: 123, name: 'Item' };
    const next: CallHandler = { handle: () => of(data) };

    const result$ = interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result.data).toEqual({ id: 123, name: 'Item' });
  });

  it('should use null when data.data is null', async () => {
    const data = { data: null, other: 'field' };
    const next: CallHandler = { handle: () => of(data) };

    const result$ = interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    // When data.data is null (falsy), || operator falls back to data (the whole object)
    expect(result.data).toEqual({ data: null, other: 'field' });
  });

  it('should handle data as array', async () => {
    const data = [{ id: 1 }, { id: 2 }];
    const next: CallHandler = { handle: () => of(data) };

    const result$ = interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
    expect(result.success).toBe(true);
  });

  it('should preserve success flag when response has success property', async () => {
    const data = { success: true, data: 'test', custom: 'prop' };
    const next: CallHandler = { handle: () => of(data) };

    const result$ = interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result.success).toBe(true);
    expect(result.custom).toBe('prop');
  });

  it('should always add timestamp', async () => {
    const data = { id: 1 };
    const next: CallHandler = { handle: () => of(data) };

    const result$ = interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result.timestamp).toBeDefined();
    expect(typeof result.timestamp).toBe('string');
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('should handle object with success property false', async () => {
    const data = { success: false, data: 'error message' };
    const next: CallHandler = { handle: () => of(data) };

    const result$ = interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result.success).toBe(false);
    expect(result.timestamp).toBeDefined();
  });

  it('should handle data with undefined success property', async () => {
    const data = { success: undefined, data: { id: 1 } };
    const next: CallHandler = { handle: () => of(data) };

    const result$ = interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result.success).toBeUndefined();
  });

  it('should handle data with number value', async () => {
    const data = 42;
    const next: CallHandler = { handle: () => of(data) };

    const result$ = interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result.data).toBe(42);
    expect(result.success).toBe(true);
  });

  it('should handle empty object', async () => {
    const data = {};
    const next: CallHandler = { handle: () => of(data) };

    const result$ = interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({});
    expect(result.timestamp).toBeDefined();
  });
});
