import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { BookingController } from '../controllers/booking.controller';
import { BookingService, BookingCreatedEvent } from '../services/booking.service';
import { BookingSlotService } from '../services/booking-slot.service';
import { UserRole } from '@auth/guards/roles.guard';

// Mock the guards and decorators
jest.mock('@auth/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockReturnValue(true),
  })),
}));

jest.mock('@auth/guards/roles.guard', () => ({
  RolesGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockReturnValue(true),
  })),
  UserRole: {
    ADMIN: 'ADMIN',
    MANAGER: 'MANAGER',
    MECHANIC: 'MECHANIC',
    RECEPTIONIST: 'RECEPTIONIST',
  },
}));

describe('BookingController', () => {
  let controller: BookingController;
  let bookingService: jest.Mocked<BookingService>;
  let slotService: jest.Mocked<BookingSlotService>;

  const mockBookingService = {
    reserveSlot: jest.fn(),
    createBooking: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    updateBooking: jest.fn(),
    cancelBooking: jest.fn(),
    getStats: jest.fn(),
  };

  const mockSlotService = {
    findAvailableSlots: jest.fn(),
    createSlot: jest.fn(),
    findById: jest.fn(),
    blockSlot: jest.fn(),
    deleteSlot: jest.fn(),
  };

  const tenantId = 'tenant-123';
  const bookingId = 'booking-123';
  const slotId = 'slot-123';
  const customerId = 'customer-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingController],
      providers: [
        { provide: BookingService, useValue: mockBookingService },
        { provide: BookingSlotService, useValue: mockSlotService },
      ],
    }).compile();

    controller = module.get<BookingController>(BookingController);
    bookingService = module.get(BookingService) as jest.Mocked<BookingService>;
    slotService = module.get(BookingSlotService) as jest.Mocked<BookingSlotService>;

    jest.clearAllMocks();
  });

  describe('reserveSlot', () => {
    const reserveDto = {
      slotId,
      customerId,
      vehicleId: 'vehicle-123',
      serviceIds: ['service-1', 'service-2'],
      notes: 'Test booking notes',
    };

    it('should successfully reserve a slot', async () => {
      const mockBooking = {
        id: bookingId,
        status: 'CONFIRMED',
        scheduledDate: new Date(),
        customer: { id: customerId, firstName: 'John', lastName: 'Doe' },
      };

      bookingService.reserveSlot.mockResolvedValue({
        success: true,
        booking: mockBooking,
      });

      const result = await controller.reserveSlot(tenantId, reserveDto);

      expect(result).toEqual({
        success: true,
        data: mockBooking,
      });
      expect(bookingService.reserveSlot).toHaveBeenCalledWith(tenantId, reserveDto);
    });

    it('should throw ConflictException when slot is already reserved', async () => {
      bookingService.reserveSlot.mockResolvedValue({
        success: false,
        conflict: true,
        retryAfter: 5000,
        queuePosition: 1,
        message: 'Slot is currently being reserved by another request. Queued for retry.',
      });

      await expect(controller.reserveSlot(tenantId, reserveDto)).rejects.toThrow(ConflictException);
      expect(bookingService.reserveSlot).toHaveBeenCalledWith(tenantId, reserveDto);
    });

    it('should handle successful reservation with minimal DTO data', async () => {
      const minimalDto = {
        slotId,
        customerId,
      };

      const mockBooking = {
        id: bookingId,
        status: 'CONFIRMED',
        scheduledDate: new Date(),
      };

      bookingService.reserveSlot.mockResolvedValue({
        success: true,
        booking: mockBooking,
      });

      const result = await controller.reserveSlot(tenantId, minimalDto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockBooking);
    });
  });

  describe('createBooking', () => {
    const createDto = {
      customerId,
      slotId,
      scheduledDate: '2024-01-15T09:00:00Z',
      durationMinutes: 60,
      vehicleId: 'vehicle-123',
      serviceIds: ['service-1'],
      notes: 'Test booking',
      source: 'WEB' as const,
    };

    it('should create a new booking', async () => {
      const mockBooking = {
        id: bookingId,
        ...createDto,
        status: 'PENDING',
        createdAt: new Date(),
      };

      bookingService.createBooking.mockResolvedValue(mockBooking);

      const result = await controller.createBooking(tenantId, createDto);

      expect(result).toEqual({
        success: true,
        data: mockBooking,
      });
      expect(bookingService.createBooking).toHaveBeenCalledWith(tenantId, createDto);
    });

    it('should create booking with minimal data', async () => {
      const minimalDto = {
        customerId,
        slotId,
        scheduledDate: '2024-01-15T09:00:00Z',
      };

      const mockBooking = {
        id: bookingId,
        ...minimalDto,
        status: 'PENDING',
        source: 'WEB',
      };

      bookingService.createBooking.mockResolvedValue(mockBooking);

      const result = await controller.createBooking(tenantId, minimalDto);

      expect(result.success).toBe(true);
      expect(bookingService.createBooking).toHaveBeenCalledWith(tenantId, minimalDto);
    });
  });

  describe('getBookings', () => {
    it('should return all bookings with pagination', async () => {
      const mockBookings = [
        { id: 'booking-1', status: 'CONFIRMED' },
        { id: 'booking-2', status: 'PENDING' },
      ];

      bookingService.findAll.mockResolvedValue({
        bookings: mockBookings,
        total: 2,
      });

      const result = await controller.getBookings(
        tenantId,
        'CONFIRMED',
        undefined,
        undefined,
        undefined,
        '10',
        '0',
      );

      expect(result).toEqual({
        success: true,
        data: mockBookings,
        meta: {
          total: 2,
          limit: 10,
          offset: 0,
        },
      });
      expect(bookingService.findAll).toHaveBeenCalledWith(tenantId, {
        status: 'CONFIRMED',
        customerId: undefined,
        fromDate: undefined,
        toDate: undefined,
        limit: 10,
        offset: 0,
      });
    });

    it('should return bookings with date filters', async () => {
      const fromDate = '2024-01-01';
      const toDate = '2024-01-31';
      const mockBookings = [{ id: 'booking-1' }];

      bookingService.findAll.mockResolvedValue({
        bookings: mockBookings,
        total: 1,
      });

      const result = await controller.getBookings(
        tenantId,
        undefined,
        'customer-123',
        fromDate,
        toDate,
        undefined,
        undefined,
      );

      expect(bookingService.findAll).toHaveBeenCalledWith(tenantId, {
        status: undefined,
        customerId: 'customer-123',
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
        limit: undefined,
        offset: undefined,
      });
      expect(result.meta.total).toBe(1);
    });

    it('should handle empty bookings list', async () => {
      bookingService.findAll.mockResolvedValue({
        bookings: [],
        total: 0,
      });

      const result = await controller.getBookings(tenantId);

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('getBooking', () => {
    it('should return booking by ID', async () => {
      const mockBooking = {
        id: bookingId,
        status: 'CONFIRMED',
        customer: { id: customerId },
        slot: { id: slotId },
      };

      bookingService.findById.mockResolvedValue(mockBooking);

      const result = await controller.getBooking(tenantId, bookingId);

      expect(result).toEqual({
        success: true,
        data: mockBooking,
      });
      expect(bookingService.findById).toHaveBeenCalledWith(tenantId, bookingId);
    });

    it('should throw NotFoundException when booking not found', async () => {
      bookingService.findById.mockRejectedValue(new NotFoundException('Booking not found'));

      await expect(controller.getBooking(tenantId, 'non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateBooking', () => {
    const updateDto = {
      status: 'CONFIRMED',
      notes: 'Updated notes',
    };

    it('should update a booking', async () => {
      const mockBooking = {
        id: bookingId,
        ...updateDto,
        scheduledDate: new Date(),
      };

      bookingService.updateBooking.mockResolvedValue(mockBooking);

      const result = await controller.updateBooking(tenantId, bookingId, updateDto);

      expect(result).toEqual({
        success: true,
        data: mockBooking,
      });
      expect(bookingService.updateBooking).toHaveBeenCalledWith(tenantId, bookingId, updateDto);
    });

    it('should update booking with partial data', async () => {
      const partialDto = { notes: 'Only updating notes' };
      const mockBooking = {
        id: bookingId,
        notes: 'Only updating notes',
        status: 'PENDING',
      };

      bookingService.updateBooking.mockResolvedValue(mockBooking);

      const result = await controller.updateBooking(tenantId, bookingId, partialDto);

      expect(result.success).toBe(true);
    });
  });

  describe('cancelBooking', () => {
    it('should cancel a booking', async () => {
      const mockBooking = {
        id: bookingId,
        status: 'CANCELLED',
        slot: { id: slotId, status: 'AVAILABLE' },
      };

      bookingService.cancelBooking.mockResolvedValue(mockBooking);

      const result = await controller.cancelBooking(tenantId, bookingId, 'Customer request');

      expect(result).toEqual({
        success: true,
        data: mockBooking,
        message: 'Booking cancelled successfully',
      });
      expect(bookingService.cancelBooking).toHaveBeenCalledWith(tenantId, bookingId, 'Customer request');
    });

    it('should cancel booking without reason', async () => {
      const mockBooking = {
        id: bookingId,
        status: 'CANCELLED',
      };

      bookingService.cancelBooking.mockResolvedValue(mockBooking);

      const result = await controller.cancelBooking(tenantId, bookingId);

      expect(bookingService.cancelBooking).toHaveBeenCalledWith(tenantId, bookingId, undefined);
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException when booking not found', async () => {
      bookingService.cancelBooking.mockRejectedValue(new NotFoundException('Booking not found'));

      await expect(controller.cancelBooking(tenantId, 'non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStats', () => {
    it('should return booking statistics', async () => {
      const mockStats = {
        total: 100,
        byStatus: {
          CONFIRMED: 50,
          PENDING: 30,
          CANCELLED: 20,
        },
        bySource: {
          WEB: 70,
          PHONE: 30,
        },
      };

      bookingService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(tenantId);

      expect(result).toEqual({
        success: true,
        data: mockStats,
      });
      expect(bookingService.getStats).toHaveBeenCalledWith(tenantId, undefined, undefined);
    });

    it('should return stats with date range', async () => {
      const fromDate = '2024-01-01';
      const toDate = '2024-01-31';
      const mockStats = {
        total: 50,
        byStatus: { CONFIRMED: 40 },
        bySource: { WEB: 50 },
      };

      bookingService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(tenantId, fromDate, toDate);

      expect(bookingService.getStats).toHaveBeenCalledWith(
        tenantId,
        new Date(fromDate),
        new Date(toDate),
      );
    });
  });

  describe('Slot Endpoints', () => {
    describe('getAvailableSlots', () => {
      it('should return available slots for a date', async () => {
        const date = '2024-01-15';
        const mockSlots = [
          { id: 'slot-1', startTime: new Date(), status: 'AVAILABLE' },
          { id: 'slot-2', startTime: new Date(), status: 'AVAILABLE' },
        ];

        slotService.findAvailableSlots.mockResolvedValue(mockSlots);

        const result = await controller.getAvailableSlots(tenantId, {
          date,
          duration: 60,
        });

        expect(result).toEqual({
          success: true,
          data: mockSlots,
          meta: {
            date,
            availableCount: 2,
          },
        });
        expect(slotService.findAvailableSlots).toHaveBeenCalledWith(tenantId, date, 60);
      });

      it('should return empty slots array when no slots available', async () => {
        slotService.findAvailableSlots.mockResolvedValue([]);

        const result = await controller.getAvailableSlots(tenantId, {
          date: '2024-01-15',
        });

        expect(result.data).toEqual([]);
        expect(result.meta.availableCount).toBe(0);
      });
    });

    describe('createSlot', () => {
      it('should create a new slot', async () => {
        const createSlotDto = {
          startTime: '2024-01-15T09:00:00Z',
          endTime: '2024-01-15T10:00:00Z',
        };

        const mockSlot = {
          id: 'new-slot-123',
          ...createSlotDto,
          status: 'AVAILABLE',
        };

        slotService.createSlot.mockResolvedValue(mockSlot);

        const result = await controller.createSlot(tenantId, createSlotDto);

        expect(result).toEqual({
          success: true,
          data: mockSlot,
        });
        expect(slotService.createSlot).toHaveBeenCalledWith(tenantId, createSlotDto);
      });
    });

    describe('getSlot', () => {
      it('should return slot by ID', async () => {
        const mockSlot = {
          id: slotId,
          startTime: new Date(),
          endTime: new Date(),
          status: 'AVAILABLE',
          booking: null,
        };

        slotService.findById.mockResolvedValue(mockSlot);

        const result = await controller.getSlot(tenantId, slotId);

        expect(result).toEqual({
          success: true,
          data: mockSlot,
        });
        expect(slotService.findById).toHaveBeenCalledWith(tenantId, slotId);
      });

      it('should throw NotFoundException when slot not found', async () => {
        slotService.findById.mockRejectedValue(new NotFoundException('Slot not found'));

        await expect(controller.getSlot(tenantId, 'non-existent')).rejects.toThrow(NotFoundException);
      });
    });

    describe('blockSlot', () => {
      it('should block a slot', async () => {
        const mockSlot = {
          id: slotId,
          status: 'BLOCKED',
        };

        slotService.blockSlot.mockResolvedValue(mockSlot);

        const result = await controller.blockSlot(tenantId, slotId, 'Maintenance');

        expect(result).toEqual({
          success: true,
          data: mockSlot,
          message: 'Slot blocked successfully',
        });
        expect(slotService.blockSlot).toHaveBeenCalledWith(tenantId, slotId, 'Maintenance');
      });

      it('should block slot without reason', async () => {
        const mockSlot = { id: slotId, status: 'BLOCKED' };
        slotService.blockSlot.mockResolvedValue(mockSlot);

        const result = await controller.blockSlot(tenantId, slotId);

        expect(slotService.blockSlot).toHaveBeenCalledWith(tenantId, slotId, undefined);
      });
    });

    describe('deleteSlot', () => {
      it('should delete a slot', async () => {
        slotService.deleteSlot.mockResolvedValue(undefined);

        const result = await controller.deleteSlot(tenantId, slotId);

        expect(result).toEqual({
          success: true,
          message: 'Slot deleted successfully',
        });
        expect(slotService.deleteSlot).toHaveBeenCalledWith(tenantId, slotId);
      });

      it('should throw NotFoundException when slot not found', async () => {
        slotService.deleteSlot.mockRejectedValue(new NotFoundException('Slot not found'));

        await expect(controller.deleteSlot(tenantId, 'non-existent')).rejects.toThrow(NotFoundException);
      });
    });
  });
});
