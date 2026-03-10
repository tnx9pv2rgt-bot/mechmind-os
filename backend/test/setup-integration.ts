// Integration test setup
// Requires a running PostgreSQL and Redis instance (use docker-compose.test.yml)

jest.setTimeout(120000);

// Ensure test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-chars-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-chars';
process.env.JWT_2FA_SECRET = 'test-2fa-secret-minimum-32-chars-long';
process.env.ENCRYPTION_KEY = 'test-encryption-key-exactly-32ch';
process.env.CORS_ORIGIN = 'http://localhost:3001';
process.env.LOG_LEVEL = 'error'; // Suppress logs during tests
