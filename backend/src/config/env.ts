import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().regex(/^\d+$/).default('3000').transform(Number),
  API_VERSION: z.string().default('v1'),

  // Database
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

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT refresh secret must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Email
  SENDGRID_API_KEY: z.string().startsWith('SG.').optional(),
  EMAIL_FROM: z.string().email().default('noreply@nexo.it'),
  EMAIL_FROM_NAME: z.string().default('Nexo Gestionale'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // Security
  BCRYPT_ROUNDS: z.string().regex(/^\d+$/).default('12').transform(Number),
  RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).default('900000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().regex(/^\d+$/).default('100').transform(Number),

  // CSRF
  CSRF_SECRET: z.string().min(16, 'CSRF secret must be at least 16 characters'),

  // CORS
  CORS_ORIGIN: z
    .string()
    .min(1, 'CORS_ORIGIN is required (comma-separated origins, no wildcard)')
    .optional(),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE: z.string().default('logs/app.log'),

  // Admin
  SETUP_SECRET: z.string().min(16, 'SETUP_SECRET is required and must be at least 16 characters'),
});

// Validate and parse environment variables
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:');
  parsedEnv.error.issues.forEach((issue: z.ZodIssue) => {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parsedEnv.data;

// Type export for TypeScript
export type Env = z.infer<typeof envSchema>;
