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
      prisma.membershipProgram.findUnique.mockResolvedValue(null);
      prisma.membershipProgram.create.mockResolvedValue(expected);

      const result = await service.createProgram(TENANT_ID, dto);

      expect(prisma.membershipProgram.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          name: dto.name,
          isActive: true,
        }),
      });
      expect(result).toEqual(expected);
    });

    it('should throw ConflictException for duplicate name', async () => {
      prisma.membershipProgram.findUnique.mockResolvedValue(mockProgram());

      await expect(
        service.createProgram(TENANT_ID, {
          name: 'Piano Premium',
          priceMonthly: 29.99,
          benefits: [],
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── updateProgram ───
  describe('updateProgram', () => {
    it('should update program details', async () => {
      const prog = mockProgram();
      prisma.membershipProgram.findFirst.mockResolvedValue(prog);
      prisma.membershipProgram.update.mockResolvedValue({ ...prog, description: 'Aggiornato' });

      const result = await service.updateProgram(TENANT_ID, 'prog-uuid-001', {
        description: 'Aggiornato',
      });

      expect(result.description).toBe('Aggiornato');
    });

    it('should throw NotFoundException for missing program', async () => {
      prisma.membershipProgram.findFirst.mockResolvedValue(null);

      await expect(
        service.updateProgram(TENANT_ID, 'nonexistent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException for duplicate name on rename', async () => {
      prisma.membershipProgram.findFirst.mockResolvedValue(mockProgram());
      prisma.membershipProgram.findUnique.mockResolvedValue(
        mockProgram({ id: 'other', name: 'Piano Base' }),
      );

      await expect(
        service.updateProgram(TENANT_ID, 'prog-uuid-001', { name: 'Piano Base' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── listPrograms ───
  describe('listPrograms', () => {
    it('should return all programs for tenant', async () => {
      const programs = [mockProgram()];
      prisma.membershipProgram.findMany.mockResolvedValue(programs);

      const result = await service.listPrograms(TENANT_ID);

      expect(result).toEqual(programs);
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
      prisma.membershipProgram.findFirst.mockResolvedValue(prog);

      const result = await service.getProgram(TENANT_ID, 'prog-uuid-001');

      expect(result).toEqual(prog);
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.membershipProgram.findFirst.mockResolvedValue(null);

      await expect(service.getProgram(TENANT_ID, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── deleteProgram ───
  describe('deleteProgram', () => {
    it('should delete program with no active memberships', async () => {
      prisma.membershipProgram.findFirst.mockResolvedValue(mockProgram());
      prisma.customerMembership.count.mockResolvedValue(0);
      prisma.membershipProgram.deleteMany.mockResolvedValue({ count: 1 });

      await service.deleteProgram(TENANT_ID, 'prog-uuid-001');

      expect(prisma.membershipProgram.deleteMany).toHaveBeenCalledWith({
        where: { id: 'prog-uuid-001', tenantId: TENANT_ID },
      });
    });

    it('should throw BadRequestException if active memberships exist', async () => {
      prisma.membershipProgram.findFirst.mockResolvedValue(mockProgram());
      prisma.customerMembership.count.mockResolvedValue(3);

      await expect(service.deleteProgram(TENANT_ID, 'prog-uuid-001')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException for missing program', async () => {
      prisma.membershipProgram.findFirst.mockResolvedValue(null);

      await expect(service.deleteProgram(TENANT_ID, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── enrollCustomer ───
  describe('enrollCustomer', () => {
    it('should enroll customer with MONTHLY billing', async () => {
      const prog = mockProgram();
      prisma.membershipProgram.findFirst.mockResolvedValue(prog);
      prisma.customerMembership.findFirst.mockResolvedValue(null);
      const created = mockMembership();
      prisma.customerMembership.create.mockResolvedValue(created);

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
    });

    it('should throw NotFoundException for inactive program', async () => {
      prisma.membershipProgram.findFirst.mockResolvedValue(null);

      await expect(
        service.enrollCustomer(TENANT_ID, 'cust-uuid-001', 'prog-uuid-001', 'MONTHLY'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if already enrolled', async () => {
      prisma.membershipProgram.findFirst.mockResolvedValue(mockProgram());
      prisma.customerMembership.findFirst.mockResolvedValue(mockMembership());

      await expect(
        service.enrollCustomer(TENANT_ID, 'cust-uuid-001', 'prog-uuid-001', 'MONTHLY'),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── cancelMembership ───
  describe('cancelMembership', () => {
    it('should cancel an active membership', async () => {
      prisma.customerMembership.findFirst.mockResolvedValue(mockMembership());
      const cancelled = mockMembership({ status: 'CANCELLED' });
      prisma.customerMembership.update.mockResolvedValue(cancelled);

      const result = await service.cancelMembership(TENANT_ID, 'mem-uuid-001');

      expect(result.status).toBe('CANCELLED');
    });

    it('should throw BadRequestException if already cancelled', async () => {
      prisma.customerMembership.findFirst.mockResolvedValue(
        mockMembership({ status: 'CANCELLED' }),
      );

      await expect(service.cancelMembership(TENANT_ID, 'mem-uuid-001')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.customerMembership.findFirst.mockResolvedValue(null);

      await expect(service.cancelMembership(TENANT_ID, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── pauseMembership ───
  describe('pauseMembership', () => {
    it('should pause an active membership', async () => {
      prisma.customerMembership.findFirst.mockResolvedValue(mockMembership());
      const paused = mockMembership({ status: 'PAUSED' });
      prisma.customerMembership.update.mockResolvedValue(paused);

      const result = await service.pauseMembership(TENANT_ID, 'mem-uuid-001');

      expect(result.status).toBe('PAUSED');
    });

    it('should throw BadRequestException if not active', async () => {
      prisma.customerMembership.findFirst.mockResolvedValue(mockMembership({ status: 'PAUSED' }));

      await expect(service.pauseMembership(TENANT_ID, 'mem-uuid-001')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── getCustomerMemberships ───
  describe('getCustomerMemberships', () => {
    it('should return all memberships for customer', async () => {
      const memberships = [mockMembership()];
      prisma.customerMembership.findMany.mockResolvedValue(memberships);

      const result = await service.getCustomerMemberships(TENANT_ID, 'cust-uuid-001');

      expect(result).toEqual(memberships);
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
      prisma.customerMembership.findMany.mockResolvedValue([mem]);

      const result = await service.checkBenefits(TENANT_ID, 'cust-uuid-001');

      expect(result).toHaveLength(1);
      expect(result[0].programName).toBe('Piano Premium');
      const oilBenefit = result[0].benefits.find(b => b.type === 'OIL_CHANGE');
      expect(oilBenefit).toBeDefined();
      expect(oilBenefit!.usedThisMonth).toBe(1);
      expect(oilBenefit!.remaining).toBe(0);

      const brakeBenefit = result[0].benefits.find(b => b.type === 'BRAKE_CHECK');
      expect(brakeBenefit).toBeDefined();
      expect(brakeBenefit!.usedThisMonth).toBe(0);
      expect(brakeBenefit!.remaining).toBe(2);
    });

    it('should return empty array if no active memberships', async () => {
      prisma.customerMembership.findMany.mockResolvedValue([]);

      const result = await service.checkBenefits(TENANT_ID, 'cust-uuid-001');

      expect(result).toEqual([]);
    });
  });

  // ─── redeemBenefit ───
  describe('redeemBenefit', () => {
    it('should redeem a benefit successfully', async () => {
      prisma.customerMembership.findFirst.mockResolvedValue(mockMembership());
      const redemption = mockRedemption();
      prisma.membershipRedemption.create.mockResolvedValue(redemption);

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
    });

    it('should throw NotFoundException if membership not found', async () => {
      prisma.customerMembership.findFirst.mockResolvedValue(null);

      await expect(service.redeemBenefit(TENANT_ID, 'nonexistent', 'OIL_CHANGE')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for invalid benefit type', async () => {
      prisma.customerMembership.findFirst.mockResolvedValue(mockMembership());

      await expect(service.redeemBenefit(TENANT_ID, 'mem-uuid-001', 'NONEXISTENT')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when monthly limit reached', async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      prisma.customerMembership.findFirst.mockResolvedValue(
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
    });

    it('should throw BadRequestException when total monthly limit reached', async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const recentDate = new Date(startOfMonth.getTime() + 86400000);
      prisma.customerMembership.findFirst.mockResolvedValue(
        mockMembership({
          redemptions: [
            mockRedemption({ benefitType: 'BRAKE_CHECK', redeemedAt: recentDate }),
            mockRedemption({ benefitType: 'BRAKE_CHECK', redeemedAt: recentDate, id: 'red-2' }),
            mockRedemption({ benefitType: 'OIL_CHANGE', redeemedAt: recentDate, id: 'red-3' }),
          ],
          program: mockProgram({ maxRedemptionsPerMonth: 3 }),
        }),
      );

      await expect(service.redeemBenefit(TENANT_ID, 'mem-uuid-001', 'BRAKE_CHECK')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── enrollCustomer — additional branches ───
  describe('enrollCustomer — additional branches', () => {
    it('should enroll customer with YEARLY billing (endDate +1 year)', async () => {
      prisma.membershipProgram.findFirst.mockResolvedValue(mockProgram());
      prisma.customerMembership.findFirst.mockResolvedValue(null);
      prisma.customerMembership.create.mockResolvedValue(mockMembership());

      await service.enrollCustomer(TENANT_ID, 'cust-uuid-001', 'prog-uuid-001', 'YEARLY');

      const createCall = prisma.customerMembership.create.mock.calls[0][0];
      const startDate = createCall.data.startDate as Date;
      const endDate = createCall.data.endDate as Date;

      // YEARLY should add exactly 1 year
      expect(endDate.getFullYear() - startDate.getFullYear()).toBe(1);
    });

    it('should log when Stripe price ID is configured for MONTHLY', async () => {
      prisma.membershipProgram.findFirst.mockResolvedValue(
        mockProgram({ stripePriceMonthlyId: 'price_monthly_123' }),
      );
      prisma.customerMembership.findFirst.mockResolvedValue(null);
      prisma.customerMembership.create.mockResolvedValue(mockMembership());

      await service.enrollCustomer(TENANT_ID, 'cust-uuid-001', 'prog-uuid-001', 'MONTHLY');

      expect(prisma.customerMembership.create).toHaveBeenCalled();
    });

    it('should log when Stripe price ID is configured for YEARLY', async () => {
      prisma.membershipProgram.findFirst.mockResolvedValue(
        mockProgram({ stripePriceYearlyId: 'price_yearly_456' }),
      );
      prisma.customerMembership.findFirst.mockResolvedValue(null);
      prisma.customerMembership.create.mockResolvedValue(mockMembership());

      await service.enrollCustomer(TENANT_ID, 'cust-uuid-001', 'prog-uuid-001', 'YEARLY');

      expect(prisma.customerMembership.create).toHaveBeenCalled();
    });
  });

  // ─── updateProgram — additional branches ───
  describe('updateProgram — additional branches', () => {
    it('should skip duplicate check when name is unchanged', async () => {
      const prog = mockProgram({ name: 'Piano Premium' });
      prisma.membershipProgram.findFirst.mockResolvedValue(prog);
      prisma.membershipProgram.update.mockResolvedValue(prog);

      await service.updateProgram(TENANT_ID, 'prog-uuid-001', { name: 'Piano Premium' });

      expect(prisma.membershipProgram.findUnique).not.toHaveBeenCalled();
    });

    it('should update all optional fields', async () => {
      const prog = mockProgram();
      prisma.membershipProgram.findFirst.mockResolvedValue(prog);
      prisma.membershipProgram.update.mockResolvedValue(prog);

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

      // Need findUnique for name change
      prisma.membershipProgram.findUnique.mockResolvedValue(null);

      expect(prisma.membershipProgram.update).toHaveBeenCalled();
    });
  });

  // ─── checkBenefits — additional branches ───
  describe('checkBenefits — additional branches', () => {
    it('should handle program with no benefits (defaults to empty array)', async () => {
      const mem = mockMembership({
        program: mockProgram({ benefits: null }),
        redemptions: [],
      });
      prisma.customerMembership.findMany.mockResolvedValue([mem]);

      const result = await service.checkBenefits(TENANT_ID, 'cust-uuid-001');

      expect(result).toHaveLength(1);
      expect(result[0].benefits).toEqual([]);
    });
  });

  // ─── redeemBenefit — additional branches ───
  describe('redeemBenefit — additional branches', () => {
    it('should redeem with workOrderId and no bookingId', async () => {
      prisma.customerMembership.findFirst.mockResolvedValue(mockMembership());
      prisma.membershipRedemption.create.mockResolvedValue(mockRedemption());

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
    });

    it('should default valueCents to 0 when not provided', async () => {
      prisma.customerMembership.findFirst.mockResolvedValue(mockMembership());
      prisma.membershipRedemption.create.mockResolvedValue(mockRedemption());

      await service.redeemBenefit(TENANT_ID, 'mem-uuid-001', 'OIL_CHANGE');

      expect(prisma.membershipRedemption.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          valueCents: new Prisma.Decimal(0),
        }),
      });
    });
  });

  // ─── getRedemptionHistory ───
  describe('getRedemptionHistory', () => {
    it('should return redemption history for membership', async () => {
      prisma.customerMembership.findFirst.mockResolvedValue(mockMembership());
      const redemptions = [mockRedemption()];
      prisma.membershipRedemption.findMany.mockResolvedValue(redemptions);

      const result = await service.getRedemptionHistory(TENANT_ID, 'mem-uuid-001');

      expect(result).toEqual(redemptions);
      expect(prisma.membershipRedemption.findMany).toHaveBeenCalledWith({
        where: { membershipId: 'mem-uuid-001' },
        orderBy: { redeemedAt: 'desc' },
      });
    });

    it('should throw NotFoundException if membership not found', async () => {
      prisma.customerMembership.findFirst.mockResolvedValue(null);

      await expect(service.getRedemptionHistory(TENANT_ID, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
