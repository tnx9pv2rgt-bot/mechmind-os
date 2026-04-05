import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../common/services/prisma.service';
import { validateTransition, TransitionMap } from '../common/utils/state-machine';
import { AssignBayDto } from './dto/assign-bay.dto';
import { MoveJobDto } from './dto/move-job.dto';

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

interface BoardBay {
  id: string;
  name: string;
  type: string;
  status: string;
  currentWorkOrder: BoardWorkOrder | null;
  technician: BoardTechnician | null;
  elapsedMinutes: number | null;
}

interface BoardWorkOrder {
  id: string;
  woNumber: string;
  status: string;
  vehiclePlate: string;
  vehicleMakeModel: string;
  customerRequest: string | null;
  diagnosis: string | null;
  assignedBayId: string | null;
  estimatedCompletion: Date | null;
  actualStartTime: Date | null;
}

interface BoardTechnician {
  id: string;
  name: string;
  specializations: string[];
}

interface TodayKpis {
  completed: number;
  inProgress: number;
  waiting: number;
  pending: number;
  totalJobs: number;
  revenue: number;
  avgCompletionMinutes: number;
}

@Injectable()
export class ProductionBoardService {
  private readonly logger = new Logger(ProductionBoardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Get the full board state: all service bays with current work orders, technicians, elapsed time
   */
  async getBoardState(tenantId: string): Promise<BoardBay[]> {
    const bays = await this.prisma.serviceBay.findMany({
      where: {
        shopFloor: { tenantId },
      },
      include: {
        currentWorkOrder: {
          include: {
            vehicle: {
              select: { id: true, licensePlate: true, make: true, model: true },
            },
          },
        },
        currentVehicle: {
          select: { id: true, licensePlate: true, make: true, model: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const bayResults: BoardBay[] = [];

    for (const bay of bays) {
      let technician: BoardTechnician | null = null;
      let elapsedMinutes: number | null = null;
      let workOrderData: BoardWorkOrder | null = null;

      if (bay.currentWorkOrder) {
        const wo = bay.currentWorkOrder;

        // Find assigned technician
        if (wo.technicianId) {
          const tech = await this.prisma.technician.findFirst({
            where: { id: wo.technicianId, tenantId },
          });
          if (tech) {
            technician = {
              id: tech.id,
              name: tech.name,
              specializations: tech.specializations,
            };
          }
        }

        // Calculate elapsed time from active timer or actualStartTime
        const activeTimer = await this.prisma.technicianTimeLog.findFirst({
          where: {
            workOrderId: wo.id,
            tenantId,
            stoppedAt: null,
          },
        });

        if (activeTimer) {
          elapsedMinutes = Math.round((Date.now() - activeTimer.startedAt.getTime()) / 60000);
        } else if (wo.actualStartTime) {
          elapsedMinutes = Math.round((Date.now() - wo.actualStartTime.getTime()) / 60000);
        }

        const vehicle = wo.vehicle;
        workOrderData = {
          id: wo.id,
          woNumber: wo.woNumber,
          status: wo.status,
          vehiclePlate: vehicle?.licensePlate ?? '',
          vehicleMakeModel: vehicle ? `${vehicle.make} ${vehicle.model}` : '',
          customerRequest: wo.customerRequest,
          diagnosis: wo.diagnosis,
          assignedBayId: wo.assignedBayId,
          estimatedCompletion: wo.estimatedCompletion,
          actualStartTime: wo.actualStartTime,
        };
      }

      bayResults.push({
        id: bay.id,
        name: bay.name,
        type: bay.type,
        status: bay.status,
        currentWorkOrder: workOrderData,
        technician,
        elapsedMinutes,
      });
    }

    return bayResults;
  }

  /**
   * Assign a work order to a service bay with a technician
   */
  async assignToBay(dto: AssignBayDto, tenantId: string): Promise<BoardBay> {
    const { workOrderId, bayId, technicianId } = dto;

    // Verify work order exists and belongs to tenant
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, tenantId },
    });
    if (!workOrder) {
      throw new NotFoundException(`Ordine di lavoro ${workOrderId} non trovato`);
    }

    // Verify bay exists and belongs to tenant (through ShopFloor)
    const bay = await this.prisma.serviceBay.findFirst({
      where: { id: bayId, shopFloor: { tenantId } },
    });
    if (!bay) {
      throw new NotFoundException(`Postazione ${bayId} non trovata`);
    }

    if (bay.status === 'MAINTENANCE' || bay.status === 'CLEANING') {
      throw new BadRequestException(
        `La postazione ${bay.name} non e' disponibile (stato: ${bay.status})`,
      );
    }

    if (bay.currentWorkOrderId && bay.currentWorkOrderId !== workOrderId) {
      throw new BadRequestException(
        `La postazione ${bay.name} e' gia' occupata da un altro ordine di lavoro`,
      );
    }

    // Verify technician exists and belongs to tenant
    const technician = await this.prisma.technician.findFirst({
      where: { id: technicianId, tenantId, isActive: true },
    });
    if (!technician) {
      throw new NotFoundException(`Tecnico ${technicianId} non trovato o non attivo`);
    }

    // Transaction: update bay + work order
    await this.prisma.$transaction([
      this.prisma.serviceBay.update({
        where: { id: bayId },
        data: {
          status: 'OCCUPIED',
          currentWorkOrderId: workOrderId,
          currentVehicleId: workOrder.vehicleId,
          checkInTime: new Date(),
        },
      }),
      this.prisma.workOrder.update({
        where: { id: workOrderId },
        data: {
          assignedBayId: bayId,
          technicianId,
        },
      }),
    ]);

    this.eventEmitter.emit('productionBoard.updated', {
      tenantId,
      action: 'assign',
      workOrderId,
      bayId,
      technicianId,
    });

    this.logger.log(
      `Work order ${workOrderId} assigned to bay ${bay.name} with technician ${technician.name} (tenant ${tenantId})`,
    );

    return this.getBayById(bayId, tenantId);
  }

  /**
   * Move a work order from one bay to another (drag-and-drop)
   */
  async moveJob(dto: MoveJobDto, tenantId: string): Promise<BoardBay> {
    const { workOrderId, fromBayId, toBayId } = dto;

    if (fromBayId === toBayId) {
      throw new BadRequestException('Le postazioni di origine e destinazione sono uguali');
    }

    // Verify work order
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, tenantId },
    });
    if (!workOrder) {
      throw new NotFoundException(`Ordine di lavoro ${workOrderId} non trovato`);
    }

    // Verify source bay
    const fromBay = await this.prisma.serviceBay.findFirst({
      where: { id: fromBayId, shopFloor: { tenantId } },
    });
    if (!fromBay) {
      throw new NotFoundException(`Postazione di origine ${fromBayId} non trovata`);
    }
    if (fromBay.currentWorkOrderId !== workOrderId) {
      throw new BadRequestException(
        `L'ordine di lavoro non e' attualmente nella postazione ${fromBay.name}`,
      );
    }

    // Verify destination bay
    const toBay = await this.prisma.serviceBay.findFirst({
      where: { id: toBayId, shopFloor: { tenantId } },
    });
    if (!toBay) {
      throw new NotFoundException(`Postazione di destinazione ${toBayId} non trovata`);
    }

    if (toBay.status === 'MAINTENANCE' || toBay.status === 'CLEANING') {
      throw new BadRequestException(
        `La postazione ${toBay.name} non e' disponibile (stato: ${toBay.status})`,
      );
    }

    if (toBay.currentWorkOrderId) {
      throw new BadRequestException(
        `La postazione ${toBay.name} e' gia' occupata da un altro ordine di lavoro`,
      );
    }

    // Transaction: clear source bay, assign destination bay, update work order
    await this.prisma.$transaction([
      this.prisma.serviceBay.update({
        where: { id: fromBayId },
        data: {
          status: 'AVAILABLE',
          currentWorkOrderId: null,
          currentVehicleId: null,
          checkInTime: null,
        },
      }),
      this.prisma.serviceBay.update({
        where: { id: toBayId },
        data: {
          status: 'OCCUPIED',
          currentWorkOrderId: workOrderId,
          currentVehicleId: workOrder.vehicleId,
          checkInTime: new Date(),
        },
      }),
      this.prisma.workOrder.update({
        where: { id: workOrderId },
        data: { assignedBayId: toBayId },
      }),
    ]);

    this.eventEmitter.emit('productionBoard.updated', {
      tenantId,
      action: 'move',
      workOrderId,
      fromBayId,
      toBayId,
    });

    this.logger.log(
      `Work order ${workOrderId} moved from ${fromBay.name} to ${toBay.name} (tenant ${tenantId})`,
    );

    return this.getBayById(toBayId, tenantId);
  }

  /**
   * Update the status of a work order with transition validation
   */
  async updateJobStatus(
    workOrderId: string,
    newStatus: string,
    tenantId: string,
  ): Promise<BoardWorkOrder> {
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, tenantId },
      include: {
        vehicle: {
          select: { id: true, licensePlate: true, make: true, model: true },
        },
      },
    });

    if (!workOrder) {
      throw new NotFoundException(`Ordine di lavoro ${workOrderId} non trovato`);
    }

    const previousStatus = workOrder.status;
    validateTransition(previousStatus, newStatus, WORK_ORDER_TRANSITIONS, 'ordine di lavoro');

    const updateData: Record<string, unknown> = { status: newStatus };

    if (newStatus === 'IN_PROGRESS' && !workOrder.actualStartTime) {
      updateData.actualStartTime = new Date();
    }
    if (newStatus === 'COMPLETED') {
      updateData.actualCompletionTime = new Date();
    }

    // If completed/ready/invoiced, free the bay
    if (['COMPLETED', 'READY', 'INVOICED'].includes(newStatus) && workOrder.assignedBayId) {
      await this.prisma.serviceBay.update({
        where: { id: workOrder.assignedBayId },
        data: {
          status: 'AVAILABLE',
          currentWorkOrderId: null,
          currentVehicleId: null,
          checkInTime: null,
        },
      });
    }

    const updated = await this.prisma.workOrder.update({
      where: { id: workOrderId },
      data: updateData,
      include: {
        vehicle: {
          select: { id: true, licensePlate: true, make: true, model: true },
        },
      },
    });

    this.eventEmitter.emit('productionBoard.updated', {
      tenantId,
      action: 'statusChange',
      workOrderId,
      previousStatus,
      newStatus,
    });

    this.logger.log(
      `Work order ${workOrderId} status changed: ${previousStatus} -> ${newStatus} (tenant ${tenantId})`,
    );

    const vehicle = updated.vehicle;
    return {
      id: updated.id,
      woNumber: updated.woNumber,
      status: updated.status,
      vehiclePlate: vehicle?.licensePlate ?? '',
      vehicleMakeModel: vehicle ? `${vehicle.make} ${vehicle.model}` : '',
      customerRequest: updated.customerRequest,
      diagnosis: updated.diagnosis,
      assignedBayId: updated.assignedBayId,
      estimatedCompletion: updated.estimatedCompletion,
      actualStartTime: updated.actualStartTime,
    };
  }

  /**
   * Get work orders that are not assigned to any bay
   */
  async getUnassignedJobs(tenantId: string): Promise<BoardWorkOrder[]> {
    const workOrders = await this.prisma.workOrder.findMany({
      where: {
        tenantId,
        assignedBayId: null,
        status: { in: ['PENDING', 'CHECKED_IN', 'IN_PROGRESS', 'WAITING_PARTS'] },
      },
      include: {
        vehicle: {
          select: { id: true, licensePlate: true, make: true, model: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return workOrders.map(wo => {
      const vehicle = wo.vehicle;
      return {
        id: wo.id,
        woNumber: wo.woNumber,
        status: wo.status,
        vehiclePlate: vehicle?.licensePlate ?? '',
        vehicleMakeModel: vehicle ? `${vehicle.make} ${vehicle.model}` : '',
        customerRequest: wo.customerRequest,
        diagnosis: wo.diagnosis,
        assignedBayId: wo.assignedBayId,
        estimatedCompletion: wo.estimatedCompletion,
        actualStartTime: wo.actualStartTime,
      };
    });
  }

  /**
   * Get today's production KPIs: completed, in progress, waiting, revenue, avg completion
   */
  async getTodayKpis(tenantId: string): Promise<TodayKpis> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [completed, inProgress, waiting, pending, completedWithTime] = await Promise.all([
      this.prisma.workOrder.count({
        where: {
          tenantId,
          status: { in: ['COMPLETED', 'READY', 'INVOICED'] },
          actualCompletionTime: { gte: todayStart, lte: todayEnd },
        },
      }),
      this.prisma.workOrder.count({
        where: {
          tenantId,
          status: 'IN_PROGRESS',
        },
      }),
      this.prisma.workOrder.count({
        where: {
          tenantId,
          status: 'WAITING_PARTS',
        },
      }),
      this.prisma.workOrder.count({
        where: {
          tenantId,
          status: { in: ['PENDING', 'CHECKED_IN'] },
        },
      }),
      this.prisma.workOrder.findMany({
        where: {
          tenantId,
          status: { in: ['COMPLETED', 'READY', 'INVOICED'] },
          actualCompletionTime: { gte: todayStart, lte: todayEnd },
          actualStartTime: { not: null },
        },
        select: {
          actualStartTime: true,
          actualCompletionTime: true,
          totalCost: true,
        },
      }),
    ]);

    let totalRevenue = 0;
    let totalCompletionMinutes = 0;
    let completedCount = 0;

    for (const wo of completedWithTime) {
      if (wo.totalCost) {
        totalRevenue += Number(wo.totalCost);
      }
      if (wo.actualStartTime && wo.actualCompletionTime) {
        totalCompletionMinutes += Math.round(
          (wo.actualCompletionTime.getTime() - wo.actualStartTime.getTime()) / 60000,
        );
        completedCount++;
      }
    }

    return {
      completed,
      inProgress,
      waiting,
      pending,
      totalJobs: completed + inProgress + waiting + pending,
      revenue: parseFloat(totalRevenue.toFixed(2)),
      avgCompletionMinutes:
        completedCount > 0 ? Math.round(totalCompletionMinutes / completedCount) : 0,
    };
  }

  /**
   * Get TV-optimized payload: board state + KPIs in a single call
   */
  async getTvPayload(tenantId: string): Promise<{
    bays: BoardBay[];
    kpis: TodayKpis;
    unassigned: BoardWorkOrder[];
    timestamp: string;
  }> {
    const [bays, kpis, unassigned] = await Promise.all([
      this.getBoardState(tenantId),
      this.getTodayKpis(tenantId),
      this.getUnassignedJobs(tenantId),
    ]);

    return {
      bays,
      kpis,
      unassigned,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get a single bay with full board data
   */
  private async getBayById(bayId: string, tenantId: string): Promise<BoardBay> {
    const allBays = await this.getBoardState(tenantId);
    const bay = allBays.find(b => b.id === bayId);
    if (!bay) {
      throw new NotFoundException(`Postazione ${bayId} non trovata`);
    }
    return bay;
  }
}
