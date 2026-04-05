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
});
