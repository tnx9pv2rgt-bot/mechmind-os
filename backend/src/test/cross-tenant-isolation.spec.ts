import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../common/services/prisma.service';
import { EncryptionService } from '../common/services/encryption.service';
import { LoggerService } from '../common/services/logger.service';
import { QueueService } from '../common/services/queue.service';
import { CustomerService } from '../customer/services/customer.service';
import { BookingService } from '../booking/services/booking.service';
import { InvoiceService } from '../invoice/invoice.service';
import { WorkOrderService } from '../work-order/work-order.service';
import { EstimateService } from '../estimate/services/estimate.service';
import { CannedJobService } from '../canned-job/canned-job.service';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TENANT_A = 'tenant-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const TENANT_B = 'tenant-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const RECORD_ID = 'record-0001';

// ---------------------------------------------------------------------------
// Shared mock factories
// ---------------------------------------------------------------------------

function mockLogger(): Record<string, jest.Mock> {
  return { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
}

// ---------------------------------------------------------------------------
// Cross-Tenant Isolation Tests
// ---------------------------------------------------------------------------

describe('Cross-Tenant Isolation', () => {
  // =======================================================================
  // CustomerService
  // =======================================================================
  describe('CustomerService', () => {
    let service: CustomerService;
    let prisma: {
      withTenant: jest.Mock;
      customer: {
        findFirst: jest.Mock;
        findMany: jest.Mock;
        count: jest.Mock;
        create: jest.Mock;
      };
    };

    const mockEncryption = {
      encrypt: jest.fn((val: string) => `enc_${val}`),
      decrypt: jest.fn((val: string) => val.replace('enc_', '')),
      hash: jest.fn((val: string) => `hash_${val}`),
    };

    beforeEach(async () => {
      prisma = {
        withTenant: jest.fn((tenantId: string, cb: (p: unknown) => unknown) => cb(prisma)),
        customer: {
          findFirst: jest.fn(),
          findMany: jest.fn(),
          count: jest.fn(),
          create: jest.fn(),
        },
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CustomerService,
          { provide: PrismaService, useValue: prisma },
          { provide: EncryptionService, useValue: mockEncryption },
          { provide: LoggerService, useValue: mockLogger() },
        ],
      }).compile();

      service = module.get<CustomerService>(CustomerService);
    });

    it('findAll scopes query by tenantId', async () => {
      prisma.customer.findMany.mockResolvedValue([]);
      prisma.customer.count.mockResolvedValue(0);

      await service.findAll(TENANT_A);

      expect(prisma.withTenant).toHaveBeenCalledWith(TENANT_A, expect.any(Function));
      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_A }),
        }),
      );
    });

    it('findAll with TENANT_B does not use TENANT_A', async () => {
      prisma.customer.findMany.mockResolvedValue([]);
      prisma.customer.count.mockResolvedValue(0);

      await service.findAll(TENANT_B);

      expect(prisma.withTenant).toHaveBeenCalledWith(TENANT_B, expect.any(Function));
      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_B }),
        }),
      );
    });

    it('findById scopes query by tenantId', async () => {
      prisma.customer.findFirst.mockResolvedValue({
        id: RECORD_ID,
        tenantId: TENANT_A,
        encryptedPhone: 'enc_phone',
        encryptedEmail: null,
        encryptedFirstName: null,
        encryptedLastName: null,
        gdprConsent: true,
        marketingConsent: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.findById(TENANT_A, RECORD_ID);

      expect(prisma.customer.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: RECORD_ID, tenantId: TENANT_A }),
        }),
      );
    });

    it('findById with wrong tenant throws NotFoundException', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);

      await expect(service.findById(TENANT_B, RECORD_ID)).rejects.toThrow(NotFoundException);
    });

    it('findAll count also scopes by tenantId', async () => {
      prisma.customer.findMany.mockResolvedValue([]);
      prisma.customer.count.mockResolvedValue(0);

      await service.findAll(TENANT_A);

      expect(prisma.customer.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_A }),
        }),
      );
    });
  });

  // =======================================================================
  // BookingService
  // =======================================================================
  describe('BookingService', () => {
    let service: BookingService;
    let prisma: {
      withTenant: jest.Mock;
      acquireAdvisoryLock: jest.Mock;
      releaseAdvisoryLock: jest.Mock;
      withSerializableTransaction: jest.Mock;
      booking: {
        findMany: jest.Mock;
        findFirst: jest.Mock;
        count: jest.Mock;
        create: jest.Mock;
        update: jest.Mock;
      };
      bookingSlot: { findFirst: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
      bookingEvent: { create: jest.Mock; update: jest.Mock };
      customer: { findFirst: jest.Mock };
    };

    beforeEach(async () => {
      prisma = {
        withTenant: jest.fn((_, cb) => cb(prisma)),
        acquireAdvisoryLock: jest.fn().mockResolvedValue(true),
        releaseAdvisoryLock: jest.fn().mockResolvedValue(undefined),
        withSerializableTransaction: jest.fn(cb => cb(prisma)),
        booking: {
          findMany: jest.fn().mockResolvedValue([]),
          findFirst: jest.fn(),
          count: jest.fn().mockResolvedValue(0),
          create: jest.fn(),
          update: jest.fn(),
        },
        bookingSlot: {
          findFirst: jest.fn(),
          findUnique: jest.fn(),
          update: jest.fn(),
        },
        bookingEvent: { create: jest.fn(), update: jest.fn() },
        customer: { findFirst: jest.fn() },
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          BookingService,
          { provide: PrismaService, useValue: prisma },
          { provide: EventEmitter2, useValue: { emit: jest.fn() } },
          { provide: QueueService, useValue: { addBookingJob: jest.fn() } },
          { provide: LoggerService, useValue: mockLogger() },
        ],
      }).compile();

      service = module.get<BookingService>(BookingService);
    });

    it('findAll scopes query by tenantId', async () => {
      await service.findAll(TENANT_A);

      expect(prisma.withTenant).toHaveBeenCalledWith(TENANT_A, expect.any(Function));
      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_A }),
        }),
      );
    });

    it('findAll with TENANT_B isolates from TENANT_A', async () => {
      await service.findAll(TENANT_B);

      expect(prisma.withTenant).toHaveBeenCalledWith(TENANT_B, expect.any(Function));
      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_B }),
        }),
      );
    });

    it('findById scopes by tenantId via withTenant', async () => {
      prisma.booking.findFirst.mockResolvedValue({ id: RECORD_ID, tenantId: TENANT_A });

      await service.findById(TENANT_A, RECORD_ID);

      expect(prisma.withTenant).toHaveBeenCalledWith(TENANT_A, expect.any(Function));
    });

    it('findById with wrong tenant throws NotFoundException', async () => {
      prisma.booking.findFirst.mockResolvedValue(null);

      await expect(service.findById(TENANT_B, RECORD_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // =======================================================================
  // InvoiceService
  // =======================================================================
  describe('InvoiceService', () => {
    let service: InvoiceService;
    let prisma: {
      invoice: {
        findFirst: jest.Mock;
        findMany: jest.Mock;
        count: jest.Mock;
        create: jest.Mock;
        update: jest.Mock;
        delete: jest.Mock;
        groupBy: jest.Mock;
        aggregate: jest.Mock;
      };
      $transaction: jest.Mock;
    };

    beforeEach(async () => {
      prisma = {
        invoice: {
          findFirst: jest.fn(),
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
          groupBy: jest.fn(),
          aggregate: jest.fn(),
        },
        $transaction: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          InvoiceService,
          { provide: PrismaService, useValue: prisma },
          {
            provide: EncryptionService,
            useValue: {
              encrypt: jest.fn((v: string) => `enc_${v}`),
              decrypt: jest.fn((v: string) => v.replace('enc_', '')),
              hash: jest.fn((v: string) => `hash_${v}`),
            },
          },
        ],
      }).compile();

      service = module.get<InvoiceService>(InvoiceService);
    });

    it('findAll scopes query by tenantId', async () => {
      await service.findAll(TENANT_A);

      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_A }),
        }),
      );
    });

    it('findAll count scopes by tenantId', async () => {
      await service.findAll(TENANT_A);

      expect(prisma.invoice.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_A }),
        }),
      );
    });

    it('findAll with TENANT_B does not leak TENANT_A data', async () => {
      await service.findAll(TENANT_B);

      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_B }),
        }),
      );
      // Ensure TENANT_A was never used
      const callArgs = prisma.invoice.findMany.mock.calls[0][0];
      expect(callArgs.where.tenantId).not.toBe(TENANT_A);
    });

    it('findOne scopes by tenantId and id', async () => {
      prisma.invoice.findFirst.mockResolvedValue({ id: RECORD_ID, tenantId: TENANT_A });

      await service.findOne(TENANT_A, RECORD_ID);

      expect(prisma.invoice.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: RECORD_ID, tenantId: TENANT_A }),
        }),
      );
    });

    it('findOne with wrong tenant throws NotFoundException', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);

      await expect(service.findOne(TENANT_B, RECORD_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // =======================================================================
  // WorkOrderService
  // =======================================================================
  describe('WorkOrderService', () => {
    let service: WorkOrderService;
    let prisma: {
      workOrder: {
        findFirst: jest.Mock;
        findMany: jest.Mock;
        count: jest.Mock;
        create: jest.Mock;
        update: jest.Mock;
      };
    };

    beforeEach(async () => {
      prisma = {
        workOrder: {
          findFirst: jest.fn(),
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0),
          create: jest.fn(),
          update: jest.fn(),
        },
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [WorkOrderService, { provide: PrismaService, useValue: prisma }],
      }).compile();

      service = module.get<WorkOrderService>(WorkOrderService);
    });

    it('findAll scopes query by tenantId', async () => {
      await service.findAll(TENANT_A);

      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_A }),
        }),
      );
    });

    it('findAll count scopes by tenantId', async () => {
      await service.findAll(TENANT_A);

      expect(prisma.workOrder.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_A }),
        }),
      );
    });

    it('findOne scopes by tenantId and id', async () => {
      prisma.workOrder.findFirst.mockResolvedValue({ id: RECORD_ID, tenantId: TENANT_A });

      await service.findOne(TENANT_A, RECORD_ID);

      expect(prisma.workOrder.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: RECORD_ID, tenantId: TENANT_A }),
        }),
      );
    });

    it('findOne with wrong tenant throws NotFoundException', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(null);

      await expect(service.findOne(TENANT_B, RECORD_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // =======================================================================
  // EstimateService
  // =======================================================================
  describe('EstimateService', () => {
    let service: EstimateService;
    let prisma: {
      estimate: {
        findFirst: jest.Mock;
        findMany: jest.Mock;
        count: jest.Mock;
        create: jest.Mock;
        update: jest.Mock;
      };
      $transaction: jest.Mock;
    };

    beforeEach(async () => {
      prisma = {
        estimate: {
          findFirst: jest.fn(),
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0),
          create: jest.fn(),
          update: jest.fn(),
        },
        $transaction: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EstimateService,
          { provide: PrismaService, useValue: prisma },
          { provide: EventEmitter2, useValue: { emit: jest.fn() } },
          { provide: LoggerService, useValue: mockLogger() },
        ],
      }).compile();

      service = module.get<EstimateService>(EstimateService);
    });

    it('findAll scopes query by tenantId', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await service.findAll(TENANT_A, {});

      // EstimateService uses $transaction([findMany, count])
      // Verify the findMany call includes tenantId in the where clause
      expect(prisma.estimate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_A }),
        }),
      );
    });

    it('findAll with TENANT_B does not leak TENANT_A data', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await service.findAll(TENANT_B, {});

      expect(prisma.estimate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_B }),
        }),
      );
    });

    it('findById scopes by tenantId and id', async () => {
      prisma.estimate.findFirst.mockResolvedValue({ id: RECORD_ID, tenantId: TENANT_A });

      await service.findById(TENANT_A, RECORD_ID);

      expect(prisma.estimate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: RECORD_ID, tenantId: TENANT_A }),
        }),
      );
    });

    it('findById with wrong tenant throws NotFoundException', async () => {
      prisma.estimate.findFirst.mockResolvedValue(null);

      await expect(service.findById(TENANT_B, RECORD_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // =======================================================================
  // CannedJobService
  // =======================================================================
  describe('CannedJobService', () => {
    let service: CannedJobService;
    let prisma: {
      cannedJob: {
        findFirst: jest.Mock;
        findMany: jest.Mock;
        create: jest.Mock;
        update: jest.Mock;
        delete: jest.Mock;
        count: jest.Mock;
      };
    };

    beforeEach(async () => {
      prisma = {
        cannedJob: {
          findFirst: jest.fn(),
          findMany: jest.fn().mockResolvedValue([]),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
          count: jest.fn().mockResolvedValue(0),
        },
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [CannedJobService, { provide: PrismaService, useValue: prisma }],
      }).compile();

      service = module.get<CannedJobService>(CannedJobService);
    });

    it('findAll scopes query by tenantId', async () => {
      await service.findAll(TENANT_A, {});

      expect(prisma.cannedJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_A }),
        }),
      );
    });

    it('findAll with TENANT_B does not leak TENANT_A data', async () => {
      await service.findAll(TENANT_B, {});

      expect(prisma.cannedJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_B }),
        }),
      );
    });

    it('findById scopes by tenantId and id', async () => {
      prisma.cannedJob.findFirst.mockResolvedValue({ id: RECORD_ID, tenantId: TENANT_A });

      await service.findById(TENANT_A, RECORD_ID);

      expect(prisma.cannedJob.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: RECORD_ID, tenantId: TENANT_A }),
        }),
      );
    });

    it('findById with wrong tenant throws NotFoundException', async () => {
      prisma.cannedJob.findFirst.mockResolvedValue(null);

      await expect(service.findById(TENANT_B, RECORD_ID)).rejects.toThrow(NotFoundException);
    });
  });
});
