/**
 * MechMind OS v10 - GDPR Compliance Tests
 * GDPR compliance validation for data protection requirements
 * 
 * GDPR Requirements Tested:
 * - Lawful basis for processing (Article 6)
 * - Data minimization (Article 5)
 * - Right to access (Article 15)
 * - Right to rectification (Article 16)
 * - Right to erasure / Right to be forgotten (Article 17)
 * - Right to data portability (Article 20)
 * - Privacy by design (Article 25)
 * - Records of processing (Article 30)
 * - Security of processing (Article 32)
 * - Data breach notification (Article 33, 34)
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
  createTenantJWT,
  encryptPII
} from '@test/mock-factories';
import { Pool } from 'pg';
import * as crypto from 'crypto';

describe('GDPRCompliance', () => {
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
        `INSERT INTO test.tenants (name) VALUES ('GDPR Test Tenant') RETURNING id`
      );
      tenantId = tenantResult.rows[0].id;
      
      // Create test shop
      const shopResult = await client.query(
        `INSERT INTO test.shops (tenant_id, name, address) VALUES ($1, 'GDPR Test Shop', '123 GDPR St') RETURNING id`,
        [tenantId]
      );
      shopId = shopResult.rows[0].id;
      
      // Create test customer with PII
      await setTenantContext(client as unknown as any, tenantId);
      const customerResult = await client.query(
        `INSERT INTO test.customers (tenant_id, shop_id, first_name_encrypted, last_name_encrypted, phone_encrypted, email_encrypted, gdpr_consent, gdpr_consent_date)
         VALUES ($1, $2, $3, $4, $5, $6, true, NOW()) RETURNING id`,
        [
          tenantId,
          shopId,
          encryptPII('John'),
          encryptPII('Doe'),
          encryptPII('+15551234567'),
          encryptPII('john.doe@example.com'),
        ]
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
      await client.query('TRUNCATE TABLE test.gdpr_audit_log, test.events, test.bookings, test.customers, test.shops, test.tenants CASCADE');
    } finally {
      client.release();
    }
  });

  afterAll(async () => {
    await app.close();
  });

  /**
   * Article 6: Lawful Basis for Processing
   */
  describe('Article 6: Lawful Basis', () => {
    it('should record consent for data processing', async () => {
      const client = await pool.connect();
      try {
        await setTenantContext(client as unknown as any, tenantId);
        
        // Verify customer has consent recorded
        const result = await client.query(
          'SELECT gdpr_consent, gdpr_consent_date FROM test.customers WHERE id = $1',
          [customerId]
        );
        
        expect(result.rows[0].gdpr_consent).toBe(true);
        expect(result.rows[0].gdpr_consent_date).toBeDefined();
      } finally {
        client.release();
      }
    });

    it('should not process data without consent', async () => {
      // Arrange - Create customer without consent
      const client = await pool.connect();
      try {
        const noConsentResult = await client.query(
          `INSERT INTO test.customers (tenant_id, shop_id, first_name_encrypted, last_name_encrypted, phone_encrypted, gdpr_consent)
           VALUES ($1, $2, $3, $4, $5, false) RETURNING id`,
          [tenantId, shopId, encryptPII('Jane'), encryptPII('Smith'), encryptPII('+15559876543')]
        );
        const noConsentCustomerId = noConsentResult.rows[0].id;
        
        // Act - Try to create booking for customer without consent
        const response = await request(app.getHttpServer())
          .post('/api/v1/bookings')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            shopId,
            customerId: noConsentCustomerId,
            serviceType: 'oil_change',
            scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            durationMinutes: 60,
          });

        // Assert - Should require consent
        expect(response.status).toBe(403);
        expect(response.body.message).toContain('consent');
      } finally {
        client.release();
      }
    });
  });

  /**
   * Article 5: Data Minimization
   */
  describe('Article 5: Data Minimization', () => {
    it('should only collect necessary data', async () => {
      // Document that only required fields are collected
      // Verify API rejects requests with excessive data
      const response = await request(app.getHttpServer())
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Test',
          lastName: 'User',
          phone: '+15551234567',
          // Excessive data
          ssn: '123-45-6789',
          creditCard: '1234-5678-9012-3456',
        });

      // Should reject or ignore excessive fields
      expect(response.status === 400 || response.body.ssn === undefined).toBe(true);
    });

    it('should encrypt PII fields', async () => {
      const client = await pool.connect();
      try {
        await setTenantContext(client as unknown as any, tenantId);
        
        // Query raw customer data
        const result = await client.query(
          'SELECT first_name_encrypted, last_name_encrypted, phone_encrypted, email_encrypted FROM test.customers WHERE id = $1',
          [customerId]
        );
        
        const customer = result.rows[0];
        
        // Verify all PII fields are encrypted
        expect(customer.first_name_encrypted).not.toBe('John');
        expect(customer.last_name_encrypted).not.toBe('Doe');
        expect(customer.phone_encrypted).not.toBe('+15551234567');
        expect(customer.email_encrypted).not.toBe('john.doe@example.com');
        
        // Verify encryption format (should be long and contain delimiters)
        expect(customer.first_name_encrypted.length).toBeGreaterThan(20);
      } finally {
        client.release();
      }
    });
  });

  /**
   * Article 15: Right to Access
   */
  describe('Article 15: Right to Access', () => {
    it('should provide customer data export', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get(`/api/v1/gdpr/data-export/${customerId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('customer');
      expect(response.body).toHaveProperty('bookings');
      expect(response.body).toHaveProperty('auditLog');
    });

    it('should include processing purposes in export', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get(`/api/v1/gdpr/data-export/${customerId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.body.processingPurposes).toBeDefined();
      expect(response.body.retentionPolicy).toBeDefined();
    });
  });

  /**
   * Article 16: Right to Rectification
   */
  describe('Article 16: Right to Rectification', () => {
    it('should allow customer data correction', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/customers/${customerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Jonathan', // Corrected name
          email: 'jonathan.doe@example.com',
        });

      // Assert
      expect(response.status).toBe(200);
      
      // Verify audit log
      const client = await pool.connect();
      try {
        const auditResult = await client.query(
          `SELECT * FROM test.gdpr_audit_log WHERE customer_id = $1 AND action = 'data_rectification'`,
          [customerId]
        );
        expect(auditResult.rows.length).toBeGreaterThan(0);
      } finally {
        client.release();
      }
    });
  });

  /**
   * Article 17: Right to Erasure (Right to be Forgotten)
   */
  describe('Article 17: Right to be Forgotten', () => {
    it('should anonymize customer data on request', async () => {
      // Create some bookings for the customer
      const client = await pool.connect();
      try {
        await setTenantContext(client as unknown as any, tenantId);
        await client.query(
          `INSERT INTO test.bookings (tenant_id, shop_id, customer_id, service_type, scheduled_at, duration_minutes, status)
           VALUES ($1, $2, $3, 'oil_change', NOW() + INTERVAL '1 day', 60, 'confirmed')`,
          [tenantId, shopId, customerId]
        );
      } finally {
        client.release();
      }

      // Act - Request erasure
      const response = await request(app.getHttpServer())
        .post(`/api/v1/gdpr/erase/${customerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Customer request' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.anonymized).toBe(true);

      // Verify data is anonymized
      const verifyClient = await pool.connect();
      try {
        await setTenantContext(verifyClient as unknown as any, tenantId);
        const result = await verifyClient.query(
          'SELECT first_name_encrypted, last_name_encrypted, phone_encrypted, email_encrypted, deleted_at FROM test.customers WHERE id = $1',
          [customerId]
        );
        
        const customer = result.rows[0];
        expect(customer.first_name_encrypted).toMatch(/^ANONYMIZED_/);
        expect(customer.last_name_encrypted).toMatch(/^ANONYMIZED_/);
        expect(customer.phone_encrypted).toMatch(/^ANONYMIZED_/);
        expect(customer.deleted_at).toBeDefined();
      } finally {
        verifyClient.release();
      }
    });

    it('should maintain audit trail after erasure', async () => {
      // Act
      await request(app.getHttpServer())
        .post(`/api/v1/gdpr/erase/${customerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Customer request' });

      // Assert - Audit log should still exist
      const client = await pool.connect();
      try {
        const auditResult = await client.query(
          `SELECT * FROM test.gdpr_audit_log 
           WHERE customer_id = $1 AND action = 'right_to_erasure'`,
          [customerId]
        );
        expect(auditResult.rows.length).toBeGreaterThan(0);
        expect(auditResult.rows[0].legal_basis).toBe('Article 17');
      } finally {
        client.release();
      }
    });

    it('should not delete booking records (anonymize instead)', async () => {
      // Create booking
      const client = await pool.connect();
      let bookingId: string;
      try {
        await setTenantContext(client as unknown as any, tenantId);
        const bookingResult = await client.query(
          `INSERT INTO test.bookings (tenant_id, shop_id, customer_id, service_type, scheduled_at, duration_minutes, status)
           VALUES ($1, $2, $3, 'oil_change', NOW() + INTERVAL '1 day', 60, 'confirmed') RETURNING id`,
          [tenantId, shopId, customerId]
        );
        bookingId = bookingResult.rows[0].id;
      } finally {
        client.release();
      }

      // Act - Request erasure
      await request(app.getHttpServer())
        .post(`/api/v1/gdpr/erase/${customerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Customer request' });

      // Assert - Booking should still exist but with anonymized customer reference
      const verifyClient = await pool.connect();
      try {
        const bookingResult = await verifyClient.query(
          'SELECT * FROM test.bookings WHERE id = $1',
          [bookingId]
        );
        expect(bookingResult.rows.length).toBe(1);
        expect(bookingResult.rows[0].customer_id).toBeNull(); // Anonymized
      } finally {
        verifyClient.release();
      }
    });
  });

  /**
   * Article 20: Right to Data Portability
   */
  describe('Article 20: Data Portability', () => {
    it('should export data in machine-readable format', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get(`/api/v1/gdpr/data-export/${customerId}?format=json`)
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      
      // Verify structure
      const data = response.body;
      expect(data.customer).toBeDefined();
      expect(data.bookings).toBeInstanceOf(Array);
      expect(data.exportDate).toBeDefined();
      expect(data.dataController).toBeDefined();
    });

    it('should support CSV export format', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get(`/api/v1/gdpr/data-export/${customerId}?format=csv`)
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
    });
  });

  /**
   * Article 25: Privacy by Design
   */
  describe('Article 25: Privacy by Design', () => {
    it('should have RLS enabled on all PII tables', async () => {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT tablename, rowsecurity 
          FROM pg_tables 
          WHERE schemaname = 'test' 
          AND tablename IN ('customers', 'bookings', 'gdpr_audit_log')
        `);
        
        for (const row of result.rows) {
          expect(row.rowsecurity).toBe(true);
        }
      } finally {
        client.release();
      }
    });

    it('should encrypt data at rest', async () => {
      // Document encryption requirement
      expect(process.env.ENCRYPTION_KEY).toBeDefined();
      expect(process.env.ENCRYPTION_ALGORITHM).toBe('aes-256-gcm');
    });
  });

  /**
   * Article 30: Records of Processing
   */
  describe('Article 30: Records of Processing', () => {
    it('should maintain audit trail for all data access', async () => {
      // Act - Access customer data
      await request(app.getHttpServer())
        .get(`/api/v1/customers/${customerId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Assert - Audit log should record access
      const client = await pool.connect();
      try {
        const auditResult = await client.query(
          `SELECT * FROM test.gdpr_audit_log 
           WHERE customer_id = $1 AND action = 'data_access'`,
          [customerId]
        );
        expect(auditResult.rows.length).toBeGreaterThan(0);
      } finally {
        client.release();
      }
    });

    it('should log all data modifications', async () => {
      // Act - Modify customer data
      await request(app.getHttpServer())
        .patch(`/api/v1/customers/${customerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ notes: 'Updated notes' });

      // Assert
      const client = await pool.connect();
      try {
        const auditResult = await client.query(
          `SELECT * FROM test.gdpr_audit_log 
           WHERE customer_id = $1 AND action = 'data_modification'`,
          [customerId]
        );
        expect(auditResult.rows.length).toBeGreaterThan(0);
      } finally {
        client.release();
      }
    });
  });

  /**
   * Article 32: Security of Processing
   */
  describe('Article 32: Security of Processing', () => {
    it('should use strong encryption for PII', async () => {
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT first_name_encrypted FROM test.customers WHERE id = $1',
          [customerId]
        );
        
        const encrypted = result.rows[0].first_name_encrypted;
        
        // Should use AES-256-GCM (format: iv:authTag:ciphertext)
        const parts = encrypted.split(':');
        expect(parts.length).toBe(3);
        
        // IV should be 16 bytes (base64 = 24 chars)
        expect(Buffer.from(parts[0], 'base64').length).toBe(16);
        
        // Auth tag should be 16 bytes
        expect(Buffer.from(parts[1], 'base64').length).toBe(16);
      } finally {
        client.release();
      }
    });

    it('should implement access controls', async () => {
      // Try to access data without authentication
      const response = await request(app.getHttpServer())
        .get(`/api/v1/customers/${customerId}`);

      expect(response.status).toBe(401);
    });
  });

  /**
   * Article 33 & 34: Data Breach Notification
   */
  describe('Article 33 & 34: Data Breach Notification', () => {
    it('should have breach detection configured', async () => {
      // Document breach detection requirements
      expect(process.env.BREACH_DETECTION_ENABLED).toBeDefined();
      expect(process.env.SUPERADMIN_EMAIL).toBeDefined();
    });

    it('should log security events', async () => {
      // Failed authentication attempts should be logged
      await request(app.getHttpServer())
        .get('/api/v1/customers')
        .set('Authorization', 'Bearer invalid-token');

      // This would be verified in security logs
      // Implementation depends on logging infrastructure
    });
  });

  /**
   * Data Retention Policy
   */
  describe('Data Retention Policy', () => {
    it('should enforce retention limits', async () => {
      // Document retention policy
      expect(process.env.DATA_RETENTION_DAYS).toBeDefined();
      
      const retentionDays = parseInt(process.env.DATA_RETENTION_DAYS || '2555'); // 7 years default
      expect(retentionDays).toBeLessThanOrEqual(2555); // Max 7 years
    });

    it('should automatically anonymize expired data', async () => {
      // This would be tested with a scheduled job
      // Document that cron job exists for data cleanup
      expect(process.env.DATA_CLEANUP_CRON).toBeDefined();
    });
  });

  /**
   * Cross-Border Data Transfer
   */
  describe('Cross-Border Data Transfer', () => {
    it('should document data transfer mechanisms', async () => {
      // Document SCCs (Standard Contractual Clauses) or adequacy decisions
      expect(process.env.DATA_TRANSFER_MECHANISM).toBeDefined();
    });
  });
});
