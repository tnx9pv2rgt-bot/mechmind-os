/**
 * MechMind OS - Location Management Service
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { LoggerService } from '../common/services/logger.service';
import { CreateLocationDto, UpdateLocationDto } from './dto/location.dto';

@Injectable()
export class LocationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async create(tenantId: string, dto: CreateLocationDto): Promise<Record<string, unknown>> {
    this.logger.log(`Creating location "${dto.name}" for tenant ${tenantId}`);

    const location = await this.prisma.location.create({
      data: {
        tenantId,
        name: dto.name,
        address: dto.address,
        city: dto.city,
        postalCode: dto.postalCode,
        country: dto.country ?? 'IT',
        phone: dto.phone,
        email: dto.email,
        isMain: dto.isMain ?? false,
      },
    });

    return location;
  }

  async findAll(
    tenantId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    data: Record<string, unknown>[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const where = { tenantId, isActive: true };

    const [data, total] = await Promise.all([
      this.prisma.location.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.location.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string, id: string): Promise<Record<string, unknown>> {
    const location = await this.prisma.location.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!location) {
      throw new NotFoundException(`Sede con ID ${id} non trovata`);
    }

    return location;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateLocationDto,
  ): Promise<Record<string, unknown>> {
    await this.findById(tenantId, id);

    const location = await this.prisma.location.update({
      where: { id, tenantId },
      data: {
        ...dto,
      },
    });

    return location;
  }

  async delete(tenantId: string, id: string): Promise<Record<string, unknown>> {
    await this.findById(tenantId, id);

    const location = await this.prisma.location.update({
      where: { id, tenantId },
      data: { isActive: false },
    });

    return location;
  }
}
