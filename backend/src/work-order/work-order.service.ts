import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/services/prisma.service';
import { validateTransition, TransitionMap } from '../common/utils/state-machine';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { VehicleCheckInDto } from './dto/check-in.dto';
import { VehicleCheckOutDto } from './dto/check-out.dto';

const WORK_ORDER_TRANSITIONS: TransitionMap = {
  PENDING: ['CHECKED_IN', 'OPEN', 'IN_PROGRESS'],
  OPEN: ['CHECKED_IN', 'IN_PROGRESS'],
  CHECKED_IN: ['IN_PROGRESS'],
  IN_PROGRESS: ['WAITING_PARTS', 'QUALITY_CHECK', 'COMPLETED'],
  WAITING_PARTS: ['IN_PROGRESS'],
  QUALITY_CHECK: ['COMPLETED', 'IN_PROGRESS'],
  COMPLETED: ['READY', 'INVOICED'],
  READY: ['INVOICED'],
  INVOICED: [],
};

interface WorkOrderFilters {
  status?: string;
  vehicleId?: string;
  customerId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class WorkOrderService {
  private readonly logger = new Logger(WorkOrderService.name);
  private readonly MAX_TIMER_MINUTES = 8 * 60;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Normalize JSON array fields that may be double-wrapped (e.g. [[]] → [])
   */
  private normalizeJsonArray(value: unknown): unknown[] {
    if (!value || !Array.isArray(value)) return [];
    // Unwrap [[items...]] → [items...]
    if (value.length === 1 && Array.isArray(value[0])) {
      return value[0];
    }
    return value;
  }

  /**
   * Normalize work order JSON fields to prevent [[]] double-wrapping
   */
  private normalizeWorkOrder<T extends Record<string, unknown>>(wo: T): T {
    return {
      ...wo,
      laborItems: this.normalizeJsonArray(wo.laborItems),
      partsUsed: this.normalizeJsonArray(wo.partsUsed),
    };
  }

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
  ): Promise<{ workOrders: unknown[]; total: number; page: number; limit: number; pages: number }> {
    try {
      const page = filters?.page ?? 1;
      const limit = filters?.limit ?? 20;
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
      if (filters?.search) {
        where.OR = [
          { woNumber: { contains: filters.search, mode: 'insensitive' } },
          { customerName: { contains: filters.search, mode: 'insensitive' } },
          { vehiclePlate: { contains: filters.search, mode: 'insensitive' } },
          { technicianName: { contains: filters.search, mode: 'insensitive' } },
        ];
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
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.workOrder.count({ where }),
      ]);

      return {
        workOrders: workOrders.map(wo => this.normalizeWorkOrder(wo)),
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
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

      return this.normalizeWorkOrder(workOrder);
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

      // Build create data — new DMS fields are cast because the Prisma client
      // types will be updated after the next migration run.
      const createData = {
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
        // New DMS fields
        priority: dto.priority,
        woType: dto.woType,
        serviceAdvisorId: dto.serviceAdvisorId,
        dropOffType: dto.dropOffType,
        courtesyCarRequested: dto.courtesyCarRequested,
        courtesyCarPlate: dto.courtesyCarPlate,
        internalNotes: dto.internalNotes,
        customerVisibleNotes: dto.customerVisibleNotes,
        preExistingDamage: dto.preExistingDamage,
        testDriveBefore: dto.testDriveBefore,
        marketingSource: dto.marketingSource,
        preAuthAmount: dto.preAuthAmount,
        taxExempt: dto.taxExempt,
        taxExemptCert: dto.taxExemptCert,
        recallCheckDone: dto.recallCheckDone,
        parkingSpot: dto.parkingSpot,
        keyTag: dto.keyTag,
        preferredContact: dto.preferredContact,
        estimatedCompletion: dto.estimatedCompletion
          ? new Date(dto.estimatedCompletion)
          : undefined,
        estimatedPickup: dto.estimatedPickup ? new Date(dto.estimatedPickup) : undefined,
        assignedBayId: dto.assignedBayId,
      } as unknown as Prisma.WorkOrderUncheckedCreateInput;

      const workOrder = await this.prisma.workOrder.create({
        data: createData,
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

      const updated = await this.prisma.workOrder.updateMany({
        where: { id, tenantId, version: existing.version },
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
          version: { increment: 1 },
        },
      });

      if (updated.count === 0) {
        throw new ConflictException('Work order modified by another user. Refresh and retry.');
      }

      const workOrder = await this.prisma.workOrder.findFirst({
        where: { id, tenantId },
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
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Failed to update work order ${id}: ${error}`);
      throw new InternalServerErrorException('Failed to update work order');
    }
  }

  /**
   * Transition work order to a new status with validation
   */
  async transition(tenantId: string, id: string, newStatus: string): Promise<unknown> {
    try {
      const existing = await this.prisma.workOrder.findFirst({
        where: { id, tenantId },
      });

      if (!existing) {
        throw new NotFoundException(`Work order ${id} not found`);
      }

      validateTransition(existing.status, newStatus, WORK_ORDER_TRANSITIONS, 'work order');

      const updated = await this.prisma.workOrder.updateMany({
        where: { id, tenantId, version: existing.version },
        data: {
          // @ts-expect-error status is validated by validateTransition() above
          status: newStatus,
          version: { increment: 1 },
        },
      });

      if (updated.count === 0) {
        throw new ConflictException('Work order modified by another user. Refresh and retry.');
      }

      const workOrder = await this.prisma.workOrder.findFirst({
        where: { id, tenantId },
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

      this.logger.log(`Work order ${id} transitioned to ${newStatus}`);
      return workOrder;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(`Failed to transition work order ${id}: ${error}`);
      throw new InternalServerErrorException('Failed to transition work order');
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

      validateTransition(existing.status, 'IN_PROGRESS', WORK_ORDER_TRANSITIONS, 'work order');

      const updated = await this.prisma.workOrder.updateMany({
        where: { id, tenantId, version: existing.version },
        data: {
          status: 'IN_PROGRESS',
          actualStartTime: new Date(),
          version: { increment: 1 },
        },
      });

      if (updated.count === 0) {
        throw new ConflictException('Work order modified by another user. Refresh and retry.');
      }

      const workOrder = await this.prisma.workOrder.findFirst({
        where: { id, tenantId },
      });

      this.logger.log(`Work order ${id} started for tenant ${tenantId}`);
      return workOrder;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
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

      validateTransition(existing.status, 'COMPLETED', WORK_ORDER_TRANSITIONS, 'work order');

      const updated = await this.prisma.workOrder.updateMany({
        where: { id, tenantId, version: existing.version },
        data: {
          status: 'COMPLETED',
          actualCompletionTime: new Date(),
          version: { increment: 1 },
        },
      });

      if (updated.count === 0) {
        throw new ConflictException('Work order modified by another user. Refresh and retry.');
      }

      const workOrder = await this.prisma.workOrder.findFirst({
        where: { id, tenantId },
      });

      this.logger.log(`Work order ${id} completed for tenant ${tenantId}`);
      return workOrder;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
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
      // Include normalized relations to build invoice items
      const workOrder = await this.prisma.workOrder.findFirst({
        where: { id, tenantId },
        include: {
          services: { include: { service: true } },
          parts: { include: { part: true } },
        },
      });

      if (!workOrder) {
        throw new NotFoundException(`Work order ${id} not found`);
      }

      validateTransition(workOrder.status, 'INVOICED', WORK_ORDER_TRANSITIONS, 'work order');

      // Build invoice items from normalized WorkOrderService and WorkOrderPart relations
      const items: Record<string, unknown>[] = [];

      for (const woSvc of workOrder.services) {
        const laborRate = woSvc.service.laborRate ?? woSvc.service.price;
        // estimatedMinutes drives quantity in hours
        const hours = parseFloat(((woSvc.actualMinutes ?? woSvc.estimatedMinutes) / 60).toFixed(2));
        const unitPrice = Number(laborRate);
        const lineTotal = parseFloat((hours * unitPrice).toFixed(2));
        items.push({
          type: 'LABOR',
          description: woSvc.service.name,
          quantity: hours,
          unitPrice,
          total: lineTotal,
        });
      }

      for (const woPart of workOrder.parts) {
        const unitPrice = Number(woPart.part.retailPrice);
        const lineTotal = parseFloat((woPart.quantity * unitPrice).toFixed(2));
        items.push({
          type: 'PART',
          description: woPart.part.name,
          quantity: woPart.quantity,
          unitPrice,
          total: lineTotal,
        });
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

        const woUpdateResult = await tx.workOrder.updateMany({
          where: { id, tenantId },
          data: {
            status: 'INVOICED',
            invoiceId: invoice.id,
          },
        });

        if (woUpdateResult.count === 0) {
          throw new NotFoundException(`Work order ${id} not found`);
        }

        const updatedWo = await tx.workOrder.findFirst({
          where: { id, tenantId },
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

    validateTransition(existing.status, 'CHECKED_IN', WORK_ORDER_TRANSITIONS, 'work order');

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

      const updated = await tx.workOrder.updateMany({
        where: { id, tenantId, version: existing.version },
        data: {
          status: 'CHECKED_IN',
          mileageIn: dto.mileageIn,
          fuelLevelIn: dto.fuelLevel,
          photos: dto.photos ? JSON.parse(JSON.stringify(dto.photos)) : undefined,
          customerSignature: dto.customerSignature,
          checkInData: JSON.parse(JSON.stringify(checkInData)),
          estimatedCompletion: dto.estimatedPickup ? new Date(dto.estimatedPickup) : undefined,
          version: { increment: 1 },
        },
      });

      if (updated.count === 0) {
        throw new ConflictException('Work order modified by another user. Refresh and retry.');
      }

      return tx.workOrder.findFirst({
        where: { id, tenantId },
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

    validateTransition(existing.status, 'READY', WORK_ORDER_TRANSITIONS, 'work order');

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

      const updated = await tx.workOrder.updateMany({
        where: { id, tenantId, version: existing.version },
        data: {
          status: 'READY',
          mileageOut: dto.mileageOut,
          fuelLevelOut: dto.fuelLevel,
          checkOutData: JSON.parse(JSON.stringify(checkOutData)),
          customerSignature: dto.customerSignature ?? existing.customerSignature,
          version: { increment: 1 },
        },
      });

      if (updated.count === 0) {
        throw new ConflictException('Work order modified by another user. Refresh and retry.');
      }

      return tx.workOrder.findFirst({
        where: { id, tenantId },
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
    let durationMinutes = Math.round((stoppedAt.getTime() - active.startedAt.getTime()) / 60000);

    if (durationMinutes > this.MAX_TIMER_MINUTES) {
      this.logger.warn(
        `Timer for technician ${technicianId} on WO ${workOrderId} exceeded ${this.MAX_TIMER_MINUTES} min (was ${durationMinutes}). Capping to ${this.MAX_TIMER_MINUTES} min.`,
      );
      durationMinutes = this.MAX_TIMER_MINUTES;
    }

    const log = await this.prisma.technicianTimeLog.update({
      where: { id: active.id },
      data: { stoppedAt, durationMinutes },
    });

    // Internal: bounded query — logs scoped to single work order
    const allLogs = await this.prisma.technicianTimeLog.findMany({
      where: { workOrderId, stoppedAt: { not: null } },
    });

    const totalMinutes = allLogs.reduce((sum, l) => sum + (l.durationMinutes ?? 0), 0);
    const totalHours = parseFloat((totalMinutes / 60).toFixed(2));

    await this.prisma.workOrder.updateMany({
      where: { id: workOrderId, tenantId },
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

    // Internal: bounded query — logs scoped to single work order
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
