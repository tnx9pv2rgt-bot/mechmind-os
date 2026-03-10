/**
 * MechMind OS - Tire Set Service
 *
 * Manages seasonal tire storage and swap tracking.
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { TireSet, Prisma } from '@prisma/client';
import { CreateTireSetDto, UpdateTireSetDto } from '../dto/tire.dto';

@Injectable()
export class TireService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateTireSetDto): Promise<TireSet> {
    return this.prisma.tireSet.create({
      data: {
        tenantId,
        vehicleId: dto.vehicleId,
        brand: dto.brand,
        model: dto.model,
        size: dto.size,
        season: dto.season,
        dot: dto.dot,
        treadDepthMm: dto.treadDepthMm,
        wearLevel: dto.wearLevel ?? 0,
        storageLocation: dto.storageLocation,
        notes: dto.notes,
      },
    });
  }

  async findAll(
    tenantId: string,
    filters: {
      vehicleId?: string;
      season?: string;
      isStored?: boolean;
    },
  ): Promise<TireSet[]> {
    const where: Prisma.TireSetWhereInput = {
      tenantId,
      isActive: true,
    };

    if (filters.vehicleId) {
      where.vehicleId = filters.vehicleId;
    }
    if (filters.season) {
      where.season = filters.season as Prisma.EnumTireSeasonFilter;
    }
    if (filters.isStored !== undefined) {
      where.isStored = filters.isStored;
    }

    return this.prisma.tireSet.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(tenantId: string, id: string): Promise<TireSet> {
    const tireSet = await this.prisma.tireSet.findFirst({
      where: { id, tenantId },
    });

    if (!tireSet) {
      throw new NotFoundException(`TireSet ${id} not found`);
    }

    return tireSet;
  }

  async update(tenantId: string, id: string, dto: UpdateTireSetDto): Promise<TireSet> {
    await this.findById(tenantId, id);

    return this.prisma.tireSet.update({
      where: { id },
      data: {
        ...dto,
      },
    });
  }

  async mount(tenantId: string, id: string, vehicleId: string): Promise<TireSet> {
    const tireSet = await this.findById(tenantId, id);

    if (tireSet.isMounted) {
      throw new BadRequestException(`TireSet ${id} is already mounted`);
    }

    return this.prisma.tireSet.update({
      where: { id },
      data: {
        vehicleId,
        isMounted: true,
        mountedAt: new Date(),
        unmountedAt: null,
        isStored: false,
        storedAt: null,
        storageLocation: null,
      },
    });
  }

  async unmount(tenantId: string, id: string): Promise<TireSet> {
    const tireSet = await this.findById(tenantId, id);

    if (!tireSet.isMounted) {
      throw new BadRequestException(`TireSet ${id} is not mounted`);
    }

    return this.prisma.tireSet.update({
      where: { id },
      data: {
        isMounted: false,
        unmountedAt: new Date(),
      },
    });
  }

  async store(tenantId: string, id: string, storageLocation: string): Promise<TireSet> {
    const tireSet = await this.findById(tenantId, id);

    if (tireSet.isStored) {
      throw new BadRequestException(`TireSet ${id} is already in storage`);
    }

    if (tireSet.isMounted) {
      throw new BadRequestException(`TireSet ${id} must be unmounted before storing`);
    }

    return this.prisma.tireSet.update({
      where: { id },
      data: {
        isStored: true,
        storedAt: new Date(),
        storageLocation,
      },
    });
  }

  async retrieve(tenantId: string, id: string): Promise<TireSet> {
    const tireSet = await this.findById(tenantId, id);

    if (!tireSet.isStored) {
      throw new BadRequestException(`TireSet ${id} is not in storage`);
    }

    return this.prisma.tireSet.update({
      where: { id },
      data: {
        isStored: false,
        storedAt: null,
        storageLocation: null,
      },
    });
  }
}
