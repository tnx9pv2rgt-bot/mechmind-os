/**
 * emailService.spec.ts — Tests for SendGrid email service wrapper
 */

// Mock SendGrid before importing
const mockSend = jest.fn();
jest.mock('@sendgrid/mail', () => ({
  __esModule: true,
  default: {
    setApiKey: jest.fn(),
    send: mockSend,
  },
}));

// Set env vars before importing module (module reads them at parse time)
const ORIGINAL_ENV_EMAIL = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = {
    ...ORIGINAL_ENV_EMAIL,
    SENDGRID_API_KEY: 'SG.test-key-12345',
    EMAIL_FROM_ADDRESS: 'test@mechmind.io',
    EMAIL_FROM_NAME: 'TestMechMind',
    APP_URL: 'https://test.mechmind.io',
  };
  mockSend.mockReset();
});

afterAll(() => {
  process.env = ORIGINAL_ENV_EMAIL;
});

describe('emailService', () => {
  // Re-import for each test block to pick up env changes
  const loadModule = async () => {
    return await import('./emailService');
  };

  describe('sendVerificationEmail', () => {
    it('should send verification email successfully', async () => {
      mockSend.mockResolvedValueOnce([
        { statusCode: 202, headers: { 'x-message-id': 'msg-123' }, body: '' },
      ]);

      const mod = await loadModule();
      const result = await mod.sendVerificationEmail('user@test.com', 'token-abc', 'Mario');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-123');
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@test.com',
          subject: expect.stringContaining('Verifica'),
        }),
      );
    });

    it('should return error on SendGrid failure', async () => {
      mockSend.mockRejectedValueOnce(new Error('SendGrid API error'));

      const mod = await loadModule();
      const result = await mod.sendVerificationEmail('user@test.com', 'token', 'Mario');

      expect(result.success).toBe(false);
      expect(result.error).toBe('SendGrid API error');
    });

    it('should return error when API key is not configured', async () => {
      process.env.SENDGRID_API_KEY = '';
      jest.resetModules();

      const mod = await import('./emailService');
      const result = await mod.sendVerificationEmail('user@test.com', 'token', 'Mario');

      expect(result.success).toBe(false);
      expect(result.error).toContain('SendGrid API key non configurata');
    });

    it('should handle non-Error thrown objects', async () => {
      mockSend.mockRejectedValueOnce('string error');

      const mod = await loadModule();
      const result = await mod.sendVerificationEmail('user@test.com', 'token', 'Mario');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Errore sconosciuto');
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email successfully', async () => {
      mockSend.mockResolvedValueOnce([
        { statusCode: 202, headers: { 'x-message-id': 'msg-456' }, body: '' },
      ]);

      const mod = await loadModule();
      const result = await mod.sendWelcomeEmail('user@test.com', 'Luigi');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-456');
    });

    it('should return error on failure', async () => {
      mockSend.mockRejectedValueOnce(new Error('Network timeout'));

      const mod = await loadModule();
      const result = await mod.sendWelcomeEmail('user@test.com', 'Luigi');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network timeout');
    });

    it('should fail when API key missing', async () => {
      process.env.SENDGRID_API_KEY = '';
      jest.resetModules();

      const mod = await import('./emailService');
      const result = await mod.sendWelcomeEmail('user@test.com', 'Luigi');

      expect(result.success).toBe(false);
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email successfully', async () => {
      mockSend.mockResolvedValueOnce([
        { statusCode: 202, headers: { 'x-message-id': 'msg-789' }, body: '' },
      ]);

      const mod = await loadModule();
      const result = await mod.sendPasswordResetEmail('user@test.com', 'reset-token');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-789');
    });

    it('should extract name from email for template', async () => {
      mockSend.mockResolvedValueOnce([
        { statusCode: 202, headers: { 'x-message-id': 'msg-x' }, body: '' },
      ]);

      const mod = await loadModule();
      await mod.sendPasswordResetEmail('mario.rossi@test.com', 'token');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'mario.rossi@test.com',
          html: expect.stringContaining('mario.rossi'),
        }),
      );
    });

    it('should return error on API failure', async () => {
      mockSend.mockRejectedValueOnce(new Error('403 Forbidden'));

      const mod = await loadModule();
      const result = await mod.sendPasswordResetEmail('user@test.com', 'token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('403 Forbidden');
    });
  });

  describe('sendEmail', () => {
    it('should send generic email successfully', async () => {
      mockSend.mockResolvedValueOnce([
        { statusCode: 202, headers: { 'x-message-id': 'msg-generic' }, body: '' },
      ]);

      const mod = await loadModule();
      const result = await mod.sendEmail({
        to: 'dest@test.com',
        from: 'any@test.com',
        subject: 'Test Subject',
        html: '<p>Hello</p>',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-generic');
    });

    it('should override from address with configured address', async () => {
      mockSend.mockResolvedValueOnce([
        { statusCode: 202, headers: { 'x-message-id': 'msg-g' }, body: '' },
      ]);

      const mod = await loadModule();
      await mod.sendEmail({
        to: 'dest@test.com',
        from: 'other@test.com',
        subject: 'Test',
        html: '<p>Hi</p>',
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: expect.objectContaining({ email: 'test@mechmind.io' }),
        }),
      );
    });

    it('should return error on failure', async () => {
      mockSend.mockRejectedValueOnce(new Error('Bad Request'));

      const mod = await loadModule();
      const result = await mod.sendEmail({
        to: 'dest@test.com',
        from: 'any@test.com',
        subject: 'Test',
        html: '<p>Hi</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Bad Request');
    });
  });

  describe('isEmailServiceConfigured', () => {
    it('should return true when API key starts with SG.', async () => {
      const mod = await loadModule();
      expect(mod.isEmailServiceConfigured()).toBe(true);
    });

    it('should return false when API key is empty', async () => {
      process.env.SENDGRID_API_KEY = '';
      jest.resetModules();

      const mod = await import('./emailService');
      expect(mod.isEmailServiceConfigured()).toBe(false);
    });

    it('should return false when API key does not start with SG.', async () => {
      process.env.SENDGRID_API_KEY = 'invalid-key';
      jest.resetModules();

      const mod = await import('./emailService');
      expect(mod.isEmailServiceConfigured()).toBe(false);
    });
  });
});
