import { CorrelationIdMiddleware } from './correlation-id.middleware';
import { Request, Response } from 'express';

describe('CorrelationIdMiddleware', () => {
  let middleware: CorrelationIdMiddleware;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    middleware = new CorrelationIdMiddleware();
    mockRes = { setHeader: jest.fn() };
    next = jest.fn();
  });

  it('should use existing x-correlation-id from request headers', () => {
    mockReq = { headers: { 'x-correlation-id': 'existing-id-123' } };

    middleware.use(mockReq as Request, mockRes as Response, next);

    expect(mockReq.headers!['x-correlation-id']).toBe('existing-id-123');
    expect(mockRes.setHeader).toHaveBeenCalledWith('x-correlation-id', 'existing-id-123');
    expect(next).toHaveBeenCalled();
  });

  it('should generate a new UUID when no correlation id is present', () => {
    mockReq = { headers: {} };

    middleware.use(mockReq as Request, mockRes as Response, next);

    const id = mockReq.headers!['x-correlation-id'] as string;
    expect(id).toBeDefined();
    // UUID v4 format
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(mockRes.setHeader).toHaveBeenCalledWith('x-correlation-id', id);
    expect(next).toHaveBeenCalled();
  });

  it('should generate a new UUID when correlation id header is empty string', () => {
    mockReq = { headers: { 'x-correlation-id': '' } };

    middleware.use(mockReq as Request, mockRes as Response, next);

    const id = mockReq.headers!['x-correlation-id'] as string;
    // Empty string is falsy, so a new UUID should be generated
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(next).toHaveBeenCalled();
  });
});
