import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { VehicleCheckInDto } from './dto/check-in.dto';
import { VehicleCheckOutDto } from './dto/check-out.dto';

interface WorkOrderFilters {
  status?: string;
  vehicleId?: string;
  customerId?: string;
}

@Injectable()
export class WorkOrderService {
  private readonly logger = new Logger(WorkOrderService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a unique WO number: WO-{YEAR}-{SEQUENCE_PADDED_4}
   */
  private async generateWoNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `WO-${year}-`;

    const lastWo = await this.prisma.workOrder.findFirst({
      where: {
        tenantId,
        woNumber: { startsWith: prefix },
      },
      orderBy: { createdAt: 'desc' },
      select: { woNumber: true },
    });

    let sequence = 1;
    if (lastWo) {
      const lastSequence = parseInt(lastWo.woNumber.replace(prefix, ''), 10);
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }

    return `${prefix}${sequence.toString().padStart(4, '0')}`;
  }

  /**
   * List all work orders for a tenant with optional filters
   */
  async findAll(
    tenantId: string,
    filters?: WorkOrderFilters,
  ): Promise<{ workOrders: unknown[]; total: number }> {
    try {
      const where: Record<string, unknown> = { tenantId };

      if (filters?.status) {
        where.status = filters.status;
      }
      if (filters?.vehicleId) {
        where.vehicleId = filters.vehicleId;
      }
      if (filters?.customerId) {
        where.customerId = filters.customerId;
      }

      const [workOrders, total] = await Promise.all([
        this.prisma.workOrder.findMany({
          where,
          include: {
            vehicle: {
              select: {
                id: true,
                licensePlate: true,
                make: true,
                model: true,
                year: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.workOrder.count({ where }),
      ]);

      return { workOrders, total };
    } catch (error) {
      this.logger.error(`Failed to list work orders: ${error}`);
      throw new InternalServerErrorException('Failed to list work orders');
    }
  }

  /**
   * Get a single work order by ID with all relations
   */
  async findOne(tenantId: string, id: string): Promise<unknown> {
    try {
      const workOrder = await this.prisma.workOrder.findFirst({
        where: { id, tenantId },
        include: {
          vehicle: {
            select: {
              id: true,
              licensePlate: true,
              make: true,
              model: true,
              year: true,
              vin: true,
            },
          },
          technicians: true,
          services: true,
          parts: true,
        },
      });

      if (!workOrder) {
        throw new NotFoundException(`Work order ${id} not found`);
      }

      return workOrder;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to find work order ${id}: ${error}`);
      throw new InternalServerErrorException('Failed to find work order');
    }
  }

  /**
   * Create a new work order with auto-generated WO number
   */
  async create(tenantId: string, dto: CreateWorkOrderDto): Promise<unknown> {
    try {
      const woNumber = await this.generateWoNumber(tenantId);

      const workOrder = await this.prisma.workOrder.create({
        data: {
          tenantId,
          woNumber,
          vehicleId: dto.vehicleId,
          customerId: dto.customerId,
          technicianId: dto.technicianId,
          bookingId: dto.bookingId,
          diagnosis: dto.diagnosis,
          customerRequest: dto.customerRequest,
          mileageIn: dto.mileageIn,
          status: 'PENDING',
        },
        include: {
          vehicle: {
            select: {
              id: true,
              licensePlate: true,
              make: true,
              model: true,
            },
          },
        },
      });

      this.logger.log(`Work order ${woNumber} created for tenant ${tenantId}`);
      return workOrder;
    } catch (error) {
      this.logger.error(`Failed to create work order: ${error}`);
      throw new InternalServerErrorException('Failed to create work order');
    }
  }

  /**
   * Update an existing work order
   */
  async update(tenantId: string, id: string, dto: UpdateWorkOrderDto): Promise<unknown> {
    try {
      const existing = await this.prisma.workOrder.findFirst({
        where: { id, tenantId },
      });

      if (!existing) {
        throw new NotFoundException(`Work order ${id} not found`);
      }

      const workOrder = await this.prisma.workOrder.update({
        where: { id },
        data: {
          vehicleId: dto.vehicleId,
          customerId: dto.customerId,
          technicianId: dto.technicianId,
          bookingId: dto.bookingId,
          diagnosis: dto.diagnosis,
          customerRequest: dto.customerRequest,
          mileageIn: dto.mileageIn,
          mileageOut: dto.mileageOut,
          laborItems: dto.laborItems ? JSON.parse(JSON.stringify(dto.laborItems)) : undefined,
          partsUsed: dto.partsUsed ? JSON.parse(JSON.stringify(dto.partsUsed)) : undefined,
          laborHours: dto.laborHours,
          laborCost: dto.laborCost,
          partsCost: dto.partsCost,
          totalCost: dto.totalCost,
          photos: dto.photos ? JSON.parse(JSON.stringify(dto.photos)) : undefined,
          customerSignature: dto.customerSignature,
          assignedBayId: dto.assignedBayId,
          estimatedCompletion: dto.estimatedCompletion,
        },
        include: {
          vehicle: {
            select: {
              id: true,
              licensePlate: true,
              make: true,
              model: true,
            },
          },
        },
      });

      return workOrder;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update work order ${id}: ${error}`);
      throw new InternalServerErrorException('Failed to update work order');
    }
  }

  /**
   * Start a work order: set status to IN_PROGRESS and record start time
   */
  async start(tenantId: string, id: string): Promise<unknown> {
    try {
      const existing = await this.prisma.workOrder.findFirst({
        where: { id, tenantId },
      });

      if (!existing) {
        throw new NotFoundException(`Work order ${id} not found`);
      }

      if (
        existing.status !== 'PENDING' &&
        existing.status !== 'CHECKED_IN' &&
        existing.status !== 'OPEN'
      ) {
        throw new BadRequestException(`Cannot start work order with status ${existing.status}`);
      }

      const workOrder = await this.prisma.workOrder.update({
        where: { id },
        data: {
          status: 'IN_PROGRESS',
          actualStartTime: new Date(),
        },
      });

      this.logger.log(`Work order ${id} started for tenant ${tenantId}`);
      return workOrder;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to start work order ${id}: ${error}`);
      throw new InternalServerErrorException('Failed to start work order');
    }
  }

  /**
   * Complete a work order: set status to COMPLETED and record completion time
   */
  async complete(tenantId: string, id: string): Promise<unknown> {
    try {
      const existing = await this.prisma.workOrder.findFirst({
        where: { id, tenantId },
      });

      if (!existing) {
        throw new NotFoundException(`Work order ${id} not found`);
      }

      if (existing.status !== 'IN_PROGRESS' && existing.status !== 'QUALITY_CHECK') {
        throw new BadRequestException(`Cannot complete work order with status ${existing.status}`);
      }

      const workOrder = await this.prisma.workOrder.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          actualCompletionTime: new Date(),
        },
      });

      this.logger.log(`Work order ${id} completed for tenant ${tenantId}`);
      return workOrder;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to complete work order ${id}: ${error}`);
      throw new InternalServerErrorException('Failed to complete work order');
    }
  }

  /**
   * Create an invoice from a completed work order
   */
  async createInvoiceFromWo(tenantId: string, id: string): Promise<unknown> {
    try {
      const workOrder = await this.prisma.workOrder.findFirst({
        where: { id, tenantId },
      });

      if (!workOrder) {
        throw new NotFoundException(`Work order ${id} not found`);
      }

      if (workOrder.status === 'INVOICED') {
        throw new BadRequestException('Work order is already invoiced');
      }

      if (workOrder.status !== 'COMPLETED' && workOrder.status !== 'READY') {
        throw new BadRequestException(
          `Cannot invoice work order with status ${workOrder.status}. Must be COMPLETED or READY.`,
        );
      }

      // Build invoice items from labor and parts
      const items: Record<string, unknown>[] = [];

      if (workOrder.laborItems && Array.isArray(workOrder.laborItems)) {
        for (const item of workOrder.laborItems as Record<string, unknown>[]) {
          items.push({
            type: 'LABOR',
            description: (item.description as string) || 'Labor',
            quantity: (item.hours as number) || 1,
            unitPrice: (item.rate as number) || 0,
            total: (item.total as number) || 0,
          });
        }
      }

      if (workOrder.partsUsed && Array.isArray(workOrder.partsUsed)) {
        for (const part of workOrder.partsUsed as Record<string, unknown>[]) {
          items.push({
            type: 'PART',
            description: (part.name as string) || 'Part',
            quantity: (part.quantity as number) || 1,
            unitPrice: (part.unitPrice as number) || 0,
            total: (part.total as number) || 0,
          });
        }
      }

      const subtotal = workOrder.totalCost ? Number(workOrder.totalCost) : 0;
      const taxRate = 22; // Italian VAT
      const taxAmount = parseFloat(((subtotal * taxRate) / 100).toFixed(2));
      const total = parseFloat((subtotal + taxAmount).toFixed(2));

      // Generate invoice number
      const year = new Date().getFullYear();
      const invoicePrefix = `INV-${year}-`;
      const lastInvoice = await this.prisma.invoice.findFirst({
        where: {
          tenantId,
          invoiceNumber: { startsWith: invoicePrefix },
        },
        orderBy: { createdAt: 'desc' },
        select: { invoiceNumber: true },
      });

      let invoiceSequence = 1;
      if (lastInvoice) {
        const lastSeq = parseInt(lastInvoice.invoiceNumber.replace(invoicePrefix, ''), 10);
        if (!isNaN(lastSeq)) {
          invoiceSequence = lastSeq + 1;
        }
      }

      const invoiceNumber = `${invoicePrefix}${invoiceSequence.toString().padStart(4, '0')}`;

      // Create invoice and update WO in a transaction
      const result = await this.prisma.$transaction(async tx => {
        const invoice = await tx.invoice.create({
          data: {
            tenantId,
            customerId: workOrder.customerId,
            workOrderId: workOrder.id,
            invoiceNumber,
            status: 'DRAFT',
            items: items.length > 0 ? JSON.parse(JSON.stringify(items)) : [],
            subtotal,
            taxRate,
            taxAmount,
            total,
          },
        });

        const updatedWo = await tx.workOrder.update({
          where: { id },
          data: {
            status: 'INVOICED',
            invoiceId: invoice.id,
          },
        });

        return { invoice, workOrder: updatedWo };
      });

      this.logger.log(
        `Invoice ${invoiceNumber} created from work order ${id} for tenant ${tenantId}`,
      );
      return result;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to create invoice from work order ${id}: ${error}`);
      throw new InternalServerErrorException('Failed to create invoice from work order');
    }
  }

  // ==================== CHECK-IN / CHECK-OUT ====================

  /**
   * Check in a vehicle: creates or updates a WorkOrder with CHECKED_IN status
   */
  async checkIn(tenantId: string, id: string, dto: VehicleCheckInDto): Promise<unknown> {
    const existing = await this.prisma.workOrder.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Work order ${id} not found`);
    }

    if (existing.status !== 'PENDING' && existing.status !== 'OPEN') {
      throw new BadRequestException(`Cannot check in work order with status ${existing.status}`);
    }

    const checkInData = {
      damageNotes: dto.damageNotes,
      itemsLeftInCar: dto.itemsLeftInCar,
      parkingSpot: dto.parkingSpot,
      estimatedPickup: dto.estimatedPickup,
      courtesyCarProvided: dto.courtesyCarProvided,
      courtesyCarPlate: dto.courtesyCarPlate,
    };

    const workOrder = await this.prisma.$transaction(async tx => {
      // Update vehicle mileage
      await tx.vehicle.update({
        where: { id: dto.vehicleId },
        data: { mileage: dto.mileageIn },
      });

      return tx.workOrder.update({
        where: { id },
        data: {
          status: 'CHECKED_IN',
          mileageIn: dto.mileageIn,
          fuelLevelIn: dto.fuelLevel,
          photos: dto.photos ? JSON.parse(JSON.stringify(dto.photos)) : undefined,
          customerSignature: dto.customerSignature,
          checkInData: JSON.parse(JSON.stringify(checkInData)),
          estimatedCompletion: dto.estimatedPickup ? new Date(dto.estimatedPickup) : undefined,
        },
        include: {
          vehicle: {
            select: { id: true, licensePlate: true, make: true, model: true },
          },
        },
      });
    });

    this.logger.log(`Work order ${id} checked in for tenant ${tenantId}`);
    return workOrder;
  }

  /**
   * Check out a vehicle: validates completion and records delivery data
   */
  async checkOut(tenantId: string, id: string, dto: VehicleCheckOutDto): Promise<unknown> {
    const existing = await this.prisma.workOrder.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Work order ${id} not found`);
    }

    if (existing.status !== 'COMPLETED' && existing.status !== 'READY') {
      throw new BadRequestException(
        `Cannot check out work order with status ${existing.status}. Must be COMPLETED or READY.`,
      );
    }

    if (existing.mileageIn && dto.mileageOut < existing.mileageIn) {
      throw new BadRequestException(
        `Mileage out (${dto.mileageOut}) cannot be less than mileage in (${existing.mileageIn})`,
      );
    }

    const checkOutData = {
      courtesyCarReturned: dto.courtesyCarReturned,
      notes: dto.notes,
    };

    const workOrder = await this.prisma.$transaction(async tx => {
      // Update vehicle mileage
      await tx.vehicle.update({
        where: { id: existing.vehicleId },
        data: { mileage: dto.mileageOut },
      });

      return tx.workOrder.update({
        where: { id },
        data: {
          status: 'READY',
          mileageOut: dto.mileageOut,
          fuelLevelOut: dto.fuelLevel,
          checkOutData: JSON.parse(JSON.stringify(checkOutData)),
          customerSignature: dto.customerSignature ?? existing.customerSignature,
        },
        include: {
          vehicle: {
            select: { id: true, licensePlate: true, make: true, model: true },
          },
        },
      });
    });

    this.logger.log(`Work order ${id} checked out for tenant ${tenantId}`);
    return workOrder;
  }

  // ==================== TECHNICIAN TIMER ====================

  /**
   * Start a timer for a technician on a work order
   */
  async startTimer(tenantId: string, workOrderId: string, technicianId: string): Promise<unknown> {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, tenantId },
    });

    if (!wo) {
      throw new NotFoundException(`Work order ${workOrderId} not found`);
    }

    // Check for active timer
    const active = await this.prisma.technicianTimeLog.findFirst({
      where: { workOrderId, technicianId, stoppedAt: null },
    });

    if (active) {
      throw new BadRequestException(
        'Timer is already running for this technician on this work order',
      );
    }

    const log = await this.prisma.technicianTimeLog.create({
      data: {
        tenantId,
        workOrderId,
        technicianId,
        startedAt: new Date(),
      },
    });

    return log;
  }

  /**
   * Stop the active timer for a technician on a work order
   */
  async stopTimer(tenantId: string, workOrderId: string, technicianId: string): Promise<unknown> {
    const active = await this.prisma.technicianTimeLog.findFirst({
      where: { workOrderId, technicianId, stoppedAt: null, tenantId },
    });

    if (!active) {
      throw new BadRequestException('No active timer found');
    }

    const stoppedAt = new Date();
    const durationMinutes = Math.round((stoppedAt.getTime() - active.startedAt.getTime()) / 60000);

    const log = await this.prisma.technicianTimeLog.update({
      where: { id: active.id },
      data: { stoppedAt, durationMinutes },
    });

    // Update WorkOrder laborHours with total accumulated time
    const allLogs = await this.prisma.technicianTimeLog.findMany({
      where: { workOrderId, stoppedAt: { not: null } },
    });

    const totalMinutes = allLogs.reduce((sum, l) => sum + (l.durationMinutes ?? 0), 0);
    const totalHours = parseFloat((totalMinutes / 60).toFixed(2));

    await this.prisma.workOrder.update({
      where: { id: workOrderId },
      data: { laborHours: totalHours },
    });

    return log;
  }

  /**
   * Get timer status for a work order
   */
  async getTimer(
    tenantId: string,
    workOrderId: string,
  ): Promise<{ active: unknown | null; totalMinutes: number; logs: unknown[] }> {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, tenantId },
    });

    if (!wo) {
      throw new NotFoundException(`Work order ${workOrderId} not found`);
    }

    const logs = await this.prisma.technicianTimeLog.findMany({
      where: { workOrderId },
      orderBy: { startedAt: 'desc' },
    });

    const active = logs.find(l => !l.stoppedAt) ?? null;
    const totalMinutes = logs
      .filter(l => l.stoppedAt)
      .reduce((sum, l) => sum + (l.durationMinutes ?? 0), 0);

    return { active, totalMinutes, logs };
  }
}
