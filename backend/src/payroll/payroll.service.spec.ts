import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { PrismaService } from '@common/services/prisma.service';
import { PayType, PayrollStatus, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

interface MockTechnicianDelegate {
  findFirst: jest.Mock;
  findMany: jest.Mock;
}

interface MockPayConfigDelegate {
  findFirst: jest.Mock;
  updateMany: jest.Mock;
  create: jest.Mock;
}

interface MockTimeLogDelegate {
  findMany: jest.Mock;
}

interface MockPayrollRecordDelegate {
  findFirst: jest.Mock;
  findMany: jest.Mock;
  upsert: jest.Mock;
  update: jest.Mock;
}

interface MockWorkOrderTechnicianDelegate {
  count: jest.Mock;
}

interface MockPrisma {
  technician: MockTechnicianDelegate;
  technicianPayConfig: MockPayConfigDelegate;
  technicianTimeLog: MockTimeLogDelegate;
  payrollRecord: MockPayrollRecordDelegate;
  workOrderTechnician: MockWorkOrderTechnicianDelegate;
}

const TENANT_ID = 'tenant-001';
const TECH_ID = 'tech-001';
const RECORD_ID = 'record-001';
const PERIOD = '2026-03';

const mockTechnician = {
  id: TECH_ID,
  tenantId: TENANT_ID,
  name: 'Marco Bianchi',
  isActive: true,
};

const mockPayConfig = {
  id: 'config-001',
  tenantId: TENANT_ID,
  technicianId: TECH_ID,
  payType: PayType.HOURLY,
  hourlyRateCents: new Decimal(2500),
  flatRatePerJobCents: null,
  overtimeMultiplier: new Decimal(1.5),
  overtimeThresholdHours: new Decimal(40),
  bonusRules: null,
  effectiveFrom: new Date('2026-01-01'),
  effectiveTo: null,
};

const mockTimeLogs = [
  {
    id: 'log-001',
    tenantId: TENANT_ID,
    technicianId: TECH_ID,
    workOrderId: 'wo-001',
    startedAt: new Date('2026-03-01T08:00:00Z'),
    stoppedAt: new Date('2026-03-01T16:00:00Z'),
    durationMinutes: 480,
  },
  {
    id: 'log-002',
    tenantId: TENANT_ID,
    technicianId: TECH_ID,
    workOrderId: 'wo-002',
    startedAt: new Date('2026-03-02T08:00:00Z'),
    stoppedAt: new Date('2026-03-02T16:00:00Z'),
    durationMinutes: 480,
  },
];

const mockPayrollRecord = {
  id: RECORD_ID,
  tenantId: TENANT_ID,
  technicianId: TECH_ID,
  period: PERIOD,
  regularHours: new Decimal(16),
  overtimeHours: new Decimal(0),
  regularPayCents: new Decimal(40000),
  overtimePayCents: new Decimal(0),
  bonusPayCents: new Decimal(0),
  totalPayCents: new Decimal(40000),
  status: PayrollStatus.DRAFT,
  approvedBy: null,
  approvedAt: null,
  technician: mockTechnician,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('PayrollService', () => {
  let service: PayrollService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollService,
        {
          provide: PrismaService,
          useValue: {
            technician: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
            },
            technicianPayConfig: {
              findFirst: jest.fn(),
              updateMany: jest.fn(),
              create: jest.fn(),
            },
            technicianTimeLog: {
              findMany: jest.fn(),
            },
            payrollRecord: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
              upsert: jest.fn(),
              update: jest.fn(),
            },
            workOrderTechnician: {
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<PayrollService>(PayrollService);
    prisma = module.get(PrismaService) as unknown as MockPrisma;
  });

  describe('configurePayRate', () => {
    it('dovrebbe creare configurazione HOURLY', async () => {
      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);
      prisma.technicianPayConfig.updateMany.mockResolvedValueOnce({ count: 0 });
      prisma.technicianPayConfig.create.mockResolvedValueOnce({
        id: 'new-config',
        payType: PayType.HOURLY,
      });

      const result = await service.configurePayRate(TENANT_ID, TECH_ID, {
        payType: PayType.HOURLY,
        hourlyRateCents: 2500,
        effectiveFrom: '2026-03-01',
      });

      expect(result).toEqual({ id: 'new-config', payType: PayType.HOURLY });
      expect(prisma.technicianPayConfig.updateMany).toHaveBeenCalled();
      expect(prisma.technicianPayConfig.create).toHaveBeenCalled();
    });

    it('dovrebbe lanciare NotFoundException per tecnico inesistente', async () => {
      prisma.technician.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.configurePayRate(TENANT_ID, 'non-existent', {
          payType: PayType.HOURLY,
          hourlyRateCents: 2500,
          effectiveFrom: '2026-03-01',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('dovrebbe lanciare BadRequestException se HOURLY senza hourlyRateCents', async () => {
      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);

      await expect(
        service.configurePayRate(TENANT_ID, TECH_ID, {
          payType: PayType.HOURLY,
          effectiveFrom: '2026-03-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('dovrebbe lanciare BadRequestException se FLAT_RATE senza flatRatePerJobCents', async () => {
      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);

      await expect(
        service.configurePayRate(TENANT_ID, TECH_ID, {
          payType: PayType.FLAT_RATE,
          effectiveFrom: '2026-03-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('dovrebbe lanciare BadRequestException se MIXED senza entrambe le tariffe', async () => {
      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);

      await expect(
        service.configurePayRate(TENANT_ID, TECH_ID, {
          payType: PayType.MIXED,
          hourlyRateCents: 2500,
          effectiveFrom: '2026-03-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('dovrebbe lanciare BadRequestException se MIXED senza hourlyRateCents', async () => {
      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);

      await expect(
        service.configurePayRate(TENANT_ID, TECH_ID, {
          payType: PayType.MIXED,
          flatRatePerJobCents: 5000,
          effectiveFrom: '2026-03-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('dovrebbe creare configurazione FLAT_RATE correttamente', async () => {
      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);
      prisma.technicianPayConfig.updateMany.mockResolvedValueOnce({ count: 0 });
      prisma.technicianPayConfig.create.mockResolvedValueOnce({
        id: 'new-config',
        payType: PayType.FLAT_RATE,
      });

      const result = await service.configurePayRate(TENANT_ID, TECH_ID, {
        payType: PayType.FLAT_RATE,
        flatRatePerJobCents: 5000,
        effectiveFrom: '2026-03-01',
      });

      expect(result.payType).toBe(PayType.FLAT_RATE);
      expect(prisma.technicianPayConfig.create).toHaveBeenCalled();
    });

    it('dovrebbe creare configurazione MIXED con entrambe le tariffe', async () => {
      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);
      prisma.technicianPayConfig.updateMany.mockResolvedValueOnce({ count: 0 });
      prisma.technicianPayConfig.create.mockResolvedValueOnce({
        id: 'new-config',
        payType: PayType.MIXED,
      });

      const result = await service.configurePayRate(TENANT_ID, TECH_ID, {
        payType: PayType.MIXED,
        hourlyRateCents: 2500,
        flatRatePerJobCents: 5000,
        effectiveFrom: '2026-03-01',
      });

      expect(result.payType).toBe(PayType.MIXED);
      expect(prisma.technicianPayConfig.create).toHaveBeenCalled();
    });

    it('dovrebbe chiudere configurazione precedente quando ne crea una nuova', async () => {
      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);
      prisma.technicianPayConfig.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.technicianPayConfig.create.mockResolvedValueOnce({
        id: 'new-config',
        payType: PayType.HOURLY,
      });

      await service.configurePayRate(TENANT_ID, TECH_ID, {
        payType: PayType.HOURLY,
        hourlyRateCents: 3000,
        effectiveFrom: '2026-04-01',
      });

      expect(prisma.technicianPayConfig.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_ID, technicianId: TECH_ID }),
        }),
      );
    });

    it('dovrebbe usare default per overtimeMultiplier e overtimeThresholdHours', async () => {
      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);
      prisma.technicianPayConfig.updateMany.mockResolvedValueOnce({ count: 0 });
      prisma.technicianPayConfig.create.mockResolvedValueOnce({
        id: 'new-config',
        payType: PayType.HOURLY,
      });

      await service.configurePayRate(TENANT_ID, TECH_ID, {
        payType: PayType.HOURLY,
        hourlyRateCents: 2500,
        effectiveFrom: '2026-03-01',
      });

      expect(prisma.technicianPayConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            overtimeMultiplier: new Decimal(1.5),
            overtimeThresholdHours: new Decimal(40),
          }),
        }),
      );
    });

    it('dovrebbe supportare effectiveTo nel DTO', async () => {
      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);
      prisma.technicianPayConfig.updateMany.mockResolvedValueOnce({ count: 0 });
      prisma.technicianPayConfig.create.mockResolvedValueOnce({
        id: 'new-config',
        payType: PayType.HOURLY,
      });

      await service.configurePayRate(TENANT_ID, TECH_ID, {
        payType: PayType.HOURLY,
        hourlyRateCents: 2500,
        effectiveFrom: '2026-03-01',
        effectiveTo: '2026-06-30',
      });

      expect(prisma.technicianPayConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            effectiveTo: new Date('2026-06-30'),
          }),
        }),
      );
    });

    it('dovrebbe supportare bonusRules', async () => {
      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);
      prisma.technicianPayConfig.updateMany.mockResolvedValueOnce({ count: 0 });
      prisma.technicianPayConfig.create.mockResolvedValueOnce({
        id: 'new-config',
        payType: PayType.HOURLY,
      });

      const bonusRules = { performanceBonus: 500, attendanceBonus: 200 };

      await service.configurePayRate(TENANT_ID, TECH_ID, {
        payType: PayType.HOURLY,
        hourlyRateCents: 2500,
        effectiveFrom: '2026-03-01',
        bonusRules,
      });

      expect(prisma.technicianPayConfig.create).toHaveBeenCalled();
    });

    it('dovrebbe usare null se hourlyRateCents non fornito', async () => {
      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);
      prisma.technicianPayConfig.updateMany.mockResolvedValueOnce({ count: 0 });
      prisma.technicianPayConfig.create.mockResolvedValueOnce({
        id: 'new-config',
        payType: PayType.FLAT_RATE,
      });

      await service.configurePayRate(TENANT_ID, TECH_ID, {
        payType: PayType.FLAT_RATE,
        flatRatePerJobCents: 5000,
        effectiveFrom: '2026-03-01',
      });

      expect(prisma.technicianPayConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            hourlyRateCents: null,
          }),
        }),
      );
    });

    it('dovrebbe usare null se flatRatePerJobCents non fornito', async () => {
      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);
      prisma.technicianPayConfig.updateMany.mockResolvedValueOnce({ count: 0 });
      prisma.technicianPayConfig.create.mockResolvedValueOnce({
        id: 'new-config',
        payType: PayType.HOURLY,
      });

      await service.configurePayRate(TENANT_ID, TECH_ID, {
        payType: PayType.HOURLY,
        hourlyRateCents: 2500,
        effectiveFrom: '2026-03-01',
      });

      expect(prisma.technicianPayConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            flatRatePerJobCents: null,
          }),
        }),
      );
    });

    it('dovrebbe usare default 1.5 per overtimeMultiplier se non fornito', async () => {
      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);
      prisma.technicianPayConfig.updateMany.mockResolvedValueOnce({ count: 0 });
      prisma.technicianPayConfig.create.mockResolvedValueOnce({
        id: 'new-config',
        payType: PayType.HOURLY,
      });

      await service.configurePayRate(TENANT_ID, TECH_ID, {
        payType: PayType.HOURLY,
        hourlyRateCents: 2500,
        effectiveFrom: '2026-03-01',
      });

      expect(prisma.technicianPayConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            overtimeMultiplier: new Decimal(1.5),
          }),
        }),
      );
    });

    it('dovrebbe usare default 40 per overtimeThresholdHours se non fornito', async () => {
      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);
      prisma.technicianPayConfig.updateMany.mockResolvedValueOnce({ count: 0 });
      prisma.technicianPayConfig.create.mockResolvedValueOnce({
        id: 'new-config',
        payType: PayType.HOURLY,
      });

      await service.configurePayRate(TENANT_ID, TECH_ID, {
        payType: PayType.HOURLY,
        hourlyRateCents: 2500,
        effectiveFrom: '2026-03-01',
      });

      expect(prisma.technicianPayConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            overtimeThresholdHours: new Decimal(40),
          }),
        }),
      );
    });

    it('dovrebbe usare Prisma.JsonNull se bonusRules non fornito', async () => {
      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);
      prisma.technicianPayConfig.updateMany.mockResolvedValueOnce({ count: 0 });
      prisma.technicianPayConfig.create.mockResolvedValueOnce({
        id: 'new-config',
        payType: PayType.HOURLY,
      });

      await service.configurePayRate(TENANT_ID, TECH_ID, {
        payType: PayType.HOURLY,
        hourlyRateCents: 2500,
        effectiveFrom: '2026-03-01',
      });

      expect(prisma.technicianPayConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bonusRules: Prisma.JsonNull,
          }),
        }),
      );
    });

    it('dovrebbe supportare overtimeMultiplier personalizzato', async () => {
      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);
      prisma.technicianPayConfig.updateMany.mockResolvedValueOnce({ count: 0 });
      prisma.technicianPayConfig.create.mockResolvedValueOnce({
        id: 'new-config',
        payType: PayType.HOURLY,
      });

      await service.configurePayRate(TENANT_ID, TECH_ID, {
        payType: PayType.HOURLY,
        hourlyRateCents: 2500,
        overtimeMultiplier: 2.0,
        effectiveFrom: '2026-03-01',
      });

      expect(prisma.technicianPayConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            overtimeMultiplier: new Decimal(2.0),
          }),
        }),
      );
    });

    it('dovrebbe supportare overtimeThresholdHours personalizzato', async () => {
      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);
      prisma.technicianPayConfig.updateMany.mockResolvedValueOnce({ count: 0 });
      prisma.technicianPayConfig.create.mockResolvedValueOnce({
        id: 'new-config',
        payType: PayType.HOURLY,
      });

      await service.configurePayRate(TENANT_ID, TECH_ID, {
        payType: PayType.HOURLY,
        hourlyRateCents: 2500,
        overtimeThresholdHours: 35,
        effectiveFrom: '2026-03-01',
      });

      expect(prisma.technicianPayConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            overtimeThresholdHours: new Decimal(35),
          }),
        }),
      );
    });
  });

  describe('calculatePayroll', () => {
    it('dovrebbe calcolare busta paga HOURLY', async () => {
      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);
      prisma.technicianPayConfig.findFirst.mockResolvedValueOnce(mockPayConfig);
      prisma.technicianTimeLog.findMany.mockResolvedValueOnce(mockTimeLogs);
      prisma.workOrderTechnician.count.mockResolvedValueOnce(0);
      prisma.payrollRecord.upsert.mockResolvedValueOnce(mockPayrollRecord);

      const result = await service.calculatePayroll(TENANT_ID, TECH_ID, PERIOD);

      expect(result.technicianId).toBe(TECH_ID);
      expect(result.period).toBe(PERIOD);
      expect(result.payType).toBe(PayType.HOURLY);
      expect(result.totalPayCents).toBeGreaterThan(0);
      expect(prisma.payrollRecord.upsert).toHaveBeenCalled();
    });

    it('dovrebbe lanciare NotFoundException se tecnico inesistente', async () => {
      prisma.technician.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.calculatePayroll(TENANT_ID, 'non-existent', PERIOD),
      ).rejects.toThrow(NotFoundException);
    });

    it('dovrebbe lanciare NotFoundException se configurazione non trovata', async () => {
      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);
      prisma.technicianPayConfig.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.calculatePayroll(TENANT_ID, TECH_ID, PERIOD),
      ).rejects.toThrow(NotFoundException);
    });

    it('dovrebbe calcolare con zero time logs', async () => {
      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);
      prisma.technicianPayConfig.findFirst.mockResolvedValueOnce(mockPayConfig);
      prisma.technicianTimeLog.findMany.mockResolvedValueOnce([]);
      prisma.workOrderTechnician.count.mockResolvedValueOnce(0);
      prisma.payrollRecord.upsert.mockResolvedValueOnce({ totalPayCents: 0 });

      const result = await service.calculatePayroll(TENANT_ID, TECH_ID, PERIOD);

      expect(result.regularHours).toBe(0);
      expect(result.overtimeHours).toBe(0);
    });

    it('dovrebbe calcolare overtime oltre 40 ore', async () => {
      const longTimeLogs = [
        {
          id: 'log-001',
          durationMinutes: 600, // 10 ore
        },
        {
          id: 'log-002',
          durationMinutes: 600, // 10 ore
        },
        {
          id: 'log-003',
          durationMinutes: 600, // 10 ore
        },
        {
          id: 'log-004',
          durationMinutes: 600, // 10 ore
        },
        {
          id: 'log-005',
          durationMinutes: 300, // 5 ore = 45 ore totali
        },
      ];

      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);
      prisma.technicianPayConfig.findFirst.mockResolvedValueOnce(mockPayConfig);
      prisma.technicianTimeLog.findMany.mockResolvedValueOnce(longTimeLogs);
      prisma.workOrderTechnician.count.mockResolvedValueOnce(0);
      prisma.payrollRecord.upsert.mockResolvedValueOnce({ totalPayCents: 0 });

      const result = await service.calculatePayroll(TENANT_ID, TECH_ID, PERIOD);

      expect(result.regularHours).toBe(40);
      expect(result.overtimeHours).toBe(5);
    });

    it('dovrebbe calcolare FLAT_RATE con lavori completati', async () => {
      const flatRateConfig = { ...mockPayConfig, payType: PayType.FLAT_RATE, flatRatePerJobCents: new Decimal(5000), hourlyRateCents: null };

      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);
      prisma.technicianPayConfig.findFirst.mockResolvedValueOnce(flatRateConfig);
      prisma.technicianTimeLog.findMany.mockResolvedValueOnce([]);
      prisma.workOrderTechnician.count.mockResolvedValueOnce(3);
      prisma.payrollRecord.upsert.mockResolvedValueOnce({ totalPayCents: 15000 });

      const result = await service.calculatePayroll(TENANT_ID, TECH_ID, PERIOD);

      expect(result.completedJobs).toBe(3);
      expect(result.flatRatePayCents).toBe(15000);
    });

    it('dovrebbe calcolare MIXED con ore e lavori', async () => {
      const mixedConfig = { ...mockPayConfig, payType: PayType.MIXED, flatRatePerJobCents: new Decimal(5000) };

      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);
      prisma.technicianPayConfig.findFirst.mockResolvedValueOnce(mixedConfig);
      prisma.technicianTimeLog.findMany.mockResolvedValueOnce(mockTimeLogs);
      prisma.workOrderTechnician.count.mockResolvedValueOnce(2);
      prisma.payrollRecord.upsert.mockResolvedValueOnce({ totalPayCents: 50000 });

      const result = await service.calculatePayroll(TENANT_ID, TECH_ID, PERIOD);

      expect(result.payType).toBe(PayType.MIXED);
      expect(result.completedJobs).toBe(2);
      expect(result.regularPayCents).toBeGreaterThan(0);
      expect(result.flatRatePayCents).toBeGreaterThan(0);
    });

    it('dovrebbe applicare moltiplicatore straordinario', async () => {
      const customOTConfig = {
        ...mockPayConfig,
        overtimeMultiplier: new Decimal(2.0),
      };

      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);
      prisma.technicianPayConfig.findFirst.mockResolvedValueOnce(customOTConfig);
      prisma.technicianTimeLog.findMany.mockResolvedValueOnce([
        { durationMinutes: 2400 }, // 40 ore
        { durationMinutes: 600 }, // 10 ore overtime
      ]);
      prisma.workOrderTechnician.count.mockResolvedValueOnce(0);
      prisma.payrollRecord.upsert.mockResolvedValueOnce({ totalPayCents: 100000 });

      const result = await service.calculatePayroll(TENANT_ID, TECH_ID, PERIOD);

      expect(result.overtimeHours).toBe(10);
    });
  });

  describe('calculateAllPayroll', () => {
    it('dovrebbe calcolare per tutti i tecnici attivi', async () => {
      const techs = [mockTechnician, { ...mockTechnician, id: 'tech-002', name: 'Luigi Rossi' }];
      prisma.technician.findMany.mockResolvedValueOnce(techs);
      prisma.technician.findFirst.mockResolvedValue(mockTechnician);
      prisma.technicianPayConfig.findFirst.mockResolvedValue(mockPayConfig);
      prisma.technicianTimeLog.findMany.mockResolvedValue(mockTimeLogs);
      prisma.workOrderTechnician.count.mockResolvedValue(0);
      prisma.payrollRecord.upsert.mockResolvedValue({ totalPayCents: 0 });

      const result = await service.calculateAllPayroll(TENANT_ID, PERIOD);

      expect(result).toHaveLength(2);
    });

    it('dovrebbe saltare tecnici senza configurazione', async () => {
      const techs = [mockTechnician];
      prisma.technician.findMany.mockResolvedValueOnce(techs);
      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);
      prisma.technicianPayConfig.findFirst.mockResolvedValueOnce(null);

      const result = await service.calculateAllPayroll(TENANT_ID, PERIOD);

      expect(result).toHaveLength(0);
    });
  });

  describe('getPayrollSummary', () => {
    it('dovrebbe restituire riepilogo corretto', async () => {
      prisma.payrollRecord.findMany.mockResolvedValueOnce([mockPayrollRecord]);

      const result = await service.getPayrollSummary(TENANT_ID, PERIOD);

      expect(result.period).toBe(PERIOD);
      expect(result.totalTechnicians).toBe(1);
      expect(result.records).toHaveLength(1);
    });

    it('dovrebbe restituire riepilogo vuoto', async () => {
      prisma.payrollRecord.findMany.mockResolvedValueOnce([]);

      const result = await service.getPayrollSummary(TENANT_ID, PERIOD);

      expect(result.period).toBe(PERIOD);
      expect(result.totalTechnicians).toBe(0);
      expect(result.records).toHaveLength(0);
    });
  });

  describe('approvePayroll', () => {
    it('dovrebbe approvare record DRAFT', async () => {
      prisma.payrollRecord.findFirst.mockResolvedValueOnce(mockPayrollRecord);
      prisma.payrollRecord.update.mockResolvedValueOnce({
        ...mockPayrollRecord,
        status: PayrollStatus.APPROVED,
      });

      const result = await service.approvePayroll(TENANT_ID, RECORD_ID, 'admin-001');

      expect(prisma.payrollRecord.update).toHaveBeenCalled();
    });

    it('dovrebbe lanciare NotFoundException se record non trovato', async () => {
      prisma.payrollRecord.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.approvePayroll(TENANT_ID, 'non-existent', 'admin-001'),
      ).rejects.toThrow(NotFoundException);
    });

    it('dovrebbe lanciare ConflictException se non DRAFT', async () => {
      const approvedRecord = { ...mockPayrollRecord, status: PayrollStatus.APPROVED };
      prisma.payrollRecord.findFirst.mockResolvedValueOnce(approvedRecord);

      await expect(
        service.approvePayroll(TENANT_ID, RECORD_ID, 'admin-001'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('exportPayroll', () => {
    it('dovrebbe esportare in CSV', async () => {
      prisma.payrollRecord.findMany.mockResolvedValueOnce([mockPayrollRecord]);

      const csv = await service.exportPayroll(TENANT_ID, PERIOD);

      expect(csv).toContain('Tecnico');
      expect(csv).toContain('Marco Bianchi');
    });

    it('dovrebbe includere header CSV', async () => {
      prisma.payrollRecord.findMany.mockResolvedValueOnce([mockPayrollRecord]);

      const csv = await service.exportPayroll(TENANT_ID, PERIOD);

      expect(csv).toContain('Tecnico,Periodo');
      expect(csv).toContain('Marco Bianchi');
      expect(csv).toContain(PERIOD);
      expect(csv).toContain('DRAFT');
    });

    it('dovrebbe restituire solo header per periodo vuoto', async () => {
      prisma.payrollRecord.findMany.mockResolvedValueOnce([]);

      const csv = await service.exportPayroll(TENANT_ID, PERIOD);

      const lines = csv.split('\n');
      expect(lines).toHaveLength(1);
    });
  });
});

  // Additional tests for branch coverage on OR conditions in calculatePayroll
  describe('calculatePayroll - Branch coverage for OR conditions', () => {
    it('dovrebbe saltare calcolo HOURLY se payType è FLAT_RATE', async () => {
      const flatRateConfig = {
        ...mockPayConfig,
        payType: PayType.FLAT_RATE,
        hourlyRateCents: null,
        flatRatePerJobCents: new Decimal(5000),
      };

      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);
      prisma.technicianPayConfig.findFirst.mockResolvedValueOnce(flatRateConfig);
      prisma.technicianTimeLog.findMany.mockResolvedValueOnce(mockTimeLogs);
      prisma.workOrderTechnician.count.mockResolvedValueOnce(0);
      prisma.payrollRecord.upsert.mockResolvedValueOnce({
        totalPayCents: new Decimal(0),
      });

      const result = await service.calculatePayroll(TENANT_ID, TECH_ID, PERIOD);

      // For FLAT_RATE, regularPayCents and overtimePayCents should be 0
      expect(result.regularPayCents).toBe(0);
      expect(result.overtimePayCents).toBe(0);
    });

    it('dovrebbe saltare calcolo FLAT_RATE se payType è HOURLY', async () => {
      const hourlyConfig = {
        ...mockPayConfig,
        payType: PayType.HOURLY,
        hourlyRateCents: new Decimal(2500),
        flatRatePerJobCents: null,
      };

      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);
      prisma.technicianPayConfig.findFirst.mockResolvedValueOnce(hourlyConfig);
      prisma.technicianTimeLog.findMany.mockResolvedValueOnce(mockTimeLogs);
      prisma.workOrderTechnician.count.mockResolvedValueOnce(5); // completed jobs ignored for HOURLY
      prisma.payrollRecord.upsert.mockResolvedValueOnce({
        totalPayCents: new Decimal(40000),
      });

      const result = await service.calculatePayroll(TENANT_ID, TECH_ID, PERIOD);

      // For HOURLY, flatRatePayCents should be 0 even if there are completed jobs
      expect(result.flatRatePayCents).toBe(0);
      expect(result.regularPayCents).toBeGreaterThan(0);
    });

    it('dovrebbe calcolare entrambi per MIXED con tariffe complete', async () => {
      const mixedConfigComplete = {
        ...mockPayConfig,
        payType: PayType.MIXED,
        hourlyRateCents: new Decimal(2500),
        flatRatePerJobCents: new Decimal(5000),
      };

      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);
      prisma.technicianPayConfig.findFirst.mockResolvedValueOnce(mixedConfigComplete);
      prisma.technicianTimeLog.findMany.mockResolvedValueOnce(mockTimeLogs);
      prisma.workOrderTechnician.count.mockResolvedValueOnce(2);
      prisma.payrollRecord.upsert.mockResolvedValueOnce({
        totalPayCents: new Decimal(50000),
      });

      const result = await service.calculatePayroll(TENANT_ID, TECH_ID, PERIOD);

      expect(result.regularPayCents).toBeGreaterThan(0);
      expect(result.flatRatePayCents).toBeGreaterThan(0);
    });

    it('dovrebbe usare null coalesce per hourlyRateCents (line 193)', async () => {
      const configWithNullRate = {
        ...mockPayConfig,
        payType: PayType.HOURLY,
        hourlyRateCents: null,
      };

      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);
      prisma.technicianPayConfig.findFirst.mockResolvedValueOnce(configWithNullRate);
      prisma.technicianTimeLog.findMany.mockResolvedValueOnce(mockTimeLogs);
      prisma.workOrderTechnician.count.mockResolvedValueOnce(0);
      prisma.payrollRecord.upsert.mockResolvedValueOnce({
        totalPayCents: new Decimal(0),
      });

      const result = await service.calculatePayroll(TENANT_ID, TECH_ID, PERIOD);

      // With null hourlyRate, should calculate as 0
      expect(result.regularPayCents).toBe(0);
    });

    it('dovrebbe usare null coalesce per flatRatePerJobCents (line 201)', async () => {
      const configWithNullFlatRate = {
        ...mockPayConfig,
        payType: PayType.FLAT_RATE,
        flatRatePerJobCents: null,
      };

      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);
      prisma.technicianPayConfig.findFirst.mockResolvedValueOnce(configWithNullFlatRate);
      prisma.technicianTimeLog.findMany.mockResolvedValueOnce([]);
      prisma.workOrderTechnician.count.mockResolvedValueOnce(3);
      prisma.payrollRecord.upsert.mockResolvedValueOnce({
        totalPayCents: new Decimal(0),
      });

      const result = await service.calculatePayroll(TENANT_ID, TECH_ID, PERIOD);

      // With null flatRate, should calculate as 0
      expect(result.flatRatePayCents).toBe(0);
    });
  });
