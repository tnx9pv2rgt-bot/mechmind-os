import { Test, TestingModule } from '@nestjs/testing';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';

describe('PayrollController', () => {
  let controller: PayrollController;
  let service: jest.Mocked<PayrollService>;

  const TENANT_ID = 'tenant-001';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayrollController],
      providers: [
        {
          provide: PayrollService,
          useValue: {
            getPayrollSummary: jest.fn(),
            calculatePayroll: jest.fn(),
            calculateAllPayroll: jest.fn(),
            configurePayRate: jest.fn(),
            approvePayroll: jest.fn(),
            exportPayroll: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PayrollController>(PayrollController);
    service = module.get(PayrollService) as jest.Mocked<PayrollService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getSummary', () => {
    it('should delegate to service with tenantId and period', async () => {
      const summary = { totalGross: 5000, totalNet: 3500, technicianCount: 3 };
      service.getPayrollSummary.mockResolvedValue(summary as never);

      const result = await controller.getSummary(TENANT_ID, { period: '2026-03' } as never);

      expect(service.getPayrollSummary).toHaveBeenCalledWith(TENANT_ID, '2026-03');
      expect(result).toEqual(summary);
    });
  });

  describe('calculateForTechnician', () => {
    it('should delegate to service with tenantId, technicianId, and period', async () => {
      const calc = { grossPay: 2000, netPay: 1400 };
      service.calculatePayroll.mockResolvedValue(calc as never);

      const result = await controller.calculateForTechnician(TENANT_ID, 'tech-001', {
        period: '2026-03',
      } as never);

      expect(service.calculatePayroll).toHaveBeenCalledWith(TENANT_ID, 'tech-001', '2026-03');
      expect(result).toEqual(calc);
    });
  });

  describe('calculateAll', () => {
    it('should delegate to service with tenantId and period', async () => {
      const calcs = [{ technicianId: 'tech-001', grossPay: 2000 }];
      service.calculateAllPayroll.mockResolvedValue(calcs as never);

      const result = await controller.calculateAll(TENANT_ID, { period: '2026-03' } as never);

      expect(service.calculateAllPayroll).toHaveBeenCalledWith(TENANT_ID, '2026-03');
      expect(result).toEqual(calcs);
    });
  });

  describe('configurePayRate', () => {
    it('should delegate to service with tenantId, technicianId, and dto', async () => {
      service.configurePayRate.mockResolvedValue({ id: 'cfg-001' } as never);
      const dto = { hourlyRate: 2500, commission: 10 };

      const result = await controller.configurePayRate(TENANT_ID, 'tech-001', dto as never);

      expect(service.configurePayRate).toHaveBeenCalledWith(TENANT_ID, 'tech-001', dto);
      expect(result).toEqual({ id: 'cfg-001' });
    });
  });

  describe('approve', () => {
    it('should delegate to service with tenantId, id, and approvedBy', async () => {
      service.approvePayroll.mockResolvedValue({ approved: true } as never);

      const result = await controller.approve(TENANT_ID, 'pr-001', {
        approvedBy: 'admin-001',
      } as never);

      expect(service.approvePayroll).toHaveBeenCalledWith(TENANT_ID, 'pr-001', 'admin-001');
      expect(result).toEqual({ approved: true });
    });
  });

  describe('exportCsv', () => {
    it('should delegate to service with tenantId and period', async () => {
      const csv = 'Tecnico;Lordo;Netto\nMario;2000;1400';
      service.exportPayroll.mockResolvedValue(csv as never);

      const result = await controller.exportCsv(TENANT_ID, { period: '2026-03' } as never);

      expect(service.exportPayroll).toHaveBeenCalledWith(TENANT_ID, '2026-03');
      expect(result).toBe(csv);
    });
  });
});
