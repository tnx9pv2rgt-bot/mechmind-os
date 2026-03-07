/**
 * MechMind OS v10 - Booking API Integration Tests
 * API endpoint testing with JWT authentication and race conditions
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { getTestPool, setTenantContext } from '@test/database';
import { 
  createTenant, 
  createShop, 
  createCustomer, 
  createTenantJWT 
} from '@test/mock-factories';
import { Pool } from 'pg';

describe('BookingAPI', () => {
  let app: INestApplication;
  let pool: Pool;
  let tenantId: string;
  let shopId: string;
  let customerId: string;
  let authToken: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    pool = getTestPool();
  });

  beforeEach(async () => {
    const client = await pool.connect();
    
    try {
      // Create test tenant
      const tenantResult = await client.query(
        `INSERT INTO test.tenants (name) VALUES ('API Test Tenant') RETURNING id`
      );
      tenantId = tenantResult.rows[0].id;
      
      // Create test shop
      const shopResult = await client.query(
        `INSERT INTO test.shops (tenant_id, name, address) VALUES ($1, 'API Test Shop', '123 API St') RETURNING id`,
        [tenantId]
      );
      shopId = shopResult.rows[0].id;
      
      // Create test customer
      await setTenantContext(client as unknown as any, tenantId);
      const customerResult = await client.query(
        `INSERT INTO test.customers (tenant_id, shop_id, first_name_encrypted, last_name_encrypted, phone_encrypted, gdpr_consent)
         VALUES ($1, $2, 'enc:API', 'enc:Customer', 'enc:555-API', true) RETURNING id`,
        [tenantId, shopId]
      );
      customerId = customerResult.rows[0].id;
      
      // Generate auth token
      authToken = createTenantJWT(tenantId);
      
    } finally {
      client.release();
    }
  });

  afterEach(async () => {
    const client = await pool.connect();
    try {
      await client.query('TRUNCATE TABLE test.bookings, test.customers, test.shops, test.tenants CASCADE');
    } finally {
      client.release();
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/bookings', () => {
    it('should create booking with valid JWT', async () => {
      // Arrange
      const bookingData = {
        shopId,
        customerId,
        serviceType: 'oil_change',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        durationMinutes: 60,
        notes: 'Test booking via API',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bookingData)
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('confirmed');
      expect(response.body.tenantId).toBe(tenantId);
    });

    it('should return 401 without JWT', async () => {
      // Arrange
      const bookingData = {
        shopId,
        serviceType: 'oil_change',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        durationMinutes: 60,
      };

      // Act & Assert
      await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .send(bookingData)
        .expect(401);
    });

    it('should return 403 with invalid tenant JWT', async () => {
      // Arrange
      const wrongTenantToken = createTenantJWT('wrong-tenant-id');
      const bookingData = {
        shopId,
        serviceType: 'oil_change',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        durationMinutes: 60,
      };

      // Act & Assert
      await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${wrongTenantToken}`)
        .send(bookingData)
        .expect(403);
    });

    it('should return 409 on slot conflict', async () => {
      // Arrange
      const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      // Create first booking
      await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          shopId,
          customerId,
          serviceType: 'oil_change',
          scheduledAt,
          durationMinutes: 60,
        })
        .expect(201);

      // Act - Try to create conflicting booking
      const response = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          shopId,
          customerId,
          serviceType: 'tire_rotation',
          scheduledAt,
          durationMinutes: 60,
        });

      // Assert
      expect(response.status).toBe(409);
      expect(response.body.message).toContain('conflict');
    });

    it('should queue booking on lock failure', async () => {
      // Arrange - Simulate lock contention by making many concurrent requests
      const scheduledAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      const bookingData = {
        shopId,
        customerId,
        serviceType: 'oil_change',
        scheduledAt,
        durationMinutes: 60,
      };

      // Act - Send 50 concurrent requests
      const requests = Array.from({ length: 50 }, () =>
        request(app.getHttpServer())
          .post('/api/v1/bookings')
          .set('Authorization', `Bearer ${authToken}`)
          .send(bookingData)
      );

      const responses = await Promise.all(requests);

      // Assert - Count successes and failures
      const successes = responses.filter(r => r.status === 201);
      const conflicts = responses.filter(r => r.status === 409);
      const queued = responses.filter(r => r.status === 202);

      // Only one should succeed, others should be conflict or queued
      expect(successes.length + conflicts.length + queued.length).toBe(50);
      expect(successes.length).toBeLessThanOrEqual(1);
    });

    it('should validate required fields', async () => {
      // Arrange - Missing serviceType
      const invalidData = {
        shopId,
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        durationMinutes: 60,
      };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.message).toContain('serviceType');
    });

    it('should reject past dates', async () => {
      // Arrange
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const bookingData = {
        shopId,
        serviceType: 'oil_change',
        scheduledAt: pastDate,
        durationMinutes: 60,
      };

      // Act & Assert
      await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bookingData)
        .expect(400);
    });
  });

  describe('GET /api/v1/bookings/:id', () => {
    let bookingId: string;

    beforeEach(async () => {
      // Create a booking
      const response = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          shopId,
          customerId,
          serviceType: 'oil_change',
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          durationMinutes: 60,
        });
      
      bookingId = response.body.id;
    });

    it('should return booking with valid JWT', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get(`/api/v1/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body.id).toBe(bookingId);
      expect(response.body.tenantId).toBe(tenantId);
    });

    it('should return 404 for non-existent booking', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .get('/api/v1/bookings/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should not return booking from different tenant', async () => {
      // Arrange - Create another tenant and try to access booking
      const otherTenantToken = createTenantJWT('other-tenant-id');

      // Act & Assert
      await request(app.getHttpServer())
        .get(`/api/v1/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${otherTenantToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/v1/bookings/:id', () => {
    let bookingId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          shopId,
          customerId,
          serviceType: 'oil_change',
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          durationMinutes: 60,
        });
      
      bookingId = response.body.id;
    });

    it('should update booking with valid data', async () => {
      // Arrange
      const updateData = {
        notes: 'Updated notes',
        durationMinutes: 90,
      };

      // Act
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      // Assert
      expect(response.body.notes).toBe('Updated notes');
      expect(response.body.durationMinutes).toBe(90);
    });

    it('should return 409 when updating to conflicting slot', async () => {
      // Arrange - Create another booking at a different time
      const otherTime = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString();
      await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          shopId,
          customerId,
          serviceType: 'tire_rotation',
          scheduledAt: otherTime,
          durationMinutes: 60,
        });

      // Act - Try to update first booking to the same time
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          scheduledAt: otherTime,
        });

      // Assert
      expect(response.status).toBe(409);
    });
  });

  describe('DELETE /api/v1/bookings/:id', () => {
    let bookingId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          shopId,
          customerId,
          serviceType: 'oil_change',
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          durationMinutes: 60,
        });
      
      bookingId = response.body.id;
    });

    it('should cancel booking', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Customer request' })
        .expect(200);

      // Assert
      expect(response.body.status).toBe('cancelled');
    });

    it('should return 404 for non-existent booking', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .delete('/api/v1/bookings/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('GET /api/v1/bookings', () => {
    beforeEach(async () => {
      // Create multiple bookings
      const baseTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      for (let i = 0; i < 5; i++) {
        const scheduledAt = new Date(baseTime.getTime() + i * 60 * 60 * 1000).toISOString();
        await request(app.getHttpServer())
          .post('/api/v1/bookings')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            shopId,
            customerId,
            serviceType: i % 2 === 0 ? 'oil_change' : 'tire_rotation',
            scheduledAt,
            durationMinutes: 60,
          });
      }
    });

    it('should return bookings for tenant', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      
      // All bookings should belong to the tenant
      response.body.forEach((booking: any) => {
        expect(booking.tenantId).toBe(tenantId);
      });
    });

    it('should filter by date range', async () => {
      // Arrange
      const startDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString();

      // Act
      const response = await request(app.getHttpServer())
        .get(`/api/v1/bookings?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body).toBeInstanceOf(Array);
      // Should return bookings within the date range
    });

    it('should filter by shop', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get(`/api/v1/bookings?shopId=${shopId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      response.body.forEach((booking: any) => {
        expect(booking.shopId).toBe(shopId);
      });
    });
  });
});
