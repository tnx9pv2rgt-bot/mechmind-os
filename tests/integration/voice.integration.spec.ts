/**
 * MechMind OS v10 - Voice Integration Tests
 * Voice webhook and AI booking flow integration testing
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { getTestPool, setTenantContext } from '@test/database';
import { createTenantJWT, generateHMACSignature } from '@test/mock-factories';
import { Pool } from 'pg';
import * as crypto from 'crypto';

describe('VoiceIntegration', () => {
  let app: INestApplication;
  let pool: Pool;
  let tenantId: string;
  let shopId: string;
  let webhookSecret: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    pool = getTestPool();
    webhookSecret = process.env.VOICE_WEBHOOK_SECRET || 'test-webhook-secret';
  });

  beforeEach(async () => {
    const client = await pool.connect();
    
    try {
      // Create test tenant
      const tenantResult = await client.query(
        `INSERT INTO test.tenants (name) VALUES ('Voice Test Tenant') RETURNING id`
      );
      tenantId = tenantResult.rows[0].id;
      
      // Create test shop
      const shopResult = await client.query(
        `INSERT INTO test.shops (tenant_id, name, address) VALUES ($1, 'Voice Test Shop', '123 Voice St') RETURNING id`,
        [tenantId]
      );
      shopId = shopResult.rows[0].id;
      
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

  describe('POST /api/v1/voice/webhook', () => {
    it('should handle complete booking flow', async () => {
      // Arrange
      const payload = {
        event: 'call.completed',
        call_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        phone_number: '+15551234567',
        transcript: 'I need to book an oil change for tomorrow at 2pm',
        recording_url: 'https://example.com/recording.mp3',
        shop_id: shopId,
      };
      
      const signature = generateHMACSignature(JSON.stringify(payload), webhookSecret);

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/voice/webhook')
        .set('X-Webhook-Signature', signature)
        .set('X-Tenant-ID', tenantId)
        .send(payload)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.bookingId).toBeDefined();
      expect(response.body.intent).toBe('booking_request');
    });

    it('should verify HMAC signature', async () => {
      // Arrange
      const payload = {
        event: 'call.completed',
        call_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        phone_number: '+15551234567',
        transcript: 'Book an appointment',
      };
      
      const invalidSignature = 'invalid-signature';

      // Act & Assert
      await request(app.getHttpServer())
        .post('/api/v1/voice/webhook')
        .set('X-Webhook-Signature', invalidSignature)
        .set('X-Tenant-ID', tenantId)
        .send(payload)
        .expect(401);
    });

    it('should reject missing signature', async () => {
      // Arrange
      const payload = {
        event: 'call.completed',
        call_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      };

      // Act & Assert
      await request(app.getHttpServer())
        .post('/api/v1/voice/webhook')
        .set('X-Tenant-ID', tenantId)
        .send(payload)
        .expect(401);
    });

    it('should handle cancellation request', async () => {
      // Arrange - First create a booking
      const bookingPayload = {
        event: 'call.completed',
        call_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        phone_number: '+15551234567',
        transcript: 'Book oil change for tomorrow at 3pm',
        shop_id: shopId,
      };
      
      const signature = generateHMACSignature(JSON.stringify(bookingPayload), webhookSecret);
      
      const bookingResponse = await request(app.getHttpServer())
        .post('/api/v1/voice/webhook')
        .set('X-Webhook-Signature', signature)
        .set('X-Tenant-ID', tenantId)
        .send(bookingPayload);
      
      // Act - Send cancellation request
      const cancelPayload = {
        event: 'call.completed',
        call_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        phone_number: '+15551234567',
        transcript: 'I need to cancel my appointment',
      };
      
      const cancelSignature = generateHMACSignature(JSON.stringify(cancelPayload), webhookSecret);
      
      const response = await request(app.getHttpServer())
        .post('/api/v1/voice/webhook')
        .set('X-Webhook-Signature', cancelSignature)
        .set('X-Tenant-ID', tenantId)
        .send(cancelPayload);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.action).toBe('cancellation');
    });

    it('should handle unclear intent', async () => {
      // Arrange
      const payload = {
        event: 'call.completed',
        call_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        phone_number: '+15551234567',
        transcript: 'I have a question about my car',
      };
      
      const signature = generateHMACSignature(JSON.stringify(payload), webhookSecret);

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/voice/webhook')
        .set('X-Webhook-Signature', signature)
        .set('X-Tenant-ID', tenantId)
        .send(payload);

      // Assert
      expect(response.body.escalated).toBe(true);
      expect(response.body.message).toContain('human agent');
    });

    it('should handle timeout event', async () => {
      // Arrange
      const payload = {
        event: 'call.timeout',
        call_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        phone_number: '+15551234567',
        duration_seconds: 30,
      };
      
      const signature = generateHMACSignature(JSON.stringify(payload), webhookSecret);

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/voice/webhook')
        .set('X-Webhook-Signature', signature)
        .set('X-Tenant-ID', tenantId)
        .send(payload);

      // Assert
      expect(response.body.escalated).toBe(true);
      expect(response.body.smsSent).toBe(true);
    });

    it('should extract entities from transcript', async () => {
      // Arrange
      const payload = {
        event: 'call.completed',
        call_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        phone_number: '+15551234567',
        transcript: 'Book tire rotation for next Tuesday at 10am for John Doe',
        shop_id: shopId,
      };
      
      const signature = generateHMACSignature(JSON.stringify(payload), webhookSecret);

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/voice/webhook')
        .set('X-Webhook-Signature', signature)
        .set('X-Tenant-ID', tenantId)
        .send(payload);

      // Assert
      expect(response.body.entities).toBeDefined();
      expect(response.body.entities.service).toBe('tire_rotation');
    });

    it('should create customer from new phone number', async () => {
      // Arrange
      const newPhone = '+15559998888';
      const payload = {
        event: 'call.completed',
        call_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        phone_number: newPhone,
        transcript: 'Book oil change for tomorrow at 2pm',
        shop_id: shopId,
      };
      
      const signature = generateHMACSignature(JSON.stringify(payload), webhookSecret);

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/voice/webhook')
        .set('X-Webhook-Signature', signature)
        .set('X-Tenant-ID', tenantId)
        .send(payload);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.customerCreated).toBe(true);
      
      // Verify customer was created
      const client = await pool.connect();
      try {
        await setTenantContext(client as unknown as any, tenantId);
        const customerResult = await client.query(
          'SELECT * FROM test.customers WHERE phone_encrypted LIKE $1',
          [`%${newPhone.slice(-4)}%`]
        );
        expect(customerResult.rows.length).toBeGreaterThan(0);
      } finally {
        client.release();
      }
    });
  });

  describe('POST /api/v1/voice/callback', () => {
    it('should handle voice callback', async () => {
      // Arrange
      const payload = {
        call_sid: 'call-123',
        from: '+15551234567',
        to: '+15559876543',
        status: 'in-progress',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/voice/callback')
        .set('X-Tenant-ID', tenantId)
        .send(payload);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.twiml).toBeDefined();
    });
  });

  describe('POST /api/v1/voice/transcription', () => {
    it('should handle transcription callback', async () => {
      // Arrange
      const payload = {
        call_sid: 'call-123',
        transcription_text: 'I need an oil change tomorrow',
        confidence: 0.92,
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/voice/transcription')
        .set('X-Tenant-ID', tenantId)
        .send(payload);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.intent).toBeDefined();
    });
  });

  describe('Voice Response Latency', () => {
    it('should respond within 2 seconds (p99 requirement)', async () => {
      // Arrange
      const latencies: number[] = [];
      
      // Act - Measure 50 requests
      for (let i = 0; i < 50; i++) {
        const payload = {
          event: 'call.completed',
          call_id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          phone_number: '+15551234567',
          transcript: 'Book oil change',
          shop_id: shopId,
        };
        
        const signature = generateHMACSignature(JSON.stringify(payload), webhookSecret);
        
        const start = Date.now();
        await request(app.getHttpServer())
          .post('/api/v1/voice/webhook')
          .set('X-Webhook-Signature', signature)
          .set('X-Tenant-ID', tenantId)
          .send(payload);
        
        latencies.push(Date.now() - start);
      }

      // Assert - p99 should be under 2000ms
      const sorted = latencies.sort((a, b) => a - b);
      const p99 = sorted[Math.floor(sorted.length * 0.99)];
      
      expect(p99).toBeLessThan(2000);
    });
  });

  describe('SMS Confirmation', () => {
    it('should send SMS confirmation after booking', async () => {
      // Arrange
      const payload = {
        event: 'call.completed',
        call_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        phone_number: '+15551234567',
        transcript: 'Book oil change for tomorrow at 2pm',
        shop_id: shopId,
      };
      
      const signature = generateHMACSignature(JSON.stringify(payload), webhookSecret);

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/voice/webhook')
        .set('X-Webhook-Signature', signature)
        .set('X-Tenant-ID', tenantId)
        .send(payload);

      // Assert
      expect(response.body.smsSent).toBe(true);
      expect(response.body.confirmationMessage).toContain('confirmed');
    });
  });
});
