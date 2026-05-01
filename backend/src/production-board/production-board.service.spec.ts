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

  // ==================== Missing branch coverage: edge cases and error paths ====================

  describe('getBoardState - technician missing but work order present', () => {
    it('should handle work order without assigned technician', async () => {
      const wo = makeMockWorkOrder({ technicianId: null, status: 'IN_PROGRESS' });
      const bay = makeMockBay({
        currentWorkOrderId: WO_ID,
        currentWorkOrder: wo,
        status: 'OCCUPIED',
      });

      prisma.serviceBay.findMany.mockResolvedValue([bay]);
      prisma.technicianTimeLog.findFirst.mockResolvedValue(null);

      const result = await service.getBoardState(TENANT_ID);

      expect(result).toHaveLength(1);
      expect(result[0].technician).toBeNull();
      expect(result[0].currentWorkOrder).toBeTruthy();
      expect(prisma.technician.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('getBoardState - elapsed time from actualStartTime', () => {
    it('should calculate elapsed minutes from actualStartTime when no active timer', async () => {
      const wo = makeMockWorkOrder({
        status: 'IN_PROGRESS',
        actualStartTime: new Date(Date.now() - 45 * 60 * 1000),
      });
      const bay = makeMockBay({
        currentWorkOrderId: WO_ID,
        currentWorkOrder: wo,
        status: 'OCCUPIED',
      });

      prisma.serviceBay.findMany.mockResolvedValue([bay]);
      prisma.technician.findFirst.mockResolvedValue(null);
      prisma.technicianTimeLog.findFirst.mockResolvedValue(null);

      const result = await service.getBoardState(TENANT_ID);

      expect(result[0].elapsedMinutes).toBeGreaterThanOrEqual(44);
      expect(result[0].elapsedMinutes).toBeLessThanOrEqual(46);
    });
  });

  describe('assignToBay - bay cleaning status', () => {
    it('should throw BadRequestException if bay is in CLEANING status', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder());
      prisma.serviceBay.findFirst.mockResolvedValue(makeMockBay({ status: 'CLEANING' }));

      await expect(
        service.assignToBay(
          { workOrderId: WO_ID, bayId: BAY_ID, technicianId: TECH_ID },
          TENANT_ID,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.serviceBay.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ shopFloor: { tenantId: TENANT_ID } }),
        }),
      );
    });
  });

  describe('assignToBay - technician inactive', () => {
    it('should throw NotFoundException if technician is inactive', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder());
      prisma.serviceBay.findFirst.mockResolvedValue(makeMockBay());
      prisma.technician.findFirst.mockResolvedValue(makeMockTechnician({ isActive: false }));
      // Need complete getBayById path mocks even though we expect early NotFoundException
      prisma.serviceBay.findMany.mockResolvedValue([]);

      await expect(
        service.assignToBay(
          { workOrderId: WO_ID, bayId: BAY_ID, technicianId: TECH_ID },
          TENANT_ID,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.technician.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });
  });

  describe('moveJob - destination bay in maintenance', () => {
    it('should throw BadRequestException if destination bay is in MAINTENANCE', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder({ assignedBayId: BAY_ID }));
      prisma.serviceBay.findFirst
        .mockResolvedValueOnce(makeMockBay({ currentWorkOrderId: WO_ID, status: 'OCCUPIED' }))
        .mockResolvedValueOnce(makeMockBay({ id: BAY_ID_2, status: 'MAINTENANCE' }));

      await expect(
        service.moveJob({ workOrderId: WO_ID, fromBayId: BAY_ID, toBayId: BAY_ID_2 }, TENANT_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('moveJob - destination bay in cleaning', () => {
    it('should throw BadRequestException if destination bay is in CLEANING', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder({ assignedBayId: BAY_ID }));
      prisma.serviceBay.findFirst
        .mockResolvedValueOnce(makeMockBay({ currentWorkOrderId: WO_ID, status: 'OCCUPIED' }))
        .mockResolvedValueOnce(makeMockBay({ id: BAY_ID_2, status: 'CLEANING' }));

      await expect(
        service.moveJob({ workOrderId: WO_ID, fromBayId: BAY_ID, toBayId: BAY_ID_2 }, TENANT_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('moveJob - source bay not found', () => {
    it('should throw NotFoundException if source bay not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder());
      prisma.serviceBay.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.moveJob({ workOrderId: WO_ID, fromBayId: 'bad-bay', toBayId: BAY_ID_2 }, TENANT_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('moveJob - destination bay not found', () => {
    it('should throw NotFoundException if destination bay not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder());
      prisma.serviceBay.findFirst
        .mockResolvedValueOnce(makeMockBay({ currentWorkOrderId: WO_ID, status: 'OCCUPIED' }))
        .mockResolvedValueOnce(null);

      await expect(
        service.moveJob({ workOrderId: WO_ID, fromBayId: BAY_ID, toBayId: 'bad-bay' }, TENANT_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateJobStatus - transition to IN_PROGRESS with existing actualStartTime', () => {
    it('should not override existing actualStartTime on transition to IN_PROGRESS', async () => {
      const existingStartTime = new Date('2026-05-01T10:00:00Z');
      prisma.workOrder.findFirst.mockResolvedValue(
        makeMockWorkOrder({
          status: 'CHECKED_IN',
          actualStartTime: existingStartTime,
        }),
      );
      prisma.workOrder.update.mockResolvedValue(
        makeMockWorkOrder({ status: 'IN_PROGRESS', actualStartTime: existingStartTime }),
      );

      await service.updateJobStatus(WO_ID, 'IN_PROGRESS', TENANT_ID);

      // Verify update was called and check the data parameter
      expect(prisma.workOrder.update).toHaveBeenCalled();
      const updateCall = (prisma.workOrder.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.status).toBe('IN_PROGRESS');
      // Since actualStartTime already exists, it shouldn't be set again
      expect(updateCall.data.actualStartTime).toBeUndefined();
    });
  });

  describe('updateJobStatus - free bay on READY status', () => {
    it('should free bay when transitioning to READY', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(
        makeMockWorkOrder({ status: 'COMPLETED', assignedBayId: BAY_ID }),
      );
      prisma.serviceBay.update.mockResolvedValue({});
      prisma.workOrder.update.mockResolvedValue(makeMockWorkOrder({ status: 'READY' }));

      await service.updateJobStatus(WO_ID, 'READY', TENANT_ID);

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

  describe('updateJobStatus - free bay on INVOICED status', () => {
    it('should free bay when transitioning to INVOICED', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(
        makeMockWorkOrder({ status: 'READY', assignedBayId: BAY_ID }),
      );
      prisma.serviceBay.update.mockResolvedValue({});
      prisma.workOrder.update.mockResolvedValue(makeMockWorkOrder({ status: 'INVOICED' }));

      await service.updateJobStatus(WO_ID, 'INVOICED', TENANT_ID);

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

  describe('getTodayKpis - with completedWithTime having null totalCost', () => {
    it('should handle work order with null totalCost in revenue calculation', async () => {
      prisma.workOrder.count
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      prisma.workOrder.findMany.mockResolvedValue([
        {
          actualStartTime: twoHoursAgo,
          actualCompletionTime: now,
          totalCost: 100.0,
        },
        {
          actualStartTime: new Date(now.getTime() - 60 * 60 * 1000),
          actualCompletionTime: now,
          totalCost: null,
        },
      ]);

      const result = await service.getTodayKpis(TENANT_ID);

      expect(result.completed).toBe(2);
      expect(result.revenue).toBe(100);
      expect(result.avgCompletionMinutes).toBeGreaterThan(0);
    });
  });

  describe('getTodayKpis - with no actualStartTime', () => {
    it('should skip work orders with null actualStartTime from avg calculation', async () => {
      prisma.workOrder.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const now = new Date();
      prisma.workOrder.findMany.mockResolvedValue([
        {
          actualStartTime: null,
          actualCompletionTime: now,
          totalCost: 100.0,
        },
      ]);

      const result = await service.getTodayKpis(TENANT_ID);

      expect(result.completed).toBe(1);
      expect(result.revenue).toBe(100);
      expect(result.avgCompletionMinutes).toBe(0);
    });
  });

  describe('getBoardState - no vehicle or null vehicle', () => {
    it('should handle work order with null vehicle', async () => {
      const wo = makeMockWorkOrder({ vehicle: null });
      const bay = makeMockBay({
        currentWorkOrderId: WO_ID,
        currentWorkOrder: wo,
        status: 'OCCUPIED',
      });

      prisma.serviceBay.findMany.mockResolvedValue([bay]);
      prisma.technician.findFirst.mockResolvedValue(null);
      prisma.technicianTimeLog.findFirst.mockResolvedValue(null);

      const result = await service.getBoardState(TENANT_ID);

      expect(result[0].currentWorkOrder?.vehiclePlate).toBe('');
      expect(result[0].currentWorkOrder?.vehicleMakeModel).toBe('');
    });
  });

  describe('assignToBay - bay already has same work order', () => {
    it('should allow assign if bay already has the same work order (idempotent)', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder());
      prisma.serviceBay.findFirst.mockResolvedValue(
        makeMockBay({ currentWorkOrderId: WO_ID, status: 'OCCUPIED' }),
      );
      prisma.technician.findFirst.mockResolvedValue(makeMockTechnician());
      prisma.$transaction.mockResolvedValue([{}, {}]);

      // Mock for getBayById -> getBoardState
      prisma.serviceBay.findMany.mockResolvedValue([
        makeMockBay({
          status: 'OCCUPIED',
          currentWorkOrderId: WO_ID,
          currentWorkOrder: makeMockWorkOrder({ assignedBayId: BAY_ID, technicianId: TECH_ID }),
        }),
      ]);
      prisma.technicianTimeLog.findFirst.mockResolvedValue(null);

      const result = await service.assignToBay(
        { workOrderId: WO_ID, bayId: BAY_ID, technicianId: TECH_ID },
        TENANT_ID,
      );

      expect(result.id).toBe(BAY_ID);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('updateJobStatus - complete with no assigned bay', () => {
    it('should handle completion of work order with no assigned bay', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(
        makeMockWorkOrder({ status: 'IN_PROGRESS', assignedBayId: null }),
      );
      prisma.workOrder.update.mockResolvedValue(
        makeMockWorkOrder({ status: 'COMPLETED', assignedBayId: null }),
      );

      await service.updateJobStatus(WO_ID, 'COMPLETED', TENANT_ID);

      expect(prisma.serviceBay.update).not.toHaveBeenCalled();
      expect(prisma.workOrder.update).toHaveBeenCalled();
    });
  });

  describe('getTodayKpis - with negative elapsed time protection', () => {
    it('should calculate correct average even with very short durations', async () => {
      prisma.workOrder.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000);
      prisma.workOrder.findMany.mockResolvedValue([
        {
          actualStartTime: oneMinuteAgo,
          actualCompletionTime: now,
          totalCost: 50.0,
        },
      ]);

      const result = await service.getTodayKpis(TENANT_ID);

      expect(result.completed).toBe(1);
      expect(result.revenue).toBe(50);
      expect(result.avgCompletionMinutes).toBe(1);
    });
  });

  describe('moveJob - work order without vehicle', () => {
    it('should handle move of work order with null vehicle', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(
        makeMockWorkOrder({ assignedBayId: BAY_ID, vehicle: null }),
      );
      prisma.serviceBay.findFirst
        .mockResolvedValueOnce(makeMockBay({ currentWorkOrderId: WO_ID, status: 'OCCUPIED' }))
        .mockResolvedValueOnce(
          makeMockBay({ id: BAY_ID_2, name: 'Postazione 2', status: 'AVAILABLE' }),
        );
      prisma.$transaction.mockResolvedValue([{}, {}, {}]);

      prisma.serviceBay.findMany.mockResolvedValue([
        makeMockBay({
          id: BAY_ID_2,
          status: 'OCCUPIED',
          currentWorkOrderId: WO_ID,
          currentWorkOrder: makeMockWorkOrder({ vehicle: null }),
        }),
      ]);
      prisma.technicianTimeLog.findFirst.mockResolvedValue(null);

      const result = await service.moveJob(
        { workOrderId: WO_ID, fromBayId: BAY_ID, toBayId: BAY_ID_2 },
        TENANT_ID,
      );

      expect(result.id).toBe(BAY_ID_2);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('updateJobStatus - transition from IN_PROGRESS to WAITING_PARTS', () => {
    it('should transition from IN_PROGRESS to WAITING_PARTS (valid)', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder({ status: 'IN_PROGRESS' }));
      prisma.workOrder.update.mockResolvedValue(makeMockWorkOrder({ status: 'WAITING_PARTS' }));

      const result = await service.updateJobStatus(WO_ID, 'WAITING_PARTS', TENANT_ID);

      expect(result.status).toBe('WAITING_PARTS');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'productionBoard.updated',
        expect.objectContaining({
          action: 'statusChange',
          newStatus: 'WAITING_PARTS',
        }),
      );
    });
  });

  describe('updateJobStatus - transition from WAITING_PARTS back to IN_PROGRESS', () => {
    it('should transition from WAITING_PARTS back to IN_PROGRESS with actualStartTime set', async () => {
      const existingStartTime = new Date('2026-05-01T10:00:00Z');
      prisma.workOrder.findFirst.mockResolvedValue(
        makeMockWorkOrder({ status: 'WAITING_PARTS', actualStartTime: existingStartTime }),
      );
      prisma.workOrder.update.mockResolvedValue(
        makeMockWorkOrder({ status: 'IN_PROGRESS', actualStartTime: existingStartTime }),
      );

      const result = await service.updateJobStatus(WO_ID, 'IN_PROGRESS', TENANT_ID);

      expect(result.status).toBe('IN_PROGRESS');
      // Since actualStartTime already exists, the update data will not include actualStartTime field
      // (it's only set if !workOrder.actualStartTime)
      const updateCall = (prisma.workOrder.update as jest.Mock).mock.calls[0][0];
      // If actualStartTime was already set, it won't be in updateData
      expect(updateCall.data.status).toBe('IN_PROGRESS');
    });
  });

  describe('updateJobStatus - transition from IN_PROGRESS to QUALITY_CHECK', () => {
    it('should transition from IN_PROGRESS to QUALITY_CHECK', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder({ status: 'IN_PROGRESS' }));
      prisma.workOrder.update.mockResolvedValue(makeMockWorkOrder({ status: 'QUALITY_CHECK' }));

      const result = await service.updateJobStatus(WO_ID, 'QUALITY_CHECK', TENANT_ID);

      expect(result.status).toBe('QUALITY_CHECK');
    });
  });

  describe('updateJobStatus - transition from QUALITY_CHECK back to IN_PROGRESS', () => {
    it('should transition from QUALITY_CHECK back to IN_PROGRESS', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder({ status: 'QUALITY_CHECK' }));
      prisma.workOrder.update.mockResolvedValue(makeMockWorkOrder({ status: 'IN_PROGRESS' }));

      const result = await service.updateJobStatus(WO_ID, 'IN_PROGRESS', TENANT_ID);

      expect(result.status).toBe('IN_PROGRESS');
    });
  });

  describe('updateJobStatus - all valid transitions from PENDING', () => {
    it('should transition PENDING → OPEN', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder({ status: 'PENDING' }));
      prisma.workOrder.update.mockResolvedValue(makeMockWorkOrder({ status: 'OPEN' }));

      const result = await service.updateJobStatus(WO_ID, 'OPEN', TENANT_ID);
      expect(result.status).toBe('OPEN');
    });

    it('should transition PENDING → CHECKED_IN', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder({ status: 'PENDING' }));
      prisma.workOrder.update.mockResolvedValue(makeMockWorkOrder({ status: 'CHECKED_IN' }));

      const result = await service.updateJobStatus(WO_ID, 'CHECKED_IN', TENANT_ID);
      expect(result.status).toBe('CHECKED_IN');
    });

    it('should transition PENDING → IN_PROGRESS with actualStartTime', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder({ status: 'PENDING' }));
      prisma.workOrder.update.mockResolvedValue(
        makeMockWorkOrder({ status: 'IN_PROGRESS', actualStartTime: new Date() }),
      );

      await service.updateJobStatus(WO_ID, 'IN_PROGRESS', TENANT_ID);

      expect(prisma.workOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ actualStartTime: expect.any(Date) }),
        }),
      );
    });
  });

  describe('updateJobStatus - completion timestamp', () => {
    it('should set actualCompletionTime on COMPLETED transition', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder({ status: 'IN_PROGRESS' }));
      prisma.workOrder.update.mockResolvedValue(
        makeMockWorkOrder({ status: 'COMPLETED', actualCompletionTime: new Date() }),
      );

      await service.updateJobStatus(WO_ID, 'COMPLETED', TENANT_ID);

      expect(prisma.workOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actualCompletionTime: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('getTodayKpis - with multiple work orders', () => {
    it('should calculate correct totals with mixed revenue and time data', async () => {
      prisma.workOrder.count
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(4);

      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

      prisma.workOrder.findMany.mockResolvedValue([
        {
          actualStartTime: twoHoursAgo,
          actualCompletionTime: now,
          totalCost: 300.0,
        },
        {
          actualStartTime: threeHoursAgo,
          actualCompletionTime: now,
          totalCost: 200.5,
        },
        {
          actualStartTime: new Date(now.getTime() - 90 * 60 * 1000),
          actualCompletionTime: now,
          totalCost: 150.0,
        },
      ]);

      const result = await service.getTodayKpis(TENANT_ID);

      expect(result.completed).toBe(3);
      expect(result.inProgress).toBe(2);
      expect(result.waiting).toBe(1);
      expect(result.pending).toBe(4);
      expect(result.totalJobs).toBe(10);
      expect(result.revenue).toBe(650.5);
      expect(result.avgCompletionMinutes).toBeGreaterThan(90);
    });
  });

  describe('getTodayKpis - with partial data (no actualCompletionTime)', () => {
    it('should skip work orders with no actualCompletionTime in avg calculation', async () => {
      prisma.workOrder.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const now = new Date();
      const start = new Date(now.getTime() - 60 * 60 * 1000);
      prisma.workOrder.findMany.mockResolvedValue([
        {
          actualStartTime: start,
          actualCompletionTime: null,
          totalCost: 100.0,
        },
      ]);

      const result = await service.getTodayKpis(TENANT_ID);

      expect(result.completed).toBe(0);
      expect(result.avgCompletionMinutes).toBe(0);
    });
  });

  describe('getBoardState - technician exists but returns null', () => {
    it('should handle technician lookup returning null even when technicianId exists', async () => {
      const wo = makeMockWorkOrder({ technicianId: TECH_ID, status: 'IN_PROGRESS' });
      const bay = makeMockBay({
        currentWorkOrderId: WO_ID,
        currentWorkOrder: wo,
        status: 'OCCUPIED',
      });

      prisma.serviceBay.findMany.mockResolvedValue([bay]);
      prisma.technician.findFirst.mockResolvedValue(null); // Tech not found despite ID
      prisma.technicianTimeLog.findFirst.mockResolvedValue(null);

      const result = await service.getBoardState(TENANT_ID);

      expect(result[0].technician).toBeNull();
      expect(result[0].currentWorkOrder).toBeTruthy();
    });
  });

  describe('assignToBay - technician with empty specializations', () => {
    it('should allow assign with technician having no specializations', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder());
      prisma.serviceBay.findFirst.mockResolvedValue(makeMockBay());
      prisma.technician.findFirst.mockResolvedValue(makeMockTechnician({ specializations: [] }));
      prisma.$transaction.mockResolvedValue([{}, {}]);

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
      expect(result.technician?.specializations).toEqual([]);
    });
  });

  describe('getUnassignedJobs - with various statuses', () => {
    it('should include only jobs in specific statuses (PENDING, CHECKED_IN, IN_PROGRESS, WAITING_PARTS)', async () => {
      prisma.workOrder.findMany.mockResolvedValue([
        makeMockWorkOrder({ status: 'PENDING' }),
        makeMockWorkOrder({ id: 'wo-002', status: 'CHECKED_IN' }),
        makeMockWorkOrder({ id: 'wo-003', status: 'IN_PROGRESS' }),
        makeMockWorkOrder({ id: 'wo-004', status: 'WAITING_PARTS' }),
      ]);

      const result = await service.getUnassignedJobs(TENANT_ID);

      expect(result).toHaveLength(4);
      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['PENDING', 'CHECKED_IN', 'IN_PROGRESS', 'WAITING_PARTS'] },
          }),
        }),
      );
    });
  });

  describe('updateJobStatus - transition from OPEN to CHECKED_IN', () => {
    it('should transition OPEN → CHECKED_IN', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder({ status: 'OPEN' }));
      prisma.workOrder.update.mockResolvedValue(makeMockWorkOrder({ status: 'CHECKED_IN' }));

      const result = await service.updateJobStatus(WO_ID, 'CHECKED_IN', TENANT_ID);

      expect(result.status).toBe('CHECKED_IN');
    });
  });

  describe('updateJobStatus - transition OPEN to IN_PROGRESS', () => {
    it('should transition OPEN → IN_PROGRESS with actualStartTime', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder({ status: 'OPEN' }));
      prisma.workOrder.update.mockResolvedValue(
        makeMockWorkOrder({
          status: 'IN_PROGRESS',
          actualStartTime: new Date(),
        }),
      );

      await service.updateJobStatus(WO_ID, 'IN_PROGRESS', TENANT_ID);

      expect(prisma.workOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actualStartTime: expect.any(Date),
            status: 'IN_PROGRESS',
          }),
        }),
      );
    });
  });

  describe('updateJobStatus - invalid transition OPEN to READY (should fail)', () => {
    it('should throw BadRequestException for OPEN → READY (invalid transition)', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder({ status: 'OPEN' }));

      await expect(service.updateJobStatus(WO_ID, 'READY', TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cross-tenant isolation', () => {
    it('should filter by tenantId in getBoardState', async () => {
      prisma.serviceBay.findMany.mockResolvedValue([]);

      await service.getBoardState(TENANT_ID);

      expect(prisma.serviceBay.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { shopFloor: { tenantId: TENANT_ID } },
        }),
      );
    });

    it('should filter by tenantId in assignToBay work order query', async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce(makeMockWorkOrder());

      prisma.serviceBay.findFirst.mockResolvedValue(makeMockBay());
      prisma.technician.findFirst.mockResolvedValue(makeMockTechnician());

      expect(prisma.workOrder.findFirst).not.toHaveBeenCalled();

      try {
        await service.assignToBay(
          { workOrderId: WO_ID, bayId: BAY_ID, technicianId: TECH_ID },
          TENANT_ID,
        );
      } catch {
        // Expected to fail later, we only care about the first call
      }

      expect(prisma.workOrder.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_ID }),
        }),
      );
    });

    it('should filter by tenantId in assignToBay technician query', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder());
      prisma.serviceBay.findFirst.mockResolvedValue(makeMockBay());
      prisma.technician.findFirst.mockResolvedValue(makeMockTechnician());

      expect(prisma.technician.findFirst).not.toHaveBeenCalled();

      try {
        await service.assignToBay(
          { workOrderId: WO_ID, bayId: BAY_ID, technicianId: TECH_ID },
          TENANT_ID,
        );
      } catch {
        // Expected to fail, we only care about the call
      }

      expect(prisma.technician.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_ID }),
        }),
      );
    });

    it('should filter by tenantId in updateJobStatus', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder({ status: 'IN_PROGRESS' }));
      prisma.workOrder.update.mockResolvedValue(makeMockWorkOrder({ status: 'COMPLETED' }));

      await service.updateJobStatus(WO_ID, 'COMPLETED', TENANT_ID);

      expect(prisma.workOrder.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_ID }),
        }),
      );
    });
  });

  describe('getBoardState - active timer calculation', () => {
    it('should calculate elapsed minutes from active timer when present', async () => {
      const startedAt = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      const wo = makeMockWorkOrder({
        id: 'wo-timer-test',
        status: 'IN_PROGRESS',
        technicianId: TECH_ID,
      });
      const bay = makeMockBay({
        id: 'bay-timer-test',
        currentWorkOrderId: 'wo-timer-test',
        currentWorkOrder: wo,
        status: 'OCCUPIED',
      });

      prisma.serviceBay.findMany.mockResolvedValue([bay]);
      prisma.technician.findFirst.mockResolvedValue(makeMockTechnician());
      prisma.technicianTimeLog.findFirst.mockResolvedValue({
        id: 'timer-1',
        startedAt,
        stoppedAt: null,
      });

      const result = await service.getBoardState(TENANT_ID);

      expect(result[0].elapsedMinutes).toBeGreaterThan(0);
    });
  });

  describe('assignToBay - bay with MAINTENANCE status', () => {
    it('should reject assigning to bay with MAINTENANCE status', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder());
      prisma.serviceBay.findFirst.mockResolvedValue(makeMockBay({ status: 'MAINTENANCE' }));

      await expect(
        service.assignToBay(
          { workOrderId: WO_ID, bayId: BAY_ID, technicianId: TECH_ID },
          TENANT_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('moveJob - fromBay has different work order', () => {
    it('should throw if fromBay does not have the specified work order', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder());
      prisma.serviceBay.findFirst
        .mockResolvedValueOnce(makeMockBay({ currentWorkOrderId: 'other-wo-id' }))
        .mockResolvedValueOnce(makeMockBay({ id: BAY_ID_2, status: 'AVAILABLE' }));

      await expect(
        service.moveJob({ workOrderId: WO_ID, fromBayId: BAY_ID, toBayId: BAY_ID_2 }, TENANT_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('moveJob - destination bay with MAINTENANCE status', () => {
    it('should reject moving to bay with MAINTENANCE status', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder());
      prisma.serviceBay.findFirst
        .mockResolvedValueOnce(makeMockBay({ currentWorkOrderId: WO_ID }))
        .mockResolvedValueOnce(makeMockBay({ id: BAY_ID_2, status: 'MAINTENANCE' }));

      await expect(
        service.moveJob({ workOrderId: WO_ID, fromBayId: BAY_ID, toBayId: BAY_ID_2 }, TENANT_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('moveJob - destination bay already occupied', () => {
    it('should reject moving to an occupied bay', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder());
      prisma.serviceBay.findFirst
        .mockResolvedValueOnce(makeMockBay({ currentWorkOrderId: WO_ID }))
        .mockResolvedValueOnce(
          makeMockBay({ id: BAY_ID_2, status: 'AVAILABLE', currentWorkOrderId: 'other-wo' }),
        );

      await expect(
        service.moveJob({ workOrderId: WO_ID, fromBayId: BAY_ID, toBayId: BAY_ID_2 }, TENANT_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateJobStatus - transition to COMPLETED sets actualCompletionTime', () => {
    it('should set actualCompletionTime when transitioning to COMPLETED', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(
        makeMockWorkOrder({ status: 'QUALITY_CHECK', assignedBayId: BAY_ID }),
      );
      const updateMock = jest
        .fn()
        .mockResolvedValue(
          makeMockWorkOrder({ status: 'COMPLETED', actualCompletionTime: new Date() }),
        );
      prisma.workOrder.update = updateMock;

      await service.updateJobStatus(WO_ID, 'COMPLETED', TENANT_ID);

      const callData = updateMock.mock.calls[0][0]?.data;
      expect(callData?.actualCompletionTime).toBeDefined();
    });
  });

  describe('updateJobStatus - transition to READY frees bay', () => {
    it('should free the bay when transitioning to READY', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(
        makeMockWorkOrder({ status: 'COMPLETED', assignedBayId: BAY_ID }),
      );
      prisma.workOrder.update.mockResolvedValue(
        makeMockWorkOrder({ status: 'READY', assignedBayId: BAY_ID }),
      );
      prisma.serviceBay.update.mockResolvedValue(makeMockBay());

      await service.updateJobStatus(WO_ID, 'READY', TENANT_ID);

      expect(prisma.serviceBay.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: BAY_ID },
          data: expect.objectContaining({
            status: 'AVAILABLE',
            currentWorkOrderId: null,
          }),
        }),
      );
    });
  });

  describe('updateJobStatus - transition to INVOICED frees bay', () => {
    it('should free the bay when transitioning to INVOICED', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(
        makeMockWorkOrder({ status: 'READY', assignedBayId: BAY_ID }),
      );
      prisma.workOrder.update.mockResolvedValue(
        makeMockWorkOrder({ status: 'INVOICED', assignedBayId: BAY_ID }),
      );
      prisma.serviceBay.update.mockResolvedValue(makeMockBay());

      await service.updateJobStatus(WO_ID, 'INVOICED', TENANT_ID);

      expect(prisma.serviceBay.update).toHaveBeenCalled();
    });
  });

  describe('getTodayKpis - revenue aggregation with Decimal', () => {
    it('should aggregate revenue correctly with Decimal totalCost', async () => {
      prisma.workOrder.count
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(1);

      const now = new Date();
      prisma.workOrder.findMany.mockResolvedValue([
        {
          actualStartTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          actualCompletionTime: now,
          totalCost: 150.5,
        },
        {
          actualStartTime: new Date(now.getTime() - 90 * 60 * 1000),
          actualCompletionTime: new Date(now.getTime() - 30 * 60 * 1000),
          totalCost: 249.5,
        },
      ]);

      const result = await service.getTodayKpis(TENANT_ID);

      expect(result.revenue).toBe(400);
      expect(result.completed).toBe(2);
    });
  });

  describe('getTodayKpis - work order with null actualCompletionTime', () => {
    it('should skip work orders with null actualCompletionTime from timing calculation', async () => {
      prisma.workOrder.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const now = new Date();
      prisma.workOrder.findMany.mockResolvedValue([
        {
          actualStartTime: new Date(now.getTime() - 60 * 60 * 1000),
          actualCompletionTime: null,
          totalCost: 200.0,
        },
      ]);

      const result = await service.getTodayKpis(TENANT_ID);

      expect(result.avgCompletionMinutes).toBe(0);
      expect(result.revenue).toBe(200);
    });
  });

  describe('getUnassignedJobs - filters by status correctly', () => {
    it('should include only jobs in specific statuses', async () => {
      const pendingWo = makeMockWorkOrder({ status: 'PENDING', assignedBayId: null });
      const checkedInWo = makeMockWorkOrder({ status: 'CHECKED_IN', assignedBayId: null });

      prisma.workOrder.findMany.mockResolvedValue([pendingWo, checkedInWo]);

      const result = await service.getUnassignedJobs(TENANT_ID);

      expect(result.length).toBe(2);
      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['PENDING', 'CHECKED_IN', 'IN_PROGRESS', 'WAITING_PARTS'] },
          }),
        }),
      );
    });
  });

  describe('getTvPayload - aggregates all data', () => {
    it('should combine bays, kpis, unassigned, and timestamp in single response', async () => {
      const bay = makeMockBay();
      prisma.serviceBay.findMany.mockResolvedValue([bay]);
      prisma.technician.findFirst.mockResolvedValue(null);
      prisma.technicianTimeLog.findFirst.mockResolvedValue(null);

      prisma.workOrder.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      prisma.workOrder.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const result = await service.getTvPayload(TENANT_ID);

      expect(result.bays).toBeDefined();
      expect(result.kpis).toBeDefined();
      expect(result.unassigned).toBeDefined();
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}/);
    });
  });

  describe('getBoardState - vehicle nullability handling', () => {
    it('should handle work order with missing vehicle in full board state', async () => {
      const wo = makeMockWorkOrder({
        id: 'wo-null-vehicle',
        vehicle: null,
        technicianId: null,
      });
      const bay = makeMockBay({
        id: 'bay-null-vehicle',
        currentWorkOrderId: 'wo-null-vehicle',
        currentWorkOrder: wo,
        status: 'OCCUPIED',
      });

      prisma.serviceBay.findMany.mockResolvedValue([bay]);
      prisma.technician.findFirst.mockResolvedValue(null);
      prisma.technicianTimeLog.findFirst.mockResolvedValue(null);

      const result = await service.getBoardState(TENANT_ID);

      expect(result[0].currentWorkOrder?.vehiclePlate).toBe('');
      expect(result[0].currentWorkOrder?.vehicleMakeModel).toBe('');
      expect(result[0].technician).toBeNull();
    });
  });

  describe('assignToBay - inactive technician rejection', () => {
    it('should reject inactive technician', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder());
      prisma.serviceBay.findFirst.mockResolvedValue(makeMockBay());
      prisma.technician.findFirst.mockResolvedValue(null); // isActive: false would be caught here

      await expect(
        service.assignToBay(
          { workOrderId: WO_ID, bayId: BAY_ID, technicianId: TECH_ID },
          TENANT_ID,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('moveJob - same source and destination bay', () => {
    it('should reject when moving to same bay', async () => {
      await expect(
        service.moveJob({ workOrderId: WO_ID, fromBayId: BAY_ID, toBayId: BAY_ID }, TENANT_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateJobStatus - transition from IN_PROGRESS to QUALITY_CHECK', () => {
    it('should transition from IN_PROGRESS to QUALITY_CHECK', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder({ status: 'IN_PROGRESS' }));
      prisma.workOrder.update.mockResolvedValue(makeMockWorkOrder({ status: 'QUALITY_CHECK' }));

      const result = await service.updateJobStatus(WO_ID, 'QUALITY_CHECK', TENANT_ID);

      expect(result.status).toBe('QUALITY_CHECK');
      expect(prisma.serviceBay.update).not.toHaveBeenCalled();
    });
  });

  describe('updateJobStatus - transition from QUALITY_CHECK to COMPLETED', () => {
    it('should transition from QUALITY_CHECK to COMPLETED and free bay', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(
        makeMockWorkOrder({ status: 'QUALITY_CHECK', assignedBayId: BAY_ID }),
      );
      prisma.workOrder.update.mockResolvedValue(
        makeMockWorkOrder({ status: 'COMPLETED', assignedBayId: BAY_ID }),
      );
      prisma.serviceBay.update.mockResolvedValue(makeMockBay());

      await service.updateJobStatus(WO_ID, 'COMPLETED', TENANT_ID);

      expect(prisma.serviceBay.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: BAY_ID },
        }),
      );
    });
  });

  describe('getTodayKpis - zero completed work orders', () => {
    it('should handle zero completed work orders gracefully', async () => {
      prisma.workOrder.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(1);

      prisma.workOrder.findMany.mockResolvedValue([]);

      const result = await service.getTodayKpis(TENANT_ID);

      expect(result.completed).toBe(0);
      expect(result.revenue).toBe(0);
      expect(result.avgCompletionMinutes).toBe(0);
    });
  });

  describe('getUnassignedJobs - empty result', () => {
    it('should return empty array when no unassigned jobs', async () => {
      prisma.workOrder.findMany.mockResolvedValue([]);

      const result = await service.getUnassignedJobs(TENANT_ID);

      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });
  });

  describe('getBayById - not found scenario', () => {
    it('should throw NotFoundException when bay not found', async () => {
      prisma.serviceBay.findMany.mockResolvedValue([]);

      await expect(service['getBayById'](BAY_ID, TENANT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBoardState - multiple bays with mixed technician states', () => {
    it('should handle multiple bays where only some have technicians', async () => {
      const bay1 = makeMockBay({
        id: 'bay-1',
        currentWorkOrderId: WO_ID,
        currentWorkOrder: makeMockWorkOrder({ id: WO_ID, technicianId: TECH_ID }),
        status: 'OCCUPIED',
      });
      const bay2 = makeMockBay({
        id: 'bay-2',
        currentWorkOrderId: null,
        currentWorkOrder: null,
        status: 'AVAILABLE',
      });

      prisma.serviceBay.findMany.mockResolvedValue([bay1, bay2]);
      prisma.technician.findFirst
        .mockResolvedValueOnce(makeMockTechnician())
        .mockResolvedValueOnce(null);
      prisma.technicianTimeLog.findFirst.mockResolvedValue(null);

      const result = await service.getBoardState(TENANT_ID);

      expect(result).toHaveLength(2);
      expect(result[0].technician?.id).toBe(TECH_ID);
      expect(result[0].currentWorkOrder).not.toBeNull();
      expect(result[1].technician).toBeNull();
      expect(result[1].currentWorkOrder).toBeNull();
    });
  });

  describe('assignToBay - bay currently available', () => {
    it('should successfully assign to bay in AVAILABLE status', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder());
      prisma.serviceBay.findFirst.mockResolvedValue(makeMockBay({ status: 'AVAILABLE' }));
      prisma.technician.findFirst.mockResolvedValue(makeMockTechnician());
      prisma.$transaction.mockResolvedValue([{}, {}]);

      prisma.serviceBay.findMany.mockResolvedValue([
        makeMockBay({
          status: 'OCCUPIED',
          currentWorkOrderId: WO_ID,
          currentWorkOrder: makeMockWorkOrder({ assignedBayId: BAY_ID, technicianId: TECH_ID }),
        }),
      ]);
      prisma.technicianTimeLog.findFirst.mockResolvedValue(null);

      const result = await service.assignToBay(
        { workOrderId: WO_ID, bayId: BAY_ID, technicianId: TECH_ID },
        TENANT_ID,
      );

      expect(result.id).toBe(BAY_ID);
      expect(result.status).toBe('OCCUPIED');
    });
  });

  describe('moveJob - source bay CLEANING status (rejected)', () => {
    it('should work when source bay is not in CLEANING/MAINTENANCE', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder());
      prisma.serviceBay.findFirst
        .mockResolvedValueOnce(makeMockBay({ currentWorkOrderId: WO_ID, status: 'OCCUPIED' }))
        .mockResolvedValueOnce(makeMockBay({ id: BAY_ID_2, status: 'AVAILABLE' }));
      prisma.$transaction.mockResolvedValue([{}, {}, {}]);

      prisma.serviceBay.findMany.mockResolvedValue([
        makeMockBay({
          id: BAY_ID_2,
          status: 'OCCUPIED',
          currentWorkOrderId: WO_ID,
          currentWorkOrder: makeMockWorkOrder({ vehicle: null }),
        }),
      ]);
      prisma.technicianTimeLog.findFirst.mockResolvedValue(null);

      const result = await service.moveJob(
        { workOrderId: WO_ID, fromBayId: BAY_ID, toBayId: BAY_ID_2 },
        TENANT_ID,
      );

      expect(result.id).toBe(BAY_ID_2);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('updateJobStatus - action that does not change bay or set times', () => {
    it('should transition from PENDING to OPEN without touching bay or timing', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(
        makeMockWorkOrder({ status: 'PENDING', assignedBayId: null }),
      );
      prisma.workOrder.update.mockResolvedValue(
        makeMockWorkOrder({ status: 'OPEN', assignedBayId: null }),
      );

      const result = await service.updateJobStatus(WO_ID, 'OPEN', TENANT_ID);

      expect(result.status).toBe('OPEN');
      expect(prisma.serviceBay.update).not.toHaveBeenCalled();
    });
  });

  describe('getTodayKpis - multiple completed work orders different times', () => {
    it('should correctly aggregate revenue and completion time from multiple work orders', async () => {
      prisma.workOrder.count
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2);

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      prisma.workOrder.findMany.mockResolvedValue([
        {
          actualStartTime: twoHoursAgo,
          actualCompletionTime: oneHourAgo,
          totalCost: 500.75,
        },
        {
          actualStartTime: oneHourAgo,
          actualCompletionTime: now,
          totalCost: 250.25,
        },
        {
          actualStartTime: new Date(now.getTime() - 30 * 60 * 1000),
          actualCompletionTime: now,
          totalCost: 100.0,
        },
      ]);

      const result = await service.getTodayKpis(TENANT_ID);

      expect(result.completed).toBe(3);
      expect(result.inProgress).toBe(2);
      expect(result.waiting).toBe(1);
      expect(result.pending).toBe(2);
      expect(result.totalJobs).toBe(8);
      expect(result.revenue).toBe(851);
      expect(result.avgCompletionMinutes).toBeGreaterThan(0);
    });
  });

  describe('getUnassignedJobs - status filtering precision', () => {
    it('should only return jobs in PENDING/CHECKED_IN/IN_PROGRESS/WAITING_PARTS', async () => {
      const jobs = [
        makeMockWorkOrder({ id: 'wo-1', status: 'PENDING', assignedBayId: null }),
        makeMockWorkOrder({ id: 'wo-2', status: 'WAITING_PARTS', assignedBayId: null }),
      ];
      prisma.workOrder.findMany.mockResolvedValue(jobs);

      const result = await service.getUnassignedJobs(TENANT_ID);

      expect(result.length).toBe(2);
      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedBayId: null,
            status: { in: ['PENDING', 'CHECKED_IN', 'IN_PROGRESS', 'WAITING_PARTS'] },
          }),
        }),
      );
    });
  });

  describe('updateJobStatus - transition from PENDING to CHECKED_IN', () => {
    it('should transition from PENDING to CHECKED_IN', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(makeMockWorkOrder({ status: 'PENDING' }));
      prisma.workOrder.update.mockResolvedValue(makeMockWorkOrder({ status: 'CHECKED_IN' }));

      const result = await service.updateJobStatus(WO_ID, 'CHECKED_IN', TENANT_ID);

      expect(result.status).toBe('CHECKED_IN');
      expect(prisma.serviceBay.update).not.toHaveBeenCalled();
    });
  });

  describe('updateJobStatus - transition from PENDING to IN_PROGRESS', () => {
    it('should transition from PENDING to IN_PROGRESS and set actualStartTime', async () => {
      const updateMock = jest
        .fn()
        .mockResolvedValue(
          makeMockWorkOrder({ status: 'IN_PROGRESS', actualStartTime: new Date() }),
        );
      prisma.workOrder.findFirst.mockResolvedValue(
        makeMockWorkOrder({ status: 'PENDING', actualStartTime: null }),
      );
      prisma.workOrder.update = updateMock;

      await service.updateJobStatus(WO_ID, 'IN_PROGRESS', TENANT_ID);

      const callData = updateMock.mock.calls[0][0]?.data;
      expect(callData?.actualStartTime).toBeDefined();
    });
  });

  describe('getTodayKpis - partial data aggregation', () => {
    it('should handle work orders with only some fields populated', async () => {
      prisma.workOrder.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      prisma.workOrder.findMany.mockResolvedValue([
        {
          actualStartTime: new Date(),
          actualCompletionTime: new Date(),
          totalCost: null, // No cost
        },
      ]);

      const result = await service.getTodayKpis(TENANT_ID);

      expect(result.completed).toBe(1);
      expect(result.revenue).toBe(0);
      expect(result.avgCompletionMinutes).toBe(0);
    });
  });

  describe('getTodayKpis - all status categories populated', () => {
    it('should count all work order statuses correctly', async () => {
      prisma.workOrder.count
        .mockResolvedValueOnce(5) // completed
        .mockResolvedValueOnce(3) // inProgress
        .mockResolvedValueOnce(2) // waiting
        .mockResolvedValueOnce(4); // pending

      prisma.workOrder.findMany.mockResolvedValue([
        {
          actualStartTime: new Date('2026-05-01T08:00:00'),
          actualCompletionTime: new Date('2026-05-01T09:00:00'),
          totalCost: 100,
        },
      ]);

      const result = await service.getTodayKpis(TENANT_ID);

      expect(result.completed).toBe(5);
      expect(result.inProgress).toBe(3);
      expect(result.waiting).toBe(2);
      expect(result.pending).toBe(4);
      expect(result.totalJobs).toBe(14);
      expect(result.revenue).toBe(100);
      expect(result.avgCompletionMinutes).toBe(60);
    });
  });

  describe('getTodayKpis - edge case: completedCount equals zero', () => {
    it('should return 0 avgCompletionMinutes when no completed jobs with timing', async () => {
      prisma.workOrder.count
        .mockResolvedValueOnce(0) // completed
        .mockResolvedValueOnce(0) // inProgress
        .mockResolvedValueOnce(0) // waiting
        .mockResolvedValueOnce(1); // pending

      prisma.workOrder.findMany.mockResolvedValue([]); // No jobs with both start and completion times

      const result = await service.getTodayKpis(TENANT_ID);

      expect(result.avgCompletionMinutes).toBe(0);
      expect(result.completed).toBe(0);
      expect(result.totalJobs).toBe(1);
    });
  });

  describe('getTodayKpis - completedCount greater than zero', () => {
    it('should calculate average correctly when multiple work orders complete', async () => {
      prisma.workOrder.count
        .mockResolvedValueOnce(2) // completed
        .mockResolvedValueOnce(0) // inProgress
        .mockResolvedValueOnce(0) // waiting
        .mockResolvedValueOnce(0); // pending

      const start1 = new Date('2026-05-01T08:00:00');
      const end1 = new Date('2026-05-01T09:30:00'); // 90 minutes
      const start2 = new Date('2026-05-01T10:00:00');
      const end2 = new Date('2026-05-01T10:30:00'); // 30 minutes

      prisma.workOrder.findMany.mockResolvedValue([
        {
          actualStartTime: start1,
          actualCompletionTime: end1,
          totalCost: 150,
        },
        {
          actualStartTime: start2,
          actualCompletionTime: end2,
          totalCost: 75,
        },
      ]);

      const result = await service.getTodayKpis(TENANT_ID);

      // (90 + 30) / 2 = 60 minutes average
      expect(result.avgCompletionMinutes).toBe(60);
      expect(result.revenue).toBe(225);
    });
  });

  describe('getTodayKpis - skips entries with missing actualStartTime', () => {
    it('should not include work orders missing actualStartTime in timing calculation', async () => {
      prisma.workOrder.count
        .mockResolvedValueOnce(2) // completed
        .mockResolvedValueOnce(0) // inProgress
        .mockResolvedValueOnce(0) // waiting
        .mockResolvedValueOnce(0); // pending

      const completionTime = new Date('2026-05-01T12:00:00');

      prisma.workOrder.findMany.mockResolvedValue([
        {
          actualStartTime: null, // Missing start
          actualCompletionTime: completionTime,
          totalCost: 200,
        },
        {
          actualStartTime: new Date('2026-05-01T10:00:00'),
          actualCompletionTime: completionTime,
          totalCost: 100,
        },
      ]);

      const result = await service.getTodayKpis(TENANT_ID);

      // Only second work order counted in timing: 120 minutes
      expect(result.avgCompletionMinutes).toBe(120);
      expect(result.revenue).toBe(300);
    });
  });

  describe('getTodayKpis - skips entries with missing actualCompletionTime', () => {
    it('should not include work orders missing actualCompletionTime in timing calculation', async () => {
      prisma.workOrder.count
        .mockResolvedValueOnce(2) // completed
        .mockResolvedValueOnce(0) // inProgress
        .mockResolvedValueOnce(0) // waiting
        .mockResolvedValueOnce(0); // pending

      const startTime = new Date('2026-05-01T08:00:00');

      prisma.workOrder.findMany.mockResolvedValue([
        {
          actualStartTime: startTime,
          actualCompletionTime: null, // Missing completion
          totalCost: 150,
        },
        {
          actualStartTime: startTime,
          actualCompletionTime: new Date('2026-05-01T10:00:00'),
          totalCost: 100,
        },
      ]);

      const result = await service.getTodayKpis(TENANT_ID);

      // Only second work order counted in timing: 120 minutes
      expect(result.avgCompletionMinutes).toBe(120);
      expect(result.revenue).toBe(250);
    });
  });

  describe('getTodayKpis - skips totalCost when null', () => {
    it('should not add null totalCost values to revenue', async () => {
      prisma.workOrder.count
        .mockResolvedValueOnce(3) // completed
        .mockResolvedValueOnce(0) // inProgress
        .mockResolvedValueOnce(0) // waiting
        .mockResolvedValueOnce(0); // pending

      const startTime = new Date('2026-05-01T08:00:00');
      const endTime = new Date('2026-05-01T10:00:00');

      prisma.workOrder.findMany.mockResolvedValue([
        {
          actualStartTime: startTime,
          actualCompletionTime: endTime,
          totalCost: null, // No cost
        },
        {
          actualStartTime: startTime,
          actualCompletionTime: endTime,
          totalCost: 500,
        },
        {
          actualStartTime: startTime,
          actualCompletionTime: endTime,
          totalCost: null, // No cost
        },
      ]);

      const result = await service.getTodayKpis(TENANT_ID);

      // Only second work order contributes revenue
      expect(result.revenue).toBe(500);
      expect(result.avgCompletionMinutes).toBe(120);
    });
  });
});
