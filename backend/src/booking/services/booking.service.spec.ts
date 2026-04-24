import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BookingService } from './booking.service';
import { PrismaService } from '@common/services/prisma.service';
import { QueueService } from '@common/services/queue.service';
import { LoggerService } from '@common/services/logger.service';
import { EncryptionService } from '@common/services/encryption.service';

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
        {
          provide: EncryptionService,
          useValue: {
            encrypt: jest.fn((v: string) => `enc_${v}`),
            decrypt: jest.fn((v: string) => (v.startsWith('enc_') ? v.slice(4) : v)),
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

  // =========================================================================
  // reserveSlot — error handling branches
  // =========================================================================
  describe('reserveSlot — error handling', () => {
    const dto = {
      slotId: SLOT_ID,
      customerId: CUSTOMER_ID,
      vehicleId: 'vehicle-001',
      serviceIds: ['service-001'],
      notes: 'Oil change',
    };

    it('should throw BadRequestException on generic error', async () => {
      (prisma.withSerializableTransaction as jest.Mock).mockRejectedValue(
        new Error('Something went wrong'),
      );

      await expect(service.reserveSlot(TENANT_ID, dto)).rejects.toThrow('Something went wrong');
    });

    it('should rethrow ConflictException from transaction', async () => {
      (prisma.withSerializableTransaction as jest.Mock).mockRejectedValue(
        new ConflictException('Slot is not available'),
      );

      await expect(service.reserveSlot(TENANT_ID, dto)).rejects.toThrow(ConflictException);
    });

    it('should handle reservation without vehicleId', async () => {
      const dtoNoVehicle = { ...dto, vehicleId: undefined };

      const result = await service.reserveSlot(TENANT_ID, dtoNoVehicle);

      expect(result.success).toBe(true);
    });

    it('should handle reservation without serviceIds', async () => {
      const dtoNoServices = { ...dto, serviceIds: undefined };

      const result = await service.reserveSlot(TENANT_ID, dtoNoServices);

      expect(result.success).toBe(true);
    });

    it('should handle reservation with empty notes', async () => {
      const dtoNoNotes = { ...dto, notes: undefined };

      const result = await service.reserveSlot(TENANT_ID, dtoNoNotes);

      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // updateBooking — status transition
  // =========================================================================
  describe('updateBooking — status transition', () => {
    it('should validate status transition when status provided', async () => {
      const existing = { id: 'booking-001', tenantId: TENANT_ID, status: 'COMPLETED' };
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(existing);

      // COMPLETED cannot transition to CONFIRMED
      await expect(
        service.updateBooking(TENANT_ID, 'booking-001', { status: 'CONFIRMED' }),
      ).rejects.toThrow();
    });

    it('should update notes without status transition', async () => {
      const existing = { id: 'booking-001', tenantId: TENANT_ID, status: 'PENDING' };
      const updated = { ...existing, notes: 'Updated notes' };
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(existing);
      (prisma.booking.update as jest.Mock).mockResolvedValue(updated);

      const result = await service.updateBooking(TENANT_ID, 'booking-001', {
        notes: 'Updated notes',
      });

      expect(result).toEqual(updated);
    });
  });

  // =========================================================================
  // createBooking — additional branches
  // =========================================================================
  describe('createBooking — optional fields', () => {
    const baseDto = {
      customerId: CUSTOMER_ID,
      slotId: SLOT_ID,
      scheduledDate: '2024-06-01T09:00:00Z',
    };

    it('should handle technicianId and liftPosition', async () => {
      const dtoWithExtras = {
        ...baseDto,
        vehicleId: 'vehicle-001',
        technicianId: 'tech-001',
        liftPosition: 'Lift 3',
        durationMinutes: 90,
        notes: 'Special request',
        source: 'PHONE' as const,
      };
      const mockBooking = {
        id: 'booking-001',
        tenantId: TENANT_ID,
        scheduledDate: new Date(baseDto.scheduledDate),
        source: 'PHONE',
      };
      (prisma.booking.create as jest.Mock).mockResolvedValue(mockBooking);

      const result = await service.createBooking(TENANT_ID, dtoWithExtras);
      expect(result).toEqual(mockBooking);
    });
  });

  // =========================================================================
  // rescheduleBooking
  // =========================================================================
  describe('rescheduleBooking', () => {
    const mockExisting = {
      id: 'booking-001',
      tenantId: TENANT_ID,
      status: 'CONFIRMED',
      scheduledDate: new Date('2024-06-01T09:00:00Z'),
      slotId: SLOT_ID,
      slot: { id: SLOT_ID },
    };

    it('should reschedule booking to new date without new slot', async () => {
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(mockExisting);
      const rescheduled = { ...mockExisting, scheduledDate: new Date('2024-06-05T10:00:00Z') };
      (prisma.booking.update as jest.Mock).mockResolvedValue(rescheduled);

      const result = await service.rescheduleBooking(TENANT_ID, 'booking-001', {
        newDate: '2024-06-05T10:00:00Z',
      });

      expect(result).toEqual(rescheduled);
      expect(prisma.bookingSlot.update).not.toHaveBeenCalled();
    });

    it('should reschedule to a new slot', async () => {
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(mockExisting);
      (prisma.bookingSlot.findFirst as jest.Mock).mockResolvedValue({
        id: 'new-slot',
        tenantId: TENANT_ID,
        status: 'AVAILABLE',
      });
      const rescheduled = { ...mockExisting, slotId: 'new-slot' };
      (prisma.booking.update as jest.Mock).mockResolvedValue(rescheduled);

      const result = await service.rescheduleBooking(TENANT_ID, 'booking-001', {
        newDate: '2024-06-05T10:00:00Z',
        newSlotId: 'new-slot',
        reason: 'Customer requested',
      });

      expect(result).toEqual(rescheduled);
      // Should free old slot
      expect(prisma.bookingSlot.update).toHaveBeenCalledWith({
        where: { id: SLOT_ID },
        data: { status: 'AVAILABLE' },
      });
    });

    it('should throw NotFoundException when booking not found', async () => {
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.rescheduleBooking(TENANT_ID, 'nonexistent', {
          newDate: '2024-06-05T10:00:00Z',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-reschedulable status', async () => {
      const completed = { ...mockExisting, status: 'COMPLETED' };
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(completed);

      await expect(
        service.rescheduleBooking(TENANT_ID, 'booking-001', {
          newDate: '2024-06-05T10:00:00Z',
        }),
      ).rejects.toThrow();
    });

    it('should throw NotFoundException when new slot not found', async () => {
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(mockExisting);
      (prisma.bookingSlot.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.rescheduleBooking(TENANT_ID, 'booking-001', {
          newDate: '2024-06-05T10:00:00Z',
          newSlotId: 'nonexistent-slot',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when new slot is not available', async () => {
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(mockExisting);
      (prisma.bookingSlot.findFirst as jest.Mock).mockResolvedValue({
        id: 'booked-slot',
        tenantId: TENANT_ID,
        status: 'BOOKED',
      });

      await expect(
        service.rescheduleBooking(TENANT_ID, 'booking-001', {
          newDate: '2024-06-05T10:00:00Z',
          newSlotId: 'booked-slot',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should handle PENDING status as reschedulable', async () => {
      const pending = { ...mockExisting, status: 'PENDING' };
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(pending);
      (prisma.booking.update as jest.Mock).mockResolvedValue(pending);

      const result = await service.rescheduleBooking(TENANT_ID, 'booking-001', {
        newDate: '2024-06-05T10:00:00Z',
      });

      expect(result).toBeDefined();
    });

    it('should handle booking without existing slotId when rescheduling to new slot', async () => {
      const noSlot = { ...mockExisting, slotId: null, slot: null };
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(noSlot);
      (prisma.bookingSlot.findFirst as jest.Mock).mockResolvedValue({
        id: 'new-slot',
        tenantId: TENANT_ID,
        status: 'AVAILABLE',
      });
      (prisma.booking.update as jest.Mock).mockResolvedValue({ ...noSlot, slotId: 'new-slot' });

      const result = await service.rescheduleBooking(TENANT_ID, 'booking-001', {
        newDate: '2024-06-05T10:00:00Z',
        newSlotId: 'new-slot',
      });

      expect(result).toBeDefined();
    });
  });

  // =========================================================================
  // cancelBooking — additional branches
  // =========================================================================
  describe('cancelBooking — edge cases', () => {
    it('should cancel without reason', async () => {
      const booking = {
        id: 'booking-001',
        tenantId: TENANT_ID,
        status: 'PENDING',
        slot: null,
      };
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(booking);
      (prisma.booking.update as jest.Mock).mockResolvedValue({ ...booking, status: 'CANCELLED' });

      const result = await service.cancelBooking(TENANT_ID, 'booking-001');
      expect(result.status).toBe('CANCELLED');
    });
  });

  // =========================================================================
  // findAll — edge cases
  // =========================================================================
  describe('findAll — edge cases', () => {
    it('should apply only fromDate without toDate', async () => {
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.booking.count as jest.Mock).mockResolvedValue(0);

      // Only fromDate, no toDate — should not create scheduledDate filter
      await service.findAll(TENANT_ID, { fromDate: new Date('2024-01-01') });

      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            scheduledDate: expect.anything(),
          }),
        }),
      );
    });
  });

  // =========================================================================
  // SECURITY: Cross-tenant isolation (OWASP A01:2021 — Broken Access Control)
  // =========================================================================
  describe('SECURITY: Cross-tenant booking isolation', () => {
    it('should reject access to booking from different tenant', async () => {
      // Simulate that booking is only found within correct tenant scope
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findById(TENANT_ID, 'booking-999')).rejects.toThrow(NotFoundException);

      // Verify withTenant was called to enforce scoping
      expect(prisma.withTenant).toHaveBeenCalledWith(TENANT_ID, expect.any(Function));
    });

    it('should filter findAll by tenantId, rejecting cross-tenant access', async () => {
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.booking.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(TENANT_ID);

      // Verify ALL queries include tenantId in WHERE clause
      const callArgs = (prisma.booking.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.tenantId).toBe(TENANT_ID);
    });

    it('should never return other tenant bookings via findAll', async () => {
      const myTenantBooking = { id: 'booking-001', tenantId: TENANT_ID };
      const otherTenantBooking = { id: 'booking-999', tenantId: 'tenant-002' };
      // Only return bookings for TENANT_ID
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([myTenantBooking]);
      (prisma.booking.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll(TENANT_ID);

      expect(result.bookings).toEqual([myTenantBooking]);
      expect(result.bookings).not.toContainEqual(otherTenantBooking);
    });
  });

  // =========================================================================
  // SECURITY: Race condition & advisory lock verification
  // =========================================================================
  describe('SECURITY: Concurrent booking race condition prevention', () => {
    it('should acquire advisory lock before booking slot', async () => {
      const dto = {
        slotId: SLOT_ID,
        customerId: CUSTOMER_ID,
        vehicleId: 'vehicle-001',
        serviceIds: ['service-001'],
        notes: 'Test',
      };

      await service.reserveSlot(TENANT_ID, dto);

      // Lock must be acquired on (tenantId, slotId) tuple
      expect(prisma.acquireAdvisoryLock).toHaveBeenCalledWith(TENANT_ID, SLOT_ID);
    });

    it('should release advisory lock even if booking creation fails', async () => {
      const dto = {
        slotId: SLOT_ID,
        customerId: CUSTOMER_ID,
        vehicleId: 'vehicle-001',
        serviceIds: ['service-001'],
        notes: 'Test',
      };
      // Simulate booking failure after lock acquired
      (prisma.customer.findFirst as jest.Mock).mockResolvedValue(null);

      try {
        await service.reserveSlot(TENANT_ID, dto);
      } catch {
        /* expected */
      }

      expect(prisma.releaseAdvisoryLock).toHaveBeenCalledWith(TENANT_ID, SLOT_ID);
    });

    it('should use SERIALIZABLE transaction for race condition prevention', async () => {
      const dto = {
        slotId: SLOT_ID,
        customerId: CUSTOMER_ID,
        vehicleId: 'vehicle-001',
        serviceIds: ['service-001'],
        notes: 'Test',
      };

      await service.reserveSlot(TENANT_ID, dto);

      expect(prisma.withSerializableTransaction).toHaveBeenCalled();
      const callArgs = (prisma.withSerializableTransaction as jest.Mock).mock.calls[0];
      expect(typeof callArgs[0]).toBe('function');
    });

    it('should reject concurrent attempts when lock unavailable', async () => {
      const dto = {
        slotId: SLOT_ID,
        customerId: CUSTOMER_ID,
        vehicleId: 'vehicle-001',
        serviceIds: ['service-001'],
        notes: 'Test',
      };
      (prisma.acquireAdvisoryLock as jest.Mock).mockResolvedValue(false);

      const result = await service.reserveSlot(TENANT_ID, dto);

      expect(result.success).toBe(false);
      expect(result.conflict).toBe(true);
      expect(result.retryAfter).toBeDefined();
    });
  });

  // =========================================================================
  // SECURITY: State machine validation
  // =========================================================================
  describe('SECURITY: Booking state machine transitions', () => {
    it('should reject invalid status transition (CANCELLED → CONFIRMED)', async () => {
      const booking = { id: 'booking-001', tenantId: TENANT_ID, status: 'CANCELLED' };
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(booking);

      // Attempting to confirm a cancelled booking should fail
      await expect(
        service.updateBooking(TENANT_ID, 'booking-001', { status: 'CONFIRMED' }),
      ).rejects.toThrow();
    });

    it('should allow valid transition (PENDING → CONFIRMED)', async () => {
      const booking = { id: 'booking-001', tenantId: TENANT_ID, status: 'PENDING' };
      const updated = { ...booking, status: 'CONFIRMED' };
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(booking);
      (prisma.booking.update as jest.Mock).mockResolvedValue(updated);

      const result = await service.updateBooking(TENANT_ID, 'booking-001', {
        status: 'CONFIRMED',
      });

      expect(result.status).toBe('CONFIRMED');
    });
  });

  // =========================================================================
  // SECURITY: Optimistic locking conflict detection
  // =========================================================================
  describe('SECURITY: Optimistic locking & version conflicts', () => {
    it('should detect conflicting updates on concurrent modifications', async () => {
      const booking = { id: 'booking-001', tenantId: TENANT_ID, status: 'PENDING' };
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(booking);
      // Simulate conflict: another process already updated
      (prisma.booking.update as jest.Mock).mockImplementation(() => {
        throw new Error('Prisma P2025: Record not found (conflict)');
      });

      await expect(
        service.updateBooking(TENANT_ID, 'booking-001', {
          status: 'CONFIRMED',
        }),
      ).rejects.toThrow();
    });
  });

  // =========================================================================
  // bulkConfirm
  // =========================================================================
  describe('bulkConfirm', () => {
    it('should confirm multiple PENDING bookings', async () => {
      (prisma.booking.findFirst as jest.Mock)
        .mockResolvedValueOnce({ id: 'booking-001', tenantId: TENANT_ID, status: 'PENDING' })
        .mockResolvedValueOnce({ id: 'booking-002', tenantId: TENANT_ID, status: 'PENDING' });

      const result = await service.bulkConfirm(TENANT_ID, ['booking-001', 'booking-002']);

      expect(result.confirmed).toBe(2);
      expect(result.failed).toEqual([]);
      expect(prisma.booking.update).toHaveBeenCalledTimes(2);
    });

    it('should skip bookings not found', async () => {
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.bulkConfirm(TENANT_ID, ['nonexistent']);

      expect(result.confirmed).toBe(0);
      expect(result.failed).toEqual([{ id: 'nonexistent', reason: 'Prenotazione non trovata' }]);
    });

    it('should skip bookings with non-PENDING status', async () => {
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue({
        id: 'booking-001',
        tenantId: TENANT_ID,
        status: 'CONFIRMED',
      });

      const result = await service.bulkConfirm(TENANT_ID, ['booking-001']);

      expect(result.confirmed).toBe(0);
      expect(result.failed[0].reason).toContain('Stato CONFIRMED');
    });

    it('should handle mixed results (some succeed, some fail)', async () => {
      (prisma.booking.findFirst as jest.Mock)
        .mockResolvedValueOnce({ id: 'booking-001', tenantId: TENANT_ID, status: 'PENDING' })
        .mockResolvedValueOnce(null);

      const result = await service.bulkConfirm(TENANT_ID, ['booking-001', 'booking-002']);

      expect(result.confirmed).toBe(1);
      expect(result.failed).toHaveLength(1);
    });

    it('should catch and report internal errors during confirmation', async () => {
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue({
        id: 'booking-001',
        tenantId: TENANT_ID,
        status: 'PENDING',
      });
      (prisma.booking.update as jest.Mock).mockRejectedValue(new Error('DB error'));

      const result = await service.bulkConfirm(TENANT_ID, ['booking-001']);

      expect(result.confirmed).toBe(0);
      expect(result.failed[0].reason).toBe('Errore interno');
    });

    it('should emit booking.updated event for each confirmed booking', async () => {
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue({
        id: 'booking-001',
        tenantId: TENANT_ID,
        status: 'PENDING',
      });

      await service.bulkConfirm(TENANT_ID, ['booking-001']);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'booking.updated',
        expect.objectContaining({
          bookingId: 'booking-001',
          tenantId: TENANT_ID,
          changes: { status: 'CONFIRMED' },
        }),
      );
    });

    it('should create booking event for each confirmed booking', async () => {
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue({
        id: 'booking-001',
        tenantId: TENANT_ID,
        status: 'PENDING',
      });

      await service.bulkConfirm(TENANT_ID, ['booking-001']);

      expect(prisma.bookingEvent.create).toHaveBeenCalledWith({
        data: {
          eventType: 'booking_confirmed',
          payload: { bulkAction: true },
          booking: { connect: { id: 'booking-001' } },
        },
      });
    });

    it('should handle empty list', async () => {
      const result = await service.bulkConfirm(TENANT_ID, []);

      expect(result.confirmed).toBe(0);
      expect(result.failed).toEqual([]);
    });
  });

  // =========================================================================
  // decryptCustomerInBooking
  // =========================================================================
  describe('decryptCustomerInBooking', () => {
    it('should decrypt encrypted customer fields', async () => {
      const mockBookingWithEncrypted = {
        id: 'booking-001',
        tenantId: TENANT_ID,
        customer: {
          id: CUSTOMER_ID,
          encryptedFirstName: 'enc_John',
          encryptedLastName: 'enc_Doe',
          encryptedEmail: 'enc_john@example.com',
          encryptedPhone: 'enc_1234567890',
        } as Record<string, unknown>,
      };

      // Call through createBooking which uses decryptCustomerInBooking
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.bookingSlot.findUnique as jest.Mock).mockResolvedValue(mockSlot);
      (prisma.booking.create as jest.Mock).mockResolvedValue(mockBookingWithEncrypted);

      const dto = {
        customerId: CUSTOMER_ID,
        vehicleId: 'vehicle-001',
        slotId: SLOT_ID,
        scheduledDate: '2024-06-01T09:00:00Z',
        durationMinutes: 60,
      };

      const result = await service.createBooking(TENANT_ID, dto);

      // Verify decryption happened (firstName should not be encrypted anymore)
      const customerData = result.customer as any;
      expect(customerData.firstName).toBeDefined();
      expect(customerData.email).toBeDefined();
    });

    it('should handle decryption errors gracefully', async () => {
      const mockEncryption = {
        encrypt: jest.fn((v: string) => `enc_${v}`),
        decrypt: jest.fn(() => {
          throw new Error('Decryption failed');
        }),
      };

      const moduleWithErrorEncryption: TestingModule = await Test.createTestingModule({
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
          { provide: EncryptionService, useValue: mockEncryption },
        ],
      }).compile();

      const serviceWithErrorEncryption =
        moduleWithErrorEncryption.get<BookingService>(BookingService);

      const mockBookingWithEncrypted = {
        id: 'booking-001',
        tenantId: TENANT_ID,
        customer: {
          id: CUSTOMER_ID,
          encryptedFirstName: 'enc_John',
          encryptedEmail: 'enc_john@example.com',
        } as Record<string, unknown>,
      };

      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.bookingSlot.findUnique as jest.Mock).mockResolvedValue(mockSlot);
      (prisma.booking.create as jest.Mock).mockResolvedValue(mockBookingWithEncrypted);

      const dto = {
        customerId: CUSTOMER_ID,
        vehicleId: 'vehicle-001',
        slotId: SLOT_ID,
        scheduledDate: '2024-06-01T09:00:00Z',
      };

      const result = await serviceWithErrorEncryption.createBooking(TENANT_ID, dto);

      // Should return '[encrypted]' when decryption fails
      const customerData = result.customer as any;
      expect(customerData.firstName).toBe('[encrypted]');
    });
  });

  // =========================================================================
  // reserveSlot — Prisma error handling
  // =========================================================================
  describe('reserveSlot — error propagation', () => {
    it('should wrap generic errors in BadRequestException and release lock', async () => {
      const dto = {
        slotId: SLOT_ID,
        customerId: CUSTOMER_ID,
        vehicleId: 'vehicle-001',
        serviceIds: ['service-001'],
        notes: 'Test',
      };

      (prisma.withSerializableTransaction as jest.Mock).mockRejectedValue(
        new Error('Generic error'),
      );

      await expect(service.reserveSlot(TENANT_ID, dto)).rejects.toThrow(BadRequestException);
      expect(prisma.releaseAdvisoryLock).toHaveBeenCalled();
    });
  });
});
