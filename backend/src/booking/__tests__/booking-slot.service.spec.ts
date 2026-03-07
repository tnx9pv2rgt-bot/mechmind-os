import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SlotStatus } from '@prisma/client';
import { BookingSlotService } from '../services/booking-slot.service';
import { PrismaService } from '@common/services/prisma.service';
import { LoggerService } from '@common/services/logger.service';

describe('BookingSlotService', () => {
  let service: BookingSlotService;
  let prisma: jest.Mocked<PrismaService>;
  let logger: jest.Mocked<LoggerService>;

  const tenantId = 'tenant-123';
  const slotId = 'slot-123';

  const mockSlot = {
    id: slotId,
    tenantId,
    startTime: new Date('2024-01-15T09:00:00Z'),
    endTime: new Date('2024-01-15T10:00:00Z'),
    status: SlotStatus.AVAILABLE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingSlotService,
        {
          provide: PrismaService,
          useValue: {
            withTenant: jest.fn(),
            bookingSlot: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              createMany: jest.fn(),
              count: jest.fn(),
              groupBy: jest.fn(),
            },
          },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BookingSlotService>(BookingSlotService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    logger = module.get(LoggerService) as jest.Mocked<LoggerService>;

    jest.clearAllMocks();
  });

  describe('findAvailableSlots', () => {
    it('should return available slots for a date', async () => {
      const date = '2024-01-15';
      const mockSlots = [
        mockSlot,
        { ...mockSlot, id: 'slot-124', startTime: new Date('2024-01-15T10:00:00Z') },
      ];

      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.bookingSlot.findMany.mockResolvedValue(mockSlots);
        return callback(prisma);
      });

      const result = await service.findAvailableSlots(tenantId, date);

      expect(result).toHaveLength(2);
      expect(prisma.bookingSlot.findMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          status: SlotStatus.AVAILABLE,
          startTime: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
        },
        orderBy: { startTime: 'asc' },
      });
    });

    it('should filter slots by minimum duration', async () => {
      const date = '2024-01-15';
      const duration = 90; // 90 minutes
      const mockSlots = [
        mockSlot, // 60 minutes - should be filtered out
        { ...mockSlot, id: 'slot-124', endTime: new Date('2024-01-15T11:30:00Z') }, // 90 minutes
        { ...mockSlot, id: 'slot-125', endTime: new Date('2024-01-15T12:00:00Z') }, // 180 minutes
      ];

      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.bookingSlot.findMany.mockResolvedValue(mockSlots);
        return callback(prisma);
      });

      const result = await service.findAvailableSlots(tenantId, date, duration);

      expect(result).toHaveLength(2);
      expect(result.every((slot) => {
        const slotDuration = (slot.endTime.getTime() - slot.startTime.getTime()) / 60000;
        return slotDuration >= duration;
      })).toBe(true);
    });

    it('should return empty array when no slots available', async () => {
      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.bookingSlot.findMany.mockResolvedValue([]);
        return callback(prisma);
      });

      const result = await service.findAvailableSlots(tenantId, '2024-01-15');

      expect(result).toEqual([]);
    });

    it('should set correct start and end of day boundaries', async () => {
      const date = '2024-06-15';

      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.bookingSlot.findMany.mockResolvedValue([]);
        return callback(prisma);
      });

      await service.findAvailableSlots(tenantId, date);

      const findManyCall = prisma.bookingSlot.findMany.mock.calls[0][0];
      const startTimeFilter = findManyCall.where.startTime;

      expect(startTimeFilter.gte.getHours()).toBe(0);
      expect(startTimeFilter.gte.getMinutes()).toBe(0);
      expect(startTimeFilter.lte.getHours()).toBe(23);
      expect(startTimeFilter.lte.getMinutes()).toBe(59);
    });
  });

  describe('createSlot', () => {
    const createDto = {
      startTime: '2024-01-15T09:00:00Z',
      endTime: '2024-01-15T10:00:00Z',
    };

    it('should create a new slot successfully', async () => {
      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.bookingSlot.findFirst.mockResolvedValue(null); // No overlap
        prisma.bookingSlot.create.mockResolvedValue(mockSlot);
        return callback(prisma);
      });

      const result = await service.createSlot(tenantId, createDto);

      expect(result).toEqual(mockSlot);
      expect(prisma.bookingSlot.create).toHaveBeenCalledWith({
        data: {
          startTime: new Date(createDto.startTime),
          endTime: new Date(createDto.endTime),
          status: SlotStatus.AVAILABLE,
          tenant: { connect: { id: tenantId } },
        },
      });
      expect(logger.log).toHaveBeenCalledWith(
        `Created slot ${mockSlot.id} for tenant ${tenantId}`,
      );
    });

    it('should throw BadRequestException when end time is before start time', async () => {
      const invalidDto = {
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T09:00:00Z',
      };

      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        return callback(prisma);
      });

      await expect(service.createSlot(tenantId, invalidDto)).rejects.toThrow(
        new BadRequestException('End time must be after start time'),
      );
    });

    it('should throw BadRequestException when end time equals start time', async () => {
      const invalidDto = {
        startTime: '2024-01-15T09:00:00Z',
        endTime: '2024-01-15T09:00:00Z',
      };

      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        return callback(prisma);
      });

      await expect(service.createSlot(tenantId, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when slot overlaps with existing slot', async () => {
      const overlappingSlot = {
        id: 'existing-slot',
        startTime: new Date('2024-01-15T09:30:00Z'),
        endTime: new Date('2024-01-15T10:30:00Z'),
      };

      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.bookingSlot.findFirst.mockResolvedValue(overlappingSlot as any);
        return callback(prisma);
      });

      await expect(service.createSlot(tenantId, createDto)).rejects.toThrow(
        new BadRequestException(
          `Slot overlaps with existing slot (${overlappingSlot.startTime.toISOString()} - ${overlappingSlot.endTime.toISOString()})`,
        ),
      );
    });

    it('should detect overlapping slot - new slot starts during existing slot', async () => {
      const existingSlot = {
        id: 'existing',
        startTime: new Date('2024-01-15T08:00:00Z'),
        endTime: new Date('2024-01-15T09:30:00Z'),
      };

      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.bookingSlot.findFirst.mockResolvedValue(existingSlot as any);
        return callback(prisma);
      });

      await expect(service.createSlot(tenantId, createDto)).rejects.toThrow(BadRequestException);
    });

    it('should detect overlapping slot - new slot ends during existing slot', async () => {
      const existingSlot = {
        id: 'existing',
        startTime: new Date('2024-01-15T09:30:00Z'),
        endTime: new Date('2024-01-15T11:00:00Z'),
      };

      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.bookingSlot.findFirst.mockResolvedValue(existingSlot as any);
        return callback(prisma);
      });

      await expect(service.createSlot(tenantId, createDto)).rejects.toThrow(BadRequestException);
    });

    it('should detect overlapping slot - new slot completely contains existing slot', async () => {
      const existingSlot = {
        id: 'existing',
        startTime: new Date('2024-01-15T09:15:00Z'),
        endTime: new Date('2024-01-15T09:45:00Z'),
      };

      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.bookingSlot.findFirst.mockResolvedValue(existingSlot as any);
        return callback(prisma);
      });

      await expect(service.createSlot(tenantId, createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('createSlotsForDateRange', () => {
    it('should create slots for working days within date range', async () => {
      const startDate = new Date('2024-01-15'); // Monday
      const endDate = new Date('2024-01-17'); // Wednesday

      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.bookingSlot.createMany.mockResolvedValue({ count: 27 });
        return callback(prisma);
      });

      const result = await service.createSlotsForDateRange(
        tenantId,
        startDate,
        endDate,
        60,
        { start: 9, end: 18 },
      );

      expect(result).toBe(27); // 3 days * 9 slots per day
      expect(prisma.bookingSlot.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            startTime: expect.any(Date),
            endTime: expect.any(Date),
            status: SlotStatus.AVAILABLE,
            tenantId,
          }),
        ]),
        skipDuplicates: true,
      });
      expect(logger.log).toHaveBeenCalled();
    });

    it('should skip weekends', async () => {
      const startDate = new Date('2024-01-13'); // Saturday
      const endDate = new Date('2024-01-14'); // Sunday

      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.bookingSlot.createMany.mockResolvedValue({ count: 0 });
        return callback(prisma);
      });

      const result = await service.createSlotsForDateRange(tenantId, startDate, endDate);

      expect(result).toBe(0);
    });

    it('should create slots crossing week boundary', async () => {
      const startDate = new Date('2024-01-12'); // Friday
      const endDate = new Date('2024-01-16'); // Tuesday

      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.bookingSlot.createMany.mockResolvedValue({ count: 27 });
        return callback(prisma);
      });

      const result = await service.createSlotsForDateRange(tenantId, startDate, endDate);

      expect(result).toBe(27); // Friday, Monday, Tuesday (9 slots each)
    });

    it('should use default duration and working hours', async () => {
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-15');

      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.bookingSlot.createMany.mockResolvedValue({ count: 9 });
        return callback(prisma);
      });

      await service.createSlotsForDateRange(tenantId, startDate, endDate);

      // Default: 60 minutes, 9-18 working hours = 9 slots
      expect(prisma.bookingSlot.createMany).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return slot by ID with booking info', async () => {
      const slotWithBooking = {
        ...mockSlot,
        booking: {
          id: 'booking-123',
          customer: { id: 'customer-123', firstName: 'John' },
          vehicle: { id: 'vehicle-123', licensePlate: 'ABC123' },
        },
      };

      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.bookingSlot.findFirst.mockResolvedValue(slotWithBooking as any);
        return callback(prisma);
      });

      const result = await service.findById(tenantId, slotId);

      expect(result).toEqual(slotWithBooking);
      expect(prisma.bookingSlot.findFirst).toHaveBeenCalledWith({
        where: { id: slotId, tenantId },
        include: {
          booking: {
            include: {
              customer: true,
              vehicle: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException when slot not found', async () => {
      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.bookingSlot.findFirst.mockResolvedValue(null);
        return callback(prisma);
      });

      await expect(service.findById(tenantId, 'non-existent')).rejects.toThrow(
        new NotFoundException('Slot non-existent not found'),
      );
    });
  });

  describe('updateSlotStatus', () => {
    it('should update slot status successfully', async () => {
      const updatedSlot = { ...mockSlot, status: SlotStatus.BOOKED };

      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.bookingSlot.findFirst.mockResolvedValue(mockSlot);
        prisma.bookingSlot.update.mockResolvedValue(updatedSlot);
        return callback(prisma);
      });

      const result = await service.updateSlotStatus(tenantId, slotId, SlotStatus.BOOKED);

      expect(result).toEqual(updatedSlot);
      expect(prisma.bookingSlot.update).toHaveBeenCalledWith({
        where: { id: slotId },
        data: { status: SlotStatus.BOOKED },
      });
      expect(logger.log).toHaveBeenCalledWith(
        `Updated slot ${slotId} status to ${SlotStatus.BOOKED}`,
      );
    });

    it('should throw NotFoundException when slot not found', async () => {
      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.bookingSlot.findFirst.mockResolvedValue(null);
        return callback(prisma);
      });

      await expect(service.updateSlotStatus(tenantId, 'non-existent', SlotStatus.BLOCKED)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('blockSlot', () => {
    it('should block an available slot', async () => {
      const blockedSlot = { ...mockSlot, status: SlotStatus.BLOCKED };

      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.bookingSlot.findFirst.mockResolvedValue(mockSlot);
        prisma.bookingSlot.update.mockResolvedValue(blockedSlot);
        return callback(prisma);
      });

      const result = await service.blockSlot(tenantId, slotId, 'Lunch break');

      expect(result).toEqual(blockedSlot);
      expect(prisma.bookingSlot.update).toHaveBeenCalledWith({
        where: { id: slotId },
        data: { status: SlotStatus.BLOCKED },
      });
      expect(logger.log).toHaveBeenCalledWith(
        `Blocked slot ${slotId}. Reason: Lunch break`,
      );
    });

    it('should block slot without reason', async () => {
      const blockedSlot = { ...mockSlot, status: SlotStatus.BLOCKED };

      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.bookingSlot.findFirst.mockResolvedValue(mockSlot);
        prisma.bookingSlot.update.mockResolvedValue(blockedSlot);
        return callback(prisma);
      });

      const result = await service.blockSlot(tenantId, slotId);

      expect(logger.log).toHaveBeenCalledWith(
        `Blocked slot ${slotId}. Reason: Not specified`,
      );
    });

    it('should throw NotFoundException when slot not found', async () => {
      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.bookingSlot.findFirst.mockResolvedValue(null);
        return callback(prisma);
      });

      await expect(service.blockSlot(tenantId, 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when slot is already booked', async () => {
      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.bookingSlot.findFirst.mockResolvedValue({
          ...mockSlot,
          status: SlotStatus.BOOKED,
        });
        return callback(prisma);
      });

      await expect(service.blockSlot(tenantId, slotId)).rejects.toThrow(
        new BadRequestException('Cannot block a booked slot'),
      );
    });
  });

  describe('deleteSlot', () => {
    it('should delete an available slot', async () => {
      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.bookingSlot.findFirst.mockResolvedValue(mockSlot);
        prisma.bookingSlot.delete.mockResolvedValue(mockSlot);
        return callback(prisma);
      });

      await service.deleteSlot(tenantId, slotId);

      expect(prisma.bookingSlot.delete).toHaveBeenCalledWith({
        where: { id: slotId },
      });
      expect(logger.log).toHaveBeenCalledWith(`Deleted slot ${slotId}`);
    });

    it('should throw NotFoundException when slot not found', async () => {
      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.bookingSlot.findFirst.mockResolvedValue(null);
        return callback(prisma);
      });

      await expect(service.deleteSlot(tenantId, 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when slot is booked', async () => {
      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.bookingSlot.findFirst.mockResolvedValue({
          ...mockSlot,
          status: SlotStatus.BOOKED,
        });
        return callback(prisma);
      });

      await expect(service.deleteSlot(tenantId, slotId)).rejects.toThrow(
        new BadRequestException('Cannot delete a booked slot'),
      );
    });
  });

  describe('getAvailabilityForRange', () => {
    it('should return availability grouped by date', async () => {
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-16');
      const mockSlots = [
        { ...mockSlot, startTime: new Date('2024-01-15T09:00:00Z') },
        { ...mockSlot, id: 'slot-2', startTime: new Date('2024-01-15T10:00:00Z'), status: SlotStatus.BOOKED },
        { ...mockSlot, id: 'slot-3', startTime: new Date('2024-01-15T11:00:00Z'), status: SlotStatus.BLOCKED },
        { ...mockSlot, id: 'slot-4', startTime: new Date('2024-01-16T09:00:00Z') },
      ];

      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.bookingSlot.findMany.mockResolvedValue(mockSlots as any);
        return callback(prisma);
      });

      const result = await service.getAvailabilityForRange(tenantId, startDate, endDate);

      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            date: '2024-01-15',
            totalSlots: 3,
            availableSlots: 1,
            bookedSlots: 1,
            blockedSlots: 1,
          }),
          expect.objectContaining({
            date: '2024-01-16',
            totalSlots: 1,
            availableSlots: 1,
            bookedSlots: 0,
            blockedSlots: 0,
          }),
        ]),
      );
    });

    it('should handle empty date range', async () => {
      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.bookingSlot.findMany.mockResolvedValue([]);
        return callback(prisma);
      });

      const result = await service.getAvailabilityForRange(
        tenantId,
        new Date('2024-01-15'),
        new Date('2024-01-16'),
      );

      expect(result).toEqual([]);
    });

    it('should correctly query slots within date range', async () => {
      const startDate = new Date('2024-01-15T00:00:00Z');
      const endDate = new Date('2024-01-20T23:59:59Z');

      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.bookingSlot.findMany.mockResolvedValue([]);
        return callback(prisma);
      });

      await service.getAvailabilityForRange(tenantId, startDate, endDate);

      expect(prisma.bookingSlot.findMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          startTime: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { startTime: 'asc' },
      });
    });
  });
});
