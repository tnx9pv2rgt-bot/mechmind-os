import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, BookingStatus } from '@prisma/client';
import { BookingService, BookingCreatedEvent } from '../services/booking.service';
import { PrismaService } from '@common/services/prisma.service';
import { QueueService } from '@common/services/queue.service';
import { LoggerService } from '@common/services/logger.service';

describe('BookingService', () => {
  let service: BookingService;
  let prisma: jest.Mocked<PrismaService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let queueService: jest.Mocked<QueueService>;
  let logger: jest.Mocked<LoggerService>;

  const tenantId = 'tenant-123';
  const slotId = 'slot-123';
  const customerId = 'customer-123';
  const vehicleId = 'vehicle-123';
  const bookingId = 'booking-123';
  const serviceId = 'service-123';

  const mockSlot = {
    id: slotId,
    tenantId,
    startTime: new Date('2024-01-15T09:00:00Z'),
    endTime: new Date('2024-01-15T10:00:00Z'),
    status: 'AVAILABLE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCustomer = {
    id: customerId,
    tenantId,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '1234567890',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBooking = {
    id: bookingId,
    tenantId,
    customerId,
    slotId,
    status: BookingStatus.CONFIRMED,
    scheduledDate: new Date('2024-01-15T09:00:00Z'),
    durationMinutes: 60,
    notes: null,
    source: 'WEB',
    vapiCallId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    customer: mockCustomer,
    vehicle: null,
    slot: mockSlot,
    services: [],
    events: [],
  };

  // Mock transaction function
  const mockTx = {
    bookingSlot: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    customer: {
      findFirst: jest.fn(),
    },
    bookingEvent: {
      create: jest.fn(),
      update: jest.fn(),
    },
    booking: {
      create: jest.fn(),
    },
    bookingService: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        {
          provide: PrismaService,
          useValue: {
            acquireAdvisoryLock: jest.fn(),
            releaseAdvisoryLock: jest.fn(),
            withSerializableTransaction: jest.fn(),
            withTenant: jest.fn(),
            booking: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
              groupBy: jest.fn(),
            },
            bookingSlot: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
            bookingEvent: {
              create: jest.fn(),
            },
            customer: {
              findFirst: jest.fn(),
            },
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: QueueService,
          useValue: {
            addBookingJob: jest.fn(),
            addNotificationJob: jest.fn(),
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

    service = module.get<BookingService>(BookingService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    eventEmitter = module.get(EventEmitter2) as jest.Mocked<EventEmitter2>;
    queueService = module.get(QueueService) as jest.Mocked<QueueService>;
    logger = module.get(LoggerService) as jest.Mocked<LoggerService>;

    jest.clearAllMocks();
  });

  describe('reserveSlot', () => {
    const reserveDto = {
      slotId,
      customerId,
      vehicleId,
      serviceIds: [serviceId],
      notes: 'Test notes',
    };

    it('should successfully reserve a slot with advisory lock and serializable transaction', async () => {
      // Step 1: Lock acquisition succeeds
      prisma.acquireAdvisoryLock.mockResolvedValue(true);

      // Step 2-9: Transaction succeeds
      prisma.withSerializableTransaction.mockImplementation(async (callback) => {
        // Setup mock transaction responses
        mockTx.bookingSlot.findFirst.mockResolvedValue(mockSlot);
        mockTx.customer.findFirst.mockResolvedValue(mockCustomer);
        mockTx.bookingEvent.create.mockResolvedValue({ id: 'event-123' });
        mockTx.bookingSlot.update.mockResolvedValue({ ...mockSlot, status: 'BOOKED' });
        mockTx.booking.create.mockResolvedValue(mockBooking);
        mockTx.bookingEvent.update.mockResolvedValue({ id: 'event-123' });

        return callback(mockTx as any);
      });

      const result = await service.reserveSlot(tenantId, reserveDto);

      expect(result.success).toBe(true);
      expect(result.booking).toBeDefined();
      expect(prisma.acquireAdvisoryLock).toHaveBeenCalledWith(tenantId, slotId);
      expect(prisma.releaseAdvisoryLock).toHaveBeenCalledWith(tenantId, slotId);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'booking.created',
        expect.any(BookingCreatedEvent),
      );
    });

    it('should queue for retry when advisory lock cannot be acquired', async () => {
      prisma.acquireAdvisoryLock.mockResolvedValue(false);
      queueService.addBookingJob.mockResolvedValue({ id: 'job-123' } as any);

      const result = await service.reserveSlot(tenantId, reserveDto);

      expect(result.success).toBe(false);
      expect(result.conflict).toBe(true);
      expect(result.retryAfter).toBe(5000);
      expect(result.queuePosition).toBe(1);
      expect(queueService.addBookingJob).toHaveBeenCalledWith(
        'reserve-slot-retry',
        expect.objectContaining({
          type: 'reserve-slot-retry',
          payload: reserveDto,
          tenantId,
        }),
        { delay: 5000 },
      );
      expect(prisma.releaseAdvisoryLock).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when slot does not exist', async () => {
      prisma.acquireAdvisoryLock.mockResolvedValue(true);
      prisma.withSerializableTransaction.mockImplementation(async (callback) => {
        mockTx.bookingSlot.findFirst.mockResolvedValue(null);
        return callback(mockTx as any);
      });

      await expect(service.reserveSlot(tenantId, reserveDto)).rejects.toThrow(NotFoundException);
      expect(prisma.releaseAdvisoryLock).toHaveBeenCalledWith(tenantId, slotId);
    });

    it('should throw ConflictException when slot is not available', async () => {
      prisma.acquireAdvisoryLock.mockResolvedValue(true);
      prisma.withSerializableTransaction.mockImplementation(async (callback) => {
        mockTx.bookingSlot.findFirst.mockResolvedValue({
          ...mockSlot,
          status: 'BOOKED',
        });
        return callback(mockTx as any);
      });

      await expect(service.reserveSlot(tenantId, reserveDto)).rejects.toThrow(ConflictException);
      expect(prisma.releaseAdvisoryLock).toHaveBeenCalledWith(tenantId, slotId);
    });

    it('should throw NotFoundException when customer does not exist', async () => {
      prisma.acquireAdvisoryLock.mockResolvedValue(true);
      prisma.withSerializableTransaction.mockImplementation(async (callback) => {
        mockTx.bookingSlot.findFirst.mockResolvedValue(mockSlot);
        mockTx.customer.findFirst.mockResolvedValue(null);
        return callback(mockTx as any);
      });

      await expect(service.reserveSlot(tenantId, reserveDto)).rejects.toThrow(NotFoundException);
      expect(prisma.releaseAdvisoryLock).toHaveBeenCalledWith(tenantId, slotId);
    });

    it('should always release advisory lock even on error', async () => {
      prisma.acquireAdvisoryLock.mockResolvedValue(true);
      prisma.withSerializableTransaction.mockRejectedValue(new Error('Database error'));

      await expect(service.reserveSlot(tenantId, reserveDto)).rejects.toThrow();
      expect(prisma.releaseAdvisoryLock).toHaveBeenCalledWith(tenantId, slotId);
    });

    it('should handle P2034 serialization conflict error', async () => {
      prisma.acquireAdvisoryLock.mockResolvedValue(true);
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Transaction failed due to serialization conflict',
        { code: 'P2034', clientVersion: '5.0.0' },
      );
      prisma.withSerializableTransaction.mockRejectedValue(prismaError);

      await expect(service.reserveSlot(tenantId, reserveDto)).rejects.toThrow(
        new ConflictException('Booking conflict detected. Please try again.'),
      );
      expect(prisma.releaseAdvisoryLock).toHaveBeenCalledWith(tenantId, slotId);
    });

    it('should handle ConflictException from transaction', async () => {
      prisma.acquireAdvisoryLock.mockResolvedValue(true);
      prisma.withSerializableTransaction.mockRejectedValue(new ConflictException('Slot booked'));

      await expect(service.reserveSlot(tenantId, reserveDto)).rejects.toThrow(ConflictException);
      expect(prisma.releaseAdvisoryLock).toHaveBeenCalledWith(tenantId, slotId);
    });

    it('should handle NotFoundException from transaction', async () => {
      prisma.acquireAdvisoryLock.mockResolvedValue(true);
      prisma.withSerializableTransaction.mockRejectedValue(new NotFoundException('Not found'));

      await expect(service.reserveSlot(tenantId, reserveDto)).rejects.toThrow(NotFoundException);
      expect(prisma.releaseAdvisoryLock).toHaveBeenCalledWith(tenantId, slotId);
    });

    it('should handle generic errors and throw BadRequestException', async () => {
      prisma.acquireAdvisoryLock.mockResolvedValue(true);
      prisma.withSerializableTransaction.mockRejectedValue(new Error('Unknown error'));

      await expect(service.reserveSlot(tenantId, reserveDto)).rejects.toThrow(BadRequestException);
      expect(prisma.releaseAdvisoryLock).toHaveBeenCalledWith(tenantId, slotId);
    });

    it('should successfully reserve slot without optional fields', async () => {
      const minimalDto = {
        slotId,
        customerId,
      };

      prisma.acquireAdvisoryLock.mockResolvedValue(true);
      prisma.withSerializableTransaction.mockImplementation(async (callback) => {
        mockTx.bookingSlot.findFirst.mockResolvedValue(mockSlot);
        mockTx.customer.findFirst.mockResolvedValue(mockCustomer);
        mockTx.bookingEvent.create.mockResolvedValue({ id: 'event-123' });
        mockTx.bookingSlot.update.mockResolvedValue({ ...mockSlot, status: 'BOOKED' });
        mockTx.booking.create.mockResolvedValue(mockBooking);
        mockTx.bookingEvent.update.mockResolvedValue({ id: 'event-123' });

        return callback(mockTx as any);
      });

      const result = await service.reserveSlot(tenantId, minimalDto);

      expect(result.success).toBe(true);
    });

    it('should emit correct BookingCreatedEvent', async () => {
      prisma.acquireAdvisoryLock.mockResolvedValue(true);
      prisma.withSerializableTransaction.mockImplementation(async (callback) => {
        mockTx.bookingSlot.findFirst.mockResolvedValue(mockSlot);
        mockTx.customer.findFirst.mockResolvedValue(mockCustomer);
        mockTx.bookingEvent.create.mockResolvedValue({ id: 'event-123' });
        mockTx.bookingSlot.update.mockResolvedValue({ ...mockSlot, status: 'BOOKED' });
        mockTx.booking.create.mockResolvedValue(mockBooking);
        mockTx.bookingEvent.update.mockResolvedValue({ id: 'event-123' });

        return callback(mockTx as any);
      });

      await service.reserveSlot(tenantId, reserveDto);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'booking.created',
        expect.objectContaining({
          bookingId: mockBooking.id,
          tenantId,
          customerId,
          scheduledDate: mockBooking.scheduledDate,
          source: mockBooking.source,
        }),
      );
    });
  });

  describe('createBooking', () => {
    const createDto = {
      customerId,
      slotId,
      scheduledDate: '2024-01-15T09:00:00Z',
      durationMinutes: 60,
      vehicleId,
      serviceIds: [serviceId],
      notes: 'Test notes',
      source: 'WEB' as const,
      vapiCallId: 'call-123',
    };

    it('should create a booking successfully', async () => {
      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.bookingSlot.findUnique.mockResolvedValue(mockSlot);
        prisma.booking.create.mockResolvedValue(mockBooking);
        prisma.bookingSlot.update.mockResolvedValue({ ...mockSlot, status: 'BOOKED' });
        prisma.bookingEvent.create.mockResolvedValue({ id: 'event-123' });

        return callback(prisma);
      });

      const result = await service.createBooking(tenantId, createDto);

      expect(result).toBeDefined();
      expect(prisma.booking.create).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'booking.created',
        expect.any(BookingCreatedEvent),
      );
    });

    it('should throw NotFoundException when slot does not exist', async () => {
      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.bookingSlot.findUnique.mockResolvedValue(null);
        return callback(prisma);
      });

      await expect(service.createBooking(tenantId, createDto)).rejects.toThrow(NotFoundException);
    });

    it('should create booking with minimal data', async () => {
      const minimalDto = {
        customerId,
        slotId,
        scheduledDate: '2024-01-15T09:00:00Z',
      };

      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.bookingSlot.findUnique.mockResolvedValue(mockSlot);
        prisma.booking.create.mockResolvedValue({
          ...mockBooking,
          notes: null,
          source: 'WEB',
          vapiCallId: null,
        });
        prisma.bookingSlot.update.mockResolvedValue({ ...mockSlot, status: 'BOOKED' });
        prisma.bookingEvent.create.mockResolvedValue({ id: 'event-123' });

        return callback(prisma);
      });

      const result = await service.createBooking(tenantId, minimalDto);

      expect(result).toBeDefined();
    });
  });

  describe('findById', () => {
    it('should return booking by ID', async () => {
      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.booking.findFirst.mockResolvedValue(mockBooking);
        return callback(prisma);
      });

      const result = await service.findById(tenantId, bookingId);

      expect(result).toEqual(mockBooking);
      expect(prisma.booking.findFirst).toHaveBeenCalledWith({
        where: { id: bookingId, tenantId },
        include: {
          customer: true,
          vehicle: true,
          services: { include: { service: true } },
          slot: true,
          events: { orderBy: { createdAt: 'desc' } },
        },
      });
    });

    it('should throw NotFoundException when booking not found', async () => {
      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.booking.findFirst.mockResolvedValue(null);
        return callback(prisma);
      });

      await expect(service.findById(tenantId, 'non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all bookings with filters', async () => {
      const mockBookings = [
        { id: 'booking-1', status: BookingStatus.CONFIRMED },
        { id: 'booking-2', status: BookingStatus.PENDING },
      ];

      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.booking.findMany.mockResolvedValue(mockBookings as any);
        prisma.booking.count.mockResolvedValue(2);
        return callback(prisma);
      });

      const result = await service.findAll(tenantId, {
        status: BookingStatus.CONFIRMED,
        customerId,
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-31'),
        limit: 10,
        offset: 0,
      });

      expect(result.bookings).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should return all bookings without filters', async () => {
      const mockBookings = [{ id: 'booking-1' }];

      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.booking.findMany.mockResolvedValue(mockBookings as any);
        prisma.booking.count.mockResolvedValue(1);
        return callback(prisma);
      });

      const result = await service.findAll(tenantId);

      expect(result.bookings).toHaveLength(1);
      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 0,
        }),
      );
    });

    it('should handle empty results', async () => {
      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.booking.findMany.mockResolvedValue([]);
        prisma.booking.count.mockResolvedValue(0);
        return callback(prisma);
      });

      const result = await service.findAll(tenantId);

      expect(result.bookings).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('updateBooking', () => {
    const updateDto = {
      status: 'CONFIRMED',
      scheduledDate: '2024-01-16T10:00:00Z',
      notes: 'Updated notes',
    };

    it('should update a booking successfully', async () => {
      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.booking.findFirst.mockResolvedValue(mockBooking);
        prisma.booking.update.mockResolvedValue({
          ...mockBooking,
          ...updateDto,
          scheduledDate: new Date(updateDto.scheduledDate),
        });
        prisma.bookingEvent.create.mockResolvedValue({ id: 'event-123' });
        return callback(prisma);
      });

      const result = await service.updateBooking(tenantId, bookingId, updateDto);

      expect(result).toBeDefined();
      expect(prisma.booking.update).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('booking.updated', {
        bookingId,
        tenantId,
        changes: updateDto,
      });
    });

    it('should throw NotFoundException when booking not found', async () => {
      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.booking.findFirst.mockResolvedValue(null);
        return callback(prisma);
      });

      await expect(service.updateBooking(tenantId, 'non-existent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update booking with partial fields', async () => {
      const partialDto = { notes: 'Only updating notes' };

      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.booking.findFirst.mockResolvedValue(mockBooking);
        prisma.booking.update.mockResolvedValue({
          ...mockBooking,
          notes: 'Only updating notes',
        });
        prisma.bookingEvent.create.mockResolvedValue({ id: 'event-123' });
        return callback(prisma);
      });

      const result = await service.updateBooking(tenantId, bookingId, partialDto);

      expect(prisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { notes: 'Only updating notes' },
        }),
      );
    });
  });

  describe('cancelBooking', () => {
    it('should cancel a booking and free the slot', async () => {
      const bookingWithSlot = {
        ...mockBooking,
        slot: mockSlot,
      };

      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.booking.findFirst.mockResolvedValue(bookingWithSlot);
        prisma.booking.update.mockResolvedValue({ ...bookingWithSlot, status: BookingStatus.CANCELLED });
        prisma.bookingSlot.update.mockResolvedValue({ ...mockSlot, status: 'AVAILABLE' });
        prisma.bookingEvent.create.mockResolvedValue({ id: 'event-123' });
        return callback(prisma);
      });

      const result = await service.cancelBooking(tenantId, bookingId, 'Customer request');

      expect(result.status).toBe(BookingStatus.CANCELLED);
      expect(prisma.bookingSlot.update).toHaveBeenCalledWith({
        where: { id: mockSlot.id },
        data: { status: 'AVAILABLE' },
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith('booking.cancelled', {
        bookingId,
        tenantId,
        reason: 'Customer request',
      });
    });

    it('should cancel booking without slot', async () => {
      const bookingWithoutSlot = {
        ...mockBooking,
        slot: null,
      };

      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.booking.findFirst.mockResolvedValue(bookingWithoutSlot);
        prisma.booking.update.mockResolvedValue({ ...bookingWithoutSlot, status: BookingStatus.CANCELLED });
        prisma.bookingEvent.create.mockResolvedValue({ id: 'event-123' });
        return callback(prisma);
      });

      const result = await service.cancelBooking(tenantId, bookingId);

      expect(prisma.bookingSlot.update).not.toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'booking.cancelled',
        expect.objectContaining({ reason: undefined }),
      );
    });

    it('should throw NotFoundException when booking not found', async () => {
      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.booking.findFirst.mockResolvedValue(null);
        return callback(prisma);
      });

      await expect(service.cancelBooking(tenantId, 'non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStats', () => {
    it('should return booking statistics', async () => {
      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.booking.count.mockResolvedValue(100);
        prisma.booking.groupBy
          .mockResolvedValueOnce([
            { status: BookingStatus.CONFIRMED, _count: { status: 50 } },
            { status: BookingStatus.PENDING, _count: { status: 30 } },
            { status: BookingStatus.CANCELLED, _count: { status: 20 } },
          ] as any)
          .mockResolvedValueOnce([
            { source: 'WEB', _count: { source: 70 } },
            { source: 'PHONE', _count: { source: 30 } },
          ] as any);
        return callback(prisma);
      });

      const result = await service.getStats(tenantId);

      expect(result.total).toBe(100);
      expect(result.byStatus).toEqual({
        CONFIRMED: 50,
        PENDING: 30,
        CANCELLED: 20,
      });
      expect(result.bySource).toEqual({
        WEB: 70,
        PHONE: 30,
      });
    });

    it('should return stats with date range filter', async () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-31');

      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.booking.count.mockResolvedValue(50);
        prisma.booking.groupBy
          .mockResolvedValueOnce([{ status: BookingStatus.CONFIRMED, _count: { status: 50 } }] as any)
          .mockResolvedValueOnce([{ source: 'WEB', _count: { source: 50 } }] as any);
        return callback(prisma);
      });

      const result = await service.getStats(tenantId, fromDate, toDate);

      expect(prisma.booking.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            scheduledDate: { gte: fromDate, lte: toDate },
          }),
        }),
      );
    });

    it('should handle empty stats', async () => {
      prisma.withTenant.mockImplementation(async (tenant, callback) => {
        prisma.booking.count.mockResolvedValue(0);
        prisma.booking.groupBy.mockResolvedValue([]).mockResolvedValue([]);
        return callback(prisma);
      });

      const result = await service.getStats(tenantId);

      expect(result.total).toBe(0);
      expect(result.byStatus).toEqual({});
      expect(result.bySource).toEqual({});
    });
  });
});
