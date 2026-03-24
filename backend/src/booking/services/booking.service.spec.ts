import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BookingService } from './booking.service';
import { PrismaService } from '@common/services/prisma.service';
import { QueueService } from '@common/services/queue.service';
import { LoggerService } from '@common/services/logger.service';

describe('BookingService', () => {
  let service: BookingService;
  let prisma: {
    acquireAdvisoryLock: jest.Mock;
    releaseAdvisoryLock: jest.Mock;
    withSerializableTransaction: jest.Mock;
    withTenant: jest.Mock;
    bookingSlot: { findFirst: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    customer: { findFirst: jest.Mock };
    booking: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    bookingEvent: { create: jest.Mock; update: jest.Mock };
  };
  let eventEmitter: { emit: jest.Mock };
  let queueService: { addBookingJob: jest.Mock };

  const TENANT_ID = 'tenant-001';
  const SLOT_ID = 'slot-001';
  const CUSTOMER_ID = 'customer-001';

  const mockSlot = {
    id: SLOT_ID,
    tenantId: TENANT_ID,
    startTime: new Date('2024-06-01T09:00:00Z'),
    endTime: new Date('2024-06-01T10:00:00Z'),
    status: 'AVAILABLE',
  };

  const mockCustomer = {
    id: CUSTOMER_ID,
    tenantId: TENANT_ID,
  };

  beforeEach(async () => {
    prisma = {
      acquireAdvisoryLock: jest.fn().mockResolvedValue(true),
      releaseAdvisoryLock: jest.fn().mockResolvedValue(undefined),
      withSerializableTransaction: jest.fn(cb => cb(prisma)),
      withTenant: jest.fn((_, cb) => cb(prisma)),
      bookingSlot: {
        findFirst: jest.fn().mockResolvedValue(mockSlot),
        findUnique: jest.fn().mockResolvedValue(mockSlot),
        update: jest.fn().mockResolvedValue({ ...mockSlot, status: 'BOOKED' }),
      },
      customer: {
        findFirst: jest.fn().mockResolvedValue(mockCustomer),
      },
      booking: {
        create: jest.fn().mockResolvedValue({
          id: 'booking-001',
          tenantId: TENANT_ID,
          customerId: CUSTOMER_ID,
          scheduledDate: mockSlot.startTime,
          source: 'WEB',
          status: 'CONFIRMED',
        }),
        findFirst: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      bookingEvent: {
        create: jest.fn().mockResolvedValue({ id: 'event-001' }),
        update: jest.fn(),
      },
    } as unknown as typeof prisma;

    eventEmitter = { emit: jest.fn() };
    queueService = { addBookingJob: jest.fn().mockResolvedValue({ id: 'job-001' }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: QueueService, useValue: queueService },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('reserveSlot', () => {
    const dto = {
      slotId: SLOT_ID,
      customerId: CUSTOMER_ID,
      vehicleId: 'vehicle-001',
      serviceIds: ['service-001'],
      notes: 'Oil change',
    };

    it('should successfully reserve an available slot', async () => {
      const result = await service.reserveSlot(TENANT_ID, dto);

      expect(result.success).toBe(true);
      expect(result.booking).toBeDefined();
      expect(prisma.acquireAdvisoryLock).toHaveBeenCalledWith(TENANT_ID, SLOT_ID);
      expect(prisma.releaseAdvisoryLock).toHaveBeenCalledWith(TENANT_ID, SLOT_ID);
    });

    it('should emit booking.created event on success', async () => {
      await service.reserveSlot(TENANT_ID, dto);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'booking.created',
        expect.objectContaining({
          bookingId: 'booking-001',
          tenantId: TENANT_ID,
          customerId: CUSTOMER_ID,
        }),
      );
    });

    it('should queue for retry when lock cannot be acquired', async () => {
      (prisma.acquireAdvisoryLock as jest.Mock).mockResolvedValue(false);

      const result = await service.reserveSlot(TENANT_ID, dto);

      expect(result.success).toBe(false);
      expect(result.conflict).toBe(true);
      expect(result.retryAfter).toBeDefined();
      expect(queueService.addBookingJob).toHaveBeenCalled();
    });

    it('should throw NotFoundException when slot does not exist', async () => {
      (prisma.bookingSlot.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.reserveSlot(TENANT_ID, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when slot is not available', async () => {
      (prisma.bookingSlot.findFirst as jest.Mock).mockResolvedValue({
        ...mockSlot,
        status: 'BOOKED',
      });

      await expect(service.reserveSlot(TENANT_ID, dto)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when customer does not exist', async () => {
      (prisma.customer.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.reserveSlot(TENANT_ID, dto)).rejects.toThrow(NotFoundException);
    });

    it('should always release advisory lock even on failure', async () => {
      (prisma.bookingSlot.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.reserveSlot(TENANT_ID, dto)).rejects.toThrow();
      expect(prisma.releaseAdvisoryLock).toHaveBeenCalledWith(TENANT_ID, SLOT_ID);
    });
  });

  describe('findById', () => {
    it('should return booking when found', async () => {
      const mockBooking = { id: 'booking-001', tenantId: TENANT_ID };
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(mockBooking);

      const result = await service.findById(TENANT_ID, 'booking-001');
      expect(result).toEqual(mockBooking);
    });

    it('should throw NotFoundException when booking not found', async () => {
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findById(TENANT_ID, 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should call withTenant with correct tenantId', async () => {
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue({ id: 'booking-001' });

      await service.findById(TENANT_ID, 'booking-001');

      expect(prisma.withTenant).toHaveBeenCalledWith(TENANT_ID, expect.any(Function));
    });
  });

  // =========================================================================
  // createBooking
  // =========================================================================
  describe('createBooking', () => {
    const dto = {
      customerId: CUSTOMER_ID,
      vehicleId: 'vehicle-001',
      slotId: SLOT_ID,
      scheduledDate: '2024-06-01T09:00:00Z',
      durationMinutes: 60,
      notes: 'Oil change',
      source: 'WEB' as const,
    };

    it('should create a booking successfully', async () => {
      const mockBooking = {
        id: 'booking-001',
        tenantId: TENANT_ID,
        scheduledDate: new Date(dto.scheduledDate),
        source: 'WEB',
      };
      (prisma.booking.create as jest.Mock).mockResolvedValue(mockBooking);

      const result = await service.createBooking(TENANT_ID, dto);

      expect(result).toEqual(mockBooking);
      expect(prisma.booking.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when slot not found', async () => {
      (prisma.bookingSlot.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.createBooking(TENANT_ID, dto)).rejects.toThrow(NotFoundException);
    });

    it('should update slot status to BOOKED', async () => {
      const mockBooking = {
        id: 'booking-001',
        tenantId: TENANT_ID,
        scheduledDate: new Date(dto.scheduledDate),
        source: 'WEB',
      };
      (prisma.booking.create as jest.Mock).mockResolvedValue(mockBooking);

      await service.createBooking(TENANT_ID, dto);

      expect(prisma.bookingSlot.update).toHaveBeenCalledWith({
        where: { id: SLOT_ID },
        data: { status: 'BOOKED' },
      });
    });

    it('should create booking event', async () => {
      const mockBooking = {
        id: 'booking-001',
        tenantId: TENANT_ID,
        scheduledDate: new Date(dto.scheduledDate),
        source: 'WEB',
      };
      (prisma.booking.create as jest.Mock).mockResolvedValue(mockBooking);

      await service.createBooking(TENANT_ID, dto);

      expect(prisma.bookingEvent.create).toHaveBeenCalledWith({
        data: {
          eventType: 'booking_created',
          payload: expect.objectContaining({ customerId: CUSTOMER_ID }),
          booking: { connect: { id: 'booking-001' } },
        },
      });
    });

    it('should emit booking.created event', async () => {
      const mockBooking = {
        id: 'booking-001',
        tenantId: TENANT_ID,
        scheduledDate: new Date(dto.scheduledDate),
        source: 'WEB',
      };
      (prisma.booking.create as jest.Mock).mockResolvedValue(mockBooking);

      await service.createBooking(TENANT_ID, dto);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'booking.created',
        expect.objectContaining({
          bookingId: 'booking-001',
          tenantId: TENANT_ID,
          customerId: CUSTOMER_ID,
        }),
      );
    });

    it('should handle optional vapiCallId', async () => {
      const dtoWithVapi = { ...dto, vapiCallId: 'call-123' };
      const mockBooking = {
        id: 'booking-001',
        tenantId: TENANT_ID,
        scheduledDate: new Date(dto.scheduledDate),
        source: 'WEB',
      };
      (prisma.booking.create as jest.Mock).mockResolvedValue(mockBooking);

      await service.createBooking(TENANT_ID, dtoWithVapi);

      expect(prisma.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            vapiCallId: 'call-123',
          }),
        }),
      );
    });

    it('should create booking without vehicleId', async () => {
      const dtoNoVehicle = { ...dto, vehicleId: undefined };
      const mockBooking = {
        id: 'booking-001',
        tenantId: TENANT_ID,
        scheduledDate: new Date(dto.scheduledDate),
        source: 'WEB',
      };
      (prisma.booking.create as jest.Mock).mockResolvedValue(mockBooking);

      await service.createBooking(TENANT_ID, dtoNoVehicle);

      expect(prisma.booking.create).toHaveBeenCalled();
    });

    it('should return existing booking when idempotencyKey already exists', async () => {
      const existingBooking = {
        id: 'booking-existing',
        tenantId: TENANT_ID,
        scheduledDate: new Date(dto.scheduledDate),
        source: 'WEB',
        idempotencyKey: 'idem-key-001',
      };
      // findUnique on the top-level prisma (before withTenant) returns existing booking
      (prisma.booking.findUnique as jest.Mock) = jest.fn().mockResolvedValue(existingBooking);

      const dtoWithKey = { ...dto, idempotencyKey: 'idem-key-001' };
      const result = await service.createBooking(TENANT_ID, dtoWithKey);

      expect(result).toEqual(existingBooking);
      // Should NOT have called booking.create since we returned early
      expect(prisma.booking.create).not.toHaveBeenCalled();
    });

    it('should create new booking when idempotencyKey is new', async () => {
      const mockBooking = {
        id: 'booking-001',
        tenantId: TENANT_ID,
        scheduledDate: new Date(dto.scheduledDate),
        source: 'WEB',
        idempotencyKey: 'idem-key-new',
      };
      // findUnique returns null → key not seen before
      (prisma.booking.findUnique as jest.Mock) = jest.fn().mockResolvedValue(null);
      (prisma.booking.create as jest.Mock).mockResolvedValue(mockBooking);

      const dtoWithKey = { ...dto, idempotencyKey: 'idem-key-new' };
      const result = await service.createBooking(TENANT_ID, dtoWithKey);

      expect(result).toEqual(mockBooking);
      expect(prisma.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            idempotencyKey: 'idem-key-new',
          }),
        }),
      );
    });
  });

  // =========================================================================
  // findAll
  // =========================================================================
  describe('findAll', () => {
    it('should return paginated bookings with total count', async () => {
      const mockBookings = [{ id: 'booking-001' }, { id: 'booking-002' }];
      (prisma.booking.findMany as jest.Mock).mockResolvedValue(mockBookings);
      (prisma.booking.count as jest.Mock).mockResolvedValue(2);

      const result = await service.findAll(TENANT_ID);

      expect(result.bookings).toEqual(mockBookings);
      expect(result.total).toBe(2);
    });

    it('should apply status filter', async () => {
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.booking.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(TENANT_ID, { status: 'CONFIRMED' as never });

      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            status: 'CONFIRMED',
          }),
        }),
      );
    });

    it('should apply customer filter', async () => {
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.booking.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(TENANT_ID, { customerId: CUSTOMER_ID });

      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            customerId: CUSTOMER_ID,
          }),
        }),
      );
    });

    it('should apply date range filter', async () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-12-31');
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.booking.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(TENANT_ID, { fromDate, toDate });

      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            scheduledDate: { gte: fromDate, lte: toDate },
          }),
        }),
      );
    });

    it('should apply pagination with limit and offset', async () => {
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.booking.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(TENANT_ID, { limit: 10, offset: 20 });

      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        }),
      );
    });

    it('should default to limit 50 and offset 0', async () => {
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.booking.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(TENANT_ID);

      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 0,
        }),
      );
    });
  });

  // =========================================================================
  // updateBooking
  // =========================================================================
  describe('updateBooking', () => {
    const mockExisting = { id: 'booking-001', tenantId: TENANT_ID, status: 'PENDING' };
    const mockUpdated = {
      id: 'booking-001',
      tenantId: TENANT_ID,
      status: 'CONFIRMED',
    };

    it('should update booking successfully', async () => {
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(mockExisting);
      (prisma.booking.update as jest.Mock).mockResolvedValue(mockUpdated);

      const result = await service.updateBooking(TENANT_ID, 'booking-001', {
        status: 'CONFIRMED',
      });

      expect(result).toEqual(mockUpdated);
    });

    it('should throw NotFoundException when booking not found', async () => {
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateBooking(TENANT_ID, 'nonexistent', { status: 'CONFIRMED' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create booking_updated event', async () => {
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(mockExisting);
      (prisma.booking.update as jest.Mock).mockResolvedValue(mockUpdated);

      await service.updateBooking(TENANT_ID, 'booking-001', { status: 'CONFIRMED' });

      expect(prisma.bookingEvent.create).toHaveBeenCalledWith({
        data: {
          eventType: 'booking_updated',
          payload: { status: 'CONFIRMED' },
          booking: { connect: { id: 'booking-001' } },
        },
      });
    });

    it('should emit booking.updated event', async () => {
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(mockExisting);
      (prisma.booking.update as jest.Mock).mockResolvedValue(mockUpdated);

      const dto = { status: 'CONFIRMED' };
      await service.updateBooking(TENANT_ID, 'booking-001', dto);

      expect(eventEmitter.emit).toHaveBeenCalledWith('booking.updated', {
        bookingId: 'booking-001',
        tenantId: TENANT_ID,
        changes: dto,
      });
    });

    it('should update scheduledDate when provided', async () => {
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(mockExisting);
      (prisma.booking.update as jest.Mock).mockResolvedValue(mockUpdated);

      await service.updateBooking(TENANT_ID, 'booking-001', {
        scheduledDate: '2024-07-01T10:00:00Z',
      });

      expect(prisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            scheduledDate: new Date('2024-07-01T10:00:00Z'),
          }),
        }),
      );
    });
  });

  // =========================================================================
  // cancelBooking
  // =========================================================================
  describe('cancelBooking', () => {
    const mockBookingWithSlot = {
      id: 'booking-001',
      tenantId: TENANT_ID,
      status: 'CONFIRMED',
      slot: { id: SLOT_ID },
    };

    it('should cancel booking and free slot', async () => {
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(mockBookingWithSlot);
      (prisma.booking.update as jest.Mock).mockResolvedValue({
        ...mockBookingWithSlot,
        status: 'CANCELLED',
      });

      const result = await service.cancelBooking(TENANT_ID, 'booking-001', 'Customer request');

      expect(result.status).toBe('CANCELLED');
      expect(prisma.bookingSlot.update).toHaveBeenCalledWith({
        where: { id: SLOT_ID },
        data: { status: 'AVAILABLE' },
      });
    });

    it('should throw NotFoundException when booking not found', async () => {
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.cancelBooking(TENANT_ID, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should create booking_cancelled event with reason', async () => {
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(mockBookingWithSlot);
      (prisma.booking.update as jest.Mock).mockResolvedValue({
        ...mockBookingWithSlot,
        status: 'CANCELLED',
      });

      await service.cancelBooking(TENANT_ID, 'booking-001', 'No longer needed');

      expect(prisma.bookingEvent.create).toHaveBeenCalledWith({
        data: {
          eventType: 'booking_cancelled',
          payload: { reason: 'No longer needed' },
          booking: { connect: { id: 'booking-001' } },
        },
      });
    });

    it('should emit booking.cancelled event', async () => {
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(mockBookingWithSlot);
      (prisma.booking.update as jest.Mock).mockResolvedValue({
        ...mockBookingWithSlot,
        status: 'CANCELLED',
      });

      await service.cancelBooking(TENANT_ID, 'booking-001', 'reason');

      expect(eventEmitter.emit).toHaveBeenCalledWith('booking.cancelled', {
        bookingId: 'booking-001',
        tenantId: TENANT_ID,
        reason: 'reason',
      });
    });

    it('should not update slot when booking has no slot', async () => {
      const bookingNoSlot = { ...mockBookingWithSlot, slot: null };
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(bookingNoSlot);
      (prisma.booking.update as jest.Mock).mockResolvedValue({
        ...bookingNoSlot,
        status: 'CANCELLED',
      });

      await service.cancelBooking(TENANT_ID, 'booking-001');

      expect(prisma.bookingSlot.update).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // getStats
  // =========================================================================
  describe('getStats', () => {
    it('should return booking statistics', async () => {
      (prisma.booking.count as jest.Mock).mockResolvedValue(15);
      (prisma.booking.findMany as jest.Mock).mockResolvedValueOnce([
        { status: 'CONFIRMED', _count: { status: 10 } },
        { status: 'CANCELLED', _count: { status: 5 } },
      ]);

      // Mock groupBy - withTenant delegates to same prisma object
      Object.defineProperty(prisma.booking, 'groupBy', {
        value: jest
          .fn()
          .mockResolvedValueOnce([
            { status: 'CONFIRMED', _count: { status: 10 } },
            { status: 'CANCELLED', _count: { status: 5 } },
          ])
          .mockResolvedValueOnce([
            { source: 'WEB', _count: { source: 12 } },
            { source: 'PHONE', _count: { source: 3 } },
          ]),
        writable: true,
        configurable: true,
      });

      const result = await service.getStats(TENANT_ID);

      expect(result.total).toBe(15);
      expect(result.byStatus).toEqual({
        CONFIRMED: 10,
        CANCELLED: 5,
      });
      expect(result.bySource).toEqual({
        WEB: 12,
        PHONE: 3,
      });
    });

    it('should apply date range filter when provided', async () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-12-31');

      (prisma.booking.count as jest.Mock).mockResolvedValue(0);
      Object.defineProperty(prisma.booking, 'groupBy', {
        value: jest.fn().mockResolvedValue([]),
        writable: true,
        configurable: true,
      });

      await service.getStats(TENANT_ID, fromDate, toDate);

      expect(prisma.booking.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          tenantId: TENANT_ID,
          scheduledDate: { gte: fromDate, lte: toDate },
        }),
      });
    });

    it('should return empty stats when no bookings', async () => {
      (prisma.booking.count as jest.Mock).mockResolvedValue(0);
      Object.defineProperty(prisma.booking, 'groupBy', {
        value: jest.fn().mockResolvedValue([]),
        writable: true,
        configurable: true,
      });

      const result = await service.getStats(TENANT_ID);

      expect(result.total).toBe(0);
      expect(result.byStatus).toEqual({});
      expect(result.bySource).toEqual({});
    });
  });
});
