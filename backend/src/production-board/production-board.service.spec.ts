import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProductionBoardService } from './production-board.service';
import { PrismaService } from '../common/services/prisma.service';

// ---------------------------------------------------------------------------
// Type helpers for Prisma mock delegates
// ---------------------------------------------------------------------------

interface MockServiceBayDelegate {
  findMany: jest.Mock;
  findFirst: jest.Mock;
  update: jest.Mock;
}

interface MockWorkOrderDelegate {
  findFirst: jest.Mock;
  findMany: jest.Mock;
  count: jest.Mock;
  update: jest.Mock;
}

interface MockTechnicianDelegate {
  findFirst: jest.Mock;
}

interface MockTechnicianTimeLogDelegate {
  findFirst: jest.Mock;
}

interface MockPrisma {
  serviceBay: MockServiceBayDelegate;
  workOrder: MockWorkOrderDelegate;
  technician: MockTechnicianDelegate;
  technicianTimeLog: MockTechnicianTimeLogDelegate;
  $transaction: jest.Mock;
}

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const WO_ID = 'wo-001';
const BAY_ID = 'bay-001';
const BAY_ID_2 = 'bay-002';
const TECH_ID = 'tech-001';
const VEHICLE_ID = 'vehicle-001';

// ---------------------------------------------------------------------------
// Mock data factories
// ---------------------------------------------------------------------------

function makeMockBay(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: BAY_ID,
    shopFloorId: 'sf-001',
    name: 'Postazione 1',
    type: 'LIFT',
    status: 'AVAILABLE',
    currentWorkOrderId: null,
    currentVehicleId: null,
    checkInTime: null,
    currentWorkOrder: null,
    currentVehicle: null,
    ...overrides,
  };
}

function makeMockWorkOrder(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: WO_ID,
    tenantId: TENANT_ID,
    woNumber: 'WO-2026-0001',
    vehicleId: VEHICLE_ID,
    customerId: 'cust-001',
    technicianId: null,
    status: 'PENDING',
    assignedBayId: null,
    customerRequest: 'Freni rumorosi',
    diagnosis: 'Pastiglie consumate',
    estimatedCompletion: null,
    actualStartTime: null,
    actualCompletionTime: null,
    totalCost: null,
    version: 1,
    vehicle: {
      id: VEHICLE_ID,
      licensePlate: 'AB123CD',
      make: 'Fiat',
      model: 'Punto',
    },
    ...overrides,
  };
}

function makeMockTechnician(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: TECH_ID,
    tenantId: TENANT_ID,
    name: 'Marco Bianchi',
    specializations: ['freni', 'motore'],
    isActive: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ProductionBoardService', () => {
  let service: ProductionBoardService;
  let prisma: MockPrisma;
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    prisma = {
      serviceBay: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      workOrder: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      technician: {
        findFirst: jest.fn(),
      },
      technicianTimeLog: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionBoardService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<ProductionBoardService>(ProductionBoardService);
  });

  // ==================== getBoardState ====================

  describe('getBoardState', () => {
    it('should return empty array when no bays exist', async () => {
      prisma.serviceBay.findMany.mockResolvedValue([]);

      const result = await service.getBoardState(TENANT_ID);

      expect(result).toEqual([]);
      expect(prisma.serviceBay.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { shopFloor: { tenantId: TENANT_ID } },
        }),
      );
    });

    it('should return bays with current work order and technician', async () => {
      const wo = makeMockWorkOrder({ technicianId: TECH_ID, status: 'IN_PROGRESS' });
      const bay = makeMockBay({
        currentWorkOrderId: WO_ID,
        currentWorkOrder: wo,
        status: 'OCCUPIED',
      });

      prisma.serviceBay.findMany.mockResolvedValue([bay]);
      prisma.technician.findFirst.mockResolvedValue(makeMockTechnician());
      prisma.technicianTimeLog.findFirst.mockResolvedValue(null);

      const result = await service.getBoardState(TENANT_ID);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(BAY_ID);
      expect(result[0].status).toBe('OCCUPIED');
      expect(result[0].currentWorkOrder).toBeTruthy();
      expect(result[0].currentWorkOrder?.woNumber).toBe('WO-2026-0001');
      expect(result[0].technician).toBeTruthy();
      expect(result[0].technician?.name).toBe('Marco Bianchi');
    });

    it('should calculate elapsed minutes from active timer', async () => {
      const wo = makeMockWorkOrder({ status: 'IN_PROGRESS' });
      const bay = makeMockBay({
        currentWorkOrderId: WO_ID,
        currentWorkOrder: wo,
        status: 'OCCUPIED',
      });

      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      prisma.serviceBay.findMany.mockResolvedValue([bay]);
      prisma.technician.findFirst.mockResolvedValue(null);
      prisma.technicianTimeLog.findFirst.mockResolvedValue({
        id: 'log-1',
        startedAt: thirtyMinutesAgo,
        stoppedAt: null,
      });

      const result = await service.getBoardState(TENANT_ID);

      expect(result[0].elapsedMinutes).toBeGreaterThanOrEqual(29);
      expect(result[0].elapsedMinutes).toBeLessThanOrEqual(31);
    });
  });

  // ==================== assignToBay ====================

  describe('assignToBay', () => {
    it('should assign work order to bay with technician', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder());
      prisma.serviceBay.findFirst.mockResolvedValue(makeMockBay());
      prisma.technician.findFirst.mockResolvedValue(makeMockTechnician());
      prisma.$transaction.mockResolvedValue([{}, {}]);

      // Mock for getBayById -> getBoardState
      const assignedBay = makeMockBay({
        status: 'OCCUPIED',
        currentWorkOrderId: WO_ID,
        currentWorkOrder: makeMockWorkOrder({ assignedBayId: BAY_ID, technicianId: TECH_ID }),
      });
      prisma.serviceBay.findMany.mockResolvedValue([assignedBay]);
      prisma.technicianTimeLog.findFirst.mockResolvedValue(null);

      const result = await service.assignToBay(
        { workOrderId: WO_ID, bayId: BAY_ID, technicianId: TECH_ID },
        TENANT_ID,
      );

      expect(result.id).toBe(BAY_ID);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'productionBoard.updated',
        expect.objectContaining({
          tenantId: TENANT_ID,
          action: 'assign',
          workOrderId: WO_ID,
          bayId: BAY_ID,
        }),
      );
    });

    it('should throw NotFoundException if work order not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(null);

      await expect(
        service.assignToBay(
          { workOrderId: 'bad-id', bayId: BAY_ID, technicianId: TECH_ID },
          TENANT_ID,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if bay not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder());
      prisma.serviceBay.findFirst.mockResolvedValue(null);

      await expect(
        service.assignToBay(
          { workOrderId: WO_ID, bayId: 'bad-bay', technicianId: TECH_ID },
          TENANT_ID,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if bay is in MAINTENANCE', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder());
      prisma.serviceBay.findFirst.mockResolvedValue(makeMockBay({ status: 'MAINTENANCE' }));

      await expect(
        service.assignToBay(
          { workOrderId: WO_ID, bayId: BAY_ID, technicianId: TECH_ID },
          TENANT_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if bay is occupied by another work order', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder());
      prisma.serviceBay.findFirst.mockResolvedValue(
        makeMockBay({ currentWorkOrderId: 'other-wo', status: 'OCCUPIED' }),
      );

      await expect(
        service.assignToBay(
          { workOrderId: WO_ID, bayId: BAY_ID, technicianId: TECH_ID },
          TENANT_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if technician not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder());
      prisma.serviceBay.findFirst.mockResolvedValue(makeMockBay());
      prisma.technician.findFirst.mockResolvedValue(null);

      await expect(
        service.assignToBay(
          { workOrderId: WO_ID, bayId: BAY_ID, technicianId: 'bad-tech' },
          TENANT_ID,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== moveJob ====================

  describe('moveJob', () => {
    it('should move work order between bays', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder({ assignedBayId: BAY_ID }));
      prisma.serviceBay.findFirst
        .mockResolvedValueOnce(makeMockBay({ currentWorkOrderId: WO_ID, status: 'OCCUPIED' }))
        .mockResolvedValueOnce(
          makeMockBay({ id: BAY_ID_2, name: 'Postazione 2', status: 'AVAILABLE' }),
        );
      prisma.$transaction.mockResolvedValue([{}, {}, {}]);

      // Mock for getBayById -> getBoardState
      prisma.serviceBay.findMany.mockResolvedValue([
        makeMockBay({
          id: BAY_ID_2,
          name: 'Postazione 2',
          status: 'OCCUPIED',
          currentWorkOrderId: WO_ID,
          currentWorkOrder: makeMockWorkOrder(),
        }),
      ]);
      prisma.technicianTimeLog.findFirst.mockResolvedValue(null);

      const result = await service.moveJob(
        { workOrderId: WO_ID, fromBayId: BAY_ID, toBayId: BAY_ID_2 },
        TENANT_ID,
      );

      expect(result.id).toBe(BAY_ID_2);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'productionBoard.updated',
        expect.objectContaining({ action: 'move', fromBayId: BAY_ID, toBayId: BAY_ID_2 }),
      );
    });

    it('should throw BadRequestException if source and destination are the same', async () => {
      await expect(
        service.moveJob({ workOrderId: WO_ID, fromBayId: BAY_ID, toBayId: BAY_ID }, TENANT_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if work order not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(null);

      await expect(
        service.moveJob({ workOrderId: 'bad-id', fromBayId: BAY_ID, toBayId: BAY_ID_2 }, TENANT_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if work order is not in source bay', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder());
      prisma.serviceBay.findFirst.mockResolvedValueOnce(
        makeMockBay({ currentWorkOrderId: 'other-wo', status: 'OCCUPIED' }),
      );

      await expect(
        service.moveJob({ workOrderId: WO_ID, fromBayId: BAY_ID, toBayId: BAY_ID_2 }, TENANT_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if destination bay is occupied', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder({ assignedBayId: BAY_ID }));
      prisma.serviceBay.findFirst
        .mockResolvedValueOnce(makeMockBay({ currentWorkOrderId: WO_ID, status: 'OCCUPIED' }))
        .mockResolvedValueOnce(
          makeMockBay({ id: BAY_ID_2, currentWorkOrderId: 'other-wo', status: 'OCCUPIED' }),
        );

      await expect(
        service.moveJob({ workOrderId: WO_ID, fromBayId: BAY_ID, toBayId: BAY_ID_2 }, TENANT_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== updateJobStatus ====================

  describe('updateJobStatus', () => {
    it('should update status with valid transition', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder({ status: 'IN_PROGRESS' }));
      prisma.workOrder.update.mockResolvedValue(
        makeMockWorkOrder({ status: 'COMPLETED', actualCompletionTime: new Date() }),
      );

      const result = await service.updateJobStatus(WO_ID, 'COMPLETED', TENANT_ID);

      expect(result.status).toBe('COMPLETED');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'productionBoard.updated',
        expect.objectContaining({
          action: 'statusChange',
          previousStatus: 'IN_PROGRESS',
          newStatus: 'COMPLETED',
        }),
      );
    });

    it('should throw NotFoundException if work order not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(null);

      await expect(service.updateJobStatus('bad-id', 'IN_PROGRESS', TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for invalid transition', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder({ status: 'PENDING' }));

      await expect(service.updateJobStatus(WO_ID, 'COMPLETED', TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should set actualStartTime when transitioning to IN_PROGRESS', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder({ status: 'CHECKED_IN' }));
      prisma.workOrder.update.mockResolvedValue(
        makeMockWorkOrder({ status: 'IN_PROGRESS', actualStartTime: new Date() }),
      );

      await service.updateJobStatus(WO_ID, 'IN_PROGRESS', TENANT_ID);

      expect(prisma.workOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'IN_PROGRESS',
            actualStartTime: expect.any(Date),
          }),
        }),
      );
    });

    it('should free bay when completing a work order with assigned bay', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(
        makeMockWorkOrder({ status: 'IN_PROGRESS', assignedBayId: BAY_ID }),
      );
      prisma.serviceBay.update.mockResolvedValue({});
      prisma.workOrder.update.mockResolvedValue(makeMockWorkOrder({ status: 'COMPLETED' }));

      await service.updateJobStatus(WO_ID, 'COMPLETED', TENANT_ID);

      expect(prisma.serviceBay.update).toHaveBeenCalledWith({
        where: { id: BAY_ID },
        data: {
          status: 'AVAILABLE',
          currentWorkOrderId: null,
          currentVehicleId: null,
          checkInTime: null,
        },
      });
    });
  });

  // ==================== getUnassignedJobs ====================

  describe('getUnassignedJobs', () => {
    it('should return unassigned work orders', async () => {
      prisma.workOrder.findMany.mockResolvedValue([
        makeMockWorkOrder(),
        makeMockWorkOrder({ id: 'wo-002', woNumber: 'WO-2026-0002' }),
      ]);

      const result = await service.getUnassignedJobs(TENANT_ID);

      expect(result).toHaveLength(2);
      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TENANT_ID,
            assignedBayId: null,
            status: { in: ['PENDING', 'CHECKED_IN', 'IN_PROGRESS', 'WAITING_PARTS'] },
          },
        }),
      );
    });

    it('should return empty array when all jobs are assigned', async () => {
      prisma.workOrder.findMany.mockResolvedValue([]);

      const result = await service.getUnassignedJobs(TENANT_ID);

      expect(result).toEqual([]);
    });
  });

  // ==================== getTodayKpis ====================

  describe('getTodayKpis', () => {
    it('should return today KPIs', async () => {
      prisma.workOrder.count
        .mockResolvedValueOnce(5) // completed
        .mockResolvedValueOnce(3) // inProgress
        .mockResolvedValueOnce(1) // waiting
        .mockResolvedValueOnce(2); // pending

      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      prisma.workOrder.findMany.mockResolvedValue([
        {
          actualStartTime: twoHoursAgo,
          actualCompletionTime: now,
          totalCost: 250.5,
        },
        {
          actualStartTime: new Date(now.getTime() - 60 * 60 * 1000),
          actualCompletionTime: now,
          totalCost: 180.0,
        },
      ]);

      const result = await service.getTodayKpis(TENANT_ID);

      expect(result.completed).toBe(5);
      expect(result.inProgress).toBe(3);
      expect(result.waiting).toBe(1);
      expect(result.pending).toBe(2);
      expect(result.totalJobs).toBe(11);
      expect(result.revenue).toBe(430.5);
      expect(result.avgCompletionMinutes).toBeGreaterThan(0);
    });

    it('should handle zero completed orders', async () => {
      prisma.workOrder.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      prisma.workOrder.findMany.mockResolvedValue([]);

      const result = await service.getTodayKpis(TENANT_ID);

      expect(result.completed).toBe(0);
      expect(result.revenue).toBe(0);
      expect(result.avgCompletionMinutes).toBe(0);
    });
  });

  // ==================== getTvPayload ====================

  describe('getTvPayload', () => {
    it('should return combined TV payload', async () => {
      // getBoardState
      prisma.serviceBay.findMany.mockResolvedValue([]);
      // getUnassignedJobs
      prisma.workOrder.findMany.mockResolvedValue([]);
      // getTodayKpis
      prisma.workOrder.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await service.getTvPayload(TENANT_ID);

      expect(result).toHaveProperty('bays');
      expect(result).toHaveProperty('kpis');
      expect(result).toHaveProperty('unassigned');
      expect(result).toHaveProperty('timestamp');
      expect(Array.isArray(result.bays)).toBe(true);
      expect(Array.isArray(result.unassigned)).toBe(true);
    });
  });
});
