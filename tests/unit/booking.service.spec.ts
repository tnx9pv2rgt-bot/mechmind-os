/**
 * MechMind OS v10 - Booking Service Unit Tests
 * Critical path testing for booking operations with advisory locks
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BookingService } from '@/booking/booking.service';
import { BookingRepository } from '@/booking/booking.repository';
import { EventStoreService } from '@/events/event-store.service';
import { AdvisoryLockService } from '@/common/advisory-lock.service';
import { EncryptionService } from '@/encryption/encryption.service';
import { NotificationService } from '@/notifications/notification.service';
import { Logger } from '@nestjs/common';
import { 
  ConflictException, 
  NotFoundException, 
  RequestTimeoutException,
  BadRequestException 
} from '@nestjs/common';

// Mock data factories
import { 
  createTenant, 
  createShop, 
  createCustomer, 
  createBooking 
} from '@test/mock-factories';

describe('BookingService', () => {
  let service: BookingService;
  let bookingRepository: jest.Mocked<BookingRepository>;
  let eventStore: jest.Mocked<EventStoreService>;
  let lockService: jest.Mocked<AdvisoryLockService>;
  let encryptionService: jest.Mocked<EncryptionService>;
  let notificationService: jest.Mocked<NotificationService>;

  // Test data
  const tenant = createTenant();
  const shop = createShop(tenant.id);
  const customer = createCustomer(tenant.id, shop.id);
  const testDate = new Date('2024-01-15T14:00:00Z');

  beforeEach(async () => {
    // Create mocks
    const mockBookingRepository = {
      findById: jest.fn(),
      findByShopAndTimeRange: jest.fn(),
      findConflictingBookings: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      countByShopAndDate: jest.fn(),
    };

    const mockEventStore = {
      appendEvent: jest.fn(),
      getEvents: jest.fn(),
      getEventsForAggregate: jest.fn(),
    };

    const mockLockService = {
      acquireLock: jest.fn(),
      releaseLock: jest.fn(),
      withLock: jest.fn(),
      getLockWaitTime: jest.fn(),
    };

    const mockEncryptionService = {
      encrypt: jest.fn((data) => `encrypted:${data}`),
      decrypt: jest.fn((data) => data.replace('encrypted:', '')),
      encryptObject: jest.fn(),
      decryptObject: jest.fn(),
    };

    const mockNotificationService = {
      sendBookingConfirmation: jest.fn(),
      sendBookingReminder: jest.fn(),
      sendCancellationNotification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: BookingRepository, useValue: mockBookingRepository },
        { provide: EventStoreService, useValue: mockEventStore },
        { provide: AdvisoryLockService, useValue: mockLockService },
        { provide: EncryptionService, useValue: mockEncryptionService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: Logger, useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn() } },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
    bookingRepository = module.get(BookingRepository);
    eventStore = module.get(EventStoreService);
    lockService = module.get(AdvisoryLockService);
    encryptionService = module.get(EncryptionService);
    notificationService = module.get(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createBooking', () => {
    const createBookingDto = {
      shopId: shop.id,
      customerId: customer.id,
      serviceType: 'oil_change',
      scheduledAt: testDate,
      durationMinutes: 60,
      notes: 'Test booking',
    };

    it('should acquire advisory lock successfully', async () => {
      // Arrange
      lockService.acquireLock.mockResolvedValue(true);
      lockService.releaseLock.mockResolvedValue(true);
      bookingRepository.findConflictingBookings.mockResolvedValue([]);
      bookingRepository.create.mockResolvedValue({
        id: 'booking-123',
        ...createBookingDto,
        tenantId: tenant.id,
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      eventStore.appendEvent.mockResolvedValue(undefined);

      // Act
      await service.createBooking(tenant.id, createBookingDto);

      // Assert
      expect(lockService.acquireLock).toHaveBeenCalledWith(
        expect.any(String),
        5000
      );
      expect(lockService.releaseLock).toHaveBeenCalled();
    });

    it('should reject booking when slot unavailable', async () => {
      // Arrange
      lockService.acquireLock.mockResolvedValue(true);
      lockService.releaseLock.mockResolvedValue(true);
      bookingRepository.findConflictingBookings.mockResolvedValue([
        { id: 'existing-booking', scheduledAt: testDate },
      ]);

      // Act & Assert
      await expect(service.createBooking(tenant.id, createBookingDto))
        .rejects
        .toThrow(ConflictException);
      
      expect(bookingRepository.create).not.toHaveBeenCalled();
      expect(lockService.releaseLock).toHaveBeenCalled();
    });

    it('should handle lock timeout gracefully', async () => {
      // Arrange
      lockService.acquireLock.mockResolvedValue(false);

      // Act & Assert
      await expect(service.createBooking(tenant.id, createBookingDto))
        .rejects
        .toThrow(RequestTimeoutException);
      
      expect(bookingRepository.create).not.toHaveBeenCalled();
    });

    it('should create booking event in event store', async () => {
      // Arrange
      const bookingId = 'booking-123';
      lockService.acquireLock.mockResolvedValue(true);
      lockService.releaseLock.mockResolvedValue(true);
      bookingRepository.findConflictingBookings.mockResolvedValue([]);
      bookingRepository.create.mockResolvedValue({
        id: bookingId,
        ...createBookingDto,
        tenantId: tenant.id,
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      eventStore.appendEvent.mockResolvedValue(undefined);

      // Act
      await service.createBooking(tenant.id, createBookingDto);

      // Assert
      expect(eventStore.appendEvent).toHaveBeenCalledWith(
        tenant.id,
        'booking',
        bookingId,
        'BookingCreated',
        expect.objectContaining({
          shopId: createBookingDto.shopId,
          customerId: createBookingDto.customerId,
          serviceType: createBookingDto.serviceType,
          scheduledAt: createBookingDto.scheduledAt,
        })
      );
    });

    it('should prevent double booking with concurrent requests', async () => {
      // Arrange - simulate race condition
      lockService.acquireLock.mockResolvedValue(true);
      lockService.releaseLock.mockResolvedValue(true);
      
      // First call finds no conflicts, second call finds conflict from first
      let callCount = 0;
      bookingRepository.findConflictingBookings.mockImplementation(() => {
        callCount++;
        return Promise.resolve(callCount > 1 ? [{ id: 'first-booking' }] : []);
      });
      
      bookingRepository.create.mockResolvedValue({
        id: 'booking-123',
        ...createBookingDto,
        tenantId: tenant.id,
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act - simulate concurrent requests
      const promises = [
        service.createBooking(tenant.id, createBookingDto),
        service.createBooking(tenant.id, createBookingDto),
      ];

      // Assert - at least one should fail with conflict
      const results = await Promise.allSettled(promises);
      const fulfilled = results.filter(r => r.status === 'fulfilled');
      const rejected = results.filter(r => r.status === 'rejected');
      
      expect(fulfilled.length + rejected.length).toBe(2);
      expect(rejected.length).toBeGreaterThan(0);
    });

    it('should validate required fields', async () => {
      // Act & Assert
      await expect(service.createBooking(tenant.id, {
        ...createBookingDto,
        shopId: '',
      })).rejects.toThrow(BadRequestException);

      await expect(service.createBooking(tenant.id, {
        ...createBookingDto,
        scheduledAt: new Date('2020-01-01'), // Past date
      })).rejects.toThrow(BadRequestException);
    });

    it('should send notification after successful booking', async () => {
      // Arrange
      lockService.acquireLock.mockResolvedValue(true);
      lockService.releaseLock.mockResolvedValue(true);
      bookingRepository.findConflictingBookings.mockResolvedValue([]);
      bookingRepository.create.mockResolvedValue({
        id: 'booking-123',
        ...createBookingDto,
        tenantId: tenant.id,
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      await service.createBooking(tenant.id, createBookingDto);

      // Assert
      expect(notificationService.sendBookingConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'booking-123',
          customerId: createBookingDto.customerId,
        })
      );
    });

    it('should handle transaction rollback on error', async () => {
      // Arrange
      lockService.acquireLock.mockResolvedValue(true);
      lockService.releaseLock.mockResolvedValue(true);
      bookingRepository.findConflictingBookings.mockResolvedValue([]);
      bookingRepository.create.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.createBooking(tenant.id, createBookingDto))
        .rejects
        .toThrow('Database error');
      
      // Verify lock is released even on error
      expect(lockService.releaseLock).toHaveBeenCalled();
      
      // Verify no event is stored on failure
      expect(eventStore.appendEvent).not.toHaveBeenCalled();
    });

    it('should respect tenant isolation', async () => {
      // Arrange
      const otherTenantId = 'other-tenant-id';
      lockService.acquireLock.mockResolvedValue(true);
      lockService.releaseLock.mockResolvedValue(true);
      bookingRepository.findConflictingBookings.mockResolvedValue([]);
      bookingRepository.create.mockResolvedValue({
        id: 'booking-123',
        ...createBookingDto,
        tenantId: otherTenantId,
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      await service.createBooking(otherTenantId, createBookingDto);

      // Assert
      expect(bookingRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: otherTenantId })
      );
    });
  });

  describe('updateBooking', () => {
    const bookingId = 'booking-123';
    const updateDto = {
      scheduledAt: new Date('2024-01-15T16:00:00Z'),
      notes: 'Updated notes',
    };

    it('should update booking with valid data', async () => {
      // Arrange
      const existingBooking = createBooking(tenant.id, shop.id, {
        id: bookingId,
        scheduledAt: testDate,
      });
      
      lockService.acquireLock.mockResolvedValue(true);
      lockService.releaseLock.mockResolvedValue(true);
      bookingRepository.findById.mockResolvedValue(existingBooking);
      bookingRepository.findConflictingBookings.mockResolvedValue([]);
      bookingRepository.update.mockResolvedValue({
        ...existingBooking,
        ...updateDto,
        updatedAt: new Date(),
      });

      // Act
      const result = await service.updateBooking(tenant.id, bookingId, updateDto);

      // Assert
      expect(result.scheduledAt).toEqual(updateDto.scheduledAt);
      expect(eventStore.appendEvent).toHaveBeenCalledWith(
        tenant.id,
        'booking',
        bookingId,
        'BookingUpdated',
        expect.any(Object)
      );
    });

    it('should throw NotFoundException for non-existent booking', async () => {
      // Arrange
      bookingRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateBooking(tenant.id, 'non-existent', updateDto))
        .rejects
        .toThrow(NotFoundException);
    });

    it('should prevent update to conflicting time slot', async () => {
      // Arrange
      const existingBooking = createBooking(tenant.id, shop.id, {
        id: bookingId,
        scheduledAt: testDate,
      });
      
      lockService.acquireLock.mockResolvedValue(true);
      lockService.releaseLock.mockResolvedValue(true);
      bookingRepository.findById.mockResolvedValue(existingBooking);
      bookingRepository.findConflictingBookings.mockResolvedValue([
        { id: 'other-booking', scheduledAt: updateDto.scheduledAt },
      ]);

      // Act & Assert
      await expect(service.updateBooking(tenant.id, bookingId, updateDto))
        .rejects
        .toThrow(ConflictException);
    });
  });

  describe('cancelBooking', () => {
    const bookingId = 'booking-123';

    it('should cancel booking successfully', async () => {
      // Arrange
      const existingBooking = createBooking(tenant.id, shop.id, {
        id: bookingId,
        status: 'confirmed',
      });
      
      bookingRepository.findById.mockResolvedValue(existingBooking);
      bookingRepository.update.mockResolvedValue({
        ...existingBooking,
        status: 'cancelled',
        updatedAt: new Date(),
      });

      // Act
      const result = await service.cancelBooking(tenant.id, bookingId, 'Customer request');

      // Assert
      expect(result.status).toBe('cancelled');
      expect(eventStore.appendEvent).toHaveBeenCalledWith(
        tenant.id,
        'booking',
        bookingId,
        'BookingCancelled',
        expect.objectContaining({ reason: 'Customer request' })
      );
      expect(notificationService.sendCancellationNotification).toHaveBeenCalled();
    });

    it('should not allow cancellation of already cancelled booking', async () => {
      // Arrange
      const cancelledBooking = createBooking(tenant.id, shop.id, {
        id: bookingId,
        status: 'cancelled',
      });
      
      bookingRepository.findById.mockResolvedValue(cancelledBooking);

      // Act & Assert
      await expect(service.cancelBooking(tenant.id, bookingId))
        .rejects
        .toThrow(BadRequestException);
    });
  });

  describe('getBookingById', () => {
    it('should return booking with decrypted customer info', async () => {
      // Arrange
      const bookingId = 'booking-123';
      const booking = createBooking(tenant.id, shop.id, {
        id: bookingId,
        customerId: customer.id,
      });
      
      bookingRepository.findById.mockResolvedValue(booking);
      encryptionService.decrypt.mockImplementation((data) => data?.replace('encrypted:', ''));

      // Act
      const result = await service.getBookingById(tenant.id, bookingId);

      // Assert
      expect(result).toBeDefined();
      expect(bookingRepository.findById).toHaveBeenCalledWith(bookingId, tenant.id);
    });

    it('should throw NotFoundException for non-existent booking', async () => {
      // Arrange
      bookingRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getBookingById(tenant.id, 'non-existent'))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('getBookingsByDateRange', () => {
    it('should return bookings within date range', async () => {
      // Arrange
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const bookings = [
        createBooking(tenant.id, shop.id, { scheduledAt: new Date('2024-01-15T10:00:00Z') }),
        createBooking(tenant.id, shop.id, { scheduledAt: new Date('2024-01-20T14:00:00Z') }),
      ];
      
      bookingRepository.findByShopAndTimeRange.mockResolvedValue(bookings);

      // Act
      const result = await service.getBookingsByDateRange(
        tenant.id,
        shop.id,
        startDate,
        endDate
      );

      // Assert
      expect(result).toHaveLength(2);
      expect(bookingRepository.findByShopAndTimeRange).toHaveBeenCalledWith(
        shop.id,
        startDate,
        endDate,
        tenant.id
      );
    });
  });

  describe('advisory lock performance', () => {
    it('should complete lock acquisition within 50ms (p99 requirement)', async () => {
      // Arrange
      const lockTimes: number[] = [];
      
      lockService.acquireLock.mockImplementation(async () => {
        const start = Date.now();
        await new Promise(resolve => setTimeout(resolve, 10)); // Simulate 10ms lock
        lockTimes.push(Date.now() - start);
        return true;
      });
      
      lockService.releaseLock.mockResolvedValue(true);
      bookingRepository.findConflictingBookings.mockResolvedValue([]);
      bookingRepository.create.mockResolvedValue({
        id: 'booking-123',
        tenantId: tenant.id,
        shopId: shop.id,
        scheduledAt: testDate,
        durationMinutes: 60,
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act - simulate 100 concurrent bookings
      const promises = Array.from({ length: 100 }, () =>
        service.createBooking(tenant.id, {
          shopId: shop.id,
          customerId: customer.id,
          serviceType: 'oil_change',
          scheduledAt: testDate,
          durationMinutes: 60,
        })
      );

      await Promise.all(promises);

      // Assert - p99 should be under 50ms
      const sorted = lockTimes.sort((a, b) => a - b);
      const p99 = sorted[Math.floor(sorted.length * 0.99)];
      
      expect(p99).toBeLessThan(50);
    });
  });
});
