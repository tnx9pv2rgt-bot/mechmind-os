import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SlotStatus } from '@prisma/client';
import { BookingSlotService } from './booking-slot.service';
import { PrismaService } from '@common/services/prisma.service';
import { LoggerService } from '@common/services/logger.service';

const TENANT_ID = 'tenant-001';
const SLOT_ID = 'slot-001';

function makeSlot(overrides: Record<string, unknown> = {}) {
  return {
    id: SLOT_ID,
    tenantId: TENANT_ID,
    startTime: new Date('2024-01-15T09:00:00Z'),
    endTime: new Date('2024-01-15T10:00:00Z'),
    status: SlotStatus.AVAILABLE,
    createdAt: new Date(),
    updatedAt: new Date(),
    bookingId: null,
    ...overrides,
  };
}

describe('BookingSlotService', () => {
  let service: BookingSlotService;
  let prisma: {
    withTenant: jest.Mock;
    bookingSlot: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      createMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let logger: { log: jest.Mock; warn: jest.Mock; error: jest.Mock };

  beforeEach(async () => {
    prisma = {
      withTenant: jest.fn((_, cb) => cb(prisma)),
      bookingSlot: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(makeSlot()),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        update: jest.fn().mockResolvedValue(makeSlot()),
        delete: jest.fn().mockResolvedValue(makeSlot()),
      },
    };

    logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingSlotService,
        { provide: PrismaService, useValue: prisma },
        { provide: LoggerService, useValue: logger },
      ],
    }).compile();

    service = module.get<BookingSlotService>(BookingSlotService);
  });

  // =========================================================================
  // findAvailableSlots
  // =========================================================================
  describe('findAvailableSlots', () => {
    it('should call withTenant with correct tenantId', async () => {
      await service.findAvailableSlots(TENANT_ID, '2024-01-15');
      expect(prisma.withTenant).toHaveBeenCalledWith(TENANT_ID, expect.any(Function));
    });

    it('should return available slots for a given date', async () => {
      const slots = [
        makeSlot(),
        makeSlot({
          id: 'slot-002',
          startTime: new Date('2024-01-15T10:00:00Z'),
          endTime: new Date('2024-01-15T11:00:00Z'),
        }),
      ];
      prisma.bookingSlot.findMany.mockResolvedValue(slots);

      const result = await service.findAvailableSlots(TENANT_ID, '2024-01-15');

      expect(result).toEqual(slots);
      expect(prisma.bookingSlot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            status: SlotStatus.AVAILABLE,
          }),
          orderBy: { startTime: 'asc' },
        }),
      );
    });

    it('should filter slots by duration when specified', async () => {
      const shortSlot = makeSlot({
        startTime: new Date('2024-01-15T09:00:00Z'),
        endTime: new Date('2024-01-15T09:30:00Z'), // 30 min
      });
      const longSlot = makeSlot({
        id: 'slot-002',
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T11:00:00Z'), // 60 min
      });
      prisma.bookingSlot.findMany.mockResolvedValue([shortSlot, longSlot]);

      const result = await service.findAvailableSlots(TENANT_ID, '2024-01-15', 60);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('slot-002');
    });

    it('should return all slots when duration is not specified', async () => {
      const slots = [makeSlot(), makeSlot({ id: 'slot-002' })];
      prisma.bookingSlot.findMany.mockResolvedValue(slots);

      const result = await service.findAvailableSlots(TENANT_ID, '2024-01-15');

      expect(result).toHaveLength(2);
    });

    it('should return empty array when no slots are available', async () => {
      prisma.bookingSlot.findMany.mockResolvedValue([]);

      const result = await service.findAvailableSlots(TENANT_ID, '2024-01-15');

      expect(result).toEqual([]);
    });

    it('should filter out all slots when none meet duration requirement', async () => {
      const shortSlot = makeSlot({
        startTime: new Date('2024-01-15T09:00:00Z'),
        endTime: new Date('2024-01-15T09:30:00Z'), // 30 min
      });
      prisma.bookingSlot.findMany.mockResolvedValue([shortSlot]);

      const result = await service.findAvailableSlots(TENANT_ID, '2024-01-15', 120);

      expect(result).toHaveLength(0);
    });
  });

  // =========================================================================
  // createSlot
  // =========================================================================
  describe('createSlot', () => {
    const validDto = {
      startTime: '2024-01-15T09:00:00Z',
      endTime: '2024-01-15T10:00:00Z',
    };

    it('should create a slot when no overlaps exist', async () => {
      prisma.bookingSlot.findFirst.mockResolvedValue(null);
      const created = makeSlot();
      prisma.bookingSlot.create.mockResolvedValue(created);

      const result = await service.createSlot(TENANT_ID, validDto);

      expect(result).toEqual(created);
      expect(prisma.bookingSlot.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: SlotStatus.AVAILABLE,
            tenant: { connect: { id: TENANT_ID } },
          }),
        }),
      );
    });

    it('should log slot creation', async () => {
      prisma.bookingSlot.findFirst.mockResolvedValue(null);

      await service.createSlot(TENANT_ID, validDto);

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Created slot'));
    });

    it('should throw BadRequestException when endTime is before startTime', async () => {
      const invalidDto = {
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T09:00:00Z',
      };

      await expect(service.createSlot(TENANT_ID, invalidDto)).rejects.toThrow(BadRequestException);
      await expect(service.createSlot(TENANT_ID, invalidDto)).rejects.toThrow(
        'End time must be after start time',
      );
    });

    it('should throw BadRequestException when startTime equals endTime', async () => {
      const sameTimeDto = {
        startTime: '2024-01-15T09:00:00Z',
        endTime: '2024-01-15T09:00:00Z',
      };

      await expect(service.createSlot(TENANT_ID, sameTimeDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when slot overlaps with existing', async () => {
      const overlapping = makeSlot({ id: 'existing-slot' });
      prisma.bookingSlot.findFirst.mockResolvedValue(overlapping);

      await expect(service.createSlot(TENANT_ID, validDto)).rejects.toThrow(BadRequestException);
      await expect(service.createSlot(TENANT_ID, validDto)).rejects.toThrow(
        /overlaps with existing slot/i,
      );
    });

    it('should call withTenant with correct tenantId', async () => {
      prisma.bookingSlot.findFirst.mockResolvedValue(null);

      await service.createSlot(TENANT_ID, validDto);

      expect(prisma.withTenant).toHaveBeenCalledWith(TENANT_ID, expect.any(Function));
    });
  });

  // =========================================================================
  // createSlotsForDateRange
  // =========================================================================
  describe('createSlotsForDateRange', () => {
    it('should create slots for weekdays only', async () => {
      // Monday 2024-01-15 to Friday 2024-01-19
      const startDate = new Date('2024-01-15T00:00:00Z');
      const endDate = new Date('2024-01-19T23:59:59Z');
      prisma.bookingSlot.createMany.mockResolvedValue({ count: 45 });

      const result = await service.createSlotsForDateRange(TENANT_ID, startDate, endDate);

      expect(result).toBe(45);
      expect(prisma.bookingSlot.createMany).toHaveBeenCalledWith(
        expect.objectContaining({ skipDuplicates: true }),
      );
    });

    it('should skip weekends', async () => {
      // Saturday 2024-01-13 to Sunday 2024-01-14
      const saturday = new Date('2024-01-13T00:00:00Z');
      const sunday = new Date('2024-01-14T23:59:59Z');
      prisma.bookingSlot.createMany.mockResolvedValue({ count: 0 });

      await service.createSlotsForDateRange(TENANT_ID, saturday, sunday);

      // createMany should be called with empty data array (weekends skipped)
      const callArgs = prisma.bookingSlot.createMany.mock.calls[0][0];
      expect(callArgs.data).toHaveLength(0);
    });

    it('should use default working hours 9-18 and 60 min slots', async () => {
      // Single weekday: Monday
      const singleDay = new Date('2024-01-15T00:00:00Z');
      prisma.bookingSlot.createMany.mockResolvedValue({ count: 9 });

      await service.createSlotsForDateRange(TENANT_ID, singleDay, singleDay);

      const callArgs = prisma.bookingSlot.createMany.mock.calls[0][0];
      // 9 slots: 9, 10, 11, 12, 13, 14, 15, 16, 17
      expect(callArgs.data).toHaveLength(9);
    });

    it('should use custom working hours when provided', async () => {
      const singleDay = new Date('2024-01-15T00:00:00Z');
      prisma.bookingSlot.createMany.mockResolvedValue({ count: 4 });

      await service.createSlotsForDateRange(TENANT_ID, singleDay, singleDay, 60, {
        start: 8,
        end: 12,
      });

      const callArgs = prisma.bookingSlot.createMany.mock.calls[0][0];
      // 4 slots: 8, 9, 10, 11
      expect(callArgs.data).toHaveLength(4);
    });

    it('should set all created slots to AVAILABLE status', async () => {
      const singleDay = new Date('2024-01-15T00:00:00Z');
      prisma.bookingSlot.createMany.mockResolvedValue({ count: 9 });

      await service.createSlotsForDateRange(TENANT_ID, singleDay, singleDay);

      const callArgs = prisma.bookingSlot.createMany.mock.calls[0][0];
      for (const slot of callArgs.data) {
        expect(slot.status).toBe(SlotStatus.AVAILABLE);
        expect(slot.tenantId).toBe(TENANT_ID);
      }
    });

    it('should log the creation result', async () => {
      const startDate = new Date('2024-01-15T00:00:00Z');
      const endDate = new Date('2024-01-15T23:59:59Z');
      prisma.bookingSlot.createMany.mockResolvedValue({ count: 9 });

      await service.createSlotsForDateRange(TENANT_ID, startDate, endDate);

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Created 9 slots'));
    });

    it('should return 0 when date range has no weekdays', async () => {
      const saturday = new Date('2024-01-13T00:00:00Z');
      const sunday = new Date('2024-01-14T00:00:00Z');
      prisma.bookingSlot.createMany.mockResolvedValue({ count: 0 });

      const result = await service.createSlotsForDateRange(TENANT_ID, saturday, sunday);

      expect(result).toBe(0);
    });
  });

  // =========================================================================
  // findById
  // =========================================================================
  describe('findById', () => {
    it('should return slot with booking details when found', async () => {
      const slotWithBooking = {
        ...makeSlot(),
        booking: { id: 'booking-001', customer: { id: 'cust-001' }, vehicle: { id: 'veh-001' } },
      };
      prisma.bookingSlot.findFirst.mockResolvedValue(slotWithBooking);

      const result = await service.findById(TENANT_ID, SLOT_ID);

      expect(result).toEqual(slotWithBooking);
      expect(prisma.bookingSlot.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: SLOT_ID, tenantId: TENANT_ID },
          include: {
            booking: {
              include: { customer: true, vehicle: true },
            },
          },
        }),
      );
    });

    it('should throw NotFoundException when slot does not exist', async () => {
      prisma.bookingSlot.findFirst.mockResolvedValue(null);

      await expect(service.findById(TENANT_ID, 'nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.findById(TENANT_ID, 'nonexistent')).rejects.toThrow(
        'Slot nonexistent not found',
      );
    });

    it('should call withTenant with correct tenantId', async () => {
      prisma.bookingSlot.findFirst.mockResolvedValue(makeSlot());

      await service.findById(TENANT_ID, SLOT_ID);

      expect(prisma.withTenant).toHaveBeenCalledWith(TENANT_ID, expect.any(Function));
    });
  });

  // =========================================================================
  // updateSlotStatus
  // =========================================================================
  describe('updateSlotStatus', () => {
    it('should update slot status when slot exists', async () => {
      prisma.bookingSlot.findFirst.mockResolvedValue(makeSlot());
      const updatedSlot = makeSlot({ status: SlotStatus.BOOKED });
      prisma.bookingSlot.update.mockResolvedValue(updatedSlot);

      const result = await service.updateSlotStatus(TENANT_ID, SLOT_ID, SlotStatus.BOOKED);

      expect(result.status).toBe(SlotStatus.BOOKED);
      expect(prisma.bookingSlot.update).toHaveBeenCalledWith({
        where: { id: SLOT_ID },
        data: { status: SlotStatus.BOOKED },
      });
    });

    it('should throw NotFoundException when slot does not exist', async () => {
      prisma.bookingSlot.findFirst.mockResolvedValue(null);

      await expect(
        service.updateSlotStatus(TENANT_ID, 'nonexistent', SlotStatus.BOOKED),
      ).rejects.toThrow(NotFoundException);
    });

    it('should log the status update', async () => {
      prisma.bookingSlot.findFirst.mockResolvedValue(makeSlot());
      prisma.bookingSlot.update.mockResolvedValue(makeSlot({ status: SlotStatus.BLOCKED }));

      await service.updateSlotStatus(TENANT_ID, SLOT_ID, SlotStatus.BLOCKED);

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining(`Updated slot ${SLOT_ID} status to BLOCKED`),
      );
    });

    it('should call withTenant with correct tenantId', async () => {
      prisma.bookingSlot.findFirst.mockResolvedValue(makeSlot());

      await service.updateSlotStatus(TENANT_ID, SLOT_ID, SlotStatus.BOOKED);

      expect(prisma.withTenant).toHaveBeenCalledWith(TENANT_ID, expect.any(Function));
    });
  });

  // =========================================================================
  // blockSlot
  // =========================================================================
  describe('blockSlot', () => {
    it('should block an available slot', async () => {
      prisma.bookingSlot.findFirst.mockResolvedValue(makeSlot());
      const blockedSlot = makeSlot({ status: SlotStatus.BLOCKED });
      prisma.bookingSlot.update.mockResolvedValue(blockedSlot);

      const result = await service.blockSlot(TENANT_ID, SLOT_ID, 'Lunch break');

      expect(result.status).toBe(SlotStatus.BLOCKED);
      expect(prisma.bookingSlot.update).toHaveBeenCalledWith({
        where: { id: SLOT_ID },
        data: { status: SlotStatus.BLOCKED },
      });
    });

    it('should throw NotFoundException when slot does not exist', async () => {
      prisma.bookingSlot.findFirst.mockResolvedValue(null);

      await expect(service.blockSlot(TENANT_ID, 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when slot is already booked', async () => {
      prisma.bookingSlot.findFirst.mockResolvedValue(makeSlot({ status: SlotStatus.BOOKED }));

      await expect(service.blockSlot(TENANT_ID, SLOT_ID)).rejects.toThrow(BadRequestException);
      await expect(service.blockSlot(TENANT_ID, SLOT_ID)).rejects.toThrow(
        'Cannot block a booked slot',
      );
    });

    it('should log with reason when provided', async () => {
      prisma.bookingSlot.findFirst.mockResolvedValue(makeSlot());
      prisma.bookingSlot.update.mockResolvedValue(makeSlot({ status: SlotStatus.BLOCKED }));

      await service.blockSlot(TENANT_ID, SLOT_ID, 'Maintenance');

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Maintenance'));
    });

    it('should log "Not specified" when no reason is provided', async () => {
      prisma.bookingSlot.findFirst.mockResolvedValue(makeSlot());
      prisma.bookingSlot.update.mockResolvedValue(makeSlot({ status: SlotStatus.BLOCKED }));

      await service.blockSlot(TENANT_ID, SLOT_ID);

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Not specified'));
    });

    it('should allow blocking a RESERVED slot', async () => {
      prisma.bookingSlot.findFirst.mockResolvedValue(makeSlot({ status: SlotStatus.RESERVED }));
      prisma.bookingSlot.update.mockResolvedValue(makeSlot({ status: SlotStatus.BLOCKED }));

      const result = await service.blockSlot(TENANT_ID, SLOT_ID);

      expect(result.status).toBe(SlotStatus.BLOCKED);
    });
  });

  // =========================================================================
  // deleteSlot
  // =========================================================================
  describe('deleteSlot', () => {
    it('should delete an available slot', async () => {
      prisma.bookingSlot.findFirst.mockResolvedValue(makeSlot());

      await service.deleteSlot(TENANT_ID, SLOT_ID);

      expect(prisma.bookingSlot.delete).toHaveBeenCalledWith({ where: { id: SLOT_ID } });
    });

    it('should throw NotFoundException when slot does not exist', async () => {
      prisma.bookingSlot.findFirst.mockResolvedValue(null);

      await expect(service.deleteSlot(TENANT_ID, 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when slot is booked', async () => {
      prisma.bookingSlot.findFirst.mockResolvedValue(makeSlot({ status: SlotStatus.BOOKED }));

      await expect(service.deleteSlot(TENANT_ID, SLOT_ID)).rejects.toThrow(BadRequestException);
      await expect(service.deleteSlot(TENANT_ID, SLOT_ID)).rejects.toThrow(
        'Cannot delete a booked slot',
      );
    });

    it('should allow deleting a blocked slot', async () => {
      prisma.bookingSlot.findFirst.mockResolvedValue(makeSlot({ status: SlotStatus.BLOCKED }));

      await service.deleteSlot(TENANT_ID, SLOT_ID);

      expect(prisma.bookingSlot.delete).toHaveBeenCalledWith({ where: { id: SLOT_ID } });
    });

    it('should log the deletion', async () => {
      prisma.bookingSlot.findFirst.mockResolvedValue(makeSlot());

      await service.deleteSlot(TENANT_ID, SLOT_ID);

      expect(logger.log).toHaveBeenCalledWith(`Deleted slot ${SLOT_ID}`);
    });

    it('should call withTenant with correct tenantId', async () => {
      prisma.bookingSlot.findFirst.mockResolvedValue(makeSlot());

      await service.deleteSlot(TENANT_ID, SLOT_ID);

      expect(prisma.withTenant).toHaveBeenCalledWith(TENANT_ID, expect.any(Function));
    });
  });

  // =========================================================================
  // getAvailabilityForRange
  // =========================================================================
  describe('getAvailabilityForRange', () => {
    it('should group slots by date and count statuses', async () => {
      const slots = [
        makeSlot({ startTime: new Date('2024-01-15T09:00:00Z'), status: SlotStatus.AVAILABLE }),
        makeSlot({
          id: 's2',
          startTime: new Date('2024-01-15T10:00:00Z'),
          status: SlotStatus.BOOKED,
        }),
        makeSlot({
          id: 's3',
          startTime: new Date('2024-01-15T11:00:00Z'),
          status: SlotStatus.BLOCKED,
        }),
        makeSlot({
          id: 's4',
          startTime: new Date('2024-01-16T09:00:00Z'),
          status: SlotStatus.AVAILABLE,
        }),
      ];
      prisma.bookingSlot.findMany.mockResolvedValue(slots);

      const result = await service.getAvailabilityForRange(
        TENANT_ID,
        new Date('2024-01-15'),
        new Date('2024-01-16'),
      );

      expect(result).toHaveLength(2);
      const day1 = result.find(d => d.date === '2024-01-15');
      expect(day1).toEqual({
        date: '2024-01-15',
        totalSlots: 3,
        availableSlots: 1,
        bookedSlots: 1,
        blockedSlots: 1,
      });
      const day2 = result.find(d => d.date === '2024-01-16');
      expect(day2).toEqual({
        date: '2024-01-16',
        totalSlots: 1,
        availableSlots: 1,
        bookedSlots: 0,
        blockedSlots: 0,
      });
    });

    it('should return empty array when no slots in range', async () => {
      prisma.bookingSlot.findMany.mockResolvedValue([]);

      const result = await service.getAvailabilityForRange(
        TENANT_ID,
        new Date('2024-01-15'),
        new Date('2024-01-16'),
      );

      expect(result).toEqual([]);
    });

    it('should query with correct date range and tenantId', async () => {
      prisma.bookingSlot.findMany.mockResolvedValue([]);
      const start = new Date('2024-01-15');
      const end = new Date('2024-01-20');

      await service.getAvailabilityForRange(TENANT_ID, start, end);

      expect(prisma.bookingSlot.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          startTime: { gte: start, lte: end },
        },
        orderBy: { startTime: 'asc' },
      });
    });

    it('should handle slots with RESERVED status (not counted in specific buckets)', async () => {
      const slots = [
        makeSlot({ startTime: new Date('2024-01-15T09:00:00Z'), status: SlotStatus.RESERVED }),
      ];
      prisma.bookingSlot.findMany.mockResolvedValue(slots);

      const result = await service.getAvailabilityForRange(
        TENANT_ID,
        new Date('2024-01-15'),
        new Date('2024-01-15'),
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: '2024-01-15',
        totalSlots: 1,
        availableSlots: 0,
        bookedSlots: 0,
        blockedSlots: 0,
      });
    });

    it('should call withTenant with correct tenantId', async () => {
      prisma.bookingSlot.findMany.mockResolvedValue([]);

      await service.getAvailabilityForRange(
        TENANT_ID,
        new Date('2024-01-15'),
        new Date('2024-01-16'),
      );

      expect(prisma.withTenant).toHaveBeenCalledWith(TENANT_ID, expect.any(Function));
    });
  });
});
