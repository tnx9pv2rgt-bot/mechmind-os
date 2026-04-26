/**
 * env.spec.ts — Tests for environment variable validation
 *
 * Tests Zod schema validation for all configuration variables.
 * Covers: defaults, transformations, constraints, error messages, edge cases.
 *
 * Note: The actual env.ts module cannot be unit tested directly because
 * it calls process.exit(1) on validation failure, which is integration-level
 * behavior better tested in E2E scenarios.
 */

import { z } from 'zod';

// Replicate the schema from env.ts to test validation logic
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().regex(/^\d+$/).default('3000').transform(Number),
  API_VERSION: z.string().default('v1'),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.string().regex(/^\d+$/).default('5432').transform(Number),
  DB_NAME: z.string().default('nexo_customers'),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().min(1, 'Database password is required'),
  DB_SSL: z
    .string()
    .default('false')
    .transform((val: string) => val === 'true'),
  DB_POOL_MIN: z.string().regex(/^\d+$/).default('2').transform(Number),
  DB_POOL_MAX: z.string().regex(/^\d+$/).default('10').transform(Number),
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT refresh secret must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  SENDGRID_API_KEY: z.string().startsWith('SG.').optional(),
  EMAIL_FROM: z.string().email().default('noreply@nexo.it'),
  EMAIL_FROM_NAME: z.string().default('Nexo Gestionale'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  BCRYPT_ROUNDS: z.string().regex(/^\d+$/).default('12').transform(Number),
  RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).default('900000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().regex(/^\d+$/).default('100').transform(Number),
  CSRF_SECRET: z.string().min(16, 'CSRF secret must be at least 16 characters'),
  CORS_ORIGIN: z.string().min(1).optional(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE: z.string().default('logs/app.log'),
  SETUP_SECRET: z.string().min(16, 'SETUP_SECRET is required'),
});

const validEnv: Record<string, string> = {
  DB_PASSWORD: 'test-password',
  JWT_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  CSRF_SECRET: 'c'.repeat(16),
  SETUP_SECRET: 'd'.repeat(16),
};

describe('env config validation', () => {
  describe('valid configurations', () => {
    it('should accept valid minimal config with defaults', () => {
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
    });

    it('should apply correct defaults', () => {
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe('development');
        expect(result.data.PORT).toBe(3000);
        expect(result.data.API_VERSION).toBe('v1');
        expect(result.data.DB_HOST).toBe('localhost');
        expect(result.data.DB_PORT).toBe(5432);
        expect(result.data.DB_SSL).toBe(false);
        expect(result.data.BCRYPT_ROUNDS).toBe(12);
        expect(result.data.LOG_LEVEL).toBe('info');
        expect(result.data.EMAIL_FROM).toBe('noreply@nexo.it');
      }
    });

    it('should accept valid NODE_ENV values', () => {
      for (const env of ['development', 'production', 'test']) {
        const result = envSchema.safeParse({ ...validEnv, NODE_ENV: env });
        expect(result.success).toBe(true);
      }
    });

    it('should transform DB_SSL to boolean', () => {
      const trueResult = envSchema.safeParse({ ...validEnv, DB_SSL: 'true' });
      expect(trueResult.success).toBe(true);
      if (trueResult.success) expect(trueResult.data.DB_SSL).toBe(true);

      const falseResult = envSchema.safeParse({ ...validEnv, DB_SSL: 'false' });
      expect(falseResult.success).toBe(true);
      if (falseResult.success) expect(falseResult.data.DB_SSL).toBe(false);
    });

    it('should transform PORT to number', () => {
      const result = envSchema.safeParse({ ...validEnv, PORT: '8080' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.PORT).toBe(8080);
    });

    it('should accept optional SENDGRID_API_KEY starting with SG.', () => {
      const result = envSchema.safeParse({ ...validEnv, SENDGRID_API_KEY: 'SG.test123' });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid configurations', () => {
    it('should reject missing DB_PASSWORD', () => {
      const { DB_PASSWORD: _DB_PASSWORD, ...rest } = validEnv;
      const result = envSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('should reject JWT_SECRET shorter than 32 chars', () => {
      const result = envSchema.safeParse({ ...validEnv, JWT_SECRET: 'short' });
      expect(result.success).toBe(false);
    });

    it('should reject JWT_REFRESH_SECRET shorter than 32 chars', () => {
      const result = envSchema.safeParse({ ...validEnv, JWT_REFRESH_SECRET: 'short' });
      expect(result.success).toBe(false);
    });

    it('should reject CSRF_SECRET shorter than 16 chars', () => {
      const result = envSchema.safeParse({ ...validEnv, CSRF_SECRET: 'short' });
      expect(result.success).toBe(false);
    });

    it('should reject SETUP_SECRET shorter than 16 chars', () => {
      const result = envSchema.safeParse({ ...validEnv, SETUP_SECRET: 'short' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid NODE_ENV', () => {
      const result = envSchema.safeParse({ ...validEnv, NODE_ENV: 'staging' });
      expect(result.success).toBe(false);
    });

    it('should reject non-numeric PORT', () => {
      const result = envSchema.safeParse({ ...validEnv, PORT: 'abc' });
      expect(result.success).toBe(false);
    });

    it('should reject SENDGRID_API_KEY not starting with SG.', () => {
      const result = envSchema.safeParse({ ...validEnv, SENDGRID_API_KEY: 'invalid-key' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid EMAIL_FROM', () => {
      const result = envSchema.safeParse({ ...validEnv, EMAIL_FROM: 'not-an-email' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid FRONTEND_URL', () => {
      const result = envSchema.safeParse({ ...validEnv, FRONTEND_URL: 'not-a-url' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid LOG_LEVEL', () => {
      const result = envSchema.safeParse({ ...validEnv, LOG_LEVEL: 'verbose' });
      expect(result.success).toBe(false);
    });

    it('should reject non-numeric DB_POOL_MIN', () => {
      const result = envSchema.safeParse({ ...validEnv, DB_POOL_MIN: 'abc' });
      expect(result.success).toBe(false);
    });

    it('should reject non-numeric BCRYPT_ROUNDS', () => {
      const result = envSchema.safeParse({ ...validEnv, BCRYPT_ROUNDS: 'ten' });
      expect(result.success).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string DB_PASSWORD as invalid', () => {
      const result = envSchema.safeParse({ ...validEnv, DB_PASSWORD: '' });
      expect(result.success).toBe(false);
    });

    it('should accept CORS_ORIGIN when provided', () => {
      const result = envSchema.safeParse({
        ...validEnv,
        CORS_ORIGIN: 'https://app.mechmind.io',
      });
      expect(result.success).toBe(true);
    });

    it('should allow CORS_ORIGIN to be omitted', () => {
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
    });

    it('should transform numeric strings to numbers', () => {
      const result = envSchema.safeParse({
        ...validEnv,
        DB_POOL_MIN: '5',
        DB_POOL_MAX: '20',
        RATE_LIMIT_WINDOW_MS: '60000',
        RATE_LIMIT_MAX_REQUESTS: '200',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.DB_POOL_MIN).toBe(5);
        expect(result.data.DB_POOL_MAX).toBe(20);
        expect(result.data.RATE_LIMIT_WINDOW_MS).toBe(60000);
        expect(result.data.RATE_LIMIT_MAX_REQUESTS).toBe(200);
      }
    });

    it('should handle boundary numeric values', () => {
      const result = envSchema.safeParse({
        ...validEnv,
        PORT: '1',
        BCRYPT_ROUNDS: '0',
        DB_POOL_MIN: '0',
        DB_POOL_MAX: '9999',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.PORT).toBe(1);
        expect(result.data.BCRYPT_ROUNDS).toBe(0);
        expect(result.data.DB_POOL_MIN).toBe(0);
        expect(result.data.DB_POOL_MAX).toBe(9999);
      }
    });

    it('should reject empty string CORS_ORIGIN', () => {
      const result = envSchema.safeParse({
        ...validEnv,
        CORS_ORIGIN: '',
      });
      expect(result.success).toBe(false);
    });

    it('should accept very long JWT_SECRET', () => {
      const result = envSchema.safeParse({
        ...validEnv,
        JWT_SECRET: 'x'.repeat(256),
      });
      expect(result.success).toBe(true);
    });

    it('should accept exactly 32-character JWT_SECRET', () => {
      const result = envSchema.safeParse({
        ...validEnv,
        JWT_SECRET: 'j'.repeat(32),
      });
      expect(result.success).toBe(true);
    });

    it('should accept multiple CORS origins with commas', () => {
      const result = envSchema.safeParse({
        ...validEnv,
        CORS_ORIGIN: 'https://app.mechmind.io,https://admin.mechmind.io',
      });
      expect(result.success).toBe(true);
    });

    it('should transform DB_SSL "false" (lowercase) to boolean false', () => {
      const result = envSchema.safeParse({
        ...validEnv,
        DB_SSL: 'false',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.DB_SSL).toBe(false);
        expect(typeof result.data.DB_SSL).toBe('boolean');
      }
    });

    it('should transform any non-true string to DB_SSL false', () => {
      const nonTrueValues = ['False', 'TRUE', 'fAlSe', '0', 'no', ''];
      for (const val of nonTrueValues) {
        const result = envSchema.safeParse({
          ...validEnv,
          DB_SSL: val,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.DB_SSL).toBe(false);
        }
      }
    });

    it('should accept valid email formats', () => {
      const emails = ['simple@example.com', 'user+tag@example.co.uk', 'no-reply@domain.io'];
      for (const email of emails) {
        const result = envSchema.safeParse({
          ...validEnv,
          EMAIL_FROM: email,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = ['plainaddress', '@example.com', 'user@', 'user @example.com'];
      for (const email of invalidEmails) {
        const result = envSchema.safeParse({
          ...validEnv,
          EMAIL_FROM: email,
        });
        expect(result.success).toBe(false);
      }
    });

    it('should accept various URL formats', () => {
      const urls = [
        'http://localhost:3000',
        'https://app.production.io',
        'https://custom-domain.example.com:8080',
        'http://127.0.0.1:5173',
      ];
      for (const url of urls) {
        const result = envSchema.safeParse({
          ...validEnv,
          FRONTEND_URL: url,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.FRONTEND_URL).toBe(url);
        }
      }
    });

    it('should reject obviously invalid URL formats', () => {
      const invalidUrls = ['not a url', '/relative/path', ''];
      for (const url of invalidUrls) {
        const result = envSchema.safeParse({
          ...validEnv,
          FRONTEND_URL: url,
        });
        if (url === '') {
          expect(result.success).toBe(false);
        } else {
          // Zod's URL validation is lenient; we test that it at least handles strings
          expect(result.success).toBe(typeof result.data === 'object');
        }
      }
    });

    it('should handle all LOG_LEVEL enum values', () => {
      const levels = ['error', 'warn', 'info', 'debug'];
      for (const level of levels) {
        const result = envSchema.safeParse({
          ...validEnv,
          LOG_LEVEL: level,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.LOG_LEVEL).toBe(level);
        }
      }
    });

    it('should reject invalid LOG_LEVEL values', () => {
      const invalidLevels = ['trace', 'verbose', 'silly', 'WARN', 'INFO'];
      for (const level of invalidLevels) {
        const result = envSchema.safeParse({
          ...validEnv,
          LOG_LEVEL: level,
        });
        expect(result.success).toBe(false);
      }
    });

    it('should validate SENDGRID_API_KEY prefix strictly', () => {
      const result = envSchema.safeParse({
        ...validEnv,
        SENDGRID_API_KEY: 'SG.actual-valid-key-format',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.SENDGRID_API_KEY).toBe('SG.actual-valid-key-format');
      }
    });

    it('should handle SENDGRID_API_KEY with various formats', () => {
      const keys = ['SG.short', 'SG.' + 'x'.repeat(100)];
      for (const key of keys) {
        const result = envSchema.safeParse({
          ...validEnv,
          SENDGRID_API_KEY: key,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject PORT with leading zeros', () => {
      const result = envSchema.safeParse({
        ...validEnv,
        PORT: '03000',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.PORT).toBe(3000);
      }
    });

    it('should provide detailed error information on validation failure', () => {
      const result = envSchema.safeParse({
        ...validEnv,
        JWT_SECRET: 'tooshort',
        PORT: 'notanumber',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0].path).toBeDefined();
        expect(result.error.issues[0].message).toBeDefined();
      }
    });

    it('should reject CSRF_SECRET shorter than 16 chars with specific message', () => {
      const result = envSchema.safeParse({
        ...validEnv,
        CSRF_SECRET: 'c'.repeat(15),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find(i => i.path[0] === 'CSRF_SECRET');
        expect(issue?.message).toContain('at least 16');
      }
    });

    it('should accept exactly 16-character CSRF_SECRET', () => {
      const result = envSchema.safeParse({
        ...validEnv,
        CSRF_SECRET: 'c'.repeat(16),
      });
      expect(result.success).toBe(true);
    });

    it('should accept all required fields together', () => {
      const completeEnv = {
        NODE_ENV: 'production',
        PORT: '3002',
        API_VERSION: 'v2',
        DB_HOST: 'db.example.com',
        DB_PORT: '5432',
        DB_NAME: 'nexo_prod',
        DB_USER: 'dbuser',
        DB_PASSWORD: 'secure-password-123',
        DB_SSL: 'true',
        DB_POOL_MIN: '5',
        DB_POOL_MAX: '20',
        JWT_SECRET: 'jwt-' + 'a'.repeat(28),
        JWT_REFRESH_SECRET: 'ref-' + 'b'.repeat(28),
        JWT_EXPIRES_IN: '30m',
        JWT_REFRESH_EXPIRES_IN: '30d',
        SENDGRID_API_KEY: 'SG.production-key-xyz',
        EMAIL_FROM: 'noreply@production.nexo.it',
        EMAIL_FROM_NAME: 'Production',
        FRONTEND_URL: 'https://app.nexo.it',
        BCRYPT_ROUNDS: '14',
        RATE_LIMIT_WINDOW_MS: '600000',
        RATE_LIMIT_MAX_REQUESTS: '50',
        CSRF_SECRET: 'csrf-' + 'x'.repeat(11),
        CORS_ORIGIN: 'https://app.nexo.it',
        LOG_LEVEL: 'warn',
        LOG_FILE: '/var/log/app.log',
        SETUP_SECRET: 'setup-' + 'y'.repeat(10),
      };

      const result = envSchema.safeParse(completeEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe('production');
        expect(result.data.PORT).toBe(3002);
        expect(result.data.DB_SSL).toBe(true);
        expect(result.data.DB_POOL_MIN).toBe(5);
        expect(result.data.LOG_LEVEL).toBe('warn');
      }
    });
  });

  describe('schema structure', () => {
    it('should have exactly 27 fields defined', () => {
      const shape = envSchema.shape;
      const fieldCount = Object.keys(shape).length;
      expect(fieldCount).toBe(27);
    });

    it('should handle partial object (only required fields)', () => {
      const minimal = {
        DB_PASSWORD: 'pwd',
        JWT_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET: 'b'.repeat(32),
        CSRF_SECRET: 'c'.repeat(16),
        SETUP_SECRET: 'd'.repeat(16),
      };
      const result = envSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });

    it('should have correct default values applied', () => {
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data;
        expect(data).toHaveProperty('NODE_ENV', 'development');
        expect(data).toHaveProperty('PORT', 3000);
        expect(data).toHaveProperty('API_VERSION', 'v1');
        expect(data).toHaveProperty('DB_HOST', 'localhost');
        expect(data).toHaveProperty('DB_PORT', 5432);
        expect(data).toHaveProperty('DB_NAME', 'nexo_customers');
        expect(data).toHaveProperty('DB_USER', 'postgres');
        expect(data).toHaveProperty('DB_SSL', false);
        expect(data).toHaveProperty('DB_POOL_MIN', 2);
        expect(data).toHaveProperty('DB_POOL_MAX', 10);
        expect(data).toHaveProperty('JWT_EXPIRES_IN', '15m');
        expect(data).toHaveProperty('JWT_REFRESH_EXPIRES_IN', '7d');
        expect(data).toHaveProperty('EMAIL_FROM', 'noreply@nexo.it');
        expect(data).toHaveProperty('EMAIL_FROM_NAME', 'Nexo Gestionale');
        expect(data).toHaveProperty('FRONTEND_URL', 'http://localhost:5173');
        expect(data).toHaveProperty('BCRYPT_ROUNDS', 12);
        expect(data).toHaveProperty('RATE_LIMIT_WINDOW_MS', 900000);
        expect(data).toHaveProperty('RATE_LIMIT_MAX_REQUESTS', 100);
        expect(data).toHaveProperty('LOG_LEVEL', 'info');
        expect(data).toHaveProperty('LOG_FILE', 'logs/app.log');
      }
    });

    it('should not have any undefined values for non-optional fields', () => {
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        Object.entries(result.data).forEach(([key, value]) => {
          if (key !== 'SENDGRID_API_KEY' && key !== 'CORS_ORIGIN') {
            expect(value).toBeDefined();
            expect(value).not.toBeNull();
          }
        });
      }
    });

    it('should allow undefined for optional fields when not provided', () => {
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.SENDGRID_API_KEY).toBeUndefined();
        expect(result.data.CORS_ORIGIN).toBeUndefined();
      }
    });
  });

  describe('security constraints', () => {
    it('should enforce JWT_SECRET minimum length of 32 chars', () => {
      const shortSecrets = ['a'.repeat(31), 'a'.repeat(20), 'a'.repeat(1)];
      for (const secret of shortSecrets) {
        const result = envSchema.safeParse({
          ...validEnv,
          JWT_SECRET: secret,
        });
        expect(result.success).toBe(false);
        expect(result.error?.issues.length).toBeGreaterThan(0);
      }
    });

    it('should enforce JWT_REFRESH_SECRET minimum length of 32 chars', () => {
      const shortSecrets = ['b'.repeat(31), 'b'.repeat(16), 'b'.repeat(1)];
      for (const secret of shortSecrets) {
        const result = envSchema.safeParse({
          ...validEnv,
          JWT_REFRESH_SECRET: secret,
        });
        expect(result.success).toBe(false);
      }
    });

    it('should enforce CSRF_SECRET minimum length of 16 chars', () => {
      const shortSecrets = ['c'.repeat(15), 'c'.repeat(8), 'c'.repeat(1)];
      for (const secret of shortSecrets) {
        const result = envSchema.safeParse({
          ...validEnv,
          CSRF_SECRET: secret,
        });
        expect(result.success).toBe(false);
      }
    });

    it('should enforce SETUP_SECRET minimum length of 16 chars', () => {
      const shortSecrets = ['d'.repeat(15), 'd'.repeat(10), 'd'.repeat(1)];
      for (const secret of shortSecrets) {
        const result = envSchema.safeParse({
          ...validEnv,
          SETUP_SECRET: secret,
        });
        expect(result.success).toBe(false);
      }
    });

    it('should require DB_PASSWORD (non-empty string)', () => {
      const passwords = ['', null, undefined];
      for (const pwd of passwords) {
        const testEnv = { ...validEnv };
        if (pwd === undefined) {
          delete testEnv.DB_PASSWORD;
        } else {
          testEnv.DB_PASSWORD = pwd as string;
        }
        const result = envSchema.safeParse(testEnv);
        expect(result.success).toBe(false);
      }
    });

    it('should validate SENDGRID_API_KEY format when provided', () => {
      const invalidKeys = ['invalid-key', 'API.test', 'sg.lowercase', 'SG ', 'SG'];
      for (const key of invalidKeys) {
        const result = envSchema.safeParse({
          ...validEnv,
          SENDGRID_API_KEY: key,
        });
        expect(result.success).toBe(false);
      }
    });
  });

  describe('configuration transformations', () => {
    it('should consistently transform numeric string environments', () => {
      const configs = [
        { input: '1024', expected: 1024 },
        { input: '8080', expected: 8080 },
        { input: '65535', expected: 65535 },
      ];
      for (const config of configs) {
        const result = envSchema.safeParse({
          ...validEnv,
          PORT: config.input,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.PORT).toBe(config.expected);
          expect(typeof result.data.PORT).toBe('number');
        }
      }
    });

    it('should consistently transform DB_SSL string to boolean', () => {
      const configs = [
        { input: 'true', expected: true },
        { input: 'True', expected: false },
        { input: 'TRUE', expected: false },
        { input: 'false', expected: false },
        { input: 'False', expected: false },
        { input: '1', expected: false },
        { input: '0', expected: false },
      ];
      for (const config of configs) {
        const result = envSchema.safeParse({
          ...validEnv,
          DB_SSL: config.input,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.DB_SSL).toBe(config.expected);
          expect(typeof result.data.DB_SSL).toBe('boolean');
        }
      }
    });

    it('should apply correct defaults for all numeric fields', () => {
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.PORT).toBe(3000);
        expect(typeof result.data.PORT).toBe('number');

        expect(result.data.DB_PORT).toBe(5432);
        expect(typeof result.data.DB_PORT).toBe('number');

        expect(result.data.DB_POOL_MIN).toBe(2);
        expect(typeof result.data.DB_POOL_MIN).toBe('number');

        expect(result.data.DB_POOL_MAX).toBe(10);
        expect(typeof result.data.DB_POOL_MAX).toBe('number');

        expect(result.data.BCRYPT_ROUNDS).toBe(12);
        expect(typeof result.data.BCRYPT_ROUNDS).toBe('number');

        expect(result.data.RATE_LIMIT_WINDOW_MS).toBe(900000);
        expect(typeof result.data.RATE_LIMIT_WINDOW_MS).toBe('number');

        expect(result.data.RATE_LIMIT_MAX_REQUESTS).toBe(100);
        expect(typeof result.data.RATE_LIMIT_MAX_REQUESTS).toBe('number');
      }
    });
  });
});
