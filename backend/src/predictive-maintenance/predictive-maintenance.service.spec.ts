import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PredictiveMaintenanceService } from './predictive-maintenance.service';
import { PrismaService } from '../common/services/prisma.service';

describe('PredictiveMaintenanceService', () => {
  let service: PredictiveMaintenanceService;
  let prisma: {
    vehicle: { findFirst: jest.Mock };
    maintenanceScheduleTemplate: { findMany: jest.Mock };
    workOrder: { findMany: jest.Mock };
    predictedMaintenance: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    bookingSlot: { create: jest.Mock };
    booking: { create: jest.Mock };
  };

  const TENANT_ID = 'tenant-001';
  const VEHICLE_ID = 'vehicle-001';

  const mockVehicle = {
    id: VEHICLE_ID,
    tenantId: TENANT_ID,
    make: 'Fiat',
    model: 'Panda',
    year: 2022,
    mileage: 50000,
    customerId: 'cust-001',
  };

  const mockTemplate = {
    id: 'tmpl-001',
    make: 'Fiat',
    model: 'Panda',
    yearFrom: 2020,
    yearTo: 2025,
    serviceType: 'OIL_CHANGE',
    intervalKm: 15000,
    intervalMonths: 12,
    description: 'Cambio olio e filtro',
    estimatedCostCents: new Prisma.Decimal(8000),
  };

  const mockPrediction = {
    id: 'pred-001',
    tenantId: TENANT_ID,
    vehicleId: VEHICLE_ID,
    customerId: 'cust-001',
    serviceType: 'OIL_CHANGE',
    predictedDate: new Date('2026-06-01T00:00:00Z'),
    predictedMileage: 65000,
    confidence: new Prisma.Decimal(0.8),
    notificationSentAt: null,
    bookedAt: null,
    bookingId: null,
    createdAt: new Date('2026-03-01T00:00:00Z'),
  };

  beforeEach(async () => {
    prisma = {
      vehicle: { findFirst: jest.fn() },
      maintenanceScheduleTemplate: { findMany: jest.fn() },
      workOrder: { findMany: jest.fn() },
      predictedMaintenance: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      bookingSlot: { create: jest.fn() },
      booking: { create: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PredictiveMaintenanceService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<PredictiveMaintenanceService>(PredictiveMaintenanceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('predictForVehicle', () => {
    it('should generate predictions based on templates and history', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.maintenanceScheduleTemplate.findMany.mockResolvedValue([mockTemplate]);
      prisma.workOrder.findMany.mockResolvedValue([]);
      prisma.predictedMaintenance.findMany.mockResolvedValue([]);
      prisma.predictedMaintenance.create.mockResolvedValue(mockPrediction);

      const result = await service.predictForVehicle(TENANT_ID, VEHICLE_ID);

      expect(result).toHaveLength(1);
      expect(result[0].serviceType).toBe('OIL_CHANGE');
      expect(result[0].vehicleId).toBe(VEHICLE_ID);
      expect(prisma.predictedMaintenance.create).toHaveBeenCalled();
    });

    it('should reuse existing predictions for same service type', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.maintenanceScheduleTemplate.findMany.mockResolvedValue([mockTemplate]);
      prisma.workOrder.findMany.mockResolvedValue([]);
      prisma.predictedMaintenance.findMany.mockResolvedValue([mockPrediction]);

      const result = await service.predictForVehicle(TENANT_ID, VEHICLE_ID);

      expect(result).toHaveLength(1);
      expect(prisma.predictedMaintenance.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when vehicle not found', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.predictForVehicle(TENANT_ID, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getMaintenanceSchedule', () => {
    it('should return schedule with overdue status', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.maintenanceScheduleTemplate.findMany.mockResolvedValue([mockTemplate]);

      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 2);

      prisma.workOrder.findMany.mockResolvedValue([
        {
          diagnosis: 'OIL CHANGE completo',
          actualCompletionTime: oldDate,
          mileageIn: 30000,
        },
      ]);

      const result = await service.getMaintenanceSchedule(TENANT_ID, VEHICLE_ID);

      expect(result).toHaveLength(1);
      expect(result[0].serviceType).toBe('OIL_CHANGE');
      expect(result[0].isOverdue).toBe(true);
      expect(result[0].lastMileage).toBe(30000);
    });

    it('should throw NotFoundException when vehicle not found', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.getMaintenanceSchedule(TENANT_ID, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getPredictions', () => {
    it('should return paginated predictions with filters', async () => {
      prisma.predictedMaintenance.findMany.mockResolvedValue([mockPrediction]);
      prisma.predictedMaintenance.count.mockResolvedValue(1);

      const result = await service.getPredictions(TENANT_ID, {
        serviceType: 'OIL_CHANGE',
        limit: 10,
        offset: 0,
      });

      expect(result.predictions).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.predictions[0].serviceType).toBe('OIL_CHANGE');
    });

    it('should filter unbooked only', async () => {
      prisma.predictedMaintenance.findMany.mockResolvedValue([mockPrediction]);
      prisma.predictedMaintenance.count.mockResolvedValue(1);

      await service.getPredictions(TENANT_ID, { unbookedOnly: true });

      expect(prisma.predictedMaintenance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            bookedAt: null,
          }),
        }),
      );
    });
  });

  describe('createBookingFromPrediction', () => {
    it('should create a booking and mark prediction as booked', async () => {
      prisma.predictedMaintenance.findFirst.mockResolvedValue(mockPrediction);
      prisma.bookingSlot.create.mockResolvedValue({ id: 'slot-001' });
      prisma.booking.create.mockResolvedValue({ id: 'booking-new-001' });
      prisma.predictedMaintenance.update.mockResolvedValue({
        ...mockPrediction,
        bookedAt: new Date(),
        bookingId: 'booking-new-001',
      });

      const result = await service.createBookingFromPrediction(TENANT_ID, 'pred-001');

      expect(result.predictionId).toBe('pred-001');
      expect(result.bookingId).toBe('booking-new-001');
      expect(prisma.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            vehicleId: VEHICLE_ID,
            customerId: 'cust-001',
          }),
        }),
      );
      expect(prisma.predictedMaintenance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pred-001' },
          data: expect.objectContaining({
            bookingId: 'booking-new-001',
          }),
        }),
      );
    });

    it('should throw NotFoundException when prediction not found', async () => {
      prisma.predictedMaintenance.findFirst.mockResolvedValue(null);

      await expect(service.createBookingFromPrediction(TENANT_ID, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when already booked', async () => {
      const bookedPrediction = { ...mockPrediction, bookedAt: new Date() };
      prisma.predictedMaintenance.findFirst.mockResolvedValue(bookedPrediction);

      await expect(service.createBookingFromPrediction(TENANT_ID, 'pred-001')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('sendMaintenanceReminders', () => {
    it('should mark predictions as notified and return count', async () => {
      prisma.predictedMaintenance.findMany.mockResolvedValue([
        mockPrediction,
        { ...mockPrediction, id: 'pred-002' },
      ]);
      prisma.predictedMaintenance.update.mockResolvedValue({});

      const result = await service.sendMaintenanceReminders(TENANT_ID);

      expect(result.sent).toBe(2);
      expect(prisma.predictedMaintenance.update).toHaveBeenCalledTimes(2);
    });

    it('should return 0 when no due predictions', async () => {
      prisma.predictedMaintenance.findMany.mockResolvedValue([]);

      const result = await service.sendMaintenanceReminders(TENANT_ID);

      expect(result.sent).toBe(0);
    });
  });

  // ============== Additional branch coverage ==============

  describe('predictForVehicle — additional branches', () => {
    it('should skip year filter when vehicle has no year', async () => {
      const noYearVehicle = { ...mockVehicle, year: null };
      prisma.vehicle.findFirst.mockResolvedValue(noYearVehicle);
      prisma.maintenanceScheduleTemplate.findMany.mockResolvedValue([mockTemplate]);
      prisma.workOrder.findMany.mockResolvedValue([]);
      prisma.predictedMaintenance.findMany.mockResolvedValue([]);
      prisma.predictedMaintenance.create.mockResolvedValue(mockPrediction);

      const result = await service.predictForVehicle(TENANT_ID, VEHICLE_ID);

      expect(result).toHaveLength(1);
      // Confidence: 0.5 base + 0.1 mileage = 0.6 (no year bonus)
      expect(prisma.predictedMaintenance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            confidence: new Prisma.Decimal(0.6),
          }),
        }),
      );
    });

    it('should skip vehicle without customerId', async () => {
      const noCustomerVehicle = { ...mockVehicle, customerId: null };
      prisma.vehicle.findFirst.mockResolvedValue(noCustomerVehicle);
      prisma.maintenanceScheduleTemplate.findMany.mockResolvedValue([mockTemplate]);
      prisma.workOrder.findMany.mockResolvedValue([]);
      prisma.predictedMaintenance.findMany.mockResolvedValue([]);

      const result = await service.predictForVehicle(TENANT_ID, VEHICLE_ID);

      expect(result).toHaveLength(0);
      expect(prisma.predictedMaintenance.create).not.toHaveBeenCalled();
    });

    it('should use lastService date when available with intervalMonths', async () => {
      const completionDate = new Date('2026-01-15T10:00:00Z');
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.maintenanceScheduleTemplate.findMany.mockResolvedValue([mockTemplate]);
      prisma.workOrder.findMany.mockResolvedValue([
        {
          diagnosis: 'OIL CHANGE completo',
          actualCompletionTime: completionDate,
          mileageIn: 45000,
        },
      ]);
      prisma.predictedMaintenance.findMany.mockResolvedValue([]);
      prisma.predictedMaintenance.create.mockResolvedValue(mockPrediction);

      await service.predictForVehicle(TENANT_ID, VEHICLE_ID);

      // Confidence: 0.5 + 0.2 (lastService) + 0.1 (mileage) + 0.1 (year) ~ 0.9
      const callData = prisma.predictedMaintenance.create.mock.calls[0][0].data;
      expect(Number(callData.confidence)).toBeCloseTo(0.9, 1);
      expect(callData.predictedMileage).toBe(60000); // 45000 + 15000
    });

    it('should default to 12 months when template has no intervalMonths and no lastService', async () => {
      const noIntervalTemplate = { ...mockTemplate, intervalMonths: null, intervalKm: null };
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.maintenanceScheduleTemplate.findMany.mockResolvedValue([noIntervalTemplate]);
      prisma.workOrder.findMany.mockResolvedValue([]);
      prisma.predictedMaintenance.findMany.mockResolvedValue([]);
      prisma.predictedMaintenance.create.mockResolvedValue(mockPrediction);

      await service.predictForVehicle(TENANT_ID, VEHICLE_ID);

      expect(prisma.predictedMaintenance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            predictedMileage: null,
          }),
        }),
      );
    });

    it('should not calculate predictedMileage when vehicle has no mileage', async () => {
      const noMileageVehicle = { ...mockVehicle, mileage: null };
      prisma.vehicle.findFirst.mockResolvedValue(noMileageVehicle);
      prisma.maintenanceScheduleTemplate.findMany.mockResolvedValue([mockTemplate]);
      prisma.workOrder.findMany.mockResolvedValue([]);
      prisma.predictedMaintenance.findMany.mockResolvedValue([]);
      prisma.predictedMaintenance.create.mockResolvedValue(mockPrediction);

      await service.predictForVehicle(TENANT_ID, VEHICLE_ID);

      expect(prisma.predictedMaintenance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            predictedMileage: null,
          }),
        }),
      );
    });

    it('should include existing predictions not covered by templates', async () => {
      const brakesPrediction = {
        ...mockPrediction,
        id: 'pred-brakes',
        serviceType: 'BRAKE_PADS',
      };
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.maintenanceScheduleTemplate.findMany.mockResolvedValue([mockTemplate]);
      prisma.workOrder.findMany.mockResolvedValue([]);
      prisma.predictedMaintenance.findMany.mockResolvedValue([brakesPrediction]);
      prisma.predictedMaintenance.create.mockResolvedValue(mockPrediction);

      const result = await service.predictForVehicle(TENANT_ID, VEHICLE_ID);

      // OIL_CHANGE from template + BRAKE_PADS from existing
      expect(result).toHaveLength(2);
      const types = result.map(r => r.serviceType);
      expect(types).toContain('OIL_CHANGE');
      expect(types).toContain('BRAKE_PADS');
    });

    it('should use template intervalMonths from now when no lastService', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.maintenanceScheduleTemplate.findMany.mockResolvedValue([mockTemplate]);
      prisma.workOrder.findMany.mockResolvedValue([]); // no completed orders
      prisma.predictedMaintenance.findMany.mockResolvedValue([]);
      prisma.predictedMaintenance.create.mockResolvedValue(mockPrediction);

      await service.predictForVehicle(TENANT_ID, VEHICLE_ID);

      // predictedMileage uses vehicle.mileage as base when no lastService
      expect(prisma.predictedMaintenance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            predictedMileage: 65000, // 50000 + 15000
          }),
        }),
      );
    });
  });

  describe('getMaintenanceSchedule — additional branches', () => {
    it('should not be overdue when nextDueDate is in the future', async () => {
      const recentDate = new Date();
      recentDate.setMonth(recentDate.getMonth() - 3);

      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.maintenanceScheduleTemplate.findMany.mockResolvedValue([mockTemplate]);
      prisma.workOrder.findMany.mockResolvedValue([
        {
          diagnosis: 'OIL CHANGE completo',
          actualCompletionTime: recentDate,
          mileageIn: 48000,
        },
      ]);

      const result = await service.getMaintenanceSchedule(TENANT_ID, VEHICLE_ID);

      expect(result[0].isOverdue).toBe(false);
      expect(result[0].nextDueMileage).toBe(63000); // 48000 + 15000
    });

    it('should be overdue by mileage only', async () => {
      const recentDate = new Date();
      recentDate.setMonth(recentDate.getMonth() - 3);

      prisma.vehicle.findFirst.mockResolvedValue({ ...mockVehicle, mileage: 70000 });
      prisma.maintenanceScheduleTemplate.findMany.mockResolvedValue([mockTemplate]);
      prisma.workOrder.findMany.mockResolvedValue([
        {
          diagnosis: 'OIL CHANGE completo',
          actualCompletionTime: recentDate,
          mileageIn: 50000,
        },
      ]);

      const result = await service.getMaintenanceSchedule(TENANT_ID, VEHICLE_ID);

      // nextDueMileage = 50000 + 15000 = 65000 < 70000 (vehicle mileage)
      expect(result[0].isOverdue).toBe(true);
    });

    it('should handle no lastService (null nextDueDate and nextDueMileage)', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.maintenanceScheduleTemplate.findMany.mockResolvedValue([mockTemplate]);
      prisma.workOrder.findMany.mockResolvedValue([]);

      const result = await service.getMaintenanceSchedule(TENANT_ID, VEHICLE_ID);

      expect(result[0].nextDueDate).toBeNull();
      expect(result[0].nextDueMileage).toBeNull();
      expect(result[0].lastDone).toBeNull();
      expect(result[0].lastMileage).toBeNull();
      expect(result[0].isOverdue).toBe(false);
    });

    it('should handle template without intervalKm', async () => {
      const noKmTemplate = { ...mockTemplate, intervalKm: null };
      const recentDate = new Date();
      recentDate.setMonth(recentDate.getMonth() - 3);

      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.maintenanceScheduleTemplate.findMany.mockResolvedValue([noKmTemplate]);
      prisma.workOrder.findMany.mockResolvedValue([
        {
          diagnosis: 'OIL CHANGE completo',
          actualCompletionTime: recentDate,
          mileageIn: 48000,
        },
      ]);

      const result = await service.getMaintenanceSchedule(TENANT_ID, VEHICLE_ID);

      expect(result[0].nextDueMileage).toBeNull();
    });

    it('should handle vehicle without year (skip year filter in templates)', async () => {
      const noYearVehicle = { ...mockVehicle, year: null };
      prisma.vehicle.findFirst.mockResolvedValue(noYearVehicle);
      prisma.maintenanceScheduleTemplate.findMany.mockResolvedValue([]);
      prisma.workOrder.findMany.mockResolvedValue([]);

      const result = await service.getMaintenanceSchedule(TENANT_ID, VEHICLE_ID);

      expect(result).toEqual([]);
    });
  });

  describe('getPredictions — additional branches', () => {
    it('should use default limit and offset when not provided', async () => {
      prisma.predictedMaintenance.findMany.mockResolvedValue([]);
      prisma.predictedMaintenance.count.mockResolvedValue(0);

      await service.getPredictions(TENANT_ID);

      expect(prisma.predictedMaintenance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 0,
        }),
      );
    });

    it('should filter by vehicleId', async () => {
      prisma.predictedMaintenance.findMany.mockResolvedValue([]);
      prisma.predictedMaintenance.count.mockResolvedValue(0);

      await service.getPredictions(TENANT_ID, { vehicleId: 'v-001' });

      expect(prisma.predictedMaintenance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ vehicleId: 'v-001' }),
        }),
      );
    });

    it('should filter by customerId', async () => {
      prisma.predictedMaintenance.findMany.mockResolvedValue([]);
      prisma.predictedMaintenance.count.mockResolvedValue(0);

      await service.getPredictions(TENANT_ID, { customerId: 'c-001' });

      expect(prisma.predictedMaintenance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ customerId: 'c-001' }),
        }),
      );
    });

    it('should filter by date range (fromDate and toDate)', async () => {
      prisma.predictedMaintenance.findMany.mockResolvedValue([]);
      prisma.predictedMaintenance.count.mockResolvedValue(0);

      await service.getPredictions(TENANT_ID, {
        fromDate: '2026-04-01',
        toDate: '2026-06-30',
      });

      expect(prisma.predictedMaintenance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            predictedDate: {
              gte: new Date('2026-04-01'),
              lte: new Date('2026-06-30'),
            },
          }),
        }),
      );
    });

    it('should filter by fromDate only', async () => {
      prisma.predictedMaintenance.findMany.mockResolvedValue([]);
      prisma.predictedMaintenance.count.mockResolvedValue(0);

      await service.getPredictions(TENANT_ID, { fromDate: '2026-04-01' });

      expect(prisma.predictedMaintenance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            predictedDate: { gte: new Date('2026-04-01') },
          }),
        }),
      );
    });

    it('should filter by toDate only', async () => {
      prisma.predictedMaintenance.findMany.mockResolvedValue([]);
      prisma.predictedMaintenance.count.mockResolvedValue(0);

      await service.getPredictions(TENANT_ID, { toDate: '2026-06-30' });

      expect(prisma.predictedMaintenance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            predictedDate: { lte: new Date('2026-06-30') },
          }),
        }),
      );
    });
  });

  describe('mapPrediction', () => {
    it('should map booked prediction with isBooked=true', async () => {
      const bookedPrediction = {
        ...mockPrediction,
        bookedAt: new Date(),
        bookingId: 'booking-001',
        notificationSentAt: new Date(),
      };
      prisma.predictedMaintenance.findMany.mockResolvedValue([bookedPrediction]);
      prisma.predictedMaintenance.count.mockResolvedValue(1);

      const result = await service.getPredictions(TENANT_ID);

      expect(result.predictions[0].isBooked).toBe(true);
      expect(result.predictions[0].bookingId).toBe('booking-001');
      expect(result.predictions[0].notificationSent).toBe(true);
    });
  });
});
