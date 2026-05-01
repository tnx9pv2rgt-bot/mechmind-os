/**
 * MechMind OS - RENTRI Waste Management Service
 *
 * Gestione registro rifiuti, codici CER, trasportatori e destinazioni.
 * Conforme al D.Lgs. 152/2006 e al sistema RENTRI.
 */

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { CreateWasteEntryDto, WasteEntryQueryDto } from '../dto/waste-entry.dto';
import { CreateTransporterDto, UpdateTransporterDto } from '../dto/waste-transporter.dto';
import { CreateDestinationDto, UpdateDestinationDto } from '../dto/waste-destination.dto';
import { AUTO_REPAIR_CER_CODES, CerCode } from '../constants/cer-codes';
import { WasteEntryType, Prisma } from '@prisma/client';

export interface WasteDashboardCerSummary {
  cerCode: string;
  cerDescription: string;
  totalKg: number;
  entryCount: number;
}

export interface WasteDashboard {
  totalEntriesThisYear: number;
  totalKgThisYear: number;
  byCer: WasteDashboardCerSummary[];
  monthlyTrend: { month: number; totalKg: number }[];
  storageAlerts: number;
}

export interface WasteAlert {
  type: 'STORAGE_OVER_YEAR' | 'MUD_DEADLINE' | 'FIR_PENDING_CONFIRMATION';
  message: string;
  severity: 'warning' | 'error';
  entityId?: string;
}

@Injectable()
export class RentriService {
  constructor(private readonly prisma: PrismaService) {}

  // ============== WASTE ENTRIES ==============

  async findAllEntries(
    tenantId: string,
    query: WasteEntryQueryDto,
  ): Promise<{ data: unknown[]; total: number; page: number; limit: number; pages: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.WasteEntryWhereInput = { tenantId };

    if (query.cerCode) {
      where.cerCode = query.cerCode;
    }
    if (query.entryType) {
      where.entryType = query.entryType;
    }
    if (query.dateFrom || query.dateTo) {
      where.entryDate = {};
      if (query.dateFrom) {
        where.entryDate.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        where.entryDate.lte = new Date(query.dateTo);
      }
    }
    if (query.search) {
      where.OR = [
        { cerDescription: { contains: query.search, mode: 'insensitive' } },
        { entryNumber: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.wasteEntry.findMany({
        where,
        include: { transporter: true, destination: true, fir: true },
        orderBy: { entryDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.wasteEntry.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOneEntry(tenantId: string, id: string): Promise<unknown> {
    const entry = await this.prisma.wasteEntry.findFirst({
      where: { id, tenantId },
      include: { transporter: true, destination: true, fir: true },
    });

    if (!entry) {
      throw new NotFoundException(`Movimento rifiuto con ID ${id} non trovato`);
    }

    return entry;
  }

  async createEntry(tenantId: string, dto: CreateWasteEntryDto, userId?: string): Promise<unknown> {
    const entryNumber = await this.generateEntryNumber(tenantId, dto.entryType);

    return this.prisma.wasteEntry.create({
      data: {
        tenantId,
        entryNumber,
        entryType: dto.entryType,
        entryDate: new Date(dto.entryDate),
        cerCode: dto.cerCode,
        cerDescription: dto.cerDescription,
        hazardClass: dto.hazardClass,
        physicalState: dto.physicalState,
        quantityKg: new Prisma.Decimal(dto.quantityKg),
        quantityUnits: dto.quantityUnits,
        unitType: dto.unitType,
        originDescription: dto.originDescription,
        isOwnProduction: dto.isOwnProduction ?? true,
        transporterId: dto.transporterId,
        destinationId: dto.destinationId,
        workOrderId: dto.workOrderId,
        storageLocationCode: dto.storageLocationCode,
        storedSince: dto.entryType === WasteEntryType.CARICO ? new Date(dto.entryDate) : undefined,
        notes: dto.notes,
        createdBy: userId,
      },
      include: { transporter: true, destination: true },
    });
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  async updateEntry(
    tenantId: string,
    id: string,
    dto: Partial<CreateWasteEntryDto>,
  ): Promise<unknown> {
    const existing = await this.prisma.wasteEntry.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Movimento rifiuto con ID ${id} non trovato`);
    }

    const updateData: Record<string, unknown> = {};
    if (dto.cerCode !== undefined) updateData.cerCode = dto.cerCode;
    if (dto.cerDescription !== undefined) updateData.cerDescription = dto.cerDescription;
    if (dto.entryDate !== undefined) updateData.entryDate = new Date(dto.entryDate);
    if (dto.quantityKg !== undefined) updateData.quantityKg = new Prisma.Decimal(dto.quantityKg);
    if (dto.hazardClass !== undefined) updateData.hazardClass = dto.hazardClass;
    if (dto.physicalState !== undefined) updateData.physicalState = dto.physicalState;
    if (dto.quantityUnits !== undefined) updateData.quantityUnits = dto.quantityUnits;
    if (dto.unitType !== undefined) updateData.unitType = dto.unitType;
    if (dto.originDescription !== undefined) updateData.originDescription = dto.originDescription;
    if (dto.isOwnProduction !== undefined) updateData.isOwnProduction = dto.isOwnProduction;
    if (dto.transporterId !== undefined) updateData.transporterId = dto.transporterId;
    if (dto.destinationId !== undefined) updateData.destinationId = dto.destinationId;
    if (dto.workOrderId !== undefined) updateData.workOrderId = dto.workOrderId;
    if (dto.storageLocationCode !== undefined)
      updateData.storageLocationCode = dto.storageLocationCode;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    return this.prisma.wasteEntry.update({
      where: { id },
      data: updateData,
      include: { transporter: true, destination: true },
    });
  }

  private async generateEntryNumber(tenantId: string, type: WasteEntryType): Promise<string> {
    const prefix = type === WasteEntryType.CARICO ? 'RC' : 'RS';
    const year = new Date().getFullYear();

    const lastEntry = await this.prisma.wasteEntry.findFirst({
      where: {
        tenantId,
        entryNumber: { startsWith: `${prefix}-${year}-` },
      },
      orderBy: { entryNumber: 'desc' },
    });

    let nextNum = 1;
    if (lastEntry) {
      const parts = lastEntry.entryNumber.split('-');
      nextNum = parseInt(parts[2], 10) + 1;
    }

    return `${prefix}-${year}-${String(nextNum).padStart(4, '0')}`;
  }

  // ============== CER CODES ==============

  getCerCodes(): CerCode[] {
    return AUTO_REPAIR_CER_CODES;
  }

  searchCerCodes(query: string): CerCode[] {
    const q = query.toLowerCase();
    return AUTO_REPAIR_CER_CODES.filter(
      cer =>
        cer.code.toLowerCase().includes(q) ||
        cer.description.toLowerCase().includes(q) ||
        cer.commonName.toLowerCase().includes(q) ||
        cer.category.toLowerCase().includes(q),
    );
  }

  // ============== TRANSPORTERS ==============

  async findAllTransporters(tenantId: string): Promise<unknown[]> {
    return this.prisma.wasteTransporter.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async createTransporter(tenantId: string, dto: CreateTransporterDto): Promise<unknown> {
    const existing = await this.prisma.wasteTransporter.findUnique({
      where: { tenantId_fiscalCode: { tenantId, fiscalCode: dto.fiscalCode } },
    });

    if (existing) {
      throw new ConflictException(
        `Trasportatore con codice fiscale ${dto.fiscalCode} gia esistente`,
      );
    }

    return this.prisma.wasteTransporter.create({
      data: {
        tenantId,
        name: dto.name,
        fiscalCode: dto.fiscalCode,
        alboCategoryNo: dto.alboCategoryNo,
        alboCategory: dto.alboCategory,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
      },
    });
  }

  async updateTransporter(
    tenantId: string,
    id: string,
    dto: UpdateTransporterDto,
  ): Promise<unknown> {
    const existing = await this.prisma.wasteTransporter.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Trasportatore con ID ${id} non trovato`);
    }

    return this.prisma.wasteTransporter.update({
      where: { id },
      data: dto,
    });
  }

  // ============== DESTINATIONS ==============

  async findAllDestinations(tenantId: string): Promise<unknown[]> {
    return this.prisma.wasteDestination.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async createDestination(tenantId: string, dto: CreateDestinationDto): Promise<unknown> {
    const existing = await this.prisma.wasteDestination.findUnique({
      where: { tenantId_fiscalCode: { tenantId, fiscalCode: dto.fiscalCode } },
    });

    if (existing) {
      throw new ConflictException(
        `Destinazione con codice fiscale ${dto.fiscalCode} gia esistente`,
      );
    }

    return this.prisma.wasteDestination.create({
      data: {
        tenantId,
        name: dto.name,
        fiscalCode: dto.fiscalCode,
        authorizationNo: dto.authorizationNo,
        operationType: dto.operationType,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
      },
    });
  }

  async updateDestination(
    tenantId: string,
    id: string,
    dto: UpdateDestinationDto,
  ): Promise<unknown> {
    const existing = await this.prisma.wasteDestination.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Destinazione con ID ${id} non trovata`);
    }

    return this.prisma.wasteDestination.update({
      where: { id },
      data: dto,
    });
  }

  // ============== DASHBOARD ==============

  async getDashboard(tenantId: string): Promise<WasteDashboard> {
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const yearEnd = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59);

    const entries = await this.prisma.wasteEntry.findMany({
      where: {
        tenantId,
        entryDate: { gte: yearStart, lte: yearEnd },
      },
    });

    const totalEntriesThisYear = entries.length;
    const totalKgThisYear = entries.reduce((sum, e) => sum + Number(e.quantityKg), 0);

    // Aggregate by CER code
    const cerMap = new Map<string, WasteDashboardCerSummary>();
    for (const entry of entries) {
      const existing = cerMap.get(entry.cerCode);
      if (existing) {
        existing.totalKg += Number(entry.quantityKg);
        existing.entryCount += 1;
      } else {
        cerMap.set(entry.cerCode, {
          cerCode: entry.cerCode,
          cerDescription: entry.cerDescription,
          totalKg: Number(entry.quantityKg),
          entryCount: 1,
        });
      }
    }

    // Monthly trend
    const monthlyMap = new Map<number, number>();
    for (const entry of entries) {
      const month = entry.entryDate.getMonth() + 1;
      monthlyMap.set(month, (monthlyMap.get(month) || 0) + Number(entry.quantityKg));
    }
    const monthlyTrend = Array.from(monthlyMap.entries())
      .map(([month, totalKg]) => ({ month, totalKg }))
      .sort((a, b) => a.month - b.month);

    // Storage alerts: entries in CARICO stored for > 1 year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const storageAlerts = await this.prisma.wasteEntry.count({
      where: {
        tenantId,
        entryType: WasteEntryType.CARICO,
        storedSince: { lte: oneYearAgo },
      },
    });

    return {
      totalEntriesThisYear,
      totalKgThisYear,
      byCer: Array.from(cerMap.values()),
      monthlyTrend,
      storageAlerts,
    };
  }

  // ============== ALERTS ==============

  async getAlerts(tenantId: string): Promise<WasteAlert[]> {
    const alerts: WasteAlert[] = [];

    // 1. Storage over 1 year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const overdueStorage = await this.prisma.wasteEntry.findMany({
      where: {
        tenantId,
        entryType: WasteEntryType.CARICO,
        storedSince: { lte: oneYearAgo },
      },
      select: { id: true, cerCode: true, storedSince: true },
    });

    for (const entry of overdueStorage) {
      alerts.push({
        type: 'STORAGE_OVER_YEAR',
        message: `Rifiuto CER ${entry.cerCode} in deposito da oltre 1 anno (dal ${entry.storedSince?.toISOString().split('T')[0]})`,
        severity: 'error',
        entityId: entry.id,
      });
    }

    // 2. MUD deadline approaching (April 30)
    const now = new Date();
    const mudDeadline = new Date(now.getFullYear(), 3, 30); // April 30
    const daysToDeadline = Math.ceil(
      (mudDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysToDeadline > 0 && daysToDeadline <= 60) {
      alerts.push({
        type: 'MUD_DEADLINE',
        message: `Scadenza MUD tra ${daysToDeadline} giorni (${mudDeadline.toISOString().split('T')[0]})`,
        severity: daysToDeadline <= 30 ? 'error' : 'warning',
      });
    }

    // 3. FIR pending confirmation > 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const pendingFirs = await this.prisma.wasteFir.findMany({
      where: {
        tenantId,
        status: 'DELIVERED',
        deliveryDate: { lte: threeMonthsAgo },
      },
      select: { id: true, firNumber: true, deliveryDate: true },
    });

    for (const fir of pendingFirs) {
      alerts.push({
        type: 'FIR_PENDING_CONFIRMATION',
        message: `FIR ${fir.firNumber} consegnato il ${fir.deliveryDate?.toISOString().split('T')[0]} in attesa di conferma da oltre 3 mesi`,
        severity: 'warning',
        entityId: fir.id,
      });
    }

    return alerts;
  }
}
