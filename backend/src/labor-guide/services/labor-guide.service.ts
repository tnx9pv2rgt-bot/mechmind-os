import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import {
  CreateLaborGuideDto,
  UpdateLaborGuideDto,
  CreateLaborGuideEntryDto,
  UpdateLaborGuideEntryDto,
} from '../dto/labor-guide.dto';
import { LaborGuide, LaborGuideEntry, Prisma } from '@prisma/client';

@Injectable()
export class LaborGuideService {
  constructor(private readonly prisma: PrismaService) {}

  async createGuide(tenantId: string, dto: CreateLaborGuideDto): Promise<LaborGuide> {
    const existing = await this.prisma.laborGuide.findUnique({
      where: { tenantId_name: { tenantId, name: dto.name } },
    });

    if (existing) {
      throw new BadRequestException(`Labor guide with name "${dto.name}" already exists`);
    }

    return this.prisma.laborGuide.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        source: dto.source,
      },
    });
  }

  async findAllGuides(
    tenantId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{
    data: LaborGuide[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 50;
    const where = { tenantId, isActive: true };

    const [data, total] = await Promise.all([
      this.prisma.laborGuide.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.laborGuide.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findGuideById(
    tenantId: string,
    id: string,
  ): Promise<LaborGuide & { entries: LaborGuideEntry[] }> {
    const guide = await this.prisma.laborGuide.findFirst({
      where: { id, tenantId },
      include: { entries: { orderBy: { operationName: 'asc' } } },
    });

    if (!guide) {
      throw new NotFoundException(`Labor guide with id "${id}" not found`);
    }

    return guide;
  }

  async updateGuide(tenantId: string, id: string, dto: UpdateLaborGuideDto): Promise<LaborGuide> {
    await this.findGuideById(tenantId, id);

    if (dto.name) {
      const existing = await this.prisma.laborGuide.findFirst({
        where: {
          tenantId,
          name: dto.name,
          id: { not: id },
        },
      });

      if (existing) {
        throw new BadRequestException(`Labor guide with name "${dto.name}" already exists`);
      }
    }

    return this.prisma.laborGuide.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        source: dto.source,
        isActive: dto.isActive,
      },
    });
  }

  async deleteGuide(tenantId: string, id: string): Promise<LaborGuide> {
    await this.findGuideById(tenantId, id);

    return this.prisma.laborGuide.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async addEntry(
    tenantId: string,
    guideId: string,
    dto: CreateLaborGuideEntryDto,
  ): Promise<LaborGuideEntry> {
    await this.findGuideById(tenantId, guideId);

    if (dto.yearFrom && dto.yearTo && dto.yearFrom > dto.yearTo) {
      throw new BadRequestException('yearFrom must be less than or equal to yearTo');
    }

    return this.prisma.laborGuideEntry.create({
      data: {
        tenantId,
        guideId,
        make: dto.make,
        model: dto.model,
        yearFrom: dto.yearFrom,
        yearTo: dto.yearTo,
        operationCode: dto.operationCode,
        operationName: dto.operationName,
        category: dto.category,
        laborTimeMinutes: dto.laborTimeMinutes,
        difficultyLevel: dto.difficultyLevel ?? 1,
        notes: dto.notes,
      },
    });
  }

  async updateEntry(
    tenantId: string,
    entryId: string,
    dto: UpdateLaborGuideEntryDto,
  ): Promise<LaborGuideEntry> {
    const entry = await this.prisma.laborGuideEntry.findFirst({
      where: { id: entryId, tenantId },
    });

    if (!entry) {
      throw new NotFoundException(`Labor guide entry with id "${entryId}" not found`);
    }

    const yearFrom = dto.yearFrom ?? entry.yearFrom;
    const yearTo = dto.yearTo ?? entry.yearTo;

    if (yearFrom && yearTo && yearFrom > yearTo) {
      throw new BadRequestException('yearFrom must be less than or equal to yearTo');
    }

    return this.prisma.laborGuideEntry.update({
      where: { id: entryId },
      data: {
        make: dto.make,
        model: dto.model,
        yearFrom: dto.yearFrom,
        yearTo: dto.yearTo,
        operationCode: dto.operationCode,
        operationName: dto.operationName,
        category: dto.category,
        laborTimeMinutes: dto.laborTimeMinutes,
        difficultyLevel: dto.difficultyLevel,
        notes: dto.notes,
      },
    });
  }

  async deleteEntry(tenantId: string, entryId: string): Promise<LaborGuideEntry> {
    const entry = await this.prisma.laborGuideEntry.findFirst({
      where: { id: entryId, tenantId },
    });

    if (!entry) {
      throw new NotFoundException(`Labor guide entry with id "${entryId}" not found`);
    }

    return this.prisma.laborGuideEntry.delete({
      where: { id: entryId },
    });
  }

  async searchEntries(
    tenantId: string,
    make: string,
    model?: string,
    category?: string,
    page = 1,
    limit = 50,
  ): Promise<{
    data: LaborGuideEntry[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const where: Prisma.LaborGuideEntryWhereInput = {
      tenantId,
      make: { equals: make, mode: 'insensitive' },
      guide: { isActive: true },
    };

    if (model) {
      where.model = { equals: model, mode: 'insensitive' };
    }

    if (category) {
      where.category = { equals: category, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.laborGuideEntry.findMany({
        where,
        include: { guide: { select: { id: true, name: true, source: true } } },
        orderBy: [{ category: 'asc' }, { operationName: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.laborGuideEntry.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }
}
