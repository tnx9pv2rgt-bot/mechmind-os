import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { MembershipService } from './membership.service';
import { PrismaService } from '@common/services/prisma.service';
import { Prisma } from '@prisma/client';

const TENANT_ID = 'tenant-uuid-001';

function mockProgram(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'prog-uuid-001',
    tenantId: TENANT_ID,
    name: 'Piano Premium',
    description: 'Piano con tagliando incluso',
    priceMonthly: new Prisma.Decimal(29.99),
    priceYearly: new Prisma.Decimal(299.99),
    stripePriceMonthlyId: null,
    stripePriceYearlyId: null,
    benefits: [
      {
        type: 'OIL_CHANGE',
        description: 'Tagliando incluso',
        maxPerMonth: 1,
        discountPercent: 100,
      },
      { type: 'BRAKE_CHECK', description: 'Controllo freni', maxPerMonth: 2, discountPercent: 50 },
    ],
    maxRedemptionsPerMonth: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function mockMembership(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'mem-uuid-001',
    tenantId: TENANT_ID,
    customerId: 'cust-uuid-001',
    programId: 'prog-uuid-001',
    stripeSubscriptionId: null,
    status: 'ACTIVE',
    startDate: new Date('2026-03-01'),
    endDate: new Date('2026-04-01'),
    createdAt: new Date(),
    updatedAt: new Date(),
    program: mockProgram(),
    redemptions: [],
    ...overrides,
  };
}

function mockRedemption(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'red-uuid-001',
    membershipId: 'mem-uuid-001',
    benefitType: 'OIL_CHANGE',
    bookingId: null,
    workOrderId: null,
    redeemedAt: new Date(),
    valueCents: new Prisma.Decimal(5000),
    ...overrides,
  };
}

describe('MembershipService', () => {
  let service: MembershipService;
  let prisma: {
    membershipProgram: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
    };
    customerMembership: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    membershipRedemption: {
      create: jest.Mock;
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    prisma = {
      membershipProgram: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      customerMembership: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      membershipRedemption: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [MembershipService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(MembershipService);
  });

  // ─── createProgram ───
  describe('createProgram', () => {
    it('should create a new membership program', async () => {
      const dto = {
        name: 'Piano Premium',
        description: 'Piano con tagliando incluso',
        priceMonthly: 29.99,
        priceYearly: 299.99,
        benefits: [
          {
            type: 'OIL_CHANGE',
            description: 'Tagliando incluso',
            maxPerMonth: 1,
            discountPercent: 100,
          },
        ],
      };
      const expected = mockProgram();
      prisma.membershipProgram.findUnique.mockResolvedValueOnce(null);
      prisma.membershipProgram.create.mockResolvedValueOnce(expected);

      const result = await service.createProgram(TENANT_ID, dto);

      expect(prisma.membershipProgram.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          name: dto.name,
          isActive: true,
        }),
      });
      expect(result).toEqual(expected);
      expect(result.id).toBe('prog-uuid-001');
    });

    it('should throw ConflictException for duplicate name', async () => {
      prisma.membershipProgram.findUnique.mockResolvedValueOnce(mockProgram());

      await expect(
        service.createProgram(TENANT_ID, {
          name: 'Piano Premium',
          priceMonthly: 29.99,
          benefits: [],
        }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.membershipProgram.create).not.toHaveBeenCalled();
    });
  });

  // ─── updateProgram ───
  describe('updateProgram', () => {
    it('should update program details', async () => {
      const prog = mockProgram();
      prisma.membershipProgram.findFirst.mockResolvedValueOnce(prog);
      prisma.membershipProgram.update.mockResolvedValueOnce({ ...prog, description: 'Aggiornato' });

      const result = await service.updateProgram(TENANT_ID, 'prog-uuid-001', {
        description: 'Aggiornato',
      });

      expect(result.description).toBe('Aggiornato');
      expect(prisma.membershipProgram.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prog-uuid-001' },
          data: expect.objectContaining({ description: 'Aggiornato' }),
        }),
      );
    });

    it('should throw NotFoundException for missing program', async () => {
      prisma.membershipProgram.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.updateProgram(TENANT_ID, 'nonexistent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.membershipProgram.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException for duplicate name on rename', async () => {
      prisma.membershipProgram.findFirst.mockResolvedValueOnce(mockProgram());
      prisma.membershipProgram.findUnique.mockResolvedValueOnce(
        mockProgram({ id: 'other', name: 'Piano Base' }),
      );

      await expect(
        service.updateProgram(TENANT_ID, 'prog-uuid-001', { name: 'Piano Base' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.membershipProgram.update).not.toHaveBeenCalled();
    });
  });

  // ─── listPrograms ───
  describe('listPrograms', () => {
    it('should return all programs for tenant', async () => {
      const programs = [mockProgram()];
      prisma.membershipProgram.findMany.mockResolvedValueOnce(programs);

      const result = await service.listPrograms(TENANT_ID);

      expect(result).toEqual(programs);
      expect(result).toHaveLength(1);
      expect(prisma.membershipProgram.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  // ─── getProgram ───
  describe('getProgram', () => {
    it('should return program by ID', async () => {
      const prog = mockProgram();
      prisma.membershipProgram.findFirst.mockResolvedValueOnce(prog);

      const result = await service.getProgram(TENANT_ID, 'prog-uuid-001');

      expect(result).toEqual(prog);
      expect((result as Record<string, unknown>).id).toBe('prog-uuid-001');
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.membershipProgram.findFirst.mockResolvedValueOnce(null);

      await expect(service.getProgram(TENANT_ID, 'nonexistent')).rejects.toThrow(NotFoundException);
      expect(prisma.membershipProgram.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'nonexistent', tenantId: TENANT_ID },
        }),
      );
    });
  });

  // ─── deleteProgram ───
  describe('deleteProgram', () => {
    it('should delete program with no active memberships', async () => {
      prisma.membershipProgram.findFirst.mockResolvedValueOnce(mockProgram());
      prisma.customerMembership.count.mockResolvedValueOnce(0);
      prisma.membershipProgram.deleteMany.mockResolvedValueOnce({ count: 1 });

      await service.deleteProgram(TENANT_ID, 'prog-uuid-001');

      expect(prisma.membershipProgram.deleteMany).toHaveBeenCalledWith({
        where: { id: 'prog-uuid-001', tenantId: TENANT_ID },
      });
      expect(prisma.customerMembership.count).toHaveBeenCalled();
    });

    it('should throw BadRequestException if active memberships exist', async () => {
      prisma.membershipProgram.findFirst.mockResolvedValueOnce(mockProgram());
      prisma.customerMembership.count.mockResolvedValueOnce(3);

      await expect(service.deleteProgram(TENANT_ID, 'prog-uuid-001')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.membershipProgram.deleteMany).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for missing program', async () => {
      prisma.membershipProgram.findFirst.mockResolvedValueOnce(null);

      await expect(service.deleteProgram(TENANT_ID, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.customerMembership.count).not.toHaveBeenCalled();
    });
  });

  // ─── enrollCustomer ───
  describe('enrollCustomer', () => {
    it('should enroll customer with MONTHLY billing', async () => {
      const prog = mockProgram();
      prisma.membershipProgram.findFirst.mockResolvedValueOnce(prog);
      prisma.customerMembership.findFirst.mockResolvedValueOnce(null);
      const created = mockMembership();
      prisma.customerMembership.create.mockResolvedValueOnce(created);

      const result = await service.enrollCustomer(
        TENANT_ID,
        'cust-uuid-001',
        'prog-uuid-001',
        'MONTHLY',
      );

      expect(prisma.customerMembership.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          customerId: 'cust-uuid-001',
          programId: 'prog-uuid-001',
          status: 'ACTIVE',
        }),
        include: { program: true },
      });
      expect(result).toEqual(created);
      expect(result.status).toBe('ACTIVE');
    });

    it('should throw NotFoundException for inactive program', async () => {
      prisma.membershipProgram.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.enrollCustomer(TENANT_ID, 'cust-uuid-001', 'prog-uuid-001', 'MONTHLY'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.customerMembership.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if already enrolled', async () => {
      prisma.membershipProgram.findFirst.mockResolvedValueOnce(mockProgram());
      prisma.customerMembership.findFirst.mockResolvedValueOnce(mockMembership());

      await expect(
        service.enrollCustomer(TENANT_ID, 'cust-uuid-001', 'prog-uuid-001', 'MONTHLY'),
      ).rejects.toThrow(ConflictException);
      expect(prisma.customerMembership.create).not.toHaveBeenCalled();
    });
  });

  // ─── cancelMembership ───
  describe('cancelMembership', () => {
    it('should cancel an active membership', async () => {
      prisma.customerMembership.findFirst.mockResolvedValueOnce(mockMembership());
      const cancelled = mockMembership({ status: 'CANCELLED' });
      prisma.customerMembership.update.mockResolvedValueOnce(cancelled);

      const result = await service.cancelMembership(TENANT_ID, 'mem-uuid-001');

      expect(result.status).toBe('CANCELLED');
      expect(prisma.customerMembership.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'mem-uuid-001' },
          data: expect.objectContaining({ status: 'CANCELLED' }),
        }),
      );
    });

    it('should throw BadRequestException if already cancelled', async () => {
      prisma.customerMembership.findFirst.mockResolvedValueOnce(
        mockMembership({ status: 'CANCELLED' }),
      );

      await expect(service.cancelMembership(TENANT_ID, 'mem-uuid-001')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.customerMembership.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.customerMembership.findFirst.mockResolvedValueOnce(null);

      await expect(service.cancelMembership(TENANT_ID, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.customerMembership.update).not.toHaveBeenCalled();
    });
  });

  // ─── pauseMembership ───
  describe('pauseMembership', () => {
    it('should pause an active membership', async () => {
      prisma.customerMembership.findFirst.mockResolvedValueOnce(mockMembership());
      const paused = mockMembership({ status: 'PAUSED' });
      prisma.customerMembership.update.mockResolvedValueOnce(paused);

      const result = await service.pauseMembership(TENANT_ID, 'mem-uuid-001');

      expect(result.status).toBe('PAUSED');
      expect(prisma.customerMembership.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException if not active', async () => {
      prisma.customerMembership.findFirst.mockResolvedValueOnce(
        mockMembership({ status: 'PAUSED' }),
      );

      await expect(service.pauseMembership(TENANT_ID, 'mem-uuid-001')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.customerMembership.update).not.toHaveBeenCalled();
    });
  });

  // ─── getCustomerMemberships ───
  describe('getCustomerMemberships', () => {
    it('should return all memberships for customer', async () => {
      const memberships = [mockMembership()];
      prisma.customerMembership.findMany.mockResolvedValueOnce(memberships);

      const result = await service.getCustomerMemberships(TENANT_ID, 'cust-uuid-001');

      expect(result).toEqual(memberships);
      expect(result).toHaveLength(1);
      expect(prisma.customerMembership.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, customerId: 'cust-uuid-001' },
        include: { program: true, redemptions: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  // ─── checkBenefits ───
  describe('checkBenefits', () => {
    it('should return available benefits with usage counts', async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const mem = mockMembership({
        redemptions: [
          mockRedemption({
            benefitType: 'OIL_CHANGE',
            redeemedAt: new Date(startOfMonth.getTime() + 86400000),
          }),
        ],
      });
      prisma.customerMembership.findMany.mockResolvedValueOnce([mem]);

      const result = await service.checkBenefits(TENANT_ID, 'cust-uuid-001');

      expect(result).toHaveLength(1);
      expect(result[0].programName).toBe('Piano Premium');
      const oilBenefit = result[0].benefits.find(b => b.type === 'OIL_CHANGE');
      expect(oilBenefit).toBeDefined();
      expect(oilBenefit!.usedThisMonth).toBe(1);
      expect(oilBenefit!.remaining).toBe(0);
      expect(prisma.customerMembership.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          customerId: 'cust-uuid-001',
          status: 'ACTIVE',
        },
        include: { program: true, redemptions: true },
      });
    });

    it('should return empty array if no active memberships', async () => {
      prisma.customerMembership.findMany.mockResolvedValueOnce([]);

      const result = await service.checkBenefits(TENANT_ID, 'cust-uuid-001');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  // ─── redeemBenefit ───
  describe('redeemBenefit', () => {
    it('should redeem a benefit successfully', async () => {
      prisma.customerMembership.findFirst.mockResolvedValueOnce(mockMembership());
      const redemption = mockRedemption();
      prisma.membershipRedemption.create.mockResolvedValueOnce(redemption);

      const result = await service.redeemBenefit(
        TENANT_ID,
        'mem-uuid-001',
        'OIL_CHANGE',
        'booking-001',
        undefined,
        5000,
      );

      expect(prisma.membershipRedemption.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          membershipId: 'mem-uuid-001',
          benefitType: 'OIL_CHANGE',
          bookingId: 'booking-001',
        }),
      });
      expect(result).toEqual(redemption);
      expect(result.id).toBe('red-uuid-001');
    });

    it('should throw NotFoundException if membership not found', async () => {
      prisma.customerMembership.findFirst.mockResolvedValueOnce(null);

      await expect(service.redeemBenefit(TENANT_ID, 'nonexistent', 'OIL_CHANGE')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.membershipRedemption.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid benefit type', async () => {
      prisma.customerMembership.findFirst.mockResolvedValueOnce(mockMembership());

      await expect(service.redeemBenefit(TENANT_ID, 'mem-uuid-001', 'NONEXISTENT')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.membershipRedemption.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when monthly limit reached', async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      prisma.customerMembership.findFirst.mockResolvedValueOnce(
        mockMembership({
          redemptions: [
            mockRedemption({
              benefitType: 'OIL_CHANGE',
              redeemedAt: new Date(startOfMonth.getTime() + 86400000),
            }),
          ],
        }),
      );

      await expect(service.redeemBenefit(TENANT_ID, 'mem-uuid-001', 'OIL_CHANGE')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.membershipRedemption.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when total monthly limit reached', async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const recentDate = new Date(startOfMonth.getTime() + 86400000);
      prisma.customerMembership.findFirst.mockResolvedValueOnce(
        mockMembership({
          redemptions: [
            mockRedemption({ benefitType: 'BRAKE_CHECK', redeemedAt: recentDate }),
            mockRedemption({ benefitType: 'BRAKE_CHECK', redeemedAt: recentDate, id: 'red-2' }),
            mockRedemption({ benefitType: 'OIL_CHANGE', redeemedAt: recentDate, id: 'red-3' }),
          ],
          program: mockProgram({
            maxRedemptionsPerMonth: 3,
            benefits: [
              {
                type: 'OIL_CHANGE',
                description: 'Tagliando incluso',
                maxPerMonth: 5, // Increase individual limit so we pass first check
                discountPercent: 100,
              },
              {
                type: 'BRAKE_CHECK',
                description: 'Controllo freni',
                maxPerMonth: 5,
                discountPercent: 50,
              },
            ],
          }),
        }),
      );

      // Try to redeem OIL_CHANGE (already 1 in month, maxPerMonth 5, so passes first check)
      // But total is 3, maxRedemptions is 3, so should fail on second check
      await expect(service.redeemBenefit(TENANT_ID, 'mem-uuid-001', 'OIL_CHANGE')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.membershipRedemption.create).not.toHaveBeenCalled();
    });
  });

  // ─── enrollCustomer — additional branches ───
  describe('enrollCustomer — additional branches', () => {
    it('should enroll customer with YEARLY billing (endDate +1 year)', async () => {
      prisma.membershipProgram.findFirst.mockResolvedValueOnce(mockProgram());
      prisma.customerMembership.findFirst.mockResolvedValueOnce(null);
      prisma.customerMembership.create.mockResolvedValueOnce(mockMembership());

      await service.enrollCustomer(TENANT_ID, 'cust-uuid-001', 'prog-uuid-001', 'YEARLY');

      const createCall = prisma.customerMembership.create.mock.calls[0][0];
      const startDate = createCall.data.startDate as Date;
      const endDate = createCall.data.endDate as Date;

      // YEARLY should add exactly 1 year
      expect(endDate.getFullYear() - startDate.getFullYear()).toBe(1);
      expect(prisma.customerMembership.create).toHaveBeenCalled();
    });

    it('should log when Stripe price ID is configured for MONTHLY', async () => {
      prisma.membershipProgram.findFirst.mockResolvedValueOnce(
        mockProgram({ stripePriceMonthlyId: 'price_monthly_123' }),
      );
      prisma.customerMembership.findFirst.mockResolvedValueOnce(null);
      prisma.customerMembership.create.mockResolvedValueOnce(mockMembership());

      await service.enrollCustomer(TENANT_ID, 'cust-uuid-001', 'prog-uuid-001', 'MONTHLY');

      expect(prisma.customerMembership.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            programId: 'prog-uuid-001',
          }),
        }),
      );
    });

    it('should log when Stripe price ID is configured for YEARLY', async () => {
      prisma.membershipProgram.findFirst.mockResolvedValueOnce(
        mockProgram({ stripePriceYearlyId: 'price_yearly_456' }),
      );
      prisma.customerMembership.findFirst.mockResolvedValueOnce(null);
      prisma.customerMembership.create.mockResolvedValueOnce(mockMembership());

      await service.enrollCustomer(TENANT_ID, 'cust-uuid-001', 'prog-uuid-001', 'YEARLY');

      expect(prisma.customerMembership.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            programId: 'prog-uuid-001',
          }),
        }),
      );
    });
  });

  // ─── updateProgram — additional branches ───
  describe('updateProgram — additional branches', () => {
    it('should skip duplicate check when name is unchanged', async () => {
      const prog = mockProgram({ name: 'Piano Premium' });
      prisma.membershipProgram.findFirst.mockResolvedValueOnce(prog);
      prisma.membershipProgram.update.mockResolvedValueOnce(prog);

      await service.updateProgram(TENANT_ID, 'prog-uuid-001', { name: 'Piano Premium' });

      expect(prisma.membershipProgram.findUnique).not.toHaveBeenCalled();
      expect(prisma.membershipProgram.update).toHaveBeenCalled();
    });

    it('should update all optional fields', async () => {
      const prog = mockProgram();
      prisma.membershipProgram.findFirst.mockResolvedValueOnce(prog);
      prisma.membershipProgram.findUnique.mockResolvedValueOnce(null);
      prisma.membershipProgram.update.mockResolvedValueOnce(prog);

      await service.updateProgram(TENANT_ID, 'prog-uuid-001', {
        name: 'New Name',
        description: 'New desc',
        priceMonthly: 39.99,
        priceYearly: 399.99,
        stripePriceMonthlyId: 'price_m_new',
        stripePriceYearlyId: 'price_y_new',
        benefits: [{ type: 'TEST', description: 'Test', maxPerMonth: 1, discountPercent: 100 }],
        maxRedemptionsPerMonth: 5,
        isActive: false,
      });

      expect(prisma.membershipProgram.update).toHaveBeenCalled();
      expect(prisma.membershipProgram.findUnique).toHaveBeenCalled();
    });
  });

  // ─── checkBenefits — additional branches ───
  describe('checkBenefits — additional branches', () => {
    it('should handle program with no benefits (defaults to empty array)', async () => {
      const mem = mockMembership({
        program: mockProgram({ benefits: null }),
        redemptions: [],
      });
      prisma.customerMembership.findMany.mockResolvedValueOnce([mem]);

      const result = await service.checkBenefits(TENANT_ID, 'cust-uuid-001');

      expect(result).toHaveLength(1);
      expect(result[0].benefits).toEqual([]);
      expect(prisma.customerMembership.findMany).toHaveBeenCalled();
    });
  });

  // ─── redeemBenefit — additional branches ───
  describe('redeemBenefit — additional branches', () => {
    it('should redeem with workOrderId and no bookingId', async () => {
      prisma.customerMembership.findFirst.mockResolvedValueOnce(mockMembership());
      prisma.membershipRedemption.create.mockResolvedValueOnce(mockRedemption());

      await service.redeemBenefit(
        TENANT_ID,
        'mem-uuid-001',
        'OIL_CHANGE',
        undefined,
        'wo-001',
        3000,
      );

      expect(prisma.membershipRedemption.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bookingId: null,
          workOrderId: 'wo-001',
        }),
      });
      expect(prisma.membershipRedemption.create).toHaveBeenCalled();
    });

    it('should default valueCents to 0 when not provided', async () => {
      prisma.customerMembership.findFirst.mockResolvedValueOnce(mockMembership());
      prisma.membershipRedemption.create.mockResolvedValueOnce(mockRedemption());

      await service.redeemBenefit(TENANT_ID, 'mem-uuid-001', 'OIL_CHANGE');

      expect(prisma.membershipRedemption.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          valueCents: new Prisma.Decimal(0),
        }),
      });
      expect(prisma.membershipRedemption.create).toHaveBeenCalled();
    });

    it('should allow redemption if old redemptions do not count (different month)', async () => {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prisma.customerMembership.findFirst.mockResolvedValueOnce(
        mockMembership({
          redemptions: [
            mockRedemption({
              benefitType: 'OIL_CHANGE',
              redeemedAt: lastMonth,
            }),
          ],
        }),
      );
      prisma.membershipRedemption.create.mockResolvedValueOnce(mockRedemption());

      const result = await service.redeemBenefit(TENANT_ID, 'mem-uuid-001', 'OIL_CHANGE');

      expect(result).toBeDefined();
      expect(prisma.membershipRedemption.create).toHaveBeenCalled();
    });

    it('should successfully redeem when total count is below limit', async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const recentDate = new Date(startOfMonth.getTime() + 86400000);
      prisma.customerMembership.findFirst.mockResolvedValueOnce(
        mockMembership({
          redemptions: [mockRedemption({ benefitType: 'BRAKE_CHECK', redeemedAt: recentDate })],
          program: mockProgram({ maxRedemptionsPerMonth: 3 }),
        }),
      );
      prisma.membershipRedemption.create.mockResolvedValueOnce(mockRedemption());

      const result = await service.redeemBenefit(TENANT_ID, 'mem-uuid-001', 'OIL_CHANGE');

      expect(result).toBeDefined();
      expect(result.id).toBe('red-uuid-001');
      expect(prisma.membershipRedemption.create).toHaveBeenCalled();
    });
  });

  // ─── getRedemptionHistory ───
  describe('getRedemptionHistory', () => {
    it('should return redemption history for membership', async () => {
      prisma.customerMembership.findFirst.mockResolvedValueOnce(mockMembership());
      const redemptions = [mockRedemption()];
      prisma.membershipRedemption.findMany.mockResolvedValueOnce(redemptions);

      const result = await service.getRedemptionHistory(TENANT_ID, 'mem-uuid-001');

      expect(result).toEqual(redemptions);
      expect(result).toHaveLength(1);
      expect(prisma.membershipRedemption.findMany).toHaveBeenCalledWith({
        where: { membershipId: 'mem-uuid-001' },
        orderBy: { redeemedAt: 'desc' },
      });
    });

    it('should throw NotFoundException if membership not found', async () => {
      prisma.customerMembership.findFirst.mockResolvedValueOnce(null);

      await expect(service.getRedemptionHistory(TENANT_ID, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.membershipRedemption.findMany).not.toHaveBeenCalled();
    });
  });
});
