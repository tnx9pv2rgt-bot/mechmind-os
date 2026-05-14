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
    jest.clearAllMocks();

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
      service.listPrograms.mockResolvedValueOnce([mockProgram] as never);

      const result = await controller.listPrograms(TENANT_ID);

      expect(service.listPrograms).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual([mockProgram]);
      expect(result).toHaveLength(1);
    });
  });

  describe('getProgram', () => {
    it('should delegate to service with tenantId and id', async () => {
      service.getProgram.mockResolvedValueOnce(mockProgram as never);

      const result = await controller.getProgram(TENANT_ID, 'prog-001');

      expect(service.getProgram).toHaveBeenCalledWith(TENANT_ID, 'prog-001');
      expect(result).toEqual(mockProgram);
      expect((result as unknown as typeof mockProgram).id).toBe('prog-001');
    });
  });

  describe('createProgram', () => {
    it('should delegate to service with tenantId and dto', async () => {
      service.createProgram.mockResolvedValueOnce(mockProgram as never);
      const dto = { name: 'Gold', priceCents: 2999 };

      const result = await controller.createProgram(TENANT_ID, dto as never);

      expect(service.createProgram).toHaveBeenCalledWith(TENANT_ID, dto);
      expect(result).toEqual(mockProgram);
      expect(result.name).toBe('Gold');
    });
  });

  describe('updateProgram', () => {
    it('should delegate to service with tenantId, id, and dto', async () => {
      const updated = { ...mockProgram, name: 'Platinum' };
      service.updateProgram.mockResolvedValueOnce(updated as never);

      const result = await controller.updateProgram(TENANT_ID, 'prog-001', {
        name: 'Platinum',
      } as never);

      expect(service.updateProgram).toHaveBeenCalledWith(TENANT_ID, 'prog-001', {
        name: 'Platinum',
      });
      expect(result).toEqual(updated);
      expect(result.name).toBe('Platinum');
    });
  });

  describe('deleteProgram', () => {
    it('should delegate to service with tenantId and id', async () => {
      service.deleteProgram.mockResolvedValueOnce(undefined as never);

      await controller.deleteProgram(TENANT_ID, 'prog-001');

      expect(service.deleteProgram).toHaveBeenCalledWith(TENANT_ID, 'prog-001');
      expect(service.deleteProgram).toHaveBeenCalled();
    });
  });

  describe('enrollCustomer', () => {
    it('should delegate to service with tenantId, customerId, programId, billingCycle', async () => {
      const enrollment = { id: 'enr-001', status: 'ACTIVE' };
      service.enrollCustomer.mockResolvedValueOnce(enrollment as never);
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
      expect(result.status).toBe('ACTIVE');
    });
  });

  describe('getCustomerMemberships', () => {
    it('should delegate to service with tenantId and customerId', async () => {
      service.getCustomerMemberships.mockResolvedValueOnce([] as never);

      const result = await controller.getCustomerMemberships(TENANT_ID, 'cust-001');

      expect(service.getCustomerMemberships).toHaveBeenCalledWith(TENANT_ID, 'cust-001');
      expect(result).toEqual([]);
    });
  });

  describe('checkBenefits', () => {
    it('should delegate to service with tenantId and customerId', async () => {
      service.checkBenefits.mockResolvedValueOnce({ benefits: [] } as never);

      const result = await controller.checkBenefits(TENANT_ID, 'cust-001');

      expect(service.checkBenefits).toHaveBeenCalledWith(TENANT_ID, 'cust-001');
      expect(result).toEqual({ benefits: [] });
    });
  });

  describe('redeemBenefit', () => {
    it('should delegate to service with all params', async () => {
      service.redeemBenefit.mockResolvedValueOnce({ redeemed: true } as never);
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
      expect(service.redeemBenefit).toHaveBeenCalledTimes(1);
    });
  });

  describe('cancelMembership', () => {
    it('should delegate to service with tenantId and id', async () => {
      service.cancelMembership.mockResolvedValueOnce({ status: 'CANCELLED' } as never);

      const result = await controller.cancelMembership(TENANT_ID, 'enr-001');

      expect(service.cancelMembership).toHaveBeenCalledWith(TENANT_ID, 'enr-001');
      expect(result.status).toBe('CANCELLED');
    });
  });

  describe('pauseMembership', () => {
    it('should delegate to service with tenantId and id', async () => {
      service.pauseMembership.mockResolvedValueOnce({ status: 'PAUSED' } as never);

      const result = await controller.pauseMembership(TENANT_ID, 'enr-001');

      expect(service.pauseMembership).toHaveBeenCalledWith(TENANT_ID, 'enr-001');
      expect(result.status).toBe('PAUSED');
    });
  });

  describe('getRedemptionHistory', () => {
    it('should delegate to service with tenantId and id', async () => {
      service.getRedemptionHistory.mockResolvedValueOnce([] as never);

      const result = await controller.getRedemptionHistory(TENANT_ID, 'enr-001');

      expect(service.getRedemptionHistory).toHaveBeenCalledWith(TENANT_ID, 'enr-001');
      expect(result).toEqual([]);
    });
  });
});
