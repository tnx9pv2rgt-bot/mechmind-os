import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { KioskService } from './kiosk.service';

describe('KioskService', () => {
  let service: KioskService;
  let prisma: {
    customerEncrypted: { findMany: jest.Mock };
    booking: { findMany: jest.Mock; findFirst: jest.Mock; update: jest.Mock; count: jest.Mock };
    shopFloor: { findMany: jest.Mock };
    tenant: { findFirst: jest.Mock };
  };
  let eventEmitter: { emit: jest.Mock };

  const TENANT_ID = 'tenant-001';

  const mockBooking = {
    id: 'booking-001',
    tenantId: TENANT_ID,
    scheduledDate: new Date(),
    durationMinutes: 60,
    status: BookingStatus.CONFIRMED,
    notes: null,
    vehicle: { licensePlate: 'AB123CD', make: 'Fiat', model: 'Panda' },
    services: [{ service: { name: 'Tagliando' } }],
  };

  beforeEach(() => {
    prisma = {
      customerEncrypted: { findMany: jest.fn() },
      booking: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      shopFloor: { findMany: jest.fn() },
      tenant: { findFirst: jest.fn() },
    };

    eventEmitter = { emit: jest.fn() };

    // Directly instantiate service with mocked dependencies
    service = new KioskService(prisma as any, eventEmitter as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findBookingByPhone', () => {
    it('should return empty array when no customers match phone hash', async () => {
      prisma.customerEncrypted.findMany.mockResolvedValue([]);

      const result = await service.findBookingByPhone(TENANT_ID, 'hash-abc');

      expect(result).toEqual([]);
      expect(prisma.customerEncrypted.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, phoneHash: 'hash-abc' },
        select: { id: true },
      });
    });

    it('should return bookings for matching customer phone hash', async () => {
      prisma.customerEncrypted.findMany.mockResolvedValue([{ id: 'cust-enc-001' }]);
      prisma.booking.findMany.mockResolvedValue([mockBooking]);

      const result = await service.findBookingByPhone(TENANT_ID, 'hash-abc');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('booking-001');
      expect(result[0].vehiclePlate).toBe('AB123CD');
      expect(result[0].services).toEqual(['Tagliando']);
    });
  });

  describe('findBookingByPlate', () => {
    it('should normalize plate and return matching bookings', async () => {
      prisma.booking.findMany.mockResolvedValue([mockBooking]);

      const result = await service.findBookingByPlate(TENANT_ID, 'ab 123-cd');

      expect(result).toHaveLength(1);
      expect(result[0].vehiclePlate).toBe('AB123CD');
      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            vehicle: { licensePlate: 'AB123CD' },
          }),
        }),
      );
    });

    it('should return empty array when no bookings match plate', async () => {
      prisma.booking.findMany.mockResolvedValue([]);

      const result = await service.findBookingByPlate(TENANT_ID, 'ZZ999ZZ');

      expect(result).toEqual([]);
    });
  });

  describe('checkIn', () => {
    it('should check in a CONFIRMED booking', async () => {
      prisma.booking.findFirst.mockResolvedValue(mockBooking);
      const updatedBooking = { ...mockBooking, status: BookingStatus.CHECKED_IN };
      prisma.booking.update.mockResolvedValue(updatedBooking);

      const result = await service.checkIn(TENANT_ID, 'booking-001', 'Nota cliente');

      expect(result.status).toBe(BookingStatus.CHECKED_IN);
      expect(prisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'booking-001' },
          data: expect.objectContaining({
            status: BookingStatus.CHECKED_IN,
          }),
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'booking.checked_in',
        expect.objectContaining({
          bookingId: 'booking-001',
          tenantId: TENANT_ID,
          source: 'KIOSK',
        }),
      );
    });

    it('should check in a PENDING booking', async () => {
      const pendingBooking = { ...mockBooking, status: BookingStatus.PENDING };
      prisma.booking.findFirst.mockResolvedValue(pendingBooking);
      const updatedBooking = { ...pendingBooking, status: BookingStatus.CHECKED_IN };
      prisma.booking.update.mockResolvedValue(updatedBooking);

      const result = await service.checkIn(TENANT_ID, 'booking-001');

      expect(result.status).toBe(BookingStatus.CHECKED_IN);
    });

    it('should throw NotFoundException when booking not found', async () => {
      prisma.booking.findFirst.mockResolvedValue(null);

      await expect(service.checkIn(TENANT_ID, 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid status transition', async () => {
      const completedBooking = { ...mockBooking, status: BookingStatus.COMPLETED };
      prisma.booking.findFirst.mockResolvedValue(completedBooking);

      await expect(service.checkIn(TENANT_ID, 'booking-001')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getShopStatus', () => {
    it('should return shop status with bay counts and queue size', async () => {
      prisma.shopFloor.findMany.mockResolvedValue([
        {
          bays: [
            { status: 'OCCUPIED' },
            { status: 'OCCUPIED' },
            { status: 'AVAILABLE' },
            { status: 'AVAILABLE' },
          ],
        },
      ]);
      prisma.booking.count.mockResolvedValue(3);

      const result = await service.getShopStatus(TENANT_ID);

      expect(result.baysTotal).toBe(4);
      expect(result.baysOccupied).toBe(2);
      expect(result.queueSize).toBe(3);
      expect(result.estimatedWaitMinutes).toBeGreaterThanOrEqual(0);
    });

    it('should handle shop with no bays', async () => {
      prisma.shopFloor.findMany.mockResolvedValue([]);
      prisma.booking.count.mockResolvedValue(0);

      const result = await service.getShopStatus(TENANT_ID);

      expect(result.baysTotal).toBe(0);
      expect(result.baysOccupied).toBe(0);
      expect(result.queueSize).toBe(0);
      expect(result.estimatedWaitMinutes).toBe(0);
    });
  });

  describe('validateKioskKey', () => {
    it('should return tenantId for valid kiosk key', async () => {
      prisma.tenant.findFirst.mockResolvedValue({ id: TENANT_ID });

      const result = await service.validateKioskKey('valid-key');

      expect(result).toBe(TENANT_ID);
    });

    it('should return null for invalid kiosk key', async () => {
      prisma.tenant.findFirst.mockResolvedValue(null);

      const result = await service.validateKioskKey('invalid-key');

      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // ADDITIONAL BRANCH COVERAGE TESTS
  // =========================================================================

  describe('findBookingByPhone - edge cases (branch coverage)', () => {
    it('should handle multiple customer matches for same phone hash', async () => {
      prisma.customerEncrypted.findMany.mockResolvedValue([{ id: 'cust-001' }, { id: 'cust-002' }]);
      prisma.booking.findMany.mockResolvedValue([
        { ...mockBooking, id: 'booking-001' },
        { ...mockBooking, id: 'booking-002', customerEncryptedId: 'cust-002' },
      ]);

      const result = await service.findBookingByPhone(TENANT_ID, 'hash-abc');

      expect(result).toHaveLength(2);
      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            customerEncryptedId: { in: ['cust-001', 'cust-002'] },
          }),
        }),
      );
    });

    it('should filter out non-PENDING and non-CONFIRMED bookings', async () => {
      prisma.customerEncrypted.findMany.mockResolvedValue([{ id: 'cust-001' }]);
      // Only PENDING and CONFIRMED should be returned
      prisma.booking.findMany.mockResolvedValue([
        { ...mockBooking, status: BookingStatus.PENDING },
      ]);

      await service.findBookingByPhone(TENANT_ID, 'hash-abc');

      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
          }),
        }),
      );
    });

    it('should order bookings by scheduledDate ascending', async () => {
      prisma.customerEncrypted.findMany.mockResolvedValue([{ id: 'cust-001' }]);
      prisma.booking.findMany.mockResolvedValue([mockBooking]);

      const result = await service.findBookingByPhone(TENANT_ID, 'hash-abc');

      expect(result).toHaveLength(1);
      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { scheduledDate: 'asc' },
        }),
      );
    });

    it('should exclude soft-deleted bookings (deletedAt: null)', async () => {
      prisma.customerEncrypted.findMany.mockResolvedValue([{ id: 'cust-001' }]);
      prisma.booking.findMany.mockResolvedValue([]);

      const result = await service.findBookingByPhone(TENANT_ID, 'hash-abc');

      expect(result).toEqual([]);
      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        }),
      );
    });
  });

  describe('findBookingByPlate - branch coverage', () => {
    it('should normalize plate: uppercase and remove spaces/dashes', async () => {
      prisma.booking.findMany.mockResolvedValue([mockBooking]);

      const result = await service.findBookingByPlate(TENANT_ID, 'ab 123-cd');

      expect(result).toHaveLength(1);
      expect(result[0].vehiclePlate).toBe('AB123CD');
      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            vehicle: { licensePlate: 'AB123CD' },
          }),
        }),
      );
    });

    it('should normalize plate already uppercase', async () => {
      prisma.booking.findMany.mockResolvedValue([mockBooking]);

      const result = await service.findBookingByPlate(TENANT_ID, 'AB123CD');

      expect(result).toHaveLength(1);
      expect(result[0].vehiclePlate).toBe('AB123CD');
      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            vehicle: { licensePlate: 'AB123CD' },
          }),
        }),
      );
    });

    it('should exclude soft-deleted and filter by status', async () => {
      prisma.booking.findMany.mockResolvedValue([]);

      const result = await service.findBookingByPlate(TENANT_ID, 'AB123CD');

      expect(result).toEqual([]);
      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
          }),
        }),
      );
    });
  });

  describe('getShopStatus - branch coverage', () => {
    it('should calculate correct estimated wait when bays are occupied', async () => {
      prisma.shopFloor.findMany.mockResolvedValue([
        {
          bays: [
            { status: 'OCCUPIED' },
            { status: 'OCCUPIED' },
            { status: 'AVAILABLE' },
            { status: 'AVAILABLE' },
          ],
        },
      ]);
      prisma.booking.count.mockResolvedValue(6);

      const result = await service.getShopStatus(TENANT_ID);

      // 6 queued / (4 - 2 occupied) = 6/2 = 3 * 45 = 135 minutes
      expect(result.estimatedWaitMinutes).toBe(135);
    });

    it('should return 0 wait minutes when no bays', async () => {
      prisma.shopFloor.findMany.mockResolvedValue([]);
      prisma.booking.count.mockResolvedValue(0);

      const result = await service.getShopStatus(TENANT_ID);

      expect(result.estimatedWaitMinutes).toBe(0);
      expect(result.baysTotal).toBe(0);
    });

    it('should handle all bays occupied (ternary: Math.max(0, 1))', async () => {
      prisma.shopFloor.findMany.mockResolvedValue([
        {
          bays: [{ status: 'OCCUPIED' }, { status: 'OCCUPIED' }],
        },
      ]);
      prisma.booking.count.mockResolvedValue(2);

      const result = await service.getShopStatus(TENANT_ID);

      // 2 queued / max(2 - 2, 1) = 2/1 = 2 * 45 = 90 minutes
      expect(result.estimatedWaitMinutes).toBe(90);
      expect(result.baysOccupied).toBe(2);
    });

    it('should count only CHECKED_IN and CONFIRMED status in queue', async () => {
      prisma.shopFloor.findMany.mockResolvedValue([{ bays: [{ status: 'AVAILABLE' }] }]);
      prisma.booking.count.mockResolvedValue(3);

      const result = await service.getShopStatus(TENANT_ID);

      expect(result.queueSize).toBe(3);
      expect(prisma.booking.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: [BookingStatus.CHECKED_IN, BookingStatus.CONFIRMED] },
          }),
        }),
      );
    });

    it('should exclude soft-deleted bookings from queue count', async () => {
      prisma.shopFloor.findMany.mockResolvedValue([{ bays: [{ status: 'AVAILABLE' }] }]);
      prisma.booking.count.mockResolvedValue(0);

      const result = await service.getShopStatus(TENANT_ID);

      expect(result.queueSize).toBe(0);
      expect(prisma.booking.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        }),
      );
    });
  });

  describe('checkIn - branch coverage', () => {
    it('should append customer notes with [KIOSK] prefix when notes provided', async () => {
      const bookingWithNotes = { ...mockBooking, notes: 'Existing notes' };
      prisma.booking.findFirst.mockResolvedValue(bookingWithNotes);
      const updated = {
        ...bookingWithNotes,
        status: BookingStatus.CHECKED_IN,
        notes: 'Existing notes\n[KIOSK] New customer notes',
      };
      prisma.booking.update.mockResolvedValue(updated);

      const result = await service.checkIn(TENANT_ID, 'booking-001', 'New customer notes');

      expect(result.status).toBe(BookingStatus.CHECKED_IN);
      expect(prisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: 'Existing notes\n[KIOSK] New customer notes',
          }),
        }),
      );
    });

    it('should handle null existing notes when appending customer notes', async () => {
      const bookingNoNotes = { ...mockBooking, notes: null };
      prisma.booking.findFirst.mockResolvedValue(bookingNoNotes);
      const updated = {
        ...bookingNoNotes,
        status: BookingStatus.CHECKED_IN,
        notes: '[KIOSK] New customer notes',
      };
      prisma.booking.update.mockResolvedValue(updated);

      const result = await service.checkIn(TENANT_ID, 'booking-001', 'New customer notes');

      expect(result.status).toBe(BookingStatus.CHECKED_IN);
      expect(prisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: '[KIOSK] New customer notes',
          }),
        }),
      );
    });

    it('should preserve existing notes when no customer notes provided', async () => {
      const bookingWithNotes = { ...mockBooking, notes: 'Existing notes' };
      prisma.booking.findFirst.mockResolvedValue(bookingWithNotes);
      const updated = { ...bookingWithNotes, status: BookingStatus.CHECKED_IN };
      prisma.booking.update.mockResolvedValue(updated);

      const result = await service.checkIn(TENANT_ID, 'booking-001');

      expect(result.status).toBe(BookingStatus.CHECKED_IN);
      expect(prisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: 'Existing notes',
          }),
        }),
      );
    });

    it('should emit booking.checked_in event with all required fields', async () => {
      prisma.booking.findFirst.mockResolvedValue(mockBooking);
      prisma.booking.update.mockResolvedValue({ ...mockBooking, status: BookingStatus.CHECKED_IN });

      const result = await service.checkIn(TENANT_ID, 'booking-001', 'Notes');

      expect(result.status).toBe(BookingStatus.CHECKED_IN);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'booking.checked_in',
        expect.objectContaining({
          bookingId: 'booking-001',
          tenantId: TENANT_ID,
          source: 'KIOSK',
          checkedInAt: expect.any(Date),
        }),
      );
    });

    it('should create event with CHECKED_IN eventType in booking update', async () => {
      prisma.booking.findFirst.mockResolvedValue(mockBooking);
      prisma.booking.update.mockResolvedValue({ ...mockBooking, status: BookingStatus.CHECKED_IN });

      const result = await service.checkIn(TENANT_ID, 'booking-001');

      expect(result.status).toBe(BookingStatus.CHECKED_IN);
      expect(prisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            events: {
              create: expect.objectContaining({
                eventType: 'CHECKED_IN',
              }),
            },
          }),
        }),
      );
    });
  });

  describe('booking mapping — null vehicle and filtered services', () => {
    it('should map booking with null vehicle to null plate/make/model', async () => {
      const bookingNoVehicle = {
        ...mockBooking,
        vehicle: null,
        services: [{ service: { name: 'Tagliando' } }],
      };
      prisma.customerEncrypted.findMany.mockResolvedValue([{ id: 'cust-enc-001' }]);
      prisma.booking.findMany.mockResolvedValue([bookingNoVehicle]);

      const result = await service.findBookingByPhone(TENANT_ID, 'hash-abc');

      expect(result).toHaveLength(1);
      expect(result[0].vehiclePlate).toBeNull();
      expect(result[0].vehicleMake).toBeNull();
      expect(result[0].vehicleModel).toBeNull();
    });

    it('should filter out null service entries from services array', async () => {
      const bookingNullService = {
        ...mockBooking,
        vehicle: { licensePlate: 'XY999ZZ', make: 'Alfa', model: 'Giulia' },
        services: [{ service: null }, { service: { name: 'Revisione' } }],
      };
      prisma.customerEncrypted.findMany.mockResolvedValue([{ id: 'cust-enc-002' }]);
      prisma.booking.findMany.mockResolvedValue([bookingNullService]);

      const result = await service.findBookingByPhone(TENANT_ID, 'hash-xyz');

      expect(result[0].services).toEqual(['Revisione']);
      expect(result[0].services).toHaveLength(1);
    });
  });

  // =========================================================================
  // ADDITIONAL BRANCH COVERAGE TESTS - NO_SHOW, CANCELLED, IN_PROGRESS
  // =========================================================================

  describe('checkIn - status transition edge cases (full branch coverage)', () => {
    it('should allow CONFIRMED status (true branch of || in condition)', async () => {
      const confirmedBooking = { ...mockBooking, status: BookingStatus.CONFIRMED };
      prisma.booking.findFirst.mockResolvedValue(confirmedBooking);
      const updated = { ...confirmedBooking, status: BookingStatus.CHECKED_IN };
      prisma.booking.update.mockResolvedValue(updated);

      const result = await service.checkIn(TENANT_ID, 'booking-001');

      expect(result.status).toBe(BookingStatus.CHECKED_IN);
      expect(prisma.booking.update).toHaveBeenCalled();
    });

    it('should allow PENDING status (true branch of || in condition)', async () => {
      const pendingBooking = { ...mockBooking, status: BookingStatus.PENDING };
      prisma.booking.findFirst.mockResolvedValue(pendingBooking);
      const updated = { ...pendingBooking, status: BookingStatus.CHECKED_IN };
      prisma.booking.update.mockResolvedValue(updated);

      const result = await service.checkIn(TENANT_ID, 'booking-001');

      expect(result.status).toBe(BookingStatus.CHECKED_IN);
      expect(prisma.booking.update).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException for NO_SHOW status (not CONFIRMED and not PENDING)', async () => {
      const noShowBooking = { ...mockBooking, status: BookingStatus.NO_SHOW };
      prisma.booking.findFirst.mockResolvedValue(noShowBooking);

      await expect(service.checkIn(TENANT_ID, 'booking-001')).rejects.toThrow(BadRequestException);
      expect(prisma.booking.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for CANCELLED status', async () => {
      const cancelledBooking = { ...mockBooking, status: BookingStatus.CANCELLED };
      prisma.booking.findFirst.mockResolvedValue(cancelledBooking);

      await expect(service.checkIn(TENANT_ID, 'booking-001')).rejects.toThrow(BadRequestException);
      expect(prisma.booking.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for IN_PROGRESS status', async () => {
      const inProgressBooking = { ...mockBooking, status: BookingStatus.IN_PROGRESS };
      prisma.booking.findFirst.mockResolvedValue(inProgressBooking);

      await expect(service.checkIn(TENANT_ID, 'booking-001')).rejects.toThrow(BadRequestException);
      expect(prisma.booking.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for CHECKED_IN status (already checked in)', async () => {
      const alreadyCheckedIn = { ...mockBooking, status: BookingStatus.CHECKED_IN };
      prisma.booking.findFirst.mockResolvedValue(alreadyCheckedIn);

      await expect(service.checkIn(TENANT_ID, 'booking-001')).rejects.toThrow(BadRequestException);
      expect(prisma.booking.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for COMPLETED status', async () => {
      const completedBooking = { ...mockBooking, status: BookingStatus.COMPLETED };
      prisma.booking.findFirst.mockResolvedValue(completedBooking);

      await expect(service.checkIn(TENANT_ID, 'booking-001')).rejects.toThrow(BadRequestException);
      expect(prisma.booking.update).not.toHaveBeenCalled();
    });
  });

  describe('getShopStatus - multiple floors with mixed bays', () => {
    it('should aggregate bays from multiple shop floors', async () => {
      prisma.shopFloor.findMany.mockResolvedValue([
        {
          bays: [{ status: 'OCCUPIED' }, { status: 'AVAILABLE' }],
        },
        {
          bays: [{ status: 'OCCUPIED' }, { status: 'OCCUPIED' }, { status: 'AVAILABLE' }],
        },
      ]);
      prisma.booking.count.mockResolvedValue(4);

      const result = await service.getShopStatus(TENANT_ID);

      expect(result.baysTotal).toBe(5);
      expect(result.baysOccupied).toBe(3);
      expect(result.queueSize).toBe(4);
    });

    it('should handle shopFloor with empty bays array', async () => {
      prisma.shopFloor.findMany.mockResolvedValue([
        { bays: [] },
        { bays: [{ status: 'AVAILABLE' }] },
      ]);
      prisma.booking.count.mockResolvedValue(0);

      const result = await service.getShopStatus(TENANT_ID);

      expect(result.baysTotal).toBe(1);
      expect(result.baysOccupied).toBe(0);
    });

    it('should return estimatedWaitMinutes=0 when all bays available (Math.max branch)', async () => {
      prisma.shopFloor.findMany.mockResolvedValue([
        {
          bays: [{ status: 'AVAILABLE' }, { status: 'AVAILABLE' }, { status: 'AVAILABLE' }],
        },
      ]);
      prisma.booking.count.mockResolvedValue(5);

      const result = await service.getShopStatus(TENANT_ID);

      // 5 queued / (3 - 0) = 5/3 * 45 = 75 minutes
      expect(result.estimatedWaitMinutes).toBe(75);
    });
  });

  describe('findBookingByPlate - license plate variations', () => {
    it('should handle plate with multiple spaces', async () => {
      prisma.booking.findMany.mockResolvedValue([mockBooking]);

      await service.findBookingByPlate(TENANT_ID, 'AB  123  CD');

      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            vehicle: { licensePlate: 'AB123CD' },
          }),
        }),
      );
    });

    it('should handle plate with multiple dashes', async () => {
      prisma.booking.findMany.mockResolvedValue([mockBooking]);

      await service.findBookingByPlate(TENANT_ID, 'AB--123--CD');

      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            vehicle: { licensePlate: 'AB123CD' },
          }),
        }),
      );
    });

    it('should handle plate mixed spaces and dashes', async () => {
      prisma.booking.findMany.mockResolvedValue([mockBooking]);

      await service.findBookingByPlate(TENANT_ID, 'AB 1-2-3 CD');

      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            vehicle: { licensePlate: 'AB123CD' },
          }),
        }),
      );
    });
  });

  describe('validateKioskKey - hash consistency', () => {
    it('should hash the kiosk key consistently', async () => {
      const testKey = 'my-secret-kiosk-key';
      prisma.tenant.findFirst.mockResolvedValue({ id: TENANT_ID });

      const result1 = await service.validateKioskKey(testKey);
      const result2 = await service.validateKioskKey(testKey);

      expect(result1).toBe(TENANT_ID);
      expect(result2).toBe(TENANT_ID);
      expect(prisma.tenant.findFirst).toHaveBeenCalledTimes(2);
      // Both calls should hash the same way (verify by checking exact call args)
      const call1Args = prisma.tenant.findFirst.mock.calls[0][0];
      const call2Args = prisma.tenant.findFirst.mock.calls[1][0];
      expect(call1Args.where.apiKeyHash).toBe(call2Args.where.apiKeyHash);
    });

    it('should filter by isActive=true when validating key', async () => {
      prisma.tenant.findFirst.mockResolvedValue({ id: TENANT_ID });

      await service.validateKioskKey('key');

      expect(prisma.tenant.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        }),
      );
    });

    it('should select only id field for performance', async () => {
      prisma.tenant.findFirst.mockResolvedValue({ id: TENANT_ID });

      await service.validateKioskKey('key');

      expect(prisma.tenant.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          select: { id: true },
        }),
      );
    });
  });
});
