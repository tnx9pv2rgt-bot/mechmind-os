import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { PrismaService } from '@common/services/prisma.service';
import { PayType, PayrollStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// ---------------------------------------------------------------------------
// Mock delegates
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PayrollService', () => {
  let service: PayrollService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    const mockPrisma: MockPrisma = {
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
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PayrollService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<PayrollService>(PayrollService);
    prisma = module.get(PrismaService) as unknown as MockPrisma;
  });

  // =========================================================================
  // configurePayRate
  // =========================================================================

  describe('configurePayRate', () => {
    it('dovrebbe creare configurazione HOURLY', async () => {
      prisma.technician.findFirst.mockResolvedValue(mockTechnician);
      prisma.technicianPayConfig.updateMany.mockResolvedValue({ count: 0 });
      prisma.technicianPayConfig.create.mockResolvedValue({
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
      prisma.technician.findFirst.mockResolvedValue(null);

      await expect(
        service.configurePayRate(TENANT_ID, 'non-existent', {
          payType: PayType.HOURLY,
          hourlyRateCents: 2500,
          effectiveFrom: '2026-03-01',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('dovrebbe lanciare BadRequestException se HOURLY senza hourlyRateCents', async () => {
      prisma.technician.findFirst.mockResolvedValue(mockTechnician);

      await expect(
        service.configurePayRate(TENANT_ID, TECH_ID, {
          payType: PayType.HOURLY,
          effectiveFrom: '2026-03-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('dovrebbe lanciare BadRequestException se FLAT_RATE senza flatRatePerJobCents', async () => {
      prisma.technician.findFirst.mockResolvedValue(mockTechnician);

      await expect(
        service.configurePayRate(TENANT_ID, TECH_ID, {
          payType: PayType.FLAT_RATE,
          effectiveFrom: '2026-03-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('dovrebbe lanciare BadRequestException se MIXED senza entrambe le tariffe', async () => {
      prisma.technician.findFirst.mockResolvedValue(mockTechnician);

      await expect(
        service.configurePayRate(TENANT_ID, TECH_ID, {
          payType: PayType.MIXED,
          hourlyRateCents: 2500,
          effectiveFrom: '2026-03-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('dovrebbe passare se FLAT_RATE con flatRatePerJobCents (skip first check)', async () => {
      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);
      prisma.technicianPayConfig.updateMany.mockResolvedValueOnce({ count: 0 });
      prisma.technicianPayConfig.create.mockResolvedValueOnce({
        id: 'cfg-002',
        payType: PayType.FLAT_RATE,
      });

      const result = await service.configurePayRate(TENANT_ID, TECH_ID, {
        payType: PayType.FLAT_RATE,
        flatRatePerJobCents: 5000,
        effectiveFrom: '2026-03-01',
      });

      expect(result.payType).toBe(PayType.FLAT_RATE);
    });

    it('dovrebbe lanciare se FLAT_RATE senza flatRatePerJobCents (second check fails)', async () => {
      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);

      await expect(
        service.configurePayRate(TENANT_ID, TECH_ID, {
          payType: PayType.FLAT_RATE,
          effectiveFrom: '2026-03-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('dovrebbe lanciare se MIXED manca una tariffa (second OR evaluates true)', async () => {
      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);

      await expect(
        service.configurePayRate(TENANT_ID, TECH_ID, {
          payType: PayType.MIXED,
          hourlyRateCents: 2500,
          effectiveFrom: '2026-03-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('dovrebbe passare se HOURLY con hourlyRateCents (line 74 first OR evaluates true, second false)', async () => {
      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);
      prisma.technicianPayConfig.updateMany.mockResolvedValueOnce({ count: 0 });
      prisma.technicianPayConfig.create.mockResolvedValueOnce({
        id: 'cfg-003',
        payType: PayType.HOURLY,
      });

      const result = await service.configurePayRate(TENANT_ID, TECH_ID, {
        payType: PayType.HOURLY,
        hourlyRateCents: 2500,
        effectiveFrom: '2026-03-01',
      });

      expect(result.payType).toBe(PayType.HOURLY);
    });

    it('dovrebbe passare se MIXED con entrambe le tariffe (line 80 both OR branches true)', async () => {
      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);
      prisma.technicianPayConfig.updateMany.mockResolvedValueOnce({ count: 0 });
      prisma.technicianPayConfig.create.mockResolvedValueOnce({
        id: 'cfg-004',
        payType: PayType.MIXED,
      });

      const result = await service.configurePayRate(TENANT_ID, TECH_ID, {
        payType: PayType.MIXED,
        hourlyRateCents: 2500,
        flatRatePerJobCents: 5000,
        effectiveFrom: '2026-03-01',
      });

      expect(result.payType).toBe(PayType.MIXED);
    });

    it('dovrebbe creare configurazione con tutti i parametri opzionali (lines 105-113)', async () => {
      prisma.technician.findFirst.mockResolvedValueOnce(mockTechnician);
      prisma.technicianPayConfig.updateMany.mockResolvedValueOnce({ count: 0 });
      prisma.technicianPayConfig.create.mockResolvedValueOnce({
        id: 'cfg-005',
        payType: PayType.HOURLY,
      });

      const result = await service.configurePayRate(TENANT_ID, TECH_ID, {
        payType: PayType.HOURLY,
        hourlyRateCents: 3000,
        overtimeMultiplier: 2.0, // Non-default value (line 106 true branch)
        overtimeThresholdHours: 35, // Non-default value (line 109 true branch)
        bonusRules: { tier1: 100 }, // Non-null value (line 111 true branch)
        effectiveFrom: '2026-03-01',
        effectiveTo: '2026-12-31', // Optional end date (line 113 true branch)
      });

      expect(result.payType).toBe(PayType.HOURLY);
      expect(prisma.technicianPayConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            overtimeMultiplier: new Decimal(2.0),
            overtimeThresholdHours: new Decimal(35),
            effectiveTo: new Date('2026-12-31'),
          }),
        }),
      );
    });
  });

  // =========================================================================
  // calculatePayroll
  // =========================================================================

  describe('calculatePayroll', () => {
    it('dovrebbe calcolare retribuzione HOURLY senza straordinari', async () => {
      prisma.technician.findFirst.mockResolvedValue(mockTechnician);
      prisma.technicianPayConfig.findFirst.mockResolvedValue(mockPayConfig);
      prisma.technicianTimeLog.findMany.mockResolvedValue(mockTimeLogs);
      prisma.workOrderTechnician.count.mockResolvedValue(0);
      prisma.payrollRecord.upsert.mockResolvedValue(mockPayrollRecord);

      const result = await service.calculatePayroll(TENANT_ID, TECH_ID, PERIOD);

      // 960 minutes = 16 hours, under 40h threshold
      expect(result.regularHours).toBe(16);
      expect(result.overtimeHours).toBe(0);
      expect(result.regularPayCents).toBe(40000); // 16h * 2500
      expect(result.overtimePayCents).toBe(0);
      expect(result.totalPayCents).toBe(40000);
      expect(result.technicianName).toBe('Marco Bianchi');
    });

    it('dovrebbe calcolare straordinari se ore > soglia', async () => {
      // 50 hours = 3000 minutes
      const lotsOfLogs = [{ ...mockTimeLogs[0], durationMinutes: 3000 }];

      prisma.technician.findFirst.mockResolvedValue(mockTechnician);
      prisma.technicianPayConfig.findFirst.mockResolvedValue(mockPayConfig);
      prisma.technicianTimeLog.findMany.mockResolvedValue(lotsOfLogs);
      prisma.workOrderTechnician.count.mockResolvedValue(0);
      prisma.payrollRecord.upsert.mockResolvedValue(mockPayrollRecord);

      const result = await service.calculatePayroll(TENANT_ID, TECH_ID, PERIOD);

      expect(result.regularHours).toBe(40);
      expect(result.overtimeHours).toBe(10);
      expect(result.regularPayCents).toBe(100000); // 40h * 2500
      expect(result.overtimePayCents).toBe(37500); // 10h * 2500 * 1.5
    });

    it('dovrebbe gestire esattamente 40 ore (nessun overtime)', async () => {
      // Exactly 40 hours = 2400 minutes
      const exactLogs = [{ ...mockTimeLogs[0], durationMinutes: 2400 }];

      prisma.technician.findFirst.mockResolvedValue(mockTechnician);
      prisma.technicianPayConfig.findFirst.mockResolvedValue(mockPayConfig);
      prisma.technicianTimeLog.findMany.mockResolvedValue(exactLogs);
      prisma.workOrderTechnician.count.mockResolvedValue(0);
      prisma.payrollRecord.upsert.mockResolvedValue(mockPayrollRecord);

      const result = await service.calculatePayroll(TENANT_ID, TECH_ID, PERIOD);

      // Math.min(40, 40) = 40, Math.max(0, 40-40) = 0
      expect(result.regularHours).toBe(40);
      expect(result.overtimeHours).toBe(0);
      expect(result.regularPayCents).toBe(100000); // 40h * 2500
      expect(result.overtimePayCents).toBe(0);
      expect(result.totalPayCents).toBe(100000);
    });

    it('dovrebbe gestire zero ore (nessun time log)', async () => {
      prisma.technician.findFirst.mockResolvedValue(mockTechnician);
      prisma.technicianPayConfig.findFirst.mockResolvedValue(mockPayConfig);
      prisma.technicianTimeLog.findMany.mockResolvedValue([]); // No logs
      prisma.workOrderTechnician.count.mockResolvedValue(0);
      prisma.payrollRecord.upsert.mockResolvedValue(mockPayrollRecord);

      const result = await service.calculatePayroll(TENANT_ID, TECH_ID, PERIOD);

      expect(result.regularHours).toBe(0);
      expect(result.overtimeHours).toBe(0);
      expect(result.regularPayCents).toBe(0);
      expect(result.overtimePayCents).toBe(0);
      expect(result.totalPayCents).toBe(0);
    });

    it('dovrebbe calcolare FLAT_RATE per lavori completati', async () => {
      const flatConfig = {
        ...mockPayConfig,
        payType: PayType.FLAT_RATE,
        hourlyRateCents: null,
        flatRatePerJobCents: new Decimal(5000),
      };

      prisma.technician.findFirst.mockResolvedValue(mockTechnician);
      prisma.technicianPayConfig.findFirst.mockResolvedValue(flatConfig);
      prisma.technicianTimeLog.findMany.mockResolvedValue(mockTimeLogs);
      prisma.workOrderTechnician.count.mockResolvedValue(8);
      prisma.payrollRecord.upsert.mockResolvedValue(mockPayrollRecord);

      const result = await service.calculatePayroll(TENANT_ID, TECH_ID, PERIOD);

      expect(result.flatRatePayCents).toBe(40000); // 8 jobs * 5000
      expect(result.regularPayCents).toBe(0);
      expect(result.totalPayCents).toBe(40000);
    });

    it('dovrebbe gestire FLAT_RATE con overtime (line 192 false, 200 true)', async () => {
      const flatWithOvertimeConfig = {
        ...mockPayConfig,
        payType: PayType.FLAT_RATE,
        hourlyRateCents: null,
        flatRatePerJobCents: new Decimal(5000),
      };
      // 50 hours total = 3000 minutes (40 regular + 10 overtime, but FLAT_RATE doesn't use hours)
      const lotsOfLogs = [{ ...mockTimeLogs[0], durationMinutes: 3000 }];

      prisma.technician.findFirst.mockResolvedValue(mockTechnician);
      prisma.technicianPayConfig.findFirst.mockResolvedValue(flatWithOvertimeConfig);
      prisma.technicianTimeLog.findMany.mockResolvedValue(lotsOfLogs);
      prisma.workOrderTechnician.count.mockResolvedValue(6); // 6 jobs completed
      prisma.payrollRecord.upsert.mockResolvedValue(mockPayrollRecord);

      const result = await service.calculatePayroll(TENANT_ID, TECH_ID, PERIOD);

      // FLAT_RATE ignores hours, only pays per job
      expect(result.regularPayCents).toBe(0); // FLAT_RATE: line 192 condition is false
      expect(result.overtimePayCents).toBe(0);
      expect(result.flatRatePayCents).toBe(30000); // 6 jobs * 5000
      expect(result.totalPayCents).toBe(30000);
    });

    it('dovrebbe saltare FLAT_RATE calc per payType HOURLY', async () => {
      const technician = { id: 'tech-001', name: 'Mario', tenantId: TENANT_ID };
      const hourlyConfig = {
        id: 'cfg-001',
        payType: PayType.HOURLY,
        hourlyRateCents: 2500,
        flatRatePerJobCents: null,
        overtimeMultiplier: new Decimal(1.5),
        overtimeThresholdHours: new Decimal(40),
      };
      const timeLogs = [
        { id: 'log-1', durationMinutes: 540 }, // 9 hours
        { id: 'log-2', durationMinutes: 420 }, // 7 hours
      ];
      // Total 16 hours, all regular (under 40)
      // Regular pay: 16 * 2500 = 40000 cents
      // Flat rate should NOT be applied (payType is HOURLY, not FLAT_RATE or MIXED)
      // Even though 5 jobs completed, flatRatePayCents should be 0

      prisma.technician.findFirst.mockResolvedValueOnce(technician);
      prisma.technicianPayConfig.findFirst.mockResolvedValueOnce(hourlyConfig as never);
      prisma.technicianTimeLog.findMany.mockResolvedValueOnce(timeLogs as never);
      prisma.workOrderTechnician.count.mockResolvedValueOnce(5); // Jobs completed - should be ignored
      prisma.payrollRecord.upsert.mockResolvedValueOnce({} as never);

      const result = await service.calculatePayroll(TENANT_ID, 'tech-001', '2026-03');

      expect(result.regularPayCents).toBe(40000); // 16 * 2500
      expect(result.overtimePayCents).toBe(0);
      expect(result.flatRatePayCents).toBe(0); // NOT calculated for HOURLY
      expect(result.totalPayCents).toBe(40000);
      expect(prisma.payrollRecord.upsert).toHaveBeenCalled();
    });

    it('dovrebbe calcolare MIXED con ore e jobs', async () => {
      const technician = { id: 'tech-002', name: 'Luigi', tenantId: TENANT_ID };
      const mixedConfig = {
        id: 'cfg-002',
        payType: PayType.MIXED,
        hourlyRateCents: 2500,
        flatRatePerJobCents: 5000,
        overtimeMultiplier: new Decimal(1.5),
        overtimeThresholdHours: new Decimal(40),
      };
      const timeLogs = [
        { id: 'log-1', durationMinutes: 540 }, // 9 hours
        { id: 'log-2', durationMinutes: 420 }, // 7 hours
      ];
      // Total 16 hours, all regular (under 40)
      // Regular pay: 16 * 2500 = 40000 cents
      // Flat rate pay: 3 jobs * 5000 = 15000 cents
      // Total: 55000 cents

      prisma.technician.findFirst.mockResolvedValueOnce(technician);
      prisma.technicianPayConfig.findFirst.mockResolvedValueOnce(mixedConfig as never);
      prisma.technicianTimeLog.findMany.mockResolvedValueOnce(timeLogs as never);
      prisma.workOrderTechnician.count.mockResolvedValueOnce(3); // Jobs completed
      prisma.payrollRecord.upsert.mockResolvedValueOnce({} as never);

      const result = await service.calculatePayroll(TENANT_ID, 'tech-002', '2026-03');

      expect(result.regularPayCents).toBe(40000); // 16 * 2500
      expect(result.overtimePayCents).toBe(0);
      expect(result.flatRatePayCents).toBe(15000); // 3 * 5000
      expect(result.totalPayCents).toBe(55000);
      expect(result.payType).toBe(PayType.MIXED);
      expect(prisma.payrollRecord.upsert).toHaveBeenCalled();
    });

    it('dovrebbe lanciare NotFoundException per tecnico inesistente', async () => {
      prisma.technician.findFirst.mockResolvedValue(null);

      await expect(service.calculatePayroll(TENANT_ID, 'non-existent', PERIOD)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('dovrebbe lanciare NotFoundException senza configurazione retributiva', async () => {
      prisma.technician.findFirst.mockResolvedValue(mockTechnician);
      prisma.technicianPayConfig.findFirst.mockResolvedValue(null);

      await expect(service.calculatePayroll(TENANT_ID, TECH_ID, PERIOD)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =========================================================================
  // calculateAllPayroll
  // =========================================================================

  describe('calculateAllPayroll', () => {
    it('dovrebbe calcolare per tutti i tecnici attivi', async () => {
      const tech2 = { ...mockTechnician, id: 'tech-002', name: 'Luigi Verdi' };
      prisma.technician.findMany.mockResolvedValue([mockTechnician, tech2]);
      prisma.technician.findFirst
        .mockResolvedValueOnce(mockTechnician)
        .mockResolvedValueOnce(tech2);
      prisma.technicianPayConfig.findFirst.mockResolvedValue(mockPayConfig);
      prisma.technicianTimeLog.findMany.mockResolvedValue(mockTimeLogs);
      prisma.workOrderTechnician.count.mockResolvedValue(0);
      prisma.payrollRecord.upsert.mockResolvedValue(mockPayrollRecord);

      const results = await service.calculateAllPayroll(TENANT_ID, PERIOD);

      expect(results).toHaveLength(2);
    });

    it('dovrebbe saltare tecnici senza configurazione', async () => {
      prisma.technician.findMany.mockResolvedValue([mockTechnician]);
      prisma.technician.findFirst.mockResolvedValue(mockTechnician);
      prisma.technicianPayConfig.findFirst.mockResolvedValue(null);

      const results = await service.calculateAllPayroll(TENANT_ID, PERIOD);

      expect(results).toHaveLength(0);
    });
  });

  // =========================================================================
  // getPayrollSummary
  // =========================================================================

  describe('getPayrollSummary', () => {
    it('dovrebbe restituire riepilogo corretto', async () => {
      prisma.payrollRecord.findMany.mockResolvedValue([mockPayrollRecord]);

      const summary = await service.getPayrollSummary(TENANT_ID, PERIOD);

      expect(summary.period).toBe(PERIOD);
      expect(summary.totalTechnicians).toBe(1);
      expect(summary.totalRegularHours).toBe(16);
      expect(summary.totalPayCents).toBe(40000);
      expect(summary.records).toHaveLength(1);
      expect(summary.records[0].technicianName).toBe('Marco Bianchi');
    });

    it('dovrebbe gestire periodo senza record', async () => {
      prisma.payrollRecord.findMany.mockResolvedValue([]);

      const summary = await service.getPayrollSummary(TENANT_ID, PERIOD);

      expect(summary.totalTechnicians).toBe(0);
      expect(summary.totalPayCents).toBe(0);
      expect(summary.records).toHaveLength(0);
    });
  });

  // =========================================================================
  // approvePayroll
  // =========================================================================

  describe('approvePayroll', () => {
    it('dovrebbe approvare record DRAFT', async () => {
      prisma.payrollRecord.findFirst.mockResolvedValue(mockPayrollRecord);
      prisma.payrollRecord.update.mockResolvedValue({
        ...mockPayrollRecord,
        status: PayrollStatus.APPROVED,
      });

      const result = (await service.approvePayroll(TENANT_ID, RECORD_ID, 'user-001')) as {
        status: PayrollStatus;
      };

      expect(result.status).toBe(PayrollStatus.APPROVED);
      expect(prisma.payrollRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: RECORD_ID },
          data: expect.objectContaining({
            status: PayrollStatus.APPROVED,
            approvedBy: 'user-001',
          }),
        }),
      );
    });

    it('dovrebbe lanciare NotFoundException per record inesistente', async () => {
      prisma.payrollRecord.findFirst.mockResolvedValue(null);

      await expect(service.approvePayroll(TENANT_ID, 'non-existent', 'user-001')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('dovrebbe lanciare ConflictException per record già approvato', async () => {
      prisma.payrollRecord.findFirst.mockResolvedValue({
        ...mockPayrollRecord,
        status: PayrollStatus.APPROVED,
      });

      await expect(service.approvePayroll(TENANT_ID, RECORD_ID, 'user-001')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // =========================================================================
  // exportPayroll
  // =========================================================================

  describe('exportPayroll', () => {
    it('dovrebbe generare CSV corretto', async () => {
      prisma.payrollRecord.findMany.mockResolvedValue([mockPayrollRecord]);

      const csv = await service.exportPayroll(TENANT_ID, PERIOD);

      expect(csv).toContain('Tecnico,Periodo');
      expect(csv).toContain('Marco Bianchi');
      expect(csv).toContain(PERIOD);
      expect(csv).toContain('DRAFT');
    });

    it('dovrebbe restituire solo header per periodo vuoto', async () => {
      prisma.payrollRecord.findMany.mockResolvedValue([]);

      const csv = await service.exportPayroll(TENANT_ID, PERIOD);

      const lines = csv.split('\n');
      expect(lines).toHaveLength(1); // solo header
    });
  });
});
