import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { CreateCannedJobDto, UpdateCannedJobDto } from './dto/canned-job.dto';
import { CannedLineType, Prisma } from '@prisma/client';

interface CannedJobFilters {
  category?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

@Injectable()
export class CannedJobService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    dto: CreateCannedJobDto,
  ): Promise<ReturnType<PrismaService['cannedJob']['create']>> {
    const lines = dto.lines ?? [];

    return this.prisma.cannedJob.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description ?? null,
        category: dto.category ?? null,
        lines: {
          create: lines.map((line, index) => ({
            type: line.type as CannedLineType,
            description: line.description,
            partId: line.partId ?? null,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            laborHours: line.laborHours ?? null,
            position: line.position ?? index,
          })),
        },
      },
      include: { lines: { orderBy: { position: 'asc' } } },
    });
  }

  async findAll(
    tenantId: string,
    filters: CannedJobFilters,
  ): Promise<{
    data: Awaited<ReturnType<PrismaService['cannedJob']['findMany']>>;
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const where: Prisma.CannedJobWhereInput = { tenantId };

    if (filters.category) {
      where.category = filters.category;
    }
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const [data, total] = await Promise.all([
      this.prisma.cannedJob.findMany({
        where,
        include: { lines: { orderBy: { position: 'asc' } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.cannedJob.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findById(
    tenantId: string,
    id: string,
  ): Promise<ReturnType<PrismaService['cannedJob']['findFirst']>> {
    const cannedJob = await this.prisma.cannedJob.findFirst({
      where: { id, tenantId },
      include: { lines: { orderBy: { position: 'asc' } } },
    });

    if (!cannedJob) {
      throw new NotFoundException(`CannedJob ${id} not found`);
    }

    return cannedJob;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateCannedJobDto,
  ): Promise<ReturnType<PrismaService['cannedJob']['update']>> {
    await this.findById(tenantId, id);

    // If lines are provided, delete old and create new in a transaction
    if (dto.lines) {
      return this.prisma.$transaction(async tx => {
        // Verify the cannedJob belongs to the tenant before deleting lines
        const job = await tx.cannedJob.findFirst({ where: { id, tenantId } });
        if (!job) throw new NotFoundException(`CannedJob ${id} not found`);

        await tx.cannedJobLine.deleteMany({ where: { cannedJobId: id } });

        return tx.cannedJob.update({
          where: { id: job.id },
          data: {
            name: dto.name,
            description: dto.description,
            category: dto.category,
            isActive: dto.isActive,
            lines: {
              create: dto.lines!.map((line, index) => ({
                type: line.type as CannedLineType,
                description: line.description,
                partId: line.partId ?? null,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                laborHours: line.laborHours ?? null,
                position: line.position ?? index,
              })),
            },
          },
          include: { lines: { orderBy: { position: 'asc' } } },
        });
      });
    }

    return this.prisma.cannedJob.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        isActive: dto.isActive,
      },
      include: { lines: { orderBy: { position: 'asc' } } },
    });
  }

  async remove(
    tenantId: string,
    id: string,
  ): Promise<ReturnType<PrismaService['cannedJob']['update']>> {
    await this.findById(tenantId, id);

    return this.prisma.cannedJob.update({
      where: { id },
      data: { isActive: false },
      include: { lines: { orderBy: { position: 'asc' } } },
    });
  }

  async applyToEstimate(
    tenantId: string,
    cannedJobId: string,
    estimateId: string,
  ): Promise<{ created: number }> {
    const cannedJob = await this.findById(tenantId, cannedJobId);

    if (!cannedJob) {
      throw new NotFoundException(`CannedJob ${cannedJobId} not found`);
    }

    const lines = (
      cannedJob as unknown as {
        lines: Array<{
          type: string;
          description: string;
          quantity: number;
          unitPrice: number;
          partId: string | null;
          position: number;
        }>;
      }
    ).lines;

    // Verify estimate belongs to tenant
    const estimate = await this.prisma.estimate.findFirst({
      where: { id: estimateId, tenantId },
    });

    if (!estimate) {
      throw new NotFoundException(`Estimate ${estimateId} not found`);
    }

    const created = await this.prisma.$transaction(
      lines.map((line, index) =>
        this.prisma.estimateLine.create({
          data: {
            estimateId,
            type: line.type as 'LABOR' | 'PART' | 'OTHER',
            description: line.description,
            quantity: line.quantity,
            unitPriceCents: line.unitPrice,
            totalCents: line.unitPrice * line.quantity,
            vatRate: 0.22,
            partId: line.partId,
            position: line.position ?? index,
          },
        }),
      ),
    );

    return { created: created.length };
  }

  async applyToWorkOrder(
    tenantId: string,
    cannedJobId: string,
    workOrderId: string,
  ): Promise<{ updated: boolean }> {
    const cannedJob = await this.findById(tenantId, cannedJobId);

    if (!cannedJob) {
      throw new NotFoundException(`CannedJob ${cannedJobId} not found`);
    }

    const lines = (
      cannedJob as unknown as {
        lines: Array<{
          type: string;
          description: string;
          quantity: number;
          unitPrice: number;
          laborHours: number | null;
          partId: string | null;
        }>;
      }
    ).lines;

    // Verify work order belongs to tenant
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, tenantId },
    });

    if (!workOrder) {
      throw new NotFoundException(`WorkOrder ${workOrderId} not found`);
    }

    const existingLaborItems = (workOrder.laborItems as Array<Record<string, unknown>>) ?? [];
    const existingPartsUsed = (workOrder.partsUsed as Array<Record<string, unknown>>) ?? [];

    const newLaborItems = lines
      .filter(l => l.type === 'LABOR')
      .map(l => ({
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        laborHours: l.laborHours,
      }));

    const newPartsUsed = lines
      .filter(l => l.type === 'PART')
      .map(l => ({
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        partId: l.partId,
      }));

    await this.prisma.workOrder.updateMany({
      where: { id: workOrderId, tenantId },
      data: {
        laborItems: JSON.parse(JSON.stringify([...existingLaborItems, ...newLaborItems])),
        partsUsed: JSON.parse(JSON.stringify([...existingPartsUsed, ...newPartsUsed])),
      },
    });

    return { updated: true };
  }
}
