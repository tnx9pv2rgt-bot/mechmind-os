import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WorkOrderService } from './work-order.service';
import { PrismaService } from '../common/services/prisma.service';

describe('WorkOrderService — Check-in / Check-out / Timer', () => {
  let service: WorkOrderService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;

  const TENANT_ID = 'tenant-001';
  const WO_ID = 'wo-001';
  const TECH_ID = 'tech-001';

  beforeEach(async () => {
    prisma = {
      workOrder: {
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      vehicle: { update: jest.fn() },
      invoice: { findFirst: jest.fn(), create: jest.fn() },
      technicianTimeLog: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        aggregate: jest.fn(),
      },
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkOrderService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<WorkOrderService>(WorkOrderService);
  });

  // ==================== CHECK-IN ====================

  describe('checkIn', () => {
    it('should check in a vehicle and update status to CHECKED_IN', async () => {
      const existing = { id: WO_ID, tenantId: TENANT_ID, status: 'PENDING', vehicleId: 'v1' };
      const checkedIn = { ...existing, status: 'CHECKED_IN' };
      prisma.workOrder.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(checkedIn);
      prisma.vehicle.update.mockResolvedValue({});
      prisma.workOrder.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.checkIn(TENANT_ID, WO_ID, {
        vehicleId: 'v1',
        customerId: 'c1',
        mileageIn: 50000,
        fuelLevel: 'HALF' as never,
      });

      expect(result).toEqual(expect.objectContaining({ status: 'CHECKED_IN' }));
      expect(prisma.vehicle.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { mileage: 50000 } }),
      );
    });

    it('should allow check-in without a booking', async () => {
      const existing = { id: WO_ID, tenantId: TENANT_ID, status: 'OPEN', vehicleId: 'v1' };
      const checkedIn = { ...existing, status: 'CHECKED_IN' };
      prisma.workOrder.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(checkedIn);
      prisma.vehicle.update.mockResolvedValue({});
      prisma.workOrder.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.checkIn(TENANT_ID, WO_ID, {
        vehicleId: 'v1',
        customerId: 'c1',
        mileageIn: 30000,
        fuelLevel: 'FULL' as never,
      });

      expect(result).toEqual(expect.objectContaining({ status: 'CHECKED_IN' }));
    });

    it('should throw on invalid status for check-in', async () => {
      prisma.workOrder.findFirst.mockResolvedValue({
        id: WO_ID,
        tenantId: TENANT_ID,
        status: 'IN_PROGRESS',
      });

      await expect(
        service.checkIn(TENANT_ID, WO_ID, {
          vehicleId: 'v1',
          customerId: 'c1',
          mileageIn: 50000,
          fuelLevel: 'HALF' as never,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when WO not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(null);

      await expect(
        service.checkIn(TENANT_ID, 'missing', {
          vehicleId: 'v1',
          customerId: 'c1',
          mileageIn: 50000,
          fuelLevel: 'HALF' as never,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== CHECK-OUT ====================

  describe('checkOut', () => {
    it('should check out a completed work order', async () => {
      const existing = {
        id: WO_ID,
        tenantId: TENANT_ID,
        status: 'COMPLETED',
        vehicleId: 'v1',
        mileageIn: 50000,
      };
      const checkedOut = { ...existing, status: 'READY', mileageOut: 50050 };
      prisma.workOrder.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(checkedOut);
      prisma.vehicle.update.mockResolvedValue({});
      prisma.workOrder.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.checkOut(TENANT_ID, WO_ID, {
        mileageOut: 50050,
        fuelLevel: 'THREE_QUARTERS' as never,
      });

      expect(result).toEqual(expect.objectContaining({ status: 'READY', mileageOut: 50050 }));
    });

    it('should throw when mileageOut < mileageIn', async () => {
      prisma.workOrder.findFirst.mockResolvedValue({
        id: WO_ID,
        tenantId: TENANT_ID,
        status: 'COMPLETED',
        vehicleId: 'v1',
        mileageIn: 50000,
      });

      await expect(
        service.checkOut(TENANT_ID, WO_ID, {
          mileageOut: 49000,
          fuelLevel: 'HALF' as never,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw on non-completed WO', async () => {
      prisma.workOrder.findFirst.mockResolvedValue({
        id: WO_ID,
        tenantId: TENANT_ID,
        status: 'IN_PROGRESS',
        vehicleId: 'v1',
      });

      await expect(
        service.checkOut(TENANT_ID, WO_ID, {
          mileageOut: 50050,
          fuelLevel: 'HALF' as never,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== TIMER ====================

  describe('startTimer', () => {
    it('should start a timer for a technician', async () => {
      prisma.workOrder.findFirst.mockResolvedValue({ id: WO_ID, tenantId: TENANT_ID });
      prisma.technicianTimeLog.findFirst.mockResolvedValue(null);
      prisma.technicianTimeLog.create.mockResolvedValue({
        id: 'log-1',
        workOrderId: WO_ID,
        technicianId: TECH_ID,
        startedAt: new Date(),
      });

      const result = await service.startTimer(TENANT_ID, WO_ID, TECH_ID);

      expect(result).toEqual(expect.objectContaining({ workOrderId: WO_ID }));
    });

    it('should throw if timer already running', async () => {
      prisma.workOrder.findFirst.mockResolvedValue({ id: WO_ID, tenantId: TENANT_ID });
      prisma.technicianTimeLog.findFirst.mockResolvedValue({ id: 'existing', stoppedAt: null });

      await expect(service.startTimer(TENANT_ID, WO_ID, TECH_ID)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('stopTimer', () => {
    it('should stop the active timer and update labor hours', async () => {
      const startedAt = new Date(Date.now() - 30 * 60000); // 30 min ago
      prisma.technicianTimeLog.findFirst.mockResolvedValue({
        id: 'log-1',
        workOrderId: WO_ID,
        technicianId: TECH_ID,
        startedAt,
        stoppedAt: null,
      });
      prisma.technicianTimeLog.update.mockResolvedValue({
        id: 'log-1',
        stoppedAt: new Date(),
        durationMinutes: 30,
      });
      prisma.technicianTimeLog.findMany.mockResolvedValue([
        { durationMinutes: 30 },
        { durationMinutes: 60 },
      ]);
      prisma.workOrder.update.mockResolvedValue({});

      const result = await service.stopTimer(TENANT_ID, WO_ID, TECH_ID);

      expect(result).toEqual(expect.objectContaining({ durationMinutes: 30 }));
      expect(prisma.workOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { laborHours: 1.5 },
        }),
      );
    });

    it('should throw if no active timer', async () => {
      prisma.technicianTimeLog.findFirst.mockResolvedValue(null);

      await expect(service.stopTimer(TENANT_ID, WO_ID, TECH_ID)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getTimer', () => {
    it('should return timer status with accumulated time', async () => {
      prisma.workOrder.findFirst.mockResolvedValue({ id: WO_ID, tenantId: TENANT_ID });
      prisma.technicianTimeLog.findMany.mockResolvedValue([
        { id: 'log-1', stoppedAt: null, durationMinutes: null },
        { id: 'log-2', stoppedAt: new Date(), durationMinutes: 45 },
      ]);

      const result = await service.getTimer(TENANT_ID, WO_ID);

      expect(result.active).toEqual(expect.objectContaining({ id: 'log-1' }));
      expect(result.totalMinutes).toBe(45);
      expect(result.logs).toHaveLength(2);
    });
  });
});
