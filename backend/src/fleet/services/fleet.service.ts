/**
 * MechMind OS - Fleet Management Service
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../common/services/prisma.service';
import { LoggerService } from '../../common/services/logger.service';
import { CreateFleetDto, UpdateFleetDto } from '../dto/fleet.dto';

@Injectable()
export class FleetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {}

  async create(tenantId: string, dto: CreateFleetDto): Promise<Record<string, unknown>> {
    this.logger.log(`Creating fleet "${dto.name}" for tenant ${tenantId}`);

    const fleet = await this.prisma.fleet.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        companyName: dto.companyName,
        contactName: dto.contactName,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        isActive: true,
      },
    });

    this.eventEmitter.emit('fleet.created', {
      fleetId: fleet.id,
      tenantId,
      name: fleet.name,
    });

    return fleet;
  }

  async findAll(tenantId: string): Promise<Record<string, unknown>[]> {
    return this.prisma.fleet.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(tenantId: string, id: string): Promise<Record<string, unknown>> {
    const fleet = await this.prisma.fleet.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        fleetVehicles: {
          where: { removedAt: null },
          include: { vehicle: true },
        },
      },
    });

    if (!fleet) {
      throw new NotFoundException(`Fleet with ID ${id} not found`);
    }

    return fleet;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateFleetDto,
  ): Promise<Record<string, unknown>> {
    await this.findById(tenantId, id);

    const fleet = await this.prisma.fleet.update({
      where: { id },
      data: {
        ...dto,
      },
    });

    this.eventEmitter.emit('fleet.updated', {
      fleetId: fleet.id,
      tenantId,
    });

    return fleet;
  }

  async delete(tenantId: string, id: string): Promise<Record<string, unknown>> {
    await this.findById(tenantId, id);

    const fleet = await this.prisma.fleet.update({
      where: { id },
      data: { isActive: false },
    });

    this.eventEmitter.emit('fleet.deleted', {
      fleetId: fleet.id,
      tenantId,
    });

    return fleet;
  }

  async addVehicle(
    tenantId: string,
    fleetId: string,
    vehicleId: string,
  ): Promise<Record<string, unknown>> {
    await this.findById(tenantId, fleetId);

    // Check vehicle exists for this tenant
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, tenantId },
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${vehicleId} not found`);
    }

    // Check if vehicle is already assigned to this fleet and not removed
    const existing = await this.prisma.fleetVehicle.findFirst({
      where: {
        tenantId,
        fleetId,
        vehicleId,
        removedAt: null,
      },
    });

    if (existing) {
      throw new BadRequestException(`Vehicle ${vehicleId} is already assigned to fleet ${fleetId}`);
    }

    const fleetVehicle = await this.prisma.fleetVehicle.create({
      data: {
        tenantId,
        fleetId,
        vehicleId,
        assignedAt: new Date(),
      },
    });

    this.eventEmitter.emit('fleet.vehicle.added', {
      fleetId,
      vehicleId,
      tenantId,
    });

    return fleetVehicle;
  }

  async removeVehicle(
    tenantId: string,
    fleetId: string,
    vehicleId: string,
  ): Promise<Record<string, unknown>> {
    await this.findById(tenantId, fleetId);

    const fleetVehicle = await this.prisma.fleetVehicle.findFirst({
      where: {
        tenantId,
        fleetId,
        vehicleId,
        removedAt: null,
      },
    });

    if (!fleetVehicle) {
      throw new NotFoundException(`Vehicle ${vehicleId} is not assigned to fleet ${fleetId}`);
    }

    const updated = await this.prisma.fleetVehicle.update({
      where: { id: fleetVehicle.id },
      data: { removedAt: new Date() },
    });

    this.eventEmitter.emit('fleet.vehicle.removed', {
      fleetId,
      vehicleId,
      tenantId,
    });

    return updated;
  }
}
