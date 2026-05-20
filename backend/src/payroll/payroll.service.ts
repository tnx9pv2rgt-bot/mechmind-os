/**
 * MechMind OS - Payroll Service
 *
 * Gestione buste paga tecnici: calcolo retribuzione oraria,
 * straordinari, tariffa fissa per lavoro completato.
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { CreatePayConfigDto } from './dto/pay-config.dto';
import { PayType, PayrollStatus, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface PayrollCalculation {
  technicianId: string;
  technicianName: string;
  period: string;
  regularHours: number;
  overtimeHours: number;
  completedJobs: number;
  regularPayCents: number;
  overtimePayCents: number;
  flatRatePayCents: number;
  bonusPayCents: number;
  totalPayCents: number;
  payType: PayType;
}

export interface PayrollSummary {
  period: string;
  totalTechnicians: number;
  totalRegularHours: number;
  totalOvertimeHours: number;
  totalPayCents: number;
  records: PayrollSummaryRecord[];
}

export interface PayrollSummaryRecord {
  technicianId: string;
  technicianName: string;
  regularHours: number;
  overtimeHours: number;
  totalPayCents: number;
  status: PayrollStatus;
}

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Configura la retribuzione per un tecnico
   */
  async configurePayRate(
    tenantId: string,
    technicianId: string,
    dto: CreatePayConfigDto,
  ): Promise<unknown> {
    // Verifica che il tecnico esista
    const technician = await this.prisma.technician.findFirst({
      where: { id: technicianId, tenantId },
    });

    if (!technician) {
      throw new NotFoundException(`Tecnico ${technicianId} non trovato`);
    }

    // Validazione: HOURLY richiede hourlyRateCents
    if ((dto.payType === PayType.HOURLY || dto.payType === PayType.MIXED) && !dto.hourlyRateCents) {
      throw new BadRequestException('Tariffa oraria obbligatoria per tipo HOURLY o MIXED');
    }

    // Validazione: FLAT_RATE richiede flatRatePerJobCents
    if (
      (dto.payType === PayType.FLAT_RATE || dto.payType === PayType.MIXED) &&
      !dto.flatRatePerJobCents
    ) {
      throw new BadRequestException('Tariffa per lavoro obbligatoria per tipo FLAT_RATE o MIXED');
    }

    // Chiudi configurazione precedente se aperta
    await this.prisma.technicianPayConfig.updateMany({
      where: {
        tenantId,
        technicianId,
        effectiveTo: null,
      },
      data: {
        effectiveTo: new Date(dto.effectiveFrom),
      },
    });

    return this.prisma.technicianPayConfig.create({
      data: {
        tenantId,
        technicianId,
        payType: dto.payType,
        hourlyRateCents: dto.hourlyRateCents ? new Decimal(dto.hourlyRateCents) : null,
        flatRatePerJobCents: dto.flatRatePerJobCents ? new Decimal(dto.flatRatePerJobCents) : null,
        overtimeMultiplier: dto.overtimeMultiplier
          ? new Decimal(dto.overtimeMultiplier)
          : new Decimal(1.5),
        overtimeThresholdHours: dto.overtimeThresholdHours
          ? new Decimal(dto.overtimeThresholdHours)
          : new Decimal(40),
        bonusRules: dto.bonusRules ? (dto.bonusRules as Prisma.InputJsonValue) : Prisma.JsonNull,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      },
    });
  }

  /**
   * Calcola la busta paga per un singolo tecnico in un periodo
   */
  async calculatePayroll(
    tenantId: string,
    technicianId: string,
    period: string,
  ): Promise<PayrollCalculation> {
    // Verifica tecnico
    const technician = await this.prisma.technician.findFirst({
      where: { id: technicianId, tenantId },
    });

    if (!technician) {
      throw new NotFoundException(`Tecnico ${technicianId} non trovato`);
    }

    // Trova configurazione retributiva attiva per il periodo
    const periodStart = new Date(`${period}-01`);
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const payConfig = await this.prisma.technicianPayConfig.findFirst({
      where: {
        tenantId,
        technicianId,
        effectiveFrom: { lte: periodEnd },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: periodStart } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (!payConfig) {
      throw new NotFoundException(
        `Configurazione retributiva non trovata per tecnico ${technicianId} nel periodo ${period}`,
      );
    }

    // Recupera time logs del periodo
    const timeLogs = await this.prisma.technicianTimeLog.findMany({
      where: {
        tenantId,
        technicianId,
        startedAt: { gte: periodStart, lt: periodEnd },
        stoppedAt: { not: null },
      },
    });

    // Calcola ore totali
    const totalMinutes = timeLogs.reduce((sum, log) => sum + (log.durationMinutes ?? 0), 0);
    const totalHours = totalMinutes / 60;

    const thresholdHours = Number(payConfig.overtimeThresholdHours);
    const regularHours = Math.min(totalHours, thresholdHours);
    const overtimeHours = Math.max(0, totalHours - thresholdHours);

    // Calcola lavori completati (per FLAT_RATE e MIXED)
    const completedJobs = await this.prisma.workOrderTechnician.count({
      where: {
        technicianId,
        workOrder: {
          tenantId,
          status: { in: ['COMPLETED', 'INVOICED'] },
          updatedAt: { gte: periodStart, lt: periodEnd },
        },
      },
    });

    // Calcola retribuzione
    let regularPayCents = 0;
    let overtimePayCents = 0;
    let flatRatePayCents = 0;
    const bonusPayCents = 0;

    if (payConfig.payType === PayType.HOURLY || payConfig.payType === PayType.MIXED) {
      const hourlyRate = Number(payConfig.hourlyRateCents ?? 0);
      regularPayCents = Math.round(regularHours * hourlyRate);
      overtimePayCents = Math.round(
        overtimeHours * hourlyRate * Number(payConfig.overtimeMultiplier),
      );
    }

    if (payConfig.payType === PayType.FLAT_RATE || payConfig.payType === PayType.MIXED) {
      const flatRate = Number(payConfig.flatRatePerJobCents ?? 0);
      flatRatePayCents = completedJobs * flatRate;
    }

    const totalPayCents = regularPayCents + overtimePayCents + flatRatePayCents + bonusPayCents;

    // Upsert record payroll
    await this.prisma.payrollRecord.upsert({
      where: {
        tenantId_technicianId_period: {
          tenantId,
          technicianId,
          period,
        },
      },
      create: {
        tenantId,
        technicianId,
        period,
        regularHours: new Decimal(regularHours),
        overtimeHours: new Decimal(overtimeHours),
        regularPayCents: new Decimal(regularPayCents + flatRatePayCents),
        overtimePayCents: new Decimal(overtimePayCents),
        bonusPayCents: new Decimal(bonusPayCents),
        totalPayCents: new Decimal(totalPayCents),
        status: PayrollStatus.DRAFT,
      },
      update: {
        regularHours: new Decimal(regularHours),
        overtimeHours: new Decimal(overtimeHours),
        regularPayCents: new Decimal(regularPayCents + flatRatePayCents),
        overtimePayCents: new Decimal(overtimePayCents),
        bonusPayCents: new Decimal(bonusPayCents),
        totalPayCents: new Decimal(totalPayCents),
      },
    });

    return {
      technicianId,
      technicianName: technician.name,
      period,
      regularHours,
      overtimeHours,
      completedJobs,
      regularPayCents,
      overtimePayCents,
      flatRatePayCents,
      bonusPayCents,
      totalPayCents,
      payType: payConfig.payType,
    };
  }

  /**
   * Calcola la busta paga per tutti i tecnici attivi
   */
  async calculateAllPayroll(tenantId: string, period: string): Promise<PayrollCalculation[]> {
    const technicians = await this.prisma.technician.findMany({
      where: { tenantId, isActive: true },
    });

    const results: PayrollCalculation[] = [];

    for (const tech of technicians) {
      try {
        const calculation = await this.calculatePayroll(tenantId, tech.id, period);
        results.push(calculation);
      } catch {
        // Tecnici senza configurazione retributiva vengono saltati
        continue;
      }
    }

    return results;
  }

  /**
   * Riepilogo payroll per un periodo
   */
  async getPayrollSummary(tenantId: string, period: string): Promise<PayrollSummary> {
    const records = await this.prisma.payrollRecord.findMany({
      where: { tenantId, period },
      include: { technician: true },
    });

    const summaryRecords: PayrollSummaryRecord[] = records.map(r => ({
      technicianId: r.technicianId,
      technicianName: r.technician.name,
      regularHours: Number(r.regularHours),
      overtimeHours: Number(r.overtimeHours),
      totalPayCents: Number(r.totalPayCents),
      status: r.status,
    }));

    return {
      period,
      totalTechnicians: records.length,
      totalRegularHours: summaryRecords.reduce((sum, r) => sum + r.regularHours, 0),
      totalOvertimeHours: summaryRecords.reduce((sum, r) => sum + r.overtimeHours, 0),
      totalPayCents: summaryRecords.reduce((sum, r) => sum + r.totalPayCents, 0),
      records: summaryRecords,
    };
  }

  /**
   * Approva un record payroll
   */
  async approvePayroll(tenantId: string, recordId: string, approvedBy: string): Promise<unknown> {
    const record = await this.prisma.payrollRecord.findFirst({
      where: { id: recordId, tenantId },
    });

    if (!record) {
      throw new NotFoundException(`Record payroll ${recordId} non trovato`);
    }

    if (record.status !== PayrollStatus.DRAFT) {
      throw new ConflictException(
        `Il record payroll è già in stato ${record.status}, impossibile approvare`,
      );
    }

    return this.prisma.payrollRecord.update({
      where: { id: recordId },
      data: {
        status: PayrollStatus.APPROVED,
        approvedBy,
        approvedAt: new Date(),
      },
    });
  }

  /**
   * Esporta payroll in formato CSV
   */
  async exportPayroll(tenantId: string, period: string): Promise<string> {
    const records = await this.prisma.payrollRecord.findMany({
      where: { tenantId, period },
      include: { technician: true },
      orderBy: { technician: { name: 'asc' } },
    });

    const headers = [
      'Tecnico',
      'Periodo',
      'Ore Regolari',
      'Ore Straordinario',
      'Retribuzione Regolare (€)',
      'Retribuzione Straordinario (€)',
      'Bonus (€)',
      'Totale (€)',
      'Stato',
    ];

    const rows = records.map(r => [
      r.technician.name,
      r.period,
      Number(r.regularHours).toFixed(2),
      Number(r.overtimeHours).toFixed(2),
      (Number(r.regularPayCents) / 100).toFixed(2),
      (Number(r.overtimePayCents) / 100).toFixed(2),
      (Number(r.bonusPayCents) / 100).toFixed(2),
      (Number(r.totalPayCents) / 100).toFixed(2),
      r.status,
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}
