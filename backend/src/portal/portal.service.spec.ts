import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PortalService } from './portal.service';
import { PrismaService } from '../common/services/prisma.service';
import { EncryptionService } from '../common/services/encryption.service';

describe('PortalService', () => {
  let service: PortalService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;
  let encryption: { encrypt: jest.Mock; decrypt: jest.Mock };

  const TENANT_ID = 'tenant-001';
  const CUSTOMER_ID = 'cust-001';

  const mockCustomer = {
    id: CUSTOMER_ID,
    tenantId: TENANT_ID,
    encryptedEmail: 'enc-mario@test.it',
    encryptedFirstName: 'enc-Mario',
    encryptedLastName: 'enc-Rossi',
    encryptedPhone: 'enc-+39123456789',
    customerType: 'PERSONA',
    codiceFiscale: 'RSSMRA80A01H501U',
    partitaIva: null,
    sdiCode: '0000000',
    pecEmail: null,
    address: 'Via Roma 1',
    city: 'Milano',
    postalCode: '20100',
    gdprConsent: true,
    gdprConsentAt: new Date('2026-01-01'),
    vehicles: [{ id: 'veh-001', make: 'Fiat', model: 'Panda' }],
    createdAt: new Date('2026-01-01'),
    deletedAt: null,
    phoneHash: 'hash-123',
  };

  beforeEach(async () => {
    prisma = {
      customer: {
        findFirst: jest.fn(),
        updateMany: jest.fn(),
        findFirstOrThrow: jest.fn(),
      },
      vehicle: { findMany: jest.fn(), findFirst: jest.fn() },
      booking: { findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn(), create: jest.fn() },
      bookingSlot: { findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      inspection: { findMany: jest.fn(), findFirst: jest.fn() },
      invoice: { findMany: jest.fn(), findFirst: jest.fn(), aggregate: jest.fn() },
      notification: { findMany: jest.fn(), count: jest.fn(), updateMany: jest.fn() },
      estimate: { findMany: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn() },
      workOrder: { findMany: jest.fn() },
      customerNotificationPreference: { findMany: jest.fn(), upsert: jest.fn() },
      smsThread: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      smsMessage: { create: jest.fn() },
      $transaction: jest.fn(),
    };

    encryption = {
      encrypt: jest.fn((val: string) => `enc-${val}`),
      decrypt: jest.fn((val: string) => val.replace('enc-', '')),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortalService,
        { provide: PrismaService, useValue: prisma },
        { provide: EncryptionService, useValue: encryption },
      ],
    }).compile();

    service = module.get<PortalService>(PortalService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===========================================================================
  // decryptCustomer (private, tested through public methods)
  // ===========================================================================
  describe('decryptCustomer via getProfile', () => {
    it('should decrypt all encrypted fields', async () => {
      prisma.customer.findFirst.mockResolvedValue(mockCustomer);

      const result = await service.getProfile(CUSTOMER_ID, TENANT_ID);

      expect(encryption.decrypt).toHaveBeenCalledWith('enc-mario@test.it');
      expect(encryption.decrypt).toHaveBeenCalledWith('enc-Mario');
      expect(encryption.decrypt).toHaveBeenCalledWith('enc-Rossi');
      expect(encryption.decrypt).toHaveBeenCalledWith('enc-+39123456789');
      expect(result.data).toMatchObject({
        email: 'mario@test.it',
        firstName: 'Mario',
        lastName: 'Rossi',
        phone: '+39123456789',
      });
    });

    it('should handle null encrypted fields', async () => {
      prisma.customer.findFirst.mockResolvedValue({
        ...mockCustomer,
        encryptedEmail: null,
        encryptedFirstName: null,
        encryptedLastName: null,
      });

      const result = await service.getProfile(CUSTOMER_ID, TENANT_ID);

      expect(result.data).toMatchObject({
        email: null,
        firstName: null,
        lastName: null,
      });
    });
  });

  // ===========================================================================
  // getDashboard
  // ===========================================================================
  describe('getDashboard', () => {
    beforeEach(() => {
      prisma.customer.findFirst.mockResolvedValue(mockCustomer);
      prisma.booking.findFirst.mockResolvedValue(null);
      prisma.vehicle.findMany.mockResolvedValue([]);
      prisma.inspection.findFirst.mockResolvedValue(null);
      prisma.invoice.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);
      prisma.invoice.aggregate.mockResolvedValue({
        _count: { id: 0 },
        _sum: { total: null },
      });
      prisma.booking.count.mockResolvedValue(0);
    });

    it('should return complete dashboard data', async () => {
      const result = await service.getDashboard(CUSTOMER_ID, TENANT_ID);

      expect(result.data).toHaveProperty('customer');
      expect(result.data).toHaveProperty('upcomingBooking');
      expect(result.data).toHaveProperty('maintenanceDue');
      expect(result.data).toHaveProperty('recentInspection');
      expect(result.data).toHaveProperty('recentDocuments');
      expect(result.data).toHaveProperty('unreadNotifications');
      expect(result.data).toHaveProperty('unpaidInvoices');
      expect(result.data).toHaveProperty('activeRepairs');
    });

    it('should throw NotFoundException when customer not found', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);

      await expect(service.getDashboard(CUSTOMER_ID, TENANT_ID)).rejects.toThrow(NotFoundException);
    });

    it('should handle null unpaid invoice sum', async () => {
      prisma.invoice.aggregate.mockResolvedValue({
        _count: { id: 0 },
        _sum: { total: null },
      });

      const result = await service.getDashboard(CUSTOMER_ID, TENANT_ID);

      expect((result.data.unpaidInvoices as Record<string, unknown>).total).toBe(0);
    });

    it('should query with correct tenant isolation', async () => {
      await service.getDashboard(CUSTOMER_ID, TENANT_ID);

      expect(prisma.customer.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: CUSTOMER_ID, tenantId: TENANT_ID, deletedAt: null },
        }),
      );
    });
  });

  // ===========================================================================
  // getProfile
  // ===========================================================================
  describe('getProfile', () => {
    it('should return profile with decrypted fields and metadata', async () => {
      prisma.customer.findFirst.mockResolvedValue(mockCustomer);

      const result = await service.getProfile(CUSTOMER_ID, TENANT_ID);

      expect(result.data).toHaveProperty('customerType', 'PERSONA');
      expect(result.data).toHaveProperty('codiceFiscale', 'RSSMRA80A01H501U');
      expect(result.data).toHaveProperty('vehicles');
      expect(result.data).toHaveProperty('gdprConsent', true);
    });

    it('should throw NotFoundException when customer not found', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);

      await expect(service.getProfile(CUSTOMER_ID, TENANT_ID)).rejects.toThrow(NotFoundException);
    });

    it('should include vehicles with deletedAt: null filter', async () => {
      prisma.customer.findFirst.mockResolvedValue(mockCustomer);

      await service.getProfile(CUSTOMER_ID, TENANT_ID);

      expect(prisma.customer.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { vehicles: { where: { deletedAt: null } } },
        }),
      );
    });
  });

  // ===========================================================================
  // updateProfile
  // ===========================================================================
  describe('updateProfile', () => {
    it('should update firstName only', async () => {
      prisma.customer.findFirst.mockResolvedValue(mockCustomer);
      prisma.customer.updateMany.mockResolvedValue({ count: 1 });
      prisma.customer.findFirstOrThrow.mockResolvedValue(mockCustomer);

      const result = await service.updateProfile(CUSTOMER_ID, TENANT_ID, { firstName: 'Luigi' });

      expect(encryption.encrypt).toHaveBeenCalledWith('Luigi');
      expect(prisma.customer.updateMany).toHaveBeenCalledWith({
        where: { id: CUSTOMER_ID, tenantId: TENANT_ID },
        data: { encryptedFirstName: 'enc-Luigi' },
      });
      expect(result.data).toBeDefined();
    });

    it('should update lastName only', async () => {
      prisma.customer.findFirst.mockResolvedValue(mockCustomer);
      prisma.customer.updateMany.mockResolvedValue({ count: 1 });
      prisma.customer.findFirstOrThrow.mockResolvedValue(mockCustomer);

      await service.updateProfile(CUSTOMER_ID, TENANT_ID, { lastName: 'Bianchi' });

      expect(encryption.encrypt).toHaveBeenCalledWith('Bianchi');
      expect(prisma.customer.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { encryptedLastName: 'enc-Bianchi' },
        }),
      );
    });

    it('should update phone only', async () => {
      prisma.customer.findFirst.mockResolvedValue(mockCustomer);
      prisma.customer.updateMany.mockResolvedValue({ count: 1 });
      prisma.customer.findFirstOrThrow.mockResolvedValue(mockCustomer);

      await service.updateProfile(CUSTOMER_ID, TENANT_ID, { phone: '+39999' });

      expect(encryption.encrypt).toHaveBeenCalledWith('+39999');
    });

    it('should update all fields at once', async () => {
      prisma.customer.findFirst.mockResolvedValue(mockCustomer);
      prisma.customer.updateMany.mockResolvedValue({ count: 1 });
      prisma.customer.findFirstOrThrow.mockResolvedValue(mockCustomer);

      await service.updateProfile(CUSTOMER_ID, TENANT_ID, {
        firstName: 'A',
        lastName: 'B',
        phone: 'C',
      });

      expect(prisma.customer.updateMany).toHaveBeenCalledWith({
        where: { id: CUSTOMER_ID, tenantId: TENANT_ID },
        data: {
          encryptedFirstName: 'enc-A',
          encryptedLastName: 'enc-B',
          encryptedPhone: 'enc-C',
        },
      });
    });

    it('should not encrypt undefined fields', async () => {
      prisma.customer.findFirst.mockResolvedValue(mockCustomer);
      prisma.customer.updateMany.mockResolvedValue({ count: 1 });
      prisma.customer.findFirstOrThrow.mockResolvedValue(mockCustomer);

      await service.updateProfile(CUSTOMER_ID, TENANT_ID, {});

      expect(prisma.customer.updateMany).toHaveBeenCalledWith({
        where: { id: CUSTOMER_ID, tenantId: TENANT_ID },
        data: {},
      });
    });

    it('should throw NotFoundException when customer not found', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);

      await expect(
        service.updateProfile(CUSTOMER_ID, TENANT_ID, { firstName: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ===========================================================================
  // getVehicles
  // ===========================================================================
  describe('getVehicles', () => {
    it('should return vehicles for customer', async () => {
      const vehicles = [{ id: 'veh-001', make: 'Fiat' }];
      prisma.vehicle.findMany.mockResolvedValue(vehicles);

      const result = await service.getVehicles(CUSTOMER_ID, TENANT_ID);

      expect(result.data).toEqual(vehicles);
      expect(prisma.vehicle.findMany).toHaveBeenCalledWith({
        where: { customerId: CUSTOMER_ID, tenantId: TENANT_ID, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no vehicles', async () => {
      prisma.vehicle.findMany.mockResolvedValue([]);

      const result = await service.getVehicles(CUSTOMER_ID, TENANT_ID);

      expect(result.data).toEqual([]);
    });
  });

  // ===========================================================================
  // getBookings
  // ===========================================================================
  describe('getBookings', () => {
    it('should return bookings with vehicle, services and slot', async () => {
      const bookings = [{ id: 'bk-001', vehicle: {}, services: [], slot: {} }];
      prisma.booking.findMany.mockResolvedValue(bookings);

      const result = await service.getBookings(CUSTOMER_ID, TENANT_ID);

      expect(result.data).toEqual(bookings);
      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { vehicle: true, services: true, slot: true },
        }),
      );
    });

    it('should return empty array when no bookings', async () => {
      prisma.booking.findMany.mockResolvedValue([]);

      const result = await service.getBookings(CUSTOMER_ID, TENANT_ID);

      expect(result.data).toEqual([]);
    });
  });

  // ===========================================================================
  // getAvailableSlots
  // ===========================================================================
  describe('getAvailableSlots', () => {
    it('should return available slots for a date', async () => {
      const slots = [{ id: 'slot-001', startTime: new Date(), status: 'AVAILABLE' }];
      prisma.bookingSlot.findMany.mockResolvedValue(slots);

      const result = await service.getAvailableSlots(TENANT_ID, '2026-04-01');

      expect(result.data).toEqual(slots);
    });

    it('should throw BadRequestException when date is empty', async () => {
      await expect(service.getAvailableSlots(TENANT_ID, '')).rejects.toThrow(BadRequestException);
    });

    it('should accept optional serviceType parameter', async () => {
      prisma.bookingSlot.findMany.mockResolvedValue([]);

      const result = await service.getAvailableSlots(TENANT_ID, '2026-04-01', 'OIL_CHANGE');

      expect(result.data).toEqual([]);
    });

    it('should work without serviceType', async () => {
      prisma.bookingSlot.findMany.mockResolvedValue([]);

      const result = await service.getAvailableSlots(TENANT_ID, '2026-04-01');

      expect(result.data).toEqual([]);
    });
  });

  // ===========================================================================
  // createBooking
  // ===========================================================================
  describe('createBooking', () => {
    const bookingData = {
      vehicleId: 'veh-001',
      slotId: 'slot-001',
      notes: 'Test notes',
      serviceType: 'OIL_CHANGE',
    };

    const mockSlot = {
      id: 'slot-001',
      tenantId: TENANT_ID,
      status: 'AVAILABLE',
      startTime: new Date('2026-04-01T09:00:00Z'),
      endTime: new Date('2026-04-01T10:00:00Z'),
    };

    it('should create booking in transaction', async () => {
      prisma.customer.findFirst.mockResolvedValue(mockCustomer);
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'veh-001' });
      prisma.bookingSlot.findFirst.mockResolvedValue(mockSlot);

      const createdBooking = { id: 'bk-new', vehicle: {}, slot: {} };
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          bookingSlot: { update: jest.fn() },
          booking: { create: jest.fn().mockResolvedValue(createdBooking) },
        };
        return fn(tx);
      });

      const result = await service.createBooking(CUSTOMER_ID, TENANT_ID, bookingData);

      expect(result.data).toEqual(createdBooking);
    });

    it('should throw NotFoundException when customer not found', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);

      await expect(service.createBooking(CUSTOMER_ID, TENANT_ID, bookingData)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when vehicle not found', async () => {
      prisma.customer.findFirst.mockResolvedValue(mockCustomer);
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.createBooking(CUSTOMER_ID, TENANT_ID, bookingData)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when slot not available', async () => {
      prisma.customer.findFirst.mockResolvedValue(mockCustomer);
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'veh-001' });
      prisma.bookingSlot.findFirst.mockResolvedValue(null);

      await expect(service.createBooking(CUSTOMER_ID, TENANT_ID, bookingData)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should calculate durationMinutes from slot times', async () => {
      prisma.customer.findFirst.mockResolvedValue(mockCustomer);
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'veh-001' });
      prisma.bookingSlot.findFirst.mockResolvedValue(mockSlot);

      const mockCreate = jest.fn().mockResolvedValue({ id: 'bk-new' });
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn({
          bookingSlot: { update: jest.fn() },
          booking: { create: mockCreate },
        });
      });

      await service.createBooking(CUSTOMER_ID, TENANT_ID, bookingData);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            durationMinutes: 60,
            notes: 'Test notes',
            source: 'WEB',
            status: 'PENDING',
          }),
        }),
      );
    });

    it('should set notes to null when not provided', async () => {
      prisma.customer.findFirst.mockResolvedValue(mockCustomer);
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'veh-001' });
      prisma.bookingSlot.findFirst.mockResolvedValue(mockSlot);

      const mockCreate = jest.fn().mockResolvedValue({ id: 'bk-new' });
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn({
          bookingSlot: { update: jest.fn() },
          booking: { create: mockCreate },
        });
      });

      await service.createBooking(CUSTOMER_ID, TENANT_ID, {
        vehicleId: 'veh-001',
        slotId: 'slot-001',
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ notes: null }),
        }),
      );
    });
  });

  // ===========================================================================
  // getInspections
  // ===========================================================================
  describe('getInspections', () => {
    it('should return inspections with vehicle, findings, photos', async () => {
      const inspections = [{ id: 'insp-001' }];
      prisma.inspection.findMany.mockResolvedValue(inspections);

      const result = await service.getInspections(CUSTOMER_ID, TENANT_ID);

      expect(result.data).toEqual(inspections);
      expect(prisma.inspection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { vehicle: true, findings: true, photos: true },
        }),
      );
    });
  });

  // ===========================================================================
  // getMaintenanceSchedule
  // ===========================================================================
  describe('getMaintenanceSchedule', () => {
    const now = new Date();
    const _thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    it('should return vehicles with no alerts when all dates are far in the future', async () => {
      prisma.vehicle.findMany.mockResolvedValue([
        {
          id: 'veh-001',
          revisionExpiry: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
          insuranceExpiry: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
          taxExpiry: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
          nextServiceDueKm: 100000,
          mileage: 80000,
        },
      ]);

      const result = await service.getMaintenanceSchedule(CUSTOMER_ID, TENANT_ID);
      const schedule = result.data as Array<{ alerts: string[]; needsAttention: boolean }>;

      expect(schedule[0].alerts).toEqual([]);
      expect(schedule[0].needsAttention).toBe(false);
    });

    it('should add REVISION_EXPIRED when revision is past', async () => {
      prisma.vehicle.findMany.mockResolvedValue([
        {
          id: 'veh-001',
          revisionExpiry: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          insuranceExpiry: null,
          taxExpiry: null,
          nextServiceDueKm: null,
          mileage: null,
        },
      ]);

      const result = await service.getMaintenanceSchedule(CUSTOMER_ID, TENANT_ID);
      const schedule = result.data as Array<{ alerts: string[] }>;

      expect(schedule[0].alerts).toContain('REVISION_EXPIRED');
    });

    it('should add REVISION_EXPIRING_SOON when revision is within 30 days', async () => {
      prisma.vehicle.findMany.mockResolvedValue([
        {
          id: 'veh-001',
          revisionExpiry: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
          insuranceExpiry: null,
          taxExpiry: null,
          nextServiceDueKm: null,
          mileage: null,
        },
      ]);

      const result = await service.getMaintenanceSchedule(CUSTOMER_ID, TENANT_ID);
      const schedule = result.data as Array<{ alerts: string[] }>;

      expect(schedule[0].alerts).toContain('REVISION_EXPIRING_SOON');
    });

    it('should add INSURANCE_EXPIRED when insurance is past', async () => {
      prisma.vehicle.findMany.mockResolvedValue([
        {
          id: 'veh-001',
          revisionExpiry: null,
          insuranceExpiry: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          taxExpiry: null,
          nextServiceDueKm: null,
          mileage: null,
        },
      ]);

      const result = await service.getMaintenanceSchedule(CUSTOMER_ID, TENANT_ID);
      const schedule = result.data as Array<{ alerts: string[] }>;

      expect(schedule[0].alerts).toContain('INSURANCE_EXPIRED');
    });

    it('should add INSURANCE_EXPIRING_SOON when insurance is within 30 days', async () => {
      prisma.vehicle.findMany.mockResolvedValue([
        {
          id: 'veh-001',
          revisionExpiry: null,
          insuranceExpiry: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
          taxExpiry: null,
          nextServiceDueKm: null,
          mileage: null,
        },
      ]);

      const result = await service.getMaintenanceSchedule(CUSTOMER_ID, TENANT_ID);
      const schedule = result.data as Array<{ alerts: string[] }>;

      expect(schedule[0].alerts).toContain('INSURANCE_EXPIRING_SOON');
    });

    it('should add TAX_EXPIRED when tax is past', async () => {
      prisma.vehicle.findMany.mockResolvedValue([
        {
          id: 'veh-001',
          revisionExpiry: null,
          insuranceExpiry: null,
          taxExpiry: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          nextServiceDueKm: null,
          mileage: null,
        },
      ]);

      const result = await service.getMaintenanceSchedule(CUSTOMER_ID, TENANT_ID);
      const schedule = result.data as Array<{ alerts: string[] }>;

      expect(schedule[0].alerts).toContain('TAX_EXPIRED');
    });

    it('should add TAX_EXPIRING_SOON when tax is within 30 days', async () => {
      prisma.vehicle.findMany.mockResolvedValue([
        {
          id: 'veh-001',
          revisionExpiry: null,
          insuranceExpiry: null,
          taxExpiry: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
          nextServiceDueKm: null,
          mileage: null,
        },
      ]);

      const result = await service.getMaintenanceSchedule(CUSTOMER_ID, TENANT_ID);
      const schedule = result.data as Array<{ alerts: string[] }>;

      expect(schedule[0].alerts).toContain('TAX_EXPIRING_SOON');
    });

    it('should add SERVICE_DUE_SOON when mileage is within 1000km of nextServiceDueKm', async () => {
      prisma.vehicle.findMany.mockResolvedValue([
        {
          id: 'veh-001',
          revisionExpiry: null,
          insuranceExpiry: null,
          taxExpiry: null,
          nextServiceDueKm: 50000,
          mileage: 49500,
        },
      ]);

      const result = await service.getMaintenanceSchedule(CUSTOMER_ID, TENANT_ID);
      const schedule = result.data as Array<{ alerts: string[] }>;

      expect(schedule[0].alerts).toContain('SERVICE_DUE_SOON');
    });

    it('should not add SERVICE_DUE_SOON when mileage is null', async () => {
      prisma.vehicle.findMany.mockResolvedValue([
        {
          id: 'veh-001',
          revisionExpiry: null,
          insuranceExpiry: null,
          taxExpiry: null,
          nextServiceDueKm: 50000,
          mileage: null,
        },
      ]);

      const result = await service.getMaintenanceSchedule(CUSTOMER_ID, TENANT_ID);
      const schedule = result.data as Array<{ alerts: string[] }>;

      expect(schedule[0].alerts).not.toContain('SERVICE_DUE_SOON');
    });

    it('should not add SERVICE_DUE_SOON when nextServiceDueKm is null', async () => {
      prisma.vehicle.findMany.mockResolvedValue([
        {
          id: 'veh-001',
          revisionExpiry: null,
          insuranceExpiry: null,
          taxExpiry: null,
          nextServiceDueKm: null,
          mileage: 49500,
        },
      ]);

      const result = await service.getMaintenanceSchedule(CUSTOMER_ID, TENANT_ID);
      const schedule = result.data as Array<{ alerts: string[] }>;

      expect(schedule[0].alerts).not.toContain('SERVICE_DUE_SOON');
    });

    it('should set needsAttention true when any alert exists', async () => {
      prisma.vehicle.findMany.mockResolvedValue([
        {
          id: 'veh-001',
          revisionExpiry: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          insuranceExpiry: null,
          taxExpiry: null,
          nextServiceDueKm: null,
          mileage: null,
        },
      ]);

      const result = await service.getMaintenanceSchedule(CUSTOMER_ID, TENANT_ID);
      const schedule = result.data as Array<{ needsAttention: boolean }>;

      expect(schedule[0].needsAttention).toBe(true);
    });

    it('should handle empty vehicles array', async () => {
      prisma.vehicle.findMany.mockResolvedValue([]);

      const result = await service.getMaintenanceSchedule(CUSTOMER_ID, TENANT_ID);

      expect(result.data).toEqual([]);
    });

    it('should accumulate multiple alerts', async () => {
      prisma.vehicle.findMany.mockResolvedValue([
        {
          id: 'veh-001',
          revisionExpiry: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          insuranceExpiry: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          taxExpiry: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          nextServiceDueKm: 50000,
          mileage: 50000,
        },
      ]);

      const result = await service.getMaintenanceSchedule(CUSTOMER_ID, TENANT_ID);
      const schedule = result.data as Array<{ alerts: string[] }>;

      expect(schedule[0].alerts.length).toBeGreaterThanOrEqual(4);
    });
  });

  // ===========================================================================
  // getInvoice
  // ===========================================================================
  describe('getInvoice', () => {
    it('should return invoice with items', async () => {
      const invoice = { id: 'inv-001', invoiceItems: [] };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.getInvoice('inv-001', CUSTOMER_ID, TENANT_ID);

      expect(result.data).toEqual(invoice);
    });

    it('should throw NotFoundException when invoice not found', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);

      await expect(service.getInvoice('inv-xxx', CUSTOMER_ID, TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ===========================================================================
  // getNotifications / markNotificationsRead
  // ===========================================================================
  describe('getNotifications', () => {
    it('should return notifications', async () => {
      const notifs = [{ id: 'n1' }, { id: 'n2' }];
      prisma.notification.findMany.mockResolvedValue(notifs);

      const result = await service.getNotifications(CUSTOMER_ID, TENANT_ID);

      expect(result.data).toEqual(notifs);
    });
  });

  describe('markNotificationsRead', () => {
    it('should mark specified notifications as read', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.markNotificationsRead(CUSTOMER_ID, TENANT_ID, ['n1', 'n2']);

      expect(result.data.updated).toBe(2);
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['n1', 'n2'] },
          customerId: CUSTOMER_ID,
          tenantId: TENANT_ID,
          deletedAt: null,
        },
        data: { status: 'READ' },
      });
    });

    it('should throw BadRequestException when ids is empty', async () => {
      await expect(service.markNotificationsRead(CUSTOMER_ID, TENANT_ID, [])).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when ids is null-like', async () => {
      await expect(
        service.markNotificationsRead(CUSTOMER_ID, TENANT_ID, null as unknown as string[]),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ===========================================================================
  // getDocuments
  // ===========================================================================
  describe('getDocuments', () => {
    it('should combine invoices and inspections sorted by date', async () => {
      prisma.invoice.findMany.mockResolvedValue([
        {
          id: 'inv-1',
          invoiceNumber: 'INV-001',
          createdAt: new Date('2026-03-01'),
          status: 'PAID',
          total: 100,
          pdfUrl: 'http://pdf.com/inv1',
        },
      ]);
      prisma.inspection.findMany.mockResolvedValue([
        {
          id: 'insp-1',
          startedAt: new Date('2026-03-15'),
          status: 'COMPLETED',
          vehicle: { make: 'Fiat', model: 'Panda' },
        },
      ]);

      const result = await service.getDocuments(CUSTOMER_ID, TENANT_ID);
      const docs = result.data as Array<{ type: string }>;

      expect(docs).toHaveLength(2);
      // Sorted by date desc: inspection (Mar 15) first, then invoice (Mar 1)
      expect(docs[0].type).toBe('INSPECTION_REPORT');
      expect(docs[1].type).toBe('INVOICE');
    });

    it('should filter by type when provided', async () => {
      prisma.invoice.findMany.mockResolvedValue([
        {
          id: 'inv-1',
          invoiceNumber: 'INV-001',
          createdAt: new Date('2026-03-01'),
          status: 'PAID',
          total: 100,
          pdfUrl: null,
        },
      ]);
      prisma.inspection.findMany.mockResolvedValue([
        {
          id: 'insp-1',
          startedAt: new Date('2026-03-15'),
          status: 'COMPLETED',
          vehicle: null,
        },
      ]);

      const result = await service.getDocuments(CUSTOMER_ID, TENANT_ID, 'INVOICE');
      const docs = result.data as Array<{ type: string }>;

      expect(docs).toHaveLength(1);
      expect(docs[0].type).toBe('INVOICE');
    });

    it('should return all docs when type is undefined', async () => {
      prisma.invoice.findMany.mockResolvedValue([]);
      prisma.inspection.findMany.mockResolvedValue([]);

      const result = await service.getDocuments(CUSTOMER_ID, TENANT_ID);

      expect(result.data).toEqual([]);
    });

    it('should handle inspection with null vehicle', async () => {
      prisma.invoice.findMany.mockResolvedValue([]);
      prisma.inspection.findMany.mockResolvedValue([
        {
          id: 'insp-1',
          startedAt: new Date('2026-03-15'),
          status: 'COMPLETED',
          vehicle: null,
        },
      ]);

      const result = await service.getDocuments(CUSTOMER_ID, TENANT_ID);
      const docs = result.data as Array<{ title: string }>;

      expect(docs[0].title).toBe('Ispezione');
    });
  });

  // ===========================================================================
  // getWarranties
  // ===========================================================================
  describe('getWarranties', () => {
    it('should return empty array (no warranty model yet)', async () => {
      const result = await service.getWarranties(CUSTOMER_ID, TENANT_ID);

      expect(result.data).toEqual([]);
    });
  });

  // ===========================================================================
  // getPayments / getPayment
  // ===========================================================================
  describe('getPayments', () => {
    it('should return paid invoices mapped as payments', async () => {
      prisma.invoice.findMany.mockResolvedValue([
        {
          id: 'inv-1',
          invoiceNumber: 'INV-001',
          total: 100,
          paymentMethod: 'CARTA',
          paidAt: new Date('2026-03-01'),
          createdAt: new Date('2026-02-01'),
        },
      ]);

      const result = await service.getPayments(CUSTOMER_ID, TENANT_ID);
      const payments = result.data as Array<Record<string, unknown>>;

      expect(payments[0]).toMatchObject({
        amount: 100,
        currency: 'EUR',
        status: 'SUCCESS',
        method: 'CARTA',
      });
    });

    it('should handle null paymentMethod', async () => {
      prisma.invoice.findMany.mockResolvedValue([
        {
          id: 'inv-1',
          invoiceNumber: 'INV-001',
          total: 50,
          paymentMethod: null,
          paidAt: null,
          createdAt: new Date(),
        },
      ]);

      const result = await service.getPayments(CUSTOMER_ID, TENANT_ID);
      const payments = result.data as Array<Record<string, unknown>>;

      expect(payments[0].method).toBeNull();
    });
  });

  describe('getPayment', () => {
    it('should return payment details for PAID invoice', async () => {
      prisma.invoice.findFirst.mockResolvedValue({
        id: 'inv-1',
        invoiceNumber: 'INV-001',
        status: 'PAID',
        total: 150,
        paymentMethod: 'BONIFICO',
        pdfUrl: 'http://pdf.com/inv1',
        createdAt: new Date(),
        updatedAt: new Date(),
        invoiceItems: [],
      });

      const result = await service.getPayment('inv-1', CUSTOMER_ID, TENANT_ID);

      expect(result.data).toMatchObject({
        status: 'SUCCESS',
        amount: 150,
        currency: 'EUR',
      });
    });

    it('should map OVERDUE status to FAILED', async () => {
      prisma.invoice.findFirst.mockResolvedValue({
        id: 'inv-1',
        invoiceNumber: 'INV-001',
        status: 'OVERDUE',
        total: 100,
        paymentMethod: null,
        pdfUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        invoiceItems: [],
      });

      const result = await service.getPayment('inv-1', CUSTOMER_ID, TENANT_ID);

      expect(result.data.status).toBe('FAILED');
    });

    it('should map other statuses to PENDING', async () => {
      prisma.invoice.findFirst.mockResolvedValue({
        id: 'inv-1',
        invoiceNumber: 'INV-001',
        status: 'SENT',
        total: 100,
        paymentMethod: null,
        pdfUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        invoiceItems: [],
      });

      const result = await service.getPayment('inv-1', CUSTOMER_ID, TENANT_ID);

      expect(result.data.status).toBe('PENDING');
    });

    it('should throw NotFoundException when payment not found', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);

      await expect(service.getPayment('inv-xxx', CUSTOMER_ID, TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ===========================================================================
  // getAccount / updateAccount (delegates to getProfile/updateProfile)
  // ===========================================================================
  describe('getAccount', () => {
    it('should delegate to getProfile', async () => {
      prisma.customer.findFirst.mockResolvedValue(mockCustomer);

      const result = await service.getAccount(CUSTOMER_ID, TENANT_ID);

      expect(result.data).toBeDefined();
      expect(prisma.customer.findFirst).toHaveBeenCalled();
    });
  });

  describe('updateAccount', () => {
    it('should delegate to updateProfile', async () => {
      prisma.customer.findFirst.mockResolvedValue(mockCustomer);
      prisma.customer.updateMany.mockResolvedValue({ count: 1 });
      prisma.customer.findFirstOrThrow.mockResolvedValue(mockCustomer);

      const result = await service.updateAccount(CUSTOMER_ID, TENANT_ID, { firstName: 'Test' });

      expect(result.data).toBeDefined();
    });
  });

  // ===========================================================================
  // getEstimates / getEstimate / acceptEstimate / rejectEstimate
  // ===========================================================================
  describe('getEstimates', () => {
    it('should return estimates with lines', async () => {
      const estimates = [{ id: 'est-001', lines: [] }];
      prisma.estimate.findMany.mockResolvedValue(estimates);

      const result = await service.getEstimates(CUSTOMER_ID, TENANT_ID);

      expect(result.data).toEqual(estimates);
    });
  });

  describe('getEstimate', () => {
    it('should return single estimate', async () => {
      const estimate = { id: 'est-001', lines: [] };
      prisma.estimate.findFirst.mockResolvedValue(estimate);

      const result = await service.getEstimate('est-001', CUSTOMER_ID, TENANT_ID);

      expect(result.data).toEqual(estimate);
    });

    it('should throw NotFoundException when estimate not found', async () => {
      prisma.estimate.findFirst.mockResolvedValue(null);

      await expect(service.getEstimate('est-xxx', CUSTOMER_ID, TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('acceptEstimate', () => {
    it('should update estimate to ACCEPTED and return updated', async () => {
      prisma.estimate.findFirst
        .mockResolvedValueOnce({ id: 'est-001' })
        .mockResolvedValueOnce({ id: 'est-001', status: 'ACCEPTED', lines: [] });
      prisma.estimate.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.acceptEstimate('est-001', CUSTOMER_ID, TENANT_ID);

      expect(prisma.estimate.updateMany).toHaveBeenCalledWith({
        where: { id: 'est-001', customerId: CUSTOMER_ID, tenantId: TENANT_ID },
        data: { status: 'ACCEPTED', acceptedAt: expect.any(Date) },
      });
      expect(result.data).toBeDefined();
    });

    it('should throw NotFoundException when estimate not found', async () => {
      prisma.estimate.findFirst.mockResolvedValue(null);

      await expect(service.acceptEstimate('est-xxx', CUSTOMER_ID, TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('rejectEstimate', () => {
    it('should update estimate to REJECTED with reason', async () => {
      prisma.estimate.findFirst
        .mockResolvedValueOnce({ id: 'est-001', notes: 'Original notes' })
        .mockResolvedValueOnce({ id: 'est-001', status: 'REJECTED', lines: [] });
      prisma.estimate.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.rejectEstimate(
        'est-001',
        CUSTOMER_ID,
        TENANT_ID,
        'Too expensive',
      );

      expect(prisma.estimate.updateMany).toHaveBeenCalledWith({
        where: { id: 'est-001', customerId: CUSTOMER_ID, tenantId: TENANT_ID },
        data: {
          status: 'REJECTED',
          rejectedAt: expect.any(Date),
          notes: 'Too expensive',
        },
      });
      expect(result.data).toBeDefined();
    });

    it('should keep original notes when no reason provided', async () => {
      prisma.estimate.findFirst
        .mockResolvedValueOnce({ id: 'est-001', notes: 'Original notes' })
        .mockResolvedValueOnce({ id: 'est-001', status: 'REJECTED', lines: [] });
      prisma.estimate.updateMany.mockResolvedValue({ count: 1 });

      await service.rejectEstimate('est-001', CUSTOMER_ID, TENANT_ID);

      expect(prisma.estimate.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ notes: 'Original notes' }),
        }),
      );
    });

    it('should use empty string reason as falsy - keep original notes', async () => {
      prisma.estimate.findFirst
        .mockResolvedValueOnce({ id: 'est-001', notes: 'Original' })
        .mockResolvedValueOnce({ id: 'est-001', status: 'REJECTED', lines: [] });
      prisma.estimate.updateMany.mockResolvedValue({ count: 1 });

      await service.rejectEstimate('est-001', CUSTOMER_ID, TENANT_ID, '');

      expect(prisma.estimate.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ notes: 'Original' }),
        }),
      );
    });

    it('should throw NotFoundException when estimate not found', async () => {
      prisma.estimate.findFirst.mockResolvedValue(null);

      await expect(service.rejectEstimate('est-xxx', CUSTOMER_ID, TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ===========================================================================
  // getTracking
  // ===========================================================================
  describe('getTracking', () => {
    it('should return active work orders', async () => {
      const workOrders = [{ id: 'wo-001', status: 'IN_PROGRESS' }];
      prisma.workOrder.findMany.mockResolvedValue(workOrders);

      const result = await service.getTracking(CUSTOMER_ID, TENANT_ID);

      expect(result.data).toEqual(workOrders);
      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['PENDING', 'IN_PROGRESS', 'WAITING_PARTS', 'CHECKED_IN'] },
          }),
        }),
      );
    });
  });

  // ===========================================================================
  // getNotificationPreferences / updateNotificationPreferences
  // ===========================================================================
  describe('getNotificationPreferences', () => {
    it('should return notification preferences', async () => {
      const prefs = [{ channel: 'SMS', enabled: true }];
      prisma.customerNotificationPreference.findMany.mockResolvedValue(prefs);

      const result = await service.getNotificationPreferences(CUSTOMER_ID, TENANT_ID);

      expect(result.data).toEqual(prefs);
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should upsert preferences for each channel', async () => {
      prisma.customerNotificationPreference.upsert.mockResolvedValue({});

      const result = await service.updateNotificationPreferences(CUSTOMER_ID, TENANT_ID, {
        SMS: true,
        EMAIL: false,
      });

      expect(prisma.customerNotificationPreference.upsert).toHaveBeenCalledTimes(2);
      expect(result.data).toHaveLength(2);
    });

    it('should handle empty preferences object', async () => {
      const result = await service.updateNotificationPreferences(CUSTOMER_ID, TENANT_ID, {});

      expect(prisma.customerNotificationPreference.upsert).not.toHaveBeenCalled();
      expect(result.data).toEqual([]);
    });
  });

  // ===========================================================================
  // getMessages / sendMessage
  // ===========================================================================
  describe('getMessages', () => {
    it('should return threads with messages', async () => {
      const threads = [{ id: 'thread-1', messages: [] }];
      prisma.smsThread.findMany.mockResolvedValue(threads);

      const result = await service.getMessages(CUSTOMER_ID, TENANT_ID);

      expect(result.data).toEqual(threads);
    });
  });

  describe('sendMessage', () => {
    it('should send message to existing thread', async () => {
      const thread = { id: 'thread-1' };
      prisma.smsThread.findFirst.mockResolvedValue(thread);
      prisma.smsMessage.create.mockResolvedValue({ id: 'msg-1', body: 'Hello' });
      prisma.smsThread.update.mockResolvedValue(thread);

      const result = await service.sendMessage(CUSTOMER_ID, TENANT_ID, 'Hello');

      expect(result.data).toBeDefined();
      expect(prisma.smsMessage.create).toHaveBeenCalledWith({
        data: {
          threadId: 'thread-1',
          direction: 'INBOUND',
          body: 'Hello',
          status: 'SENT',
        },
      });
    });

    it('should create new thread when none exists', async () => {
      prisma.smsThread.findFirst.mockResolvedValue(null);
      prisma.customer.findFirst.mockResolvedValue({ phoneHash: 'hash-123' });
      const newThread = { id: 'thread-new' };
      prisma.smsThread.create.mockResolvedValue(newThread);
      prisma.smsMessage.create.mockResolvedValue({ id: 'msg-1' });
      prisma.smsThread.update.mockResolvedValue(newThread);

      const result = await service.sendMessage(CUSTOMER_ID, TENANT_ID, 'Hello');

      expect(prisma.smsThread.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          customerId: CUSTOMER_ID,
          phoneHash: 'hash-123',
        }),
      });
      expect(result.data).toBeDefined();
    });

    it('should throw NotFoundException when customer not found for new thread', async () => {
      prisma.smsThread.findFirst.mockResolvedValue(null);
      prisma.customer.findFirst.mockResolvedValue(null);

      await expect(service.sendMessage(CUSTOMER_ID, TENANT_ID, 'Hello')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for empty message', async () => {
      await expect(service.sendMessage(CUSTOMER_ID, TENANT_ID, '')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for whitespace-only message', async () => {
      await expect(service.sendMessage(CUSTOMER_ID, TENANT_ID, '   ')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should trim the message body', async () => {
      const thread = { id: 'thread-1' };
      prisma.smsThread.findFirst.mockResolvedValue(thread);
      prisma.smsMessage.create.mockResolvedValue({ id: 'msg-1' });
      prisma.smsThread.update.mockResolvedValue(thread);

      await service.sendMessage(CUSTOMER_ID, TENANT_ID, '  Hello  ');

      expect(prisma.smsMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ body: 'Hello' }),
        }),
      );
    });
  });
});
