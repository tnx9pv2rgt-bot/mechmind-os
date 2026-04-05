/**
 * env.spec.ts — Tests for environment variable validation
 */

// We cannot easily test the actual module since it calls process.exit(1) on invalid env.
// Instead we test the Zod schema directly by extracting its shape.

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
  });
});
