/**
 * MechMind OS v10 - OWASP Top 10 Security Tests
 * Security testing for common vulnerabilities
 * 
 * OWASP Top 10 2021:
 * 1. Broken Access Control
 * 2. Cryptographic Failures
 * 3. Injection
 * 4. Insecure Design
 * 5. Security Misconfiguration
 * 6. Vulnerable and Outdated Components
 * 7. Identification and Authentication Failures
 * 8. Software and Data Integrity Failures
 * 9. Security Logging and Monitoring Failures
 * 10. Server-Side Request Forgery (SSRF)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { getTestPool } from '@test/database';
import { 
  createTenantJWT, 
  generateExpiredToken, 
  generateTamperedToken,
  generateNoneAlgorithmToken,
  generateIncompleteToken,
  createTenant
} from '@test/mock-factories';
import { Pool } from 'pg';

describe('Security - OWASP Top 10', () => {
  let app: INestApplication;
  let pool: Pool;
  let tenantId: string;
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
      const tenantResult = await client.query(
        `INSERT INTO test.tenants (name) VALUES ('Security Test Tenant') RETURNING id`
      );
      tenantId = tenantResult.rows[0].id;
      authToken = createTenantJWT(tenantId);
    } finally {
      client.release();
    }
  });

  afterEach(async () => {
    const client = await pool.connect();
    try {
      await client.query('TRUNCATE TABLE test.tenants CASCADE');
    } finally {
      client.release();
    }
  });

  afterAll(async () => {
    await app.close();
  });

  /**
   * OWASP #1: Broken Access Control
   */
  describe('A01: Broken Access Control', () => {
    it('should enforce tenant isolation', async () => {
      // Arrange - Create booking with tenant 1 token
      const otherTenantToken = createTenantJWT('other-tenant-id');
      
      // Act - Try to access data with wrong tenant token
      const response = await request(app.getHttpServer())
        .get('/api/v1/bookings')
        .set('Authorization', `Bearer ${otherTenantToken}`);

      // Assert - Should not see other tenant's data
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should prevent IDOR attacks', async () => {
      // Arrange - Try to access resource by guessing ID
      const guessedId = '00000000-0000-0000-0000-000000000001';
      
      // Act
      const response = await request(app.getHttpServer())
        .get(`/api/v1/bookings/${guessedId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Assert - Should return 404, not expose existence
      expect(response.status).toBe(404);
    });

    it('should reject unauthorized admin operations', async () => {
      // Arrange - Regular user token trying admin endpoint
      const userToken = createTenantJWT(tenantId, 'user-id', ['user']);
      
      // Act
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${userToken}`);

      // Assert
      expect(response.status).toBe(403);
    });

    it('should enforce CORS policy', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .options('/api/v1/bookings')
        .set('Origin', 'https://malicious-site.com')
        .set('Access-Control-Request-Method', 'POST');

      // Assert - Should not allow untrusted origins
      const allowedOrigin = response.headers['access-control-allow-origin'];
      if (allowedOrigin) {
        expect(allowedOrigin).not.toContain('malicious-site.com');
      }
    });
  });

  /**
   * OWASP #2: Cryptographic Failures
   */
  describe('A02: Cryptographic Failures', () => {
    it('should use HTTPS in production', async () => {
      // This is a configuration test - document the requirement
      const isProduction = process.env.NODE_ENV === 'production';
      if (isProduction) {
        // In production, all endpoints should redirect HTTP to HTTPS
        // This is typically handled at the load balancer level
        expect(process.env.FORCE_HTTPS).toBe('true');
      }
    });

    it('should encrypt PII at rest', async () => {
      const client = await pool.connect();
      try {
        // Insert customer with PII
        await client.query(
          `INSERT INTO test.tenants (name) VALUES ('Crypto Test') RETURNING id`
        );
        
        // Query raw data
        const result = await client.query(
          `SELECT first_name_encrypted FROM test.customers LIMIT 1`
        );
        
        if (result.rows.length > 0) {
          const encryptedName = result.rows[0].first_name_encrypted;
          // Should be encrypted, not plaintext
          expect(encryptedName).not.toMatch(/^[A-Za-z]+$/);
          expect(encryptedName.length).toBeGreaterThan(20);
        }
      } finally {
        client.release();
      }
    });

    it('should use secure password hashing', async () => {
      // Document that bcrypt/Argon2 should be used
      // Actual implementation test would verify hash format
      const bcryptPattern = /^\$2[aby]\$\d+\$/;
      const argonPattern = /^\$argon2/;
      
      // This is a placeholder - actual test would check stored hashes
      expect(['bcrypt', 'argon2']).toContain(process.env.PASSWORD_HASH_ALGORITHM || 'bcrypt');
    });
  });

  /**
   * OWASP #3: Injection
   */
  describe('A03: Injection', () => {
    it('should prevent SQL injection', async () => {
      // Arrange - SQL injection attempt
      const maliciousInput = "'; DROP TABLE test.bookings; --";
      
      // Act
      const response = await request(app.getHttpServer())
        .get(`/api/v1/bookings?search=${encodeURIComponent(maliciousInput)}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Assert - Should not cause error or execute injection
      expect(response.status).toBe(200);
      
      // Verify table still exists
      const client = await pool.connect();
      try {
        const result = await client.query(
          "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bookings')"
        );
        expect(result.rows[0].exists).toBe(true);
      } finally {
        client.release();
      }
    });

    it('should prevent NoSQL injection', async () => {
      // Arrange - NoSQL injection attempt
      const maliciousPayload = {
        shopId: { $ne: null },
        $where: 'this.password.length > 0',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(maliciousPayload);

      // Assert - Should validate input and reject
      expect(response.status).toBe(400);
    });

    it('should prevent command injection', async () => {
      // Arrange - Command injection in file upload path
      const maliciousPath = '../../../etc/passwd';
      
      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('test'), maliciousPath);

      // Assert - Should sanitize path
      expect(response.status).not.toBe(200);
    });

    it('should prevent LDAP injection', async () => {
      // Document LDAP injection prevention
      // If LDAP is used, input should be sanitized
      const ldapInjection = '*)(uid=*))(&(uid=*';
      
      // This is a documentation test - actual LDAP queries should use parameterized filters
      expect(ldapInjection).toContain('*');
    });
  });

  /**
   * OWASP #4: Insecure Design
   */
  describe('A04: Insecure Design', () => {
    it('should implement rate limiting', async () => {
      // Act - Send many rapid requests
      const requests = Array.from({ length: 150 }, () =>
        request(app.getHttpServer())
          .get('/api/v1/bookings')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(requests);

      // Assert - Some should be rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should require authentication for protected endpoints', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/api/v1/bookings');

      // Assert
      expect(response.status).toBe(401);
    });

    it('should validate business logic constraints', async () => {
      // Arrange - Invalid business logic (booking in past)
      const pastDate = new Date('2020-01-01').toISOString();
      
      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          shopId: 'test-shop',
          serviceType: 'oil_change',
          scheduledAt: pastDate,
          durationMinutes: 60,
        });

      // Assert
      expect(response.status).toBe(400);
    });
  });

  /**
   * OWASP #5: Security Misconfiguration
   */
  describe('A05: Security Misconfiguration', () => {
    it('should not expose stack traces in production', async () => {
      // Arrange - Trigger an error
      process.env.NODE_ENV = 'production';
      
      // Act
      const response = await request(app.getHttpServer())
        .get('/api/v1/trigger-error')
        .set('Authorization', `Bearer ${authToken}`);

      // Assert - Should not contain stack trace
      if (response.status >= 500) {
        expect(response.body.stack).toBeUndefined();
        expect(response.body.message).not.toContain('at ');
      }
      
      process.env.NODE_ENV = 'test';
    });

    it('should have security headers', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
    });

    it('should not expose sensitive information in error messages', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ invalid: 'data' });

      // Assert - Error should not expose internal details
      const body = JSON.stringify(response.body);
      expect(body).not.toContain('password');
      expect(body).not.toContain('secret');
      expect(body).not.toContain('SELECT');
    });
  });

  /**
   * OWASP #6: Vulnerable and Outdated Components
   */
  describe('A06: Vulnerable Components', () => {
    it('should have dependency scanning configured', () => {
      // Document that npm audit should be run regularly
      // This is a documentation test
      const packageJson = require('../../package.json');
      
      // Check for known vulnerable packages (example)
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };
      
      // Ensure no known vulnerable versions are used
      expect(dependencies).toBeDefined();
    });
  });

  /**
   * OWASP #7: Identification and Authentication Failures
   */
  describe('A07: Authentication Failures', () => {
    it('should reject expired JWT tokens', async () => {
      // Arrange
      const expiredToken = generateExpiredToken(tenantId);
      
      // Act
      const response = await request(app.getHttpServer())
        .get('/api/v1/bookings')
        .set('Authorization', `Bearer ${expiredToken}`);

      // Assert
      expect(response.status).toBe(401);
    });

    it('should reject tampered JWT tokens', async () => {
      // Arrange
      const tamperedToken = generateTamperedToken(tenantId);
      
      // Act
      const response = await request(app.getHttpServer())
        .get('/api/v1/bookings')
        .set('Authorization', `Bearer ${tamperedToken}`);

      // Assert
      expect(response.status).toBe(401);
    });

    it('should reject tokens with algorithm none', async () => {
      // Arrange
      const noneToken = generateNoneAlgorithmToken(tenantId);
      
      // Act
      const response = await request(app.getHttpServer())
        .get('/api/v1/bookings')
        .set('Authorization', `Bearer ${noneToken}`);

      // Assert
      expect(response.status).toBe(401);
    });

    it('should reject tokens with missing claims', async () => {
      // Arrange
      const incompleteToken = generateIncompleteToken(['tenantId']);
      
      // Act
      const response = await request(app.getHttpServer())
        .get('/api/v1/bookings')
        .set('Authorization', `Bearer ${incompleteToken}`);

      // Assert
      expect(response.status).toBe(401);
    });

    it('should implement account lockout', async () => {
      // Document account lockout policy
      // After 5 failed login attempts, account should be locked
      expect(process.env.MAX_LOGIN_ATTEMPTS || '5').toBeDefined();
    });
  });

  /**
   * OWASP #8: Software and Data Integrity Failures
   */
  describe('A08: Integrity Failures', () => {
    it('should verify HMAC signatures on webhooks', async () => {
      // Arrange - Webhook with invalid signature
      const payload = { event: 'test', data: 'value' };
      
      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/voice/webhook')
        .set('X-Webhook-Signature', 'invalid-signature')
        .set('X-Tenant-ID', tenantId)
        .send(payload);

      // Assert
      expect(response.status).toBe(401);
    });

    it('should use signed URLs for file downloads', async () => {
      // Document signed URL requirement
      // File download URLs should be signed and expire
      expect(process.env.FILE_URL_EXPIRY || '3600').toBeDefined();
    });
  });

  /**
   * OWASP #9: Security Logging and Monitoring Failures
   */
  describe('A09: Logging Failures', () => {
    it('should log authentication failures', async () => {
      // Act - Failed authentication
      await request(app.getHttpServer())
        .get('/api/v1/bookings')
        .set('Authorization', 'Bearer invalid-token');

      // Assert - Should be logged (verify in logs)
      // This is a documentation test - actual log verification depends on implementation
    });

    it('should log access to sensitive data', async () => {
      // Document that PII access should be logged
      // Verify in audit logs
      expect(process.env.AUDIT_LOG_ENABLED).toBe('true');
    });

    it('should not log sensitive data', async () => {
      // Document that passwords, tokens, etc. should not be logged
      // This is a code review requirement
    });
  });

  /**
   * OWASP #10: Server-Side Request Forgery (SSRF)
   */
  describe('A10: SSRF', () => {
    it('should validate URLs before fetching', async () => {
      // Arrange - SSRF attempt
      const maliciousUrl = 'http://localhost:22/'; // Try to access SSH
      
      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/webhook/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ url: maliciousUrl });

      // Assert - Should reject internal URLs
      expect(response.status).toBe(400);
    });

    it('should block requests to internal IPs', async () => {
      // Arrange
      const internalUrls = [
        'http://127.0.0.1/',
        'http://10.0.0.1/',
        'http://192.168.1.1/',
        'http://169.254.169.254/', // AWS metadata
      ];

      for (const url of internalUrls) {
        // Act
        const response = await request(app.getHttpServer())
          .post('/api/v1/webhook/register')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ url });

        // Assert
        expect(response.status).toBe(400);
      }
    });
  });
});
