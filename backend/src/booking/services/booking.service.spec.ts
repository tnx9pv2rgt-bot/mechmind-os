import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BookingService } from './booking.service';
import { PrismaService } from '@common/services/prisma.service';
import { QueueService } from '@common/services/queue.service';
import { LoggerService } from '@common/services/logger.service';

describe('BookingService', () => {
  let service: BookingService;
  let prisma: Record<string, jest.Mock>;
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
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      bookingEvent: {
        create: jest.fn().mockResolvedValue({ id: 'event-001' }),
        update: jest.fn(),
      },
    } as unknown as Record<string, jest.Mock>;

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
  });
});
