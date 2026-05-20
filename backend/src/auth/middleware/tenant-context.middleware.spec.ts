import { TenantContextMiddleware, RequestWithTenant } from './tenant-context.middleware';
import { Response } from 'express';
import { PrismaService } from '../../common/services/prisma.service';
import { LoggerService } from '../../common/services/logger.service';

describe('TenantContextMiddleware', () => {
  let middleware: TenantContextMiddleware;
  let prisma: { setTenantContext: jest.Mock; clearTenantContext: jest.Mock };
  let logger: { debug: jest.Mock; error: jest.Mock; log: jest.Mock; warn: jest.Mock };
  let mockRes: Partial<Response> & { on: jest.Mock };
  let next: jest.Mock;

  beforeEach(() => {
    prisma = {
      setTenantContext: jest.fn().mockResolvedValue(undefined),
      clearTenantContext: jest.fn().mockResolvedValue(undefined),
    };
    logger = {
      debug: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
    };
    mockRes = { on: jest.fn() };
    next = jest.fn();
    middleware = new TenantContextMiddleware(
      prisma as unknown as PrismaService,
      logger as unknown as LoggerService,
    );
  });

  it('should set tenant context when tenantId is present', async () => {
    const req = { tenantId: 'tenant-123' } as RequestWithTenant;

    await middleware.use(req, mockRes as unknown as Response, next);

    expect(prisma.setTenantContext).toHaveBeenCalledWith('tenant-123');
    expect(logger.debug).toHaveBeenCalledWith(
      'Tenant context set: tenant-123',
      'TenantContextMiddleware',
    );
    expect(next).toHaveBeenCalled();
  });

  it('should register finish listener to clear tenant context', async () => {
    const req = { tenantId: 'tenant-456' } as RequestWithTenant;

    await middleware.use(req, mockRes as unknown as Response, next);

    expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));

    // Simulate finish event
    const finishCallback = mockRes.on.mock.calls[0][1];
    await finishCallback();

    expect(prisma.clearTenantContext).toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      'Tenant context cleared: tenant-456',
      'TenantContextMiddleware',
    );
  });

  it('should handle error when clearing tenant context', async () => {
    const req = { tenantId: 'tenant-789' } as RequestWithTenant;
    prisma.clearTenantContext.mockRejectedValue(new Error('Redis down'));

    await middleware.use(req, mockRes as unknown as Response, next);

    const finishCallback = mockRes.on.mock.calls[0][1];
    await finishCallback();

    expect(logger.error).toHaveBeenCalledWith('Failed to clear tenant context', expect.any(String));
  });

  it('should handle error when setting tenant context', async () => {
    const req = { tenantId: 'tenant-err' } as RequestWithTenant;
    prisma.setTenantContext.mockRejectedValue(new Error('DB connection lost'));

    await middleware.use(req, mockRes as unknown as Response, next);

    expect(logger.error).toHaveBeenCalledWith('Failed to set tenant context: DB connection lost');
    expect(next).toHaveBeenCalled();
  });

  it('should skip when no tenantId is present', async () => {
    const req = {} as RequestWithTenant;

    await middleware.use(req, mockRes as unknown as Response, next);

    expect(prisma.setTenantContext).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith('No tenant ID in request - RLS not applied');
    expect(next).toHaveBeenCalled();
  });

  it('should skip when tenantId is undefined', async () => {
    const req = { tenantId: undefined } as RequestWithTenant;

    await middleware.use(req, mockRes as unknown as Response, next);

    expect(prisma.setTenantContext).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('should handle error message correctly in catch block', async () => {
    const req = { tenantId: 'tenant-err' } as RequestWithTenant;
    const errorMessage = 'Custom DB error message';
    prisma.setTenantContext.mockRejectedValue(new Error(errorMessage));

    await middleware.use(req, mockRes as unknown as Response, next);

    expect(logger.error).toHaveBeenCalledWith(`Failed to set tenant context: ${errorMessage}`);
  });

  it('should properly log debug message when no tenantId exists', async () => {
    const req = {} as RequestWithTenant;

    await middleware.use(req, mockRes as unknown as Response, next);

    expect(logger.debug).toHaveBeenCalledWith('No tenant ID in request - RLS not applied');
  });

  it('should call next even when setTenantContext fails', async () => {
    const req = { tenantId: 'tenant-err' } as RequestWithTenant;
    prisma.setTenantContext.mockRejectedValue(new Error('Error'));

    await middleware.use(req, mockRes as unknown as Response, next);

    expect(next).toHaveBeenCalled();
  });

  it('should register finish listener when tenantId is present', async () => {
    const req = { tenantId: 'tenant-123' } as RequestWithTenant;

    await middleware.use(req, mockRes as unknown as Response, next);

    expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });

  it('should not register finish listener when tenantId is absent', async () => {
    const req = {} as RequestWithTenant;

    await middleware.use(req, mockRes as unknown as Response, next);

    expect(mockRes.on).not.toHaveBeenCalled();
  });

  it('should clear context on response finish with correct tenant ID', async () => {
    const tenantId = 'clear-test-tenant';
    const req = { tenantId } as RequestWithTenant;

    await middleware.use(req, mockRes as unknown as Response, next);

    const finishCallback = mockRes.on.mock.calls[0][1];
    await finishCallback();

    expect(prisma.clearTenantContext).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledWith(
      `Tenant context cleared: ${tenantId}`,
      'TenantContextMiddleware',
    );
  });
});
