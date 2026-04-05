import { Test, TestingModule } from '@nestjs/testing';
import { MembershipController } from './membership.controller';
import { MembershipService } from './membership.service';

describe('MembershipController', () => {
  let controller: MembershipController;
  let service: jest.Mocked<MembershipService>;

  const TENANT_ID = 'tenant-001';

  const mockProgram = {
    id: 'prog-001',
    tenantId: TENANT_ID,
    name: 'Gold',
    priceCents: 2999,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MembershipController],
      providers: [
        {
          provide: MembershipService,
          useValue: {
            listPrograms: jest.fn(),
            getProgram: jest.fn(),
            createProgram: jest.fn(),
            updateProgram: jest.fn(),
            deleteProgram: jest.fn(),
            enrollCustomer: jest.fn(),
            getCustomerMemberships: jest.fn(),
            checkBenefits: jest.fn(),
            redeemBenefit: jest.fn(),
            cancelMembership: jest.fn(),
            pauseMembership: jest.fn(),
            getRedemptionHistory: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MembershipController>(MembershipController);
    service = module.get(MembershipService) as jest.Mocked<MembershipService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listPrograms', () => {
    it('should delegate to service with tenantId', async () => {
      service.listPrograms.mockResolvedValue([mockProgram] as never);

      const result = await controller.listPrograms(TENANT_ID);

      expect(service.listPrograms).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual([mockProgram]);
    });
  });

  describe('getProgram', () => {
    it('should delegate to service with tenantId and id', async () => {
      service.getProgram.mockResolvedValue(mockProgram as never);

      const result = await controller.getProgram(TENANT_ID, 'prog-001');

      expect(service.getProgram).toHaveBeenCalledWith(TENANT_ID, 'prog-001');
      expect(result).toEqual(mockProgram);
    });
  });

  describe('createProgram', () => {
    it('should delegate to service with tenantId and dto', async () => {
      service.createProgram.mockResolvedValue(mockProgram as never);
      const dto = { name: 'Gold', priceCents: 2999 };

      const result = await controller.createProgram(TENANT_ID, dto as never);

      expect(service.createProgram).toHaveBeenCalledWith(TENANT_ID, dto);
      expect(result).toEqual(mockProgram);
    });
  });

  describe('updateProgram', () => {
    it('should delegate to service with tenantId, id, and dto', async () => {
      const updated = { ...mockProgram, name: 'Platinum' };
      service.updateProgram.mockResolvedValue(updated as never);

      const result = await controller.updateProgram(TENANT_ID, 'prog-001', {
        name: 'Platinum',
      } as never);

      expect(service.updateProgram).toHaveBeenCalledWith(TENANT_ID, 'prog-001', {
        name: 'Platinum',
      });
      expect(result).toEqual(updated);
    });
  });

  describe('deleteProgram', () => {
    it('should delegate to service with tenantId and id', async () => {
      service.deleteProgram.mockResolvedValue(undefined as never);

      await controller.deleteProgram(TENANT_ID, 'prog-001');

      expect(service.deleteProgram).toHaveBeenCalledWith(TENANT_ID, 'prog-001');
    });
  });

  describe('enrollCustomer', () => {
    it('should delegate to service with tenantId, customerId, programId, billingCycle', async () => {
      const enrollment = { id: 'enr-001', status: 'ACTIVE' };
      service.enrollCustomer.mockResolvedValue(enrollment as never);
      const dto = {
        customerId: 'cust-001',
        programId: 'prog-001',
        billingCycle: 'MONTHLY' as const,
      };

      const result = await controller.enrollCustomer(TENANT_ID, dto as never);

      expect(service.enrollCustomer).toHaveBeenCalledWith(
        TENANT_ID,
        'cust-001',
        'prog-001',
        'MONTHLY',
      );
      expect(result).toEqual(enrollment);
    });
  });

  describe('getCustomerMemberships', () => {
    it('should delegate to service with tenantId and customerId', async () => {
      service.getCustomerMemberships.mockResolvedValue([] as never);

      await controller.getCustomerMemberships(TENANT_ID, 'cust-001');

      expect(service.getCustomerMemberships).toHaveBeenCalledWith(TENANT_ID, 'cust-001');
    });
  });

  describe('checkBenefits', () => {
    it('should delegate to service with tenantId and customerId', async () => {
      service.checkBenefits.mockResolvedValue({ benefits: [] } as never);

      await controller.checkBenefits(TENANT_ID, 'cust-001');

      expect(service.checkBenefits).toHaveBeenCalledWith(TENANT_ID, 'cust-001');
    });
  });

  describe('redeemBenefit', () => {
    it('should delegate to service with all params', async () => {
      service.redeemBenefit.mockResolvedValue({ redeemed: true } as never);
      const dto = {
        benefitType: 'OIL_CHANGE',
        bookingId: 'book-001',
        workOrderId: 'wo-001',
        valueCents: 5000,
      };

      const result = await controller.redeemBenefit(TENANT_ID, 'enr-001', dto as never);

      expect(service.redeemBenefit).toHaveBeenCalledWith(
        TENANT_ID,
        'enr-001',
        'OIL_CHANGE',
        'book-001',
        'wo-001',
        5000,
      );
      expect(result).toEqual({ redeemed: true });
    });
  });

  describe('cancelMembership', () => {
    it('should delegate to service with tenantId and id', async () => {
      service.cancelMembership.mockResolvedValue({ status: 'CANCELLED' } as never);

      await controller.cancelMembership(TENANT_ID, 'enr-001');

      expect(service.cancelMembership).toHaveBeenCalledWith(TENANT_ID, 'enr-001');
    });
  });

  describe('pauseMembership', () => {
    it('should delegate to service with tenantId and id', async () => {
      service.pauseMembership.mockResolvedValue({ status: 'PAUSED' } as never);

      await controller.pauseMembership(TENANT_ID, 'enr-001');

      expect(service.pauseMembership).toHaveBeenCalledWith(TENANT_ID, 'enr-001');
    });
  });

  describe('getRedemptionHistory', () => {
    it('should delegate to service with tenantId and id', async () => {
      service.getRedemptionHistory.mockResolvedValue([] as never);

      await controller.getRedemptionHistory(TENANT_ID, 'enr-001');

      expect(service.getRedemptionHistory).toHaveBeenCalledWith(TENANT_ID, 'enr-001');
    });
  });
});
