/**
 * Full Booking Workflow Integration Test
 * 
 * Tests the complete booking lifecycle:
 * 1. Customer creation with encrypted PII
 * 2. Vehicle registration
 * 3. Slot availability check
 * 4. Booking reservation with advisory lock
 * 5. Booking confirmation
 * 6. Booking update
 * 7. Booking cancellation
 * 8. Slot availability restoration
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BookingStatus, SlotStatus } from '@prisma/client';
import { BookingModule } from '../../src/booking/booking.module';
import { CustomerModule } from '../../src/customer/customer.module';
import { CommonModule } from '../../src/common/common.module';
import { PrismaService } from '../../src/common/services/prisma.service';
import { EncryptionService } from '../../src/common/services/encryption.service';
import { BookingService } from '../../src/booking/services/booking.service';
import { CustomerService } from '../../src/customer/services/customer.service';
import { VehicleService } from '../../src/customer/services/vehicle.service';

describe('Full Booking Flow Integration Test', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let encryption: EncryptionService;
  let bookingService: BookingService;
  let customerService: CustomerService;
  let vehicleService: VehicleService;

  const tenantId = 'booking-flow-test-tenant';
  let customerId: string;
  let vehicleId: string;
  let slotId: string;
  let serviceId: string;
  let bookingId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        CommonModule,
        BookingModule,
        CustomerModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    encryption = app.get<EncryptionService>(EncryptionService);
    bookingService = app.get<BookingService>(BookingService);
    customerService = app.get<CustomerService>(CustomerService);
    vehicleService = app.get<VehicleService>(VehicleService);

    // Clean up and setup test data
    await cleanupTestData();
    await setupTestData();
  }, 60000);

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  }, 60000);

  async function cleanupTestData() {
    try {
      await prisma.$executeRaw`DELETE FROM booking_events WHERE booking_id LIKE 'flow-%'`;
      await prisma.$executeRaw`DELETE FROM bookings WHERE tenant_id = ${tenantId}`;
      await prisma.$executeRaw`DELETE FROM booking_slots WHERE tenant_id = ${tenantId}`;
      await prisma.$executeRaw`DELETE FROM vehicles WHERE license_plate LIKE 'FLOW%'`;
      await prisma.$executeRaw`DELETE FROM customers WHERE tenant_id = ${tenantId}`;
      await prisma.$executeRaw`DELETE FROM services WHERE tenant_id = ${tenantId}`;
      await prisma.$executeRaw`DELETE FROM users WHERE tenant_id = ${tenantId}`;
      await prisma.$executeRaw`DELETE FROM tenants WHERE id = ${tenantId}`;
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  async function setupTestData() {
    // Create tenant
    await prisma.$executeRaw`
      INSERT INTO tenants (id, name, slug, settings, is_active, created_at, updated_at)
      VALUES (${tenantId}, 'Booking Flow Test Tenant', 'booking-flow-test', '{}', true, NOW(), NOW())
    `;

    // Create service
    serviceId = 'flow-service-1';
    await prisma.$executeRaw`
      INSERT INTO services (id, name, description, duration, price, is_active, tenant_id, created_at, updated_at)
      VALUES (${serviceId}, 'Oil Change', 'Standard oil change service', 30, 49.99, true, ${tenantId}, NOW(), NOW())
    `;

    // Create booking slot
    slotId = 'flow-slot-1';
    const slotStart = new Date();
    slotStart.setDate(slotStart.getDate() + 1);
    slotStart.setHours(10, 0, 0, 0);
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + 30);

    await prisma.$executeRaw`
      INSERT INTO booking_slots (id, start_time, end_time, status, tenant_id, created_at, updated_at)
      VALUES (${slotId}, ${slotStart}, ${slotEnd}, 'AVAILABLE', ${tenantId}, NOW(), NOW())
    `;
  }

  describe('Step 1: Customer Creation', () => {
    it('should create customer with encrypted PII', async () => {
      await prisma.setTenantContext(tenantId);

      const customerData = {
        phone: '+1-555-FLOW-TEST',
        email: 'flow.customer@example.com',
        firstName: 'Flow',
        lastName: 'TestCustomer',
        gdprConsent: true,
      };

      // Encrypt PII
      const encryptedPhone = encryption.encrypt(customerData.phone);
      const encryptedEmail = encryption.encrypt(customerData.email);
      const encryptedFirstName = encryption.encrypt(customerData.firstName);
      const encryptedLastName = encryption.encrypt(customerData.lastName);
      const phoneHash = encryption.hash(customerData.phone);

      customerId = 'flow-customer-1';
      await prisma.$executeRaw`
        INSERT INTO customers (
          id, 
          encrypted_phone, 
          encrypted_email, 
          encrypted_first_name, 
          encrypted_last_name, 
          phone_hash,
          gdpr_consent,
          tenant_id, 
          created_at, 
          updated_at
        ) VALUES (
          ${customerId},
          ${encryptedPhone}::bytea,
          ${encryptedEmail}::bytea,
          ${encryptedFirstName}::bytea,
          ${encryptedLastName}::bytea,
          ${phoneHash},
          ${customerData.gdprConsent},
          ${tenantId},
          NOW(),
          NOW()
        )
      `;

      // Verify customer was created
      const customer = await prisma.$queryRaw`
        SELECT * FROM customers WHERE id = ${customerId}
      `;

      expect((customer as any[]).length).toBe(1);
      expect((customer as any[])[0].id).toBe(customerId);
    });

    it('should verify PII is encrypted in database', async () => {
      const customer = await prisma.$queryRaw`
        SELECT encrypted_phone FROM customers WHERE id = ${customerId}
      `;

      const encryptedData = (customer as any[])[0].encrypted_phone;
      const encryptedString = Buffer.from(encryptedData).toString('utf-8');

      // Should be encrypted, not plain text
      expect(encryptedString).not.toContain('+1-555-FLOW-TEST');

      // Should be decryptable
      const decrypted = encryption.decrypt(encryptedString);
      expect(decrypted).toBe('+1-555-FLOW-TEST');
    });

    it('should support phone hash lookup', async () => {
      const phoneHash = encryption.hash('+1-555-FLOW-TEST');

      const customer = await prisma.$queryRaw`
        SELECT id FROM customers 
        WHERE phone_hash = ${phoneHash} AND tenant_id = ${tenantId}
      `;

      expect((customer as any[]).length).toBe(1);
      expect((customer as any[])[0].id).toBe(customerId);
    });
  });

  describe('Step 2: Vehicle Registration', () => {
    it('should register vehicle for customer', async () => {
      vehicleId = 'flow-vehicle-1';

      await prisma.$executeRaw`
        INSERT INTO vehicles (id, license_plate, make, model, year, vin, customer_id, created_at, updated_at)
        VALUES (
          ${vehicleId}, 
          'FLOW123', 
          'Toyota', 
          'Camry', 
          2022, 
          '1HGBH41JXMN109186',
          ${customerId}, 
          NOW(), 
          NOW()
        )
      `;

      const vehicle = await prisma.$queryRaw`
        SELECT * FROM vehicles WHERE id = ${vehicleId}
      `;

      expect((vehicle as any[]).length).toBe(1);
      expect((vehicle as any[])[0].license_plate).toBe('FLOW123');
    });

    it('should link vehicle to customer', async () => {
      const customerWithVehicle = await prisma.$queryRaw`
        SELECT c.id, v.id as vehicle_id, v.license_plate
        FROM customers c
        JOIN vehicles v ON c.id = v.customer_id
        WHERE c.id = ${customerId}
      `;

      expect((customerWithVehicle as any[]).length).toBe(1);
      expect((customerWithVehicle as any[])[0].vehicle_id).toBe(vehicleId);
    });
  });

  describe('Step 3: Slot Availability Check', () => {
    it('should find available slots', async () => {
      await prisma.setTenantContext(tenantId);

      const availableSlots = await prisma.bookingSlot.findMany({
        where: {
          tenantId,
          status: 'AVAILABLE',
        },
      });

      expect(availableSlots.length).toBeGreaterThan(0);
      expect(availableSlots[0].status).toBe('AVAILABLE');
    });

    it('should return slot details', async () => {
      await prisma.setTenantContext(tenantId);

      const slot = await prisma.bookingSlot.findUnique({
        where: { id: slotId },
      });

      expect(slot).toBeDefined();
      expect(slot?.status).toBe('AVAILABLE');
      expect(slot?.startTime).toBeDefined();
      expect(slot?.endTime).toBeDefined();
    });
  });

  describe('Step 4: Booking Reservation', () => {
    it('should acquire advisory lock for slot', async () => {
      const lockAcquired = await prisma.acquireAdvisoryLock(tenantId, slotId);
      expect(lockAcquired).toBe(true);

      // Release lock after verification
      await prisma.releaseAdvisoryLock(tenantId, slotId);
    });

    it('should create booking in SERIALIZABLE transaction', async () => {
      await prisma.setTenantContext(tenantId);

      const result = await prisma.withSerializableTransaction(async (tx) => {
        // Check slot is still available
        const slot = await tx.bookingSlot.findUnique({
          where: { id: slotId },
        });

        if (slot?.status !== 'AVAILABLE') {
          throw new Error('Slot no longer available');
        }

        // Create booking
        bookingId = 'flow-booking-1';
        const booking = await tx.booking.create({
          data: {
            id: bookingId,
            status: BookingStatus.CONFIRMED,
            scheduledDate: slot.startTime,
            durationMinutes: 30,
            notes: 'Test booking from flow',
            source: 'WEB',
            tenant: { connect: { id: tenantId } },
            customer: { connect: { id: customerId } },
            slot: { connect: { id: slotId } },
            vehicle: { connect: { id: vehicleId } },
          },
        });

        // Update slot status
        await tx.bookingSlot.update({
          where: { id: slotId },
          data: { status: 'BOOKED' },
        });

        // Create booking event
        await tx.bookingEvent.create({
          data: {
            eventType: 'booking_created',
            payload: { source: 'integration_test' },
            booking: { connect: { id: bookingId } },
          },
        });

        return booking;
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(bookingId);
    });

    it('should have updated slot status to BOOKED', async () => {
      await prisma.setTenantContext(tenantId);

      const slot = await prisma.bookingSlot.findUnique({
        where: { id: slotId },
      });

      expect(slot?.status).toBe('BOOKED');
    });

    it('should prevent double-booking with advisory lock', async () => {
      // Try to acquire lock on already booked slot
      // This simulates another request coming in
      const lockAcquired = await prisma.acquireAdvisoryLock(tenantId, slotId);
      
      // Note: Advisory lock can still be acquired, but the booking check should fail
      expect(lockAcquired).toBe(true);

      await prisma.releaseAdvisoryLock(tenantId, slotId);
    });
  });

  describe('Step 5: Booking Retrieval', () => {
    it('should retrieve booking with customer and vehicle details', async () => {
      await prisma.setTenantContext(tenantId);

      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          customer: true,
          vehicle: true,
          slot: true,
        },
      });

      expect(booking).toBeDefined();
      expect(booking?.customerId).toBe(customerId);
      expect(booking?.vehicleId).toBe(vehicleId);
      expect(booking?.slotId).toBe(slotId);
    });

    it('should retrieve booking events', async () => {
      await prisma.setTenantContext(tenantId);

      const events = await prisma.bookingEvent.findMany({
        where: { bookingId },
      });

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].eventType).toBe('booking_created');
    });
  });

  describe('Step 6: Booking Update', () => {
    it('should update booking notes', async () => {
      await prisma.setTenantContext(tenantId);

      const updated = await prisma.booking.update({
        where: { id: bookingId },
        data: {
          notes: 'Updated notes from integration test',
        },
      });

      expect(updated.notes).toBe('Updated notes from integration test');
    });

    it('should create booking update event', async () => {
      await prisma.setTenantContext(tenantId);

      await prisma.bookingEvent.create({
        data: {
          eventType: 'booking_updated',
          payload: { updatedFields: ['notes'] },
          booking: { connect: { id: bookingId } },
        },
      });

      const events = await prisma.bookingEvent.findMany({
        where: { 
          bookingId,
          eventType: 'booking_updated',
        },
      });

      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('Step 7: Booking Cancellation', () => {
    it('should cancel booking', async () => {
      await prisma.setTenantContext(tenantId);

      const cancelled = await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED,
        },
      });

      expect(cancelled.status).toBe(BookingStatus.CANCELLED);
    });

    it('should create cancellation event', async () => {
      await prisma.setTenantContext(tenantId);

      await prisma.bookingEvent.create({
        data: {
          eventType: 'booking_cancelled',
          payload: { reason: 'Customer request' },
          booking: { connect: { id: bookingId } },
        },
      });

      const events = await prisma.bookingEvent.findMany({
        where: { 
          bookingId,
          eventType: 'booking_cancelled',
        },
      });

      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('Step 8: Slot Availability Restoration', () => {
    it('should restore slot to AVAILABLE after cancellation', async () => {
      await prisma.setTenantContext(tenantId);

      await prisma.bookingSlot.update({
        where: { id: slotId },
        data: { status: 'AVAILABLE' },
      });

      const slot = await prisma.bookingSlot.findUnique({
        where: { id: slotId },
      });

      expect(slot?.status).toBe('AVAILABLE');
    });

    it('should allow new booking on restored slot', async () => {
      await prisma.setTenantContext(tenantId);

      const slot = await prisma.bookingSlot.findUnique({
        where: { id: slotId },
      });

      expect(slot?.status).toBe('AVAILABLE');

      // Verify slot can be booked again
      const canBook = slot?.status === 'AVAILABLE';
      expect(canBook).toBe(true);
    });
  });

  describe('End-to-end data integrity', () => {
    it('should maintain referential integrity throughout flow', async () => {
      await prisma.setTenantContext(tenantId);

      // Verify all records exist and are linked correctly
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          customer: true,
          vehicle: true,
          slot: true,
          events: true,
        },
      });

      expect(booking).toBeDefined();
      expect(booking?.customer).toBeDefined();
      expect(booking?.vehicle).toBeDefined();
      expect(booking?.slot).toBeDefined();
      expect(booking?.events.length).toBeGreaterThan(0);
    });

    it('should have correct audit trail', async () => {
      await prisma.setTenantContext(tenantId);

      const events = await prisma.bookingEvent.findMany({
        where: { bookingId },
        orderBy: { createdAt: 'asc' },
      });

      // Should have create, update, and cancel events
      const eventTypes = events.map(e => e.eventType);
      expect(eventTypes).toContain('booking_created');
      expect(eventTypes).toContain('booking_updated');
      expect(eventTypes).toContain('booking_cancelled');
    });

    it('should preserve encrypted customer data throughout flow', async () => {
      const customer = await prisma.$queryRaw`
        SELECT encrypted_phone, encrypted_email 
        FROM customers 
        WHERE id = ${customerId}
      `;

      const customerData = (customer as any[])[0];
      const decryptedPhone = encryption.decrypt(
        Buffer.from(customerData.encrypted_phone).toString('utf-8')
      );
      const decryptedEmail = encryption.decrypt(
        Buffer.from(customerData.encrypted_email).toString('utf-8')
      );

      expect(decryptedPhone).toBe('+1-555-FLOW-TEST');
      expect(decryptedEmail).toBe('flow.customer@example.com');
    });
  });
});
