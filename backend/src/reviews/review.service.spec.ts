import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ReviewService } from './review.service';
import { PrismaService } from '../common/services/prisma.service';
import { NotificationV2Service } from '../notifications/services/notification-v2.service';
import { PublicTokenService } from '../public-token/public-token.service';
import { NotificationType, NotificationChannel } from '@prisma/client';

describe('ReviewService', () => {
  let service: ReviewService;
  let prisma: {
    customer: { findFirst: jest.Mock };
    notification: { count: jest.Mock; findMany: jest.Mock };
    workOrder: { findFirst: jest.Mock };
  };
  let notificationService: { sendImmediate: jest.Mock };
  let mockPublicTokenService: {
    generateToken: jest.Mock;
    validateToken: jest.Mock;
    consumeToken: jest.Mock;
    revokeTokensForEntity: jest.Mock;
  };
  let mockEventEmitter: { emit: jest.Mock };

  const TENANT_ID = 'tenant-001';
  const CUSTOMER_ID = 'cust-001';

  beforeEach(async () => {
    prisma = {
      customer: { findFirst: jest.fn() },
      notification: { count: jest.fn(), findMany: jest.fn() },
      workOrder: { findFirst: jest.fn() },
    };

    notificationService = {
      sendImmediate: jest.fn(),
    };

    mockPublicTokenService = {
      generateToken: jest.fn(),
      validateToken: jest.fn(),
      consumeToken: jest.fn(),
      revokeTokensForEntity: jest.fn(),
    };
    // Set sensible defaults for all tests
    mockPublicTokenService.generateToken.mockResolvedValue({ token: 'review-token-123' });
    mockPublicTokenService.consumeToken.mockResolvedValue({});
    mockPublicTokenService.revokeTokensForEntity.mockResolvedValue(0);

    mockEventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationV2Service, useValue: notificationService },
        { provide: PublicTokenService, useValue: mockPublicTokenService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);

    // Set sensible default for ConfigService.get()
    const configService = module.get<ConfigService>(ConfigService);
    (configService.get as jest.Mock).mockReturnValue('https://app.mechmind.io');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('metadata filtering for review requests', () => {
    it('should use correct notification type and template filter in all methods', async () => {
      prisma.notification.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(20);

      await service.getStats(TENANT_ID);

      const calls = prisma.notification.count.mock.calls;
      calls.forEach(call => {
        expect(call[0].where.type).toBe(NotificationType.STATUS_UPDATE);
        expect(call[0].where.metadata).toEqual({
          path: ['template'],
          equals: 'review-request',
        });
      });
    });

    it('should handle empty notification list from metadata filter', async () => {
      prisma.notification.findMany.mockResolvedValueOnce([]);
      prisma.notification.count.mockResolvedValueOnce(0);

      const result = await service.findAll(TENANT_ID, { page: 1, limit: 20 });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
    });
  });

  describe('requestReview', () => {
    it('should send review request notification', async () => {
      prisma.customer.findFirst.mockResolvedValueOnce({ id: CUSTOMER_ID, tenantId: TENANT_ID });
      notificationService.sendImmediate.mockResolvedValueOnce({ success: true });

      const result = await service.requestReview(CUSTOMER_ID, TENANT_ID);

      expect(result).toEqual({
        success: true,
        message: 'Richiesta di recensione inviata',
      });
      expect(prisma.customer.findFirst).toHaveBeenCalledWith({
        where: { id: CUSTOMER_ID, tenantId: TENANT_ID },
      });
      expect(notificationService.sendImmediate).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: CUSTOMER_ID,
          tenantId: TENANT_ID,
          type: NotificationType.STATUS_UPDATE,
          channel: NotificationChannel.SMS,
          metadata: expect.objectContaining({
            template: 'review-request',
          }),
        }),
      );
    });

    it('should throw NotFoundException if customer not found', async () => {
      prisma.customer.findFirst.mockResolvedValueOnce(null);

      await expect(service.requestReview(CUSTOMER_ID, TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.customer.findFirst).toHaveBeenCalledWith({
        where: { id: CUSTOMER_ID, tenantId: TENANT_ID },
      });
      expect(notificationService.sendImmediate).not.toHaveBeenCalled();
    });

    it('should verify customer isolation by tenantId', async () => {
      const differentTenant = 'tenant-999';
      prisma.customer.findFirst.mockResolvedValueOnce(null);

      await expect(service.requestReview(CUSTOMER_ID, differentTenant)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.customer.findFirst).toHaveBeenCalledWith({
        where: { id: CUSTOMER_ID, tenantId: differentTenant },
      });
    });
  });

  describe('getStats', () => {
    it('should return review stats', async () => {
      prisma.notification.count
        .mockResolvedValueOnce(15) // sentThisMonth
        .mockResolvedValueOnce(10) // sentLastMonth
        .mockResolvedValueOnce(100); // totalSent

      const result = await service.getStats(TENANT_ID);

      expect(result).toEqual({
        sentThisMonth: 15,
        sentLastMonth: 10,
        totalSent: 100,
      });
      expect(prisma.notification.count).toHaveBeenCalledTimes(3);
      expect(prisma.notification.count).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_ID }),
        }),
      );
    });

    it('should return zero stats when no notifications exist', async () => {
      prisma.notification.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await service.getStats(TENANT_ID);

      expect(result).toEqual({
        sentThisMonth: 0,
        sentLastMonth: 0,
        totalSent: 0,
      });
    });

    it('should filter by tenant across all time periods', async () => {
      prisma.notification.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(50);

      await service.getStats(TENANT_ID);

      // Verifica che TUTTI i tre count filtrano per tenantId
      const calls = prisma.notification.count.mock.calls;
      expect(calls.length).toBe(3);
      calls.forEach(callArgs => {
        expect(callArgs[0].where.tenantId).toBe(TENANT_ID);
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated review notifications', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          customerId: CUSTOMER_ID,
          status: 'SENT',
          sentAt: new Date('2026-03-17'),
          createdAt: new Date('2026-03-17'),
        },
      ];
      prisma.notification.findMany.mockResolvedValueOnce(mockNotifications);
      prisma.notification.count.mockResolvedValueOnce(1);

      const result = await service.findAll(TENANT_ID, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_ID }),
          take: 20,
          skip: 0,
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(prisma.notification.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_ID }),
        }),
      );
    });

    it('should cap limit at 100', async () => {
      prisma.notification.findMany.mockResolvedValueOnce([]);
      prisma.notification.count.mockResolvedValueOnce(0);

      const result = await service.findAll(TENANT_ID, { page: 1, limit: 200 });

      expect(result.limit).toBe(100);
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });

    it('should use default page=1 and limit=20 when options are empty', async () => {
      prisma.notification.findMany.mockResolvedValueOnce([]);
      prisma.notification.count.mockResolvedValueOnce(0);

      const result = await service.findAll(TENANT_ID);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });

    it('should use default page=1 when only limit is provided', async () => {
      prisma.notification.findMany.mockResolvedValueOnce([]);
      prisma.notification.count.mockResolvedValueOnce(0);

      const result = await service.findAll(TENANT_ID, { limit: 10 });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });

    it('should properly calculate skip for page > 1', async () => {
      prisma.notification.findMany.mockResolvedValueOnce([]);
      prisma.notification.count.mockResolvedValueOnce(50);

      const result = await service.findAll(TENANT_ID, { page: 3, limit: 10 });

      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('should handle undefined page option (uses default 1)', async () => {
      prisma.notification.findMany.mockResolvedValueOnce([]);
      prisma.notification.count.mockResolvedValueOnce(0);

      const result = await service.findAll(TENANT_ID, { page: undefined, limit: 10 });

      expect(result.page).toBe(1);
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0 }),
      );
    });

    it('should handle undefined limit option (uses default 20)', async () => {
      prisma.notification.findMany.mockResolvedValueOnce([]);
      prisma.notification.count.mockResolvedValueOnce(0);

      const result = await service.findAll(TENANT_ID, { page: 2, limit: undefined });

      expect(result.limit).toBe(20);
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 20 }),
      );
    });

    it('should handle both undefined page and limit', async () => {
      prisma.notification.findMany.mockResolvedValueOnce([]);
      prisma.notification.count.mockResolvedValueOnce(0);

      const result = await service.findAll(TENANT_ID, { page: undefined, limit: undefined });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });

    it('should properly map notification fields', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          customerId: 'cust-1',
          status: 'SENT',
          sentAt: new Date('2026-03-17'),
          createdAt: new Date('2026-03-17'),
        },
        {
          id: 'notif-2',
          customerId: 'cust-2',
          status: 'PENDING',
          sentAt: null,
          createdAt: new Date('2026-03-16'),
        },
      ];
      prisma.notification.findMany.mockResolvedValueOnce(mockNotifications);
      prisma.notification.count.mockResolvedValueOnce(2);

      const result = await service.findAll(TENANT_ID, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        id: 'notif-1',
        customerId: 'cust-1',
        status: 'SENT',
        sentAt: new Date('2026-03-17'),
        createdAt: new Date('2026-03-17'),
      });
      expect(result.data[1].sentAt).toBeNull();
    });
  });

  describe('scheduleAutoReviewRequest', () => {
    it('should generate token and emit scheduled event', async () => {
      prisma.customer.findFirst.mockResolvedValueOnce({ id: CUSTOMER_ID, tenantId: TENANT_ID });

      const result = await service.scheduleAutoReviewRequest(TENANT_ID, 'wo-001', CUSTOMER_ID);

      expect(result.reviewUrl).toContain('review-token-123');
      expect(result.scheduledFor).toBeInstanceOf(Date);
      expect(mockPublicTokenService.generateToken).toHaveBeenCalledWith(
        TENANT_ID,
        'REVIEW_REQUEST',
        'wo-001',
        'WorkOrder',
        168,
        expect.objectContaining({ customerId: CUSTOMER_ID }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'review.requestScheduled',
        expect.objectContaining({
          tenantId: TENANT_ID,
          workOrderId: 'wo-001',
          customerId: CUSTOMER_ID,
          reviewUrl: expect.stringContaining('review-token-123'),
          token: 'review-token-123',
          delayMs: 2 * 60 * 60 * 1000,
        }),
      );
    });

    it('should throw NotFoundException if customer not found', async () => {
      prisma.customer.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.scheduleAutoReviewRequest(TENANT_ID, 'wo-001', CUSTOMER_ID),
      ).rejects.toThrow(NotFoundException);
      expect(mockPublicTokenService.generateToken).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should verify customer tenant isolation in scheduling', async () => {
      const differentTenant = 'tenant-999';
      prisma.customer.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.scheduleAutoReviewRequest(differentTenant, 'wo-001', CUSTOMER_ID),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.customer.findFirst).toHaveBeenCalledWith({
        where: { id: CUSTOMER_ID, tenantId: differentTenant },
      });
    });

    it('should include scheduledFor in event payload', async () => {
      prisma.customer.findFirst.mockResolvedValueOnce({ id: CUSTOMER_ID, tenantId: TENANT_ID });

      const beforeCall = Date.now();
      await service.scheduleAutoReviewRequest(TENANT_ID, 'wo-001', CUSTOMER_ID);
      const afterCall = Date.now();

      const eventCall = mockEventEmitter.emit.mock.calls[0][1];
      const scheduledForMs = eventCall.scheduledFor.getTime();
      const delayMs = 2 * 60 * 60 * 1000;

      // scheduledFor deve essere approssimativamente now + delayMs
      expect(scheduledForMs).toBeGreaterThanOrEqual(beforeCall + delayMs - 100);
      expect(scheduledForMs).toBeLessThanOrEqual(afterCall + delayMs + 100);
    });
  });

  describe('sendReviewRequest', () => {
    it('should generate token and emit sent event', async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce({ id: 'wo-001', customerId: CUSTOMER_ID });

      const result = await service.sendReviewRequest(TENANT_ID, 'wo-001');

      expect(result.reviewUrl).toContain('review-token-123');
      expect(mockPublicTokenService.revokeTokensForEntity).toHaveBeenCalledWith(
        TENANT_ID,
        'WorkOrder',
        'wo-001',
      );
      expect(mockPublicTokenService.generateToken).toHaveBeenCalledWith(
        TENANT_ID,
        'REVIEW_REQUEST',
        'wo-001',
        'WorkOrder',
        168,
        expect.objectContaining({ customerId: CUSTOMER_ID }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'review.requestSent',
        expect.objectContaining({
          tenantId: TENANT_ID,
          workOrderId: 'wo-001',
          customerId: CUSTOMER_ID,
          reviewUrl: expect.stringContaining('review-token-123'),
          token: 'review-token-123',
        }),
      );
    });

    it('should throw NotFoundException if work order not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce(null);

      await expect(service.sendReviewRequest(TENANT_ID, 'wo-xxx')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPublicTokenService.revokeTokensForEntity).not.toHaveBeenCalled();
      expect(mockPublicTokenService.generateToken).not.toHaveBeenCalled();
    });

    it('should verify work order tenant isolation', async () => {
      const differentTenant = 'tenant-999';
      prisma.workOrder.findFirst.mockResolvedValueOnce(null);

      await expect(service.sendReviewRequest(differentTenant, 'wo-001')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.workOrder.findFirst).toHaveBeenCalledWith({
        where: { id: 'wo-001', tenantId: differentTenant },
        select: { id: true, customerId: true },
      });
    });

    it('should revoke previous tokens before generating new one', async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce({ id: 'wo-001', customerId: CUSTOMER_ID });

      await service.sendReviewRequest(TENANT_ID, 'wo-001');

      // Verifica ordine: revoke prima di generate
      const revokeCalls = mockPublicTokenService.revokeTokensForEntity.mock.invocationCallOrder;
      const generateCalls = mockPublicTokenService.generateToken.mock.invocationCallOrder;
      expect(revokeCalls[0]).toBeLessThan(generateCalls[0]);
    });

    it('should pass customerId from work order to token metadata', async () => {
      const expectedCustomerId = 'special-customer-123';
      prisma.workOrder.findFirst.mockResolvedValueOnce({
        id: 'wo-001',
        customerId: expectedCustomerId,
      });

      await service.sendReviewRequest(TENANT_ID, 'wo-001');

      expect(mockPublicTokenService.generateToken).toHaveBeenCalledWith(
        TENANT_ID,
        'REVIEW_REQUEST',
        'wo-001',
        'WorkOrder',
        168,
        expect.objectContaining({ customerId: expectedCustomerId }),
      );
    });
  });
});
