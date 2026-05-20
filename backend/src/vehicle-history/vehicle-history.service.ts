import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/services/prisma.service';
import { VehicleHistorySource, Prisma } from '@prisma/client';
import { ImportHistoryDto } from './dto/import-history.dto';
import { ManualRecordDto } from './dto/manual-record.dto';

export interface VehicleHistoryEntry {
  id: string;
  vehicleId: string;
  vin: string | null;
  source: VehicleHistorySource;
  eventType: string;
  eventDate: Date;
  description: string;
  mileage: number | null;
  shopName: string | null;
  costCents: Prisma.Decimal | null;
  metadata: Prisma.JsonValue | null;
  importedAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class VehicleHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cronologia completa: record locali (da WorkOrder) + record importati/manuali
   */
  async getFullHistory(tenantId: string, vehicleId: string): Promise<VehicleHistoryEntry[]> {
    await this.ensureVehicleExists(tenantId, vehicleId);

    const [localRecords, externalRecords] = await Promise.all([
      this.getLocalHistory(tenantId, vehicleId),
      this.prisma.vehicleHistoryRecord.findMany({
        where: {
          tenantId,
          vehicleId,
          source: { not: VehicleHistorySource.LOCAL },
        },
        orderBy: { eventDate: 'desc' },
      }),
    ]);

    const allRecords = [...localRecords, ...externalRecords];
    allRecords.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());

    return allRecords;
  }

  /**
   * Importa record da sorgente esterna (Motornet, Carfax, etc.)
   */
  async importExternalHistory(
    tenantId: string,
    vehicleId: string,
    dto: ImportHistoryDto,
  ): Promise<{ imported: number }> {
    await this.ensureVehicleExists(tenantId, vehicleId);

    const now = new Date();
    const source = dto.source as unknown as VehicleHistorySource;

    const data = dto.records.map(record => ({
      tenantId,
      vehicleId,
      vin: record.vin ?? null,
      source,
      eventType: record.eventType,
      eventDate: new Date(record.eventDate),
      description: record.description,
      mileage: record.mileage ?? null,
      shopName: record.shopName ?? null,
      costCents: record.costCents != null ? new Prisma.Decimal(record.costCents) : null,
      metadata: (record.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      importedAt: now,
    }));

    const result = await this.prisma.vehicleHistoryRecord.createMany({ data });

    return { imported: result.count };
  }

  /**
   * Aggiungi record manuale
   */
  async addManualRecord(
    tenantId: string,
    vehicleId: string,
    dto: ManualRecordDto,
  ): Promise<VehicleHistoryEntry> {
    await this.ensureVehicleExists(tenantId, vehicleId);

    const record = await this.prisma.vehicleHistoryRecord.create({
      data: {
        tenantId,
        vehicleId,
        vin: dto.vin ?? null,
        source: VehicleHistorySource.MANUAL,
        eventType: dto.eventType,
        eventDate: new Date(dto.eventDate),
        description: dto.description,
        mileage: dto.mileage ?? null,
        shopName: dto.shopName ?? null,
        costCents: dto.costCents != null ? new Prisma.Decimal(dto.costCents) : null,
        metadata: (dto.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      },
    });

    return record;
  }

  /**
   * Cronologia locale: costruita dai WorkOrder del veicolo
   */
  async getLocalHistory(tenantId: string, vehicleId: string): Promise<VehicleHistoryEntry[]> {
    const workOrders = await this.prisma.workOrder.findMany({
      where: {
        tenantId,
        vehicleId,
        status: { in: ['COMPLETED', 'INVOICED'] },
      },
      orderBy: { actualCompletionTime: 'desc' },
      select: {
        id: true,
        woNumber: true,
        diagnosis: true,
        customerRequest: true,
        totalCost: true,
        mileageIn: true,
        actualCompletionTime: true,
        actualStartTime: true,
        createdAt: true,
      },
    });

    return workOrders.map(wo => ({
      id: `local-${wo.id}`,
      vehicleId,
      vin: null,
      source: VehicleHistorySource.LOCAL,
      eventType: 'SERVICE',
      eventDate: wo.actualCompletionTime ?? wo.createdAt,
      description: `[${wo.woNumber}] ${wo.diagnosis ?? wo.customerRequest ?? 'Intervento completato'}`,
      mileage: wo.mileageIn,
      shopName: null,
      costCents: wo.totalCost,
      metadata: null,
      importedAt: null,
      createdAt: wo.createdAt,
    }));
  }

  private async ensureVehicleExists(tenantId: string, vehicleId: string): Promise<void> {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, tenantId, deletedAt: null },
      select: { id: true },
    });

    if (!vehicle) {
      throw new NotFoundException(`Veicolo ${vehicleId} non trovato`);
    }
  }
}
