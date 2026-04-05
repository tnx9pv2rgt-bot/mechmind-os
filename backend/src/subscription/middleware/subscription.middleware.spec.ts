import {
  SubscriptionMiddleware,
  requireFeature,
  SubscriptionRateLimitMiddleware,
} from './subscription.middleware';
import { ForbiddenException } from '@nestjs/common';
import { Request, Response } from 'express';
import { FeatureFlag } from '@prisma/client';
import { FeatureAccessService } from '../services/feature-access.service';
import { RedisService } from '../../common/services/redis.service';

describe('SubscriptionMiddleware', () => {
  let middleware: SubscriptionMiddleware;
  let featureAccessService: { getUsageStats: jest.Mock };
  let next: jest.Mock;

  beforeEach(() => {
    featureAccessService = {
      getUsageStats: jest.fn(),
    };
    middleware = new SubscriptionMiddleware(
      featureAccessService as unknown as FeatureAccessService,
    );
    next = jest.fn();
  });

  it('should skip when no tenantId is present', async () => {
    const req = {} as Request;

    await middleware.use(req, {} as Response, next);

    expect(featureAccessService.getUsageStats).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('should attach subscription info to request', async () => {
    const req = { tenantId: 'tid-1' } as unknown as Request;
    featureAccessService.getUsageStats.mockResolvedValue({
      plan: 'PROFESSIONAL',
      status: 'ACTIVE',
      usage: { BOOKING: { current: 5, limit: 100 }, INVOICE: { current: 2, limit: 50 } },
    });

    await middleware.use(req, {} as Response, next);

    expect(req.subscription).toEqual({
      plan: 'PROFESSIONAL',
      status: 'ACTIVE',
      features: ['BOOKING', 'INVOICE'],
    });
    expect(next).toHaveBeenCalled();
  });

  it('should call next even when getUsageStats throws', async () => {
    const req = { tenantId: 'tid-err' } as unknown as Request;
    featureAccessService.getUsageStats.mockRejectedValue(new Error('DB error'));

    await middleware.use(req, {} as Response, next);

    expect(next).toHaveBeenCalled();
    expect(req.subscription).toBeUndefined();
  });
});

describe('requireFeature', () => {
  let next: jest.Mock;

  beforeEach(() => {
    next = jest.fn();
  });

  it('should throw ForbiddenException when no tenantId', async () => {
    const middleware = requireFeature('BOOKING' as FeatureFlag);
    const req = {} as Request;

    await expect(middleware(req, {} as Response, next)).rejects.toThrow(ForbiddenException);

    expect(next).not.toHaveBeenCalled();
  });

  it('should call next when tenantId is present', async () => {
    const middleware = requireFeature('BOOKING' as FeatureFlag);
    const req = { tenantId: 'tid-1' } as unknown as Request;

    await middleware(req, {} as Response, next);

    expect(next).toHaveBeenCalled();
  });
});

describe('SubscriptionRateLimitMiddleware', () => {
  let middleware: SubscriptionRateLimitMiddleware;
  let redis: { get: jest.Mock; set: jest.Mock };
  let next: jest.Mock;
  let mockRes: { setHeader: jest.Mock };

  beforeEach(() => {
    redis = { get: jest.fn(), set: jest.fn() };
    middleware = new SubscriptionRateLimitMiddleware(redis as unknown as RedisService);
    next = jest.fn();
    mockRes = { setHeader: jest.fn() };
  });

  it('should skip when no tenantId is present', async () => {
    const req = {} as Request;

    await middleware.use(req, mockRes as unknown as Response, next);

    expect(redis.get).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('should increment counter and set rate limit headers', async () => {
    redis.get.mockResolvedValue('100');
    const req = { tenantId: 'tid-rate' } as unknown as Request;

    await middleware.use(req, mockRes as unknown as Response, next);

    expect(redis.get).toHaveBeenCalledWith(
      expect.stringMatching(/^rate:monthly:tid-rate:\d{4}-\d{2}$/),
    );
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringMatching(/^rate:monthly:tid-rate:\d{4}-\d{2}$/),
      '101',
      expect.any(Number),
    );
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '25000');
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
    expect(next).toHaveBeenCalled();
  });

  it('should start counter at 1 when no existing count', async () => {
    redis.get.mockResolvedValue(null);
    const req = { tenantId: 'tid-new' } as unknown as Request;

    await middleware.use(req, mockRes as unknown as Response, next);

    expect(redis.set).toHaveBeenCalledWith(expect.any(String), '1', expect.any(Number));
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '24999');
    expect(next).toHaveBeenCalled();
  });

  it('should show 0 remaining when over limit', async () => {
    redis.get.mockResolvedValue('25000');
    const req = { tenantId: 'tid-full' } as unknown as Request;

    await middleware.use(req, mockRes as unknown as Response, next);

    expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
    expect(next).toHaveBeenCalled();
  });
});
