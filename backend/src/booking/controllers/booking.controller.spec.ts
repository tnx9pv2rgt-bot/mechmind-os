import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from '../services/booking.service';
import { BookingSlotService } from '../services/booking-slot.service';

describe('BookingController', () => {
  let controller: BookingController;
  let bookingService: jest.Mocked<BookingService>;
  let slotService: jest.Mocked<BookingSlotService>;

  const TENANT_ID = 'tenant-001';

  const mockBooking = {
    id: 'book-001',
    tenantId: TENANT_ID,
    customerId: 'cust-001',
    status: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSlot = {
    id: 'slot-001',
    tenantId: TENANT_ID,
    date: new Date(),
    startTime: '09:00',
    endTime: '10:00',
    available: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingController],
      providers: [
        {
          provide: BookingService,
          useValue: {
            reserveSlot: jest.fn(),
            createBooking: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            updateBooking: jest.fn(),
            rescheduleBooking: jest.fn(),
            cancelBooking: jest.fn(),
            getStats: jest.fn(),
            bulkConfirm: jest.fn(),
          },
        },
        {
          provide: BookingSlotService,
          useValue: {
            findAvailableSlots: jest.fn(),
            createSlot: jest.fn(),
            findById: jest.fn(),
            blockSlot: jest.fn(),
            deleteSlot: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<BookingController>(BookingController);
    bookingService = module.get(BookingService) as jest.Mocked<BookingService>;
    slotService = module.get(BookingSlotService) as jest.Mocked<BookingSlotService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ==================== BOOKING ENDPOINTS ====================

  describe('reserveSlot', () => {
    it('should return booking on successful reservation', async () => {
      bookingService.reserveSlot.mockResolvedValue({
        success: true,
        booking: mockBooking,
      } as never);
      const dto = { slotId: 'slot-001', customerId: 'cust-001' };

      const result = await controller.reserveSlot(TENANT_ID, dto as never);

      expect(bookingService.reserveSlot).toHaveBeenCalledWith(TENANT_ID, dto);
      expect(result).toEqual({ success: true, data: mockBooking });
    });

    it('should throw ConflictException on slot conflict', async () => {
      bookingService.reserveSlot.mockResolvedValue({
        success: false,
        conflict: true,
        message: 'Slot already taken',
        retryAfter: 5,
        queuePosition: 2,
      } as never);

      const dto = { slotId: 'slot-001', customerId: 'cust-001' };

      await expect(controller.reserveSlot(TENANT_ID, dto as never)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('createBooking', () => {
    it('should delegate to service with tenantId and dto', async () => {
      bookingService.createBooking.mockResolvedValue(mockBooking as never);
      const dto = { customerId: 'cust-001', date: '2026-04-01', time: '09:00' };

      const result = await controller.createBooking(TENANT_ID, dto as never);

      expect(bookingService.createBooking).toHaveBeenCalledWith(TENANT_ID, dto);
      expect(result).toEqual({ success: true, data: mockBooking });
    });
  });

  describe('getBookings', () => {
    it('should delegate to service with parsed filters', async () => {
      const expected = { bookings: [mockBooking], total: 1 };
      bookingService.findAll.mockResolvedValue(expected as never);

      const result = await controller.getBookings(
        TENANT_ID,
        'PENDING',
        'cust-001',
        '2026-01-01',
        '2026-12-31',
        '10',
        '0',
      );

      expect(bookingService.findAll).toHaveBeenCalledWith(TENANT_ID, {
        status: 'PENDING',
        customerId: 'cust-001',
        fromDate: new Date('2026-01-01'),
        toDate: new Date('2026-12-31'),
        limit: 10,
        offset: 0,
      });
      expect(result).toEqual({
        success: true,
        data: expected.bookings,
        meta: { total: 1, limit: 10, offset: 0 },
      });
    });

    it('should use default limit/offset when not provided', async () => {
      bookingService.findAll.mockResolvedValue({ bookings: [], total: 0 } as never);

      const result = await controller.getBookings(TENANT_ID);

      expect(bookingService.findAll).toHaveBeenCalledWith(TENANT_ID, {
        status: undefined,
        customerId: undefined,
        fromDate: undefined,
        toDate: undefined,
        limit: 50,
        offset: 0,
      });
      expect(result.meta).toEqual({ total: 0, limit: 50, offset: 0 });
    });

    it('should fall back to defaults when limit/offset are non-numeric', async () => {
      bookingService.findAll.mockResolvedValueOnce({ bookings: [], total: 0 } as never);

      const result = await controller.getBookings(
        TENANT_ID,
        undefined,
        undefined,
        undefined,
        undefined,
        'abc',
        'xyz',
      );

      expect(bookingService.findAll).toHaveBeenCalledWith(TENANT_ID, {
        status: undefined,
        customerId: undefined,
        fromDate: undefined,
        toDate: undefined,
        limit: 50,
        offset: 0,
      });
      expect(result.meta).toEqual({ total: 0, limit: 50, offset: 0 });
    });
  });

  describe('getBooking', () => {
    it('should delegate to service with tenantId and bookingId', async () => {
      bookingService.findById.mockResolvedValue(mockBooking as never);

      const result = await controller.getBooking(TENANT_ID, 'book-001');

      expect(bookingService.findById).toHaveBeenCalledWith(TENANT_ID, 'book-001');
      expect(result).toEqual({ success: true, data: mockBooking });
    });
  });

  describe('updateBooking', () => {
    it('should delegate to service with tenantId, id, and dto', async () => {
      const updated = { ...mockBooking, status: 'CONFIRMED' };
      bookingService.updateBooking.mockResolvedValue(updated as never);
      const dto = { status: 'CONFIRMED' };

      const result = await controller.updateBooking(TENANT_ID, 'book-001', dto as never);

      expect(bookingService.updateBooking).toHaveBeenCalledWith(TENANT_ID, 'book-001', dto);
      expect(result).toEqual({ success: true, data: updated });
    });
  });

  describe('cancelBooking', () => {
    it('should delegate to service with tenantId, id, and reason', async () => {
      const cancelled = { ...mockBooking, status: 'CANCELLED' };
      bookingService.cancelBooking.mockResolvedValue(cancelled as never);

      const result = await controller.cancelBooking(TENANT_ID, 'book-001', 'Customer request');

      expect(bookingService.cancelBooking).toHaveBeenCalledWith(
        TENANT_ID,
        'book-001',
        'Customer request',
      );
      expect(result).toEqual({
        success: true,
        data: cancelled,
        message: 'Booking cancelled successfully',
      });
    });

    it('should delegate to service without reason', async () => {
      const cancelled = { ...mockBooking, status: 'CANCELLED' };
      bookingService.cancelBooking.mockResolvedValueOnce(cancelled as never);

      const result = await controller.cancelBooking(TENANT_ID, 'book-001');

      expect(bookingService.cancelBooking).toHaveBeenCalledWith(TENANT_ID, 'book-001', undefined);
      expect(result.success).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should delegate to service with tenantId and date range', async () => {
      const stats = { total: 10, pending: 3, completed: 7 };
      bookingService.getStats.mockResolvedValue(stats as never);

      const result = await controller.getStats(TENANT_ID, '2026-01-01', '2026-12-31');

      expect(bookingService.getStats).toHaveBeenCalledWith(
        TENANT_ID,
        new Date('2026-01-01'),
        new Date('2026-12-31'),
      );
      expect(result).toEqual({ success: true, data: stats });
    });

    it('should pass undefined dates when not provided', async () => {
      bookingService.getStats.mockResolvedValue({} as never);

      await controller.getStats(TENANT_ID);

      expect(bookingService.getStats).toHaveBeenCalledWith(TENANT_ID, undefined, undefined);
    });
  });

  // ==================== CALENDAR & RESCHEDULE ENDPOINTS ====================

  describe('getCalendarBookings', () => {
    it('should return bookings formatted as calendar events', async () => {
      const scheduledDate = new Date('2026-04-01T09:00:00Z');
      const bookingsWithRelations = [
        {
          id: 'book-001',
          tenantId: TENANT_ID,
          customerId: 'cust-001',
          status: 'CONFIRMED',
          scheduledDate,
          durationMinutes: 60,
          liftPosition: 'Ponte A',
          customer: { id: 'cust-001' },
          vehicle: { licensePlate: 'AB123CD', make: 'Fiat', model: 'Punto' },
        },
      ];
      bookingService.findAll.mockResolvedValue({
        bookings: bookingsWithRelations,
        total: 1,
      } as never);

      const result = await controller.getCalendarBookings(TENANT_ID, {
        from: '2026-04-01',
        to: '2026-04-30',
      });

      expect(bookingService.findAll).toHaveBeenCalledWith(TENANT_ID, {
        fromDate: new Date('2026-04-01'),
        toDate: new Date('2026-04-30'),
        limit: 1000,
        offset: 0,
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({
        id: 'book-001',
        title: 'AB123CD - Fiat Punto',
        start: scheduledDate,
        end: new Date('2026-04-01T10:00:00Z'),
        status: 'CONFIRMED',
        color: '#3b82f6',
        bayId: 'Ponte A',
        customerId: 'cust-001',
      });
      expect(result.meta).toEqual({
        total: 1,
        from: '2026-04-01',
        to: '2026-04-30',
      });
    });

    it('should filter by bayId when provided', async () => {
      const bookingsWithRelations = [
        {
          id: 'book-001',
          customerId: 'cust-001',
          status: 'PENDING',
          scheduledDate: new Date('2026-04-01T09:00:00Z'),
          durationMinutes: 30,
          liftPosition: 'Ponte A',
          customer: { id: 'cust-001' },
          vehicle: { licensePlate: 'AB123CD', make: 'Fiat', model: 'Punto' },
        },
        {
          id: 'book-002',
          customerId: 'cust-002',
          status: 'CONFIRMED',
          scheduledDate: new Date('2026-04-01T10:00:00Z'),
          durationMinutes: 60,
          liftPosition: 'Ponte B',
          customer: { id: 'cust-002' },
          vehicle: { licensePlate: 'EF456GH', make: 'Toyota', model: 'Yaris' },
        },
      ];
      bookingService.findAll.mockResolvedValue({
        bookings: bookingsWithRelations,
        total: 2,
      } as never);

      const result = await controller.getCalendarBookings(TENANT_ID, {
        from: '2026-04-01',
        to: '2026-04-30',
        bayId: 'Ponte A',
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('book-001');
    });

    it('should handle bookings without customer or vehicle', async () => {
      const scheduledDate = new Date('2026-04-01T09:00:00Z');
      bookingService.findAll.mockResolvedValue({
        bookings: [
          {
            id: 'book-003',
            customerId: null,
            status: 'CANCELLED',
            scheduledDate,
            durationMinutes: 45,
            liftPosition: null,
            customer: null,
            vehicle: null,
          },
        ],
        total: 1,
      } as never);

      const result = await controller.getCalendarBookings(TENANT_ID, {
        from: '2026-04-01',
        to: '2026-04-30',
      });

      expect(result.data[0].title).toBe('Booking #book-003');
      expect(result.data[0].color).toBe('#ef4444');
      expect(result.data[0].bayId).toBeNull();
      expect(result.data[0].customerId).toBeNull();
    });

    it('should use vehicleInfo as title when vehicle has make/model but no licensePlate', async () => {
      bookingService.findAll.mockResolvedValueOnce({
        bookings: [
          {
            id: 'book-010',
            customerId: 'cust-010',
            status: 'CONFIRMED',
            scheduledDate: new Date('2026-04-05T09:00:00Z'),
            durationMinutes: 30,
            liftPosition: null,
            customer: { id: 'cust-010' },
            vehicle: { licensePlate: null, make: 'BMW', model: 'Serie 3' },
          },
        ],
        total: 1,
      } as never);

      const result = await controller.getCalendarBookings(TENANT_ID, {
        from: '2026-04-01',
        to: '2026-04-30',
      });

      expect(result.data[0].title).toBe('BMW Serie 3');
    });

    it('should use licensePlate as title when vehicle has plate but no make/model', async () => {
      bookingService.findAll.mockResolvedValueOnce({
        bookings: [
          {
            id: 'book-011',
            customerId: 'cust-011',
            status: 'PENDING',
            scheduledDate: new Date('2026-04-05T10:00:00Z'),
            durationMinutes: 60,
            liftPosition: null,
            customer: { id: 'cust-011' },
            vehicle: { licensePlate: 'ZZ999ZZ', make: null, model: null },
          },
        ],
        total: 1,
      } as never);

      const result = await controller.getCalendarBookings(TENANT_ID, {
        from: '2026-04-01',
        to: '2026-04-30',
      });

      expect(result.data[0].title).toBe('ZZ999ZZ');
    });

    it('should use fallback color for unknown booking status', async () => {
      bookingService.findAll.mockResolvedValueOnce({
        bookings: [
          {
            id: 'book-012',
            customerId: 'cust-012',
            status: 'UNKNOWN_STATUS',
            scheduledDate: new Date('2026-04-05T11:00:00Z'),
            durationMinutes: 30,
            liftPosition: null,
            customer: null,
            vehicle: null,
          },
        ],
        total: 1,
      } as never);

      const result = await controller.getCalendarBookings(TENANT_ID, {
        from: '2026-04-01',
        to: '2026-04-30',
      });

      expect(result.data[0].color).toBe('#6b7280');
    });

    it('should handle vehicle with null make field using empty string fallback', async () => {
      bookingService.findAll.mockResolvedValueOnce({
        bookings: [
          {
            id: 'book-013',
            customerId: 'cust-013',
            status: 'IN_PROGRESS',
            scheduledDate: new Date('2026-04-05T12:00:00Z'),
            durationMinutes: 90,
            liftPosition: 'Ponte C',
            customer: { id: 'cust-013' },
            vehicle: { licensePlate: 'XX000XX', make: null, model: 'Giulia' },
          },
        ],
        total: 1,
      } as never);

      const result = await controller.getCalendarBookings(TENANT_ID, {
        from: '2026-04-01',
        to: '2026-04-30',
      });

      expect(result.data[0].title).toBe('XX000XX - Giulia');
      expect(result.data[0].color).toBe('#f97316');
    });
  });

  describe('bulkConfirm', () => {
    it('should delegate to service and return bulk confirmation result', async () => {
      const bulkResult = { confirmed: 3, failed: 0 };
      bookingService.bulkConfirm.mockResolvedValueOnce(bulkResult as never);

      const result = await controller.bulkConfirm(TENANT_ID, {
        ids: ['book-001', 'book-002', 'book-003'],
      } as never);

      expect(bookingService.bulkConfirm).toHaveBeenCalledWith(TENANT_ID, [
        'book-001',
        'book-002',
        'book-003',
      ]);
      expect(result).toEqual({ success: true, data: bulkResult });
    });
  });

  describe('rescheduleBooking', () => {
    it('should delegate to service and return rescheduled booking', async () => {
      const rescheduled = { ...mockBooking, scheduledDate: new Date('2026-04-05T14:00:00Z') };
      bookingService.rescheduleBooking.mockResolvedValue(rescheduled as never);
      const dto = { newDate: '2026-04-05T14:00:00Z', reason: 'Customer request' };

      const result = await controller.rescheduleBooking(TENANT_ID, 'book-001', dto as never);

      expect(bookingService.rescheduleBooking).toHaveBeenCalledWith(TENANT_ID, 'book-001', dto);
      expect(result).toEqual({
        success: true,
        data: rescheduled,
        message: 'Booking rescheduled successfully',
      });
    });

    it('should pass newSlotId when provided', async () => {
      bookingService.rescheduleBooking.mockResolvedValue(mockBooking as never);
      const dto = { newDate: '2026-04-05T14:00:00Z', newSlotId: 'slot-002' };

      await controller.rescheduleBooking(TENANT_ID, 'book-001', dto as never);

      expect(bookingService.rescheduleBooking).toHaveBeenCalledWith(TENANT_ID, 'book-001', dto);
    });
  });

  // ==================== SLOT ENDPOINTS ====================

  describe('getAvailableSlots', () => {
    it('should delegate to slotService with tenantId, date, and duration', async () => {
      const slots = [mockSlot];
      slotService.findAvailableSlots.mockResolvedValue(slots as never);
      const query = { date: '2026-04-01', duration: 60 };

      const result = await controller.getAvailableSlots(TENANT_ID, query as never);

      expect(slotService.findAvailableSlots).toHaveBeenCalledWith(TENANT_ID, '2026-04-01', 60);
      expect(result).toEqual({
        success: true,
        data: slots,
        meta: { date: '2026-04-01', availableCount: 1 },
      });
    });
  });

  describe('createSlot', () => {
    it('should delegate to slotService with tenantId and dto', async () => {
      slotService.createSlot.mockResolvedValue(mockSlot as never);
      const dto = { date: '2026-04-01', startTime: '09:00', endTime: '10:00' };

      const result = await controller.createSlot(TENANT_ID, dto as never);

      expect(slotService.createSlot).toHaveBeenCalledWith(TENANT_ID, dto);
      expect(result).toEqual({ success: true, data: mockSlot });
    });
  });

  describe('getSlot', () => {
    it('should delegate to slotService with tenantId and slotId', async () => {
      slotService.findById.mockResolvedValue(mockSlot as never);

      const result = await controller.getSlot(TENANT_ID, 'slot-001');

      expect(slotService.findById).toHaveBeenCalledWith(TENANT_ID, 'slot-001');
      expect(result).toEqual({ success: true, data: mockSlot });
    });
  });

  describe('blockSlot', () => {
    it('should delegate to slotService with tenantId, slotId, and reason', async () => {
      const blocked = { ...mockSlot, available: false };
      slotService.blockSlot.mockResolvedValue(blocked as never);

      const result = await controller.blockSlot(TENANT_ID, 'slot-001', 'Maintenance');

      expect(slotService.blockSlot).toHaveBeenCalledWith(TENANT_ID, 'slot-001', 'Maintenance');
      expect(result).toEqual({
        success: true,
        data: blocked,
        message: 'Slot blocked successfully',
      });
    });

    it('should delegate to slotService without reason', async () => {
      const blocked = { ...mockSlot, available: false };
      slotService.blockSlot.mockResolvedValueOnce(blocked as never);

      const result = await controller.blockSlot(TENANT_ID, 'slot-001');

      expect(slotService.blockSlot).toHaveBeenCalledWith(TENANT_ID, 'slot-001', undefined);
      expect(result.success).toBe(true);
    });
  });

  describe('deleteSlot', () => {
    it('should delegate to slotService with tenantId and slotId', async () => {
      slotService.deleteSlot.mockResolvedValue(undefined as never);

      const result = await controller.deleteSlot(TENANT_ID, 'slot-001');

      expect(slotService.deleteSlot).toHaveBeenCalledWith(TENANT_ID, 'slot-001');
      expect(result).toEqual({ success: true, message: 'Slot deleted successfully' });
    });
  });
});
