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
            cancelBooking: jest.fn(),
            getStats: jest.fn(),
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
