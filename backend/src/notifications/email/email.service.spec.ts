import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  EmailService,
  BookingConfirmationData,
  BookingReminderData,
  InvoiceReadyData,
  GdprDataExportData,
  WelcomeData,
  PasswordResetData,
  BookingCancelledData,
} from './email.service';

// Mock the Resend SDK
const mockSend = jest.fn();
const mockGet = jest.fn();
const mockVerify = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: mockSend,
      get: mockGet,
    },
    domains: {
      verify: mockVerify,
    },
  })),
}));

describe('EmailService', () => {
  let service: EmailService;

  const defaultConfigMap: Record<string, string | boolean> = {
    RESEND_API_KEY: 'test-api-key',
    ENABLE_EMAIL_NOTIFICATIONS: true,
    EMAIL_FROM_ADDRESS: 'noreply@mechmind.io',
    EMAIL_FROM_NAME: 'MechMind',
  };

  const createModule = async (
    configOverrides: Record<string, string | boolean> = {},
  ): Promise<TestingModule> => {
    const config = { ...defaultConfigMap, ...configOverrides };
    return Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(
              (key: string, defaultValue?: string | boolean) => config[key] ?? defaultValue,
            ),
          },
        },
      ],
    }).compile();
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await createModule();
    service = module.get<EmailService>(EmailService);
    module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // Initialization
  // =========================================================================
  describe('initialization', () => {
    it('should initialize Resend client when API key and enabled flag are present', async () => {
      const module = await createModule({
        RESEND_API_KEY: 'test-api-key',
        ENABLE_EMAIL_NOTIFICATIONS: true,
      });
      const svc = module.get<EmailService>(EmailService);
      expect(svc).toBeDefined();
    });

    it('should not initialize Resend when API key is missing', async () => {
      const module = await createModule({
        RESEND_API_KEY: '',
        ENABLE_EMAIL_NOTIFICATIONS: true,
      });
      const svc = module.get<EmailService>(EmailService);
      expect(svc).toBeDefined();
    });

    it('should not initialize Resend when email notifications are disabled', async () => {
      const module = await createModule({
        RESEND_API_KEY: 'test-api-key',
        ENABLE_EMAIL_NOTIFICATIONS: false,
      });
      const svc = module.get<EmailService>(EmailService);
      expect(svc).toBeDefined();
    });
  });

  // =========================================================================
  // sendBookingConfirmation()
  // =========================================================================
  describe('sendBookingConfirmation', () => {
    const mockData: BookingConfirmationData = {
      customerName: 'Mario Rossi',
      customerEmail: 'mario@example.com',
      service: 'Tagliando completo',
      date: '2024-03-15',
      time: '14:30',
      vehicle: 'Fiat Panda ABC123',
      bookingCode: 'BK-2024-001',
      workshopName: 'Officina Meccanica',
      workshopAddress: 'Via Roma 123, Milano',
      workshopPhone: '+39 02 1234567',
      notes: 'Controllare freni',
    };

    it('should send booking confirmation email via Resend', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      const result = await service.sendBookingConfirmation(mockData);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('email-123');
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'mario@example.com',
          subject: expect.stringContaining('BK-2024-001'),
          html: expect.stringContaining('Mario Rossi'),
          tags: [{ name: 'category', value: 'booking_confirmation' }],
        }),
      );
    });

    it('should include all booking details in the HTML', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-123' }, error: null });

      await service.sendBookingConfirmation(mockData);

      const sentHtml = mockSend.mock.calls[0][0].html;
      expect(sentHtml).toContain('Mario Rossi');
      expect(sentHtml).toContain('BK-2024-001');
      expect(sentHtml).toContain('Tagliando completo');
      expect(sentHtml).toContain('2024-03-15');
      expect(sentHtml).toContain('14:30');
      expect(sentHtml).toContain('Fiat Panda ABC123');
      expect(sentHtml).toContain('Officina Meccanica');
      expect(sentHtml).toContain('Via Roma 123, Milano');
      expect(sentHtml).toContain('+39 02 1234567');
      expect(sentHtml).toContain('Controllare freni');
    });

    it('should handle Resend API error', async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: { message: 'Invalid API key' },
      });

      const result = await service.sendBookingConfirmation(mockData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });

    it('should handle Resend SDK throwing an exception', async () => {
      mockSend.mockRejectedValue(new Error('Network error'));

      const result = await service.sendBookingConfirmation(mockData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle booking confirmation without notes', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-124' }, error: null });
      const dataWithoutNotes = { ...mockData, notes: undefined };

      const result = await service.sendBookingConfirmation(dataWithoutNotes);

      expect(result.success).toBe(true);
      const sentHtml = mockSend.mock.calls[0][0].html;
      expect(sentHtml).not.toContain('Controllare freni');
    });
  });

  // =========================================================================
  // sendBookingReminder()
  // =========================================================================
  describe('sendBookingReminder', () => {
    const mockData: BookingReminderData = {
      customerName: 'Mario Rossi',
      customerEmail: 'mario@example.com',
      service: 'Tagliando completo',
      date: '2024-03-15',
      time: '14:30',
      vehicle: 'Fiat Panda ABC123',
      bookingCode: 'BK-2024-001',
      workshopName: 'Officina Meccanica',
      workshopAddress: 'Via Roma 123, Milano',
    };

    it('should send booking reminder email', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-200' }, error: null });

      const result = await service.sendBookingReminder(mockData);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('email-200');
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'mario@example.com',
          subject: expect.stringContaining('Promemoria'),
          tags: [{ name: 'category', value: 'booking_reminder' }],
        }),
      );
    });

    it('should include reminder-specific content in HTML', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-200' }, error: null });

      await service.sendBookingReminder(mockData);

      const sentHtml = mockSend.mock.calls[0][0].html;
      expect(sentHtml).toContain('Promemoria');
      expect(sentHtml).toContain('Mario Rossi');
      expect(sentHtml).toContain('BK-2024-001');
    });
  });

  // =========================================================================
  // sendInvoiceReady()
  // =========================================================================
  describe('sendInvoiceReady', () => {
    const mockData: InvoiceReadyData = {
      customerName: 'Mario Rossi',
      customerEmail: 'mario@example.com',
      invoiceNumber: 'INV-2024-001',
      invoiceDate: '2024-03-15',
      amount: '250.00',
      downloadUrl: 'https://mechmind.io/invoice/inv-2024-001',
      workshopName: 'Officina Meccanica',
    };

    it('should send invoice ready email', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-300' }, error: null });

      const result = await service.sendInvoiceReady(mockData);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('email-300');
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'mario@example.com',
          subject: expect.stringContaining('INV-2024-001'),
          tags: [{ name: 'category', value: 'invoice_ready' }],
        }),
      );
    });

    it('should include download link in HTML', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-300' }, error: null });

      await service.sendInvoiceReady(mockData);

      const sentHtml = mockSend.mock.calls[0][0].html;
      expect(sentHtml).toContain('https://mechmind.io/invoice/inv-2024-001');
      expect(sentHtml).toContain('250.00');
      expect(sentHtml).toContain('INV-2024-001');
    });
  });

  // =========================================================================
  // sendGdprDataExport()
  // =========================================================================
  describe('sendGdprDataExport', () => {
    const mockData: GdprDataExportData = {
      customerName: 'Mario Rossi',
      customerEmail: 'mario@example.com',
      downloadUrl: 'https://mechmind.io/gdpr/download/abc123',
      expiryDate: '2024-03-22',
      requestId: 'GDPR-2024-001',
    };

    it('should send GDPR data export email', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-400' }, error: null });

      const result = await service.sendGdprDataExport(mockData);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('email-400');
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'mario@example.com',
          subject: expect.stringContaining('GDPR-2024-001'),
          tags: [{ name: 'category', value: 'gdpr_export' }],
        }),
      );
    });

    it('should include expiry date and download URL in HTML', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-400' }, error: null });

      await service.sendGdprDataExport(mockData);

      const sentHtml = mockSend.mock.calls[0][0].html;
      expect(sentHtml).toContain('https://mechmind.io/gdpr/download/abc123');
      expect(sentHtml).toContain('2024-03-22');
      expect(sentHtml).toContain('GDPR-2024-001');
    });
  });

  // =========================================================================
  // sendWelcome()
  // =========================================================================
  describe('sendWelcome', () => {
    const mockData: WelcomeData = {
      customerName: 'Mario Rossi',
      customerEmail: 'mario@example.com',
      workshopName: 'Officina Meccanica',
      loginUrl: 'https://mechmind.io/login',
    };

    it('should send welcome email', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-500' }, error: null });

      const result = await service.sendWelcome(mockData);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('email-500');
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'mario@example.com',
          subject: expect.stringContaining('Benvenuto'),
          tags: [{ name: 'category', value: 'welcome' }],
        }),
      );
    });

    it('should include login URL in HTML', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-500' }, error: null });

      await service.sendWelcome(mockData);

      const sentHtml = mockSend.mock.calls[0][0].html;
      expect(sentHtml).toContain('https://mechmind.io/login');
      expect(sentHtml).toContain('Officina Meccanica');
    });
  });

  // =========================================================================
  // sendPasswordReset()
  // =========================================================================
  describe('sendPasswordReset', () => {
    const mockData: PasswordResetData = {
      customerName: 'Mario Rossi',
      customerEmail: 'mario@example.com',
      resetUrl: 'https://mechmind.io/reset/token123',
      expiryHours: 24,
    };

    it('should send password reset email', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-600' }, error: null });

      const result = await service.sendPasswordReset(mockData);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('email-600');
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'mario@example.com',
          subject: expect.stringContaining('password'),
          tags: [{ name: 'category', value: 'password_reset' }],
        }),
      );
    });

    it('should include reset URL and expiry in HTML', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-600' }, error: null });

      await service.sendPasswordReset(mockData);

      const sentHtml = mockSend.mock.calls[0][0].html;
      expect(sentHtml).toContain('https://mechmind.io/reset/token123');
      expect(sentHtml).toContain('24');
    });
  });

  // =========================================================================
  // sendBookingCancelled()
  // =========================================================================
  describe('sendBookingCancelled', () => {
    const mockData: BookingCancelledData = {
      customerName: 'Mario Rossi',
      customerEmail: 'mario@example.com',
      service: 'Tagliando completo',
      date: '2024-03-15',
      bookingCode: 'BK-2024-001',
      workshopName: 'Officina Meccanica',
      cancellationReason: 'Customer request',
    };

    it('should send booking cancellation email', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-700' }, error: null });

      const result = await service.sendBookingCancelled(mockData);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('email-700');
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'mario@example.com',
          subject: expect.stringContaining('Annullata'),
          tags: [{ name: 'category', value: 'booking_cancelled' }],
        }),
      );
    });

    it('should include cancellation reason when provided', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-700' }, error: null });

      await service.sendBookingCancelled(mockData);

      const sentHtml = mockSend.mock.calls[0][0].html;
      expect(sentHtml).toContain('Customer request');
    });

    it('should handle cancellation without reason', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-701' }, error: null });
      const dataNoReason = { ...mockData, cancellationReason: undefined };

      const result = await service.sendBookingCancelled(dataNoReason);

      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // sendRawEmail()
  // =========================================================================
  describe('sendRawEmail', () => {
    it('should send raw email with custom content', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-800' }, error: null });

      const result = await service.sendRawEmail({
        to: 'test@example.com',
        subject: 'Custom Subject',
        html: '<p>Custom content</p>',
        tags: [{ name: 'category', value: 'custom' }],
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('email-800');
    });
  });

  // =========================================================================
  // Email validation
  // =========================================================================
  describe('email validation', () => {
    it('should reject invalid email format', async () => {
      const result = await service.sendRawEmail({
        to: 'invalid-email',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email format');
    });

    it('should accept valid email format', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-900' }, error: null });

      const result = await service.sendRawEmail({
        to: 'valid@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // getEmailStatus()
  // =========================================================================
  describe('getEmailStatus', () => {
    it('should return email status from Resend', async () => {
      mockGet.mockResolvedValue({
        data: { last_event: 'delivered', delivered_at: '2024-03-15T10:00:00Z' },
        error: null,
      });

      const result = await service.getEmailStatus('email-123');

      expect(result).toEqual({
        status: 'delivered',
        deliveredAt: expect.any(Date),
      });
      expect(mockGet).toHaveBeenCalledWith('email-123');
    });

    it('should return null on Resend API error', async () => {
      mockGet.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await service.getEmailStatus('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null on exception', async () => {
      mockGet.mockRejectedValue(new Error('Network failure'));

      const result = await service.getEmailStatus('email-123');

      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // verifyDomain()
  // =========================================================================
  describe('verifyDomain', () => {
    it('should verify domain and return valid status', async () => {
      mockVerify.mockResolvedValue({
        data: { records: [{ type: 'MX', value: 'mx.example.com' }] },
        error: null,
      });

      const result = await service.verifyDomain('mechmind.io');

      expect(result.valid).toBe(true);
      expect(mockVerify).toHaveBeenCalledWith('mechmind.io');
    });

    it('should return invalid on verification failure', async () => {
      mockVerify.mockResolvedValue({
        data: null,
        error: { message: 'Domain not found' },
      });

      const result = await service.verifyDomain('invalid.io');

      expect(result.valid).toBe(false);
    });

    it('should return invalid on exception', async () => {
      mockVerify.mockRejectedValue(new Error('API error'));

      const result = await service.verifyDomain('mechmind.io');

      expect(result.valid).toBe(false);
    });
  });

  // =========================================================================
  // getStats()
  // =========================================================================
  describe('getStats', () => {
    it('should return null (placeholder)', async () => {
      const result = await service.getStats();

      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // Fallback when Resend not initialized
  // =========================================================================
  describe('when Resend is not initialized', () => {
    let uninitializedService: EmailService;

    beforeEach(async () => {
      const module = await createModule({
        RESEND_API_KEY: '',
        ENABLE_EMAIL_NOTIFICATIONS: false,
      });
      uninitializedService = module.get<EmailService>(EmailService);
    });

    it('should return mock success for email sending', async () => {
      const result = await uninitializedService.sendBookingConfirmation({
        customerName: 'Mario Rossi',
        customerEmail: 'mario@example.com',
        service: 'Tagliando',
        date: '2024-03-15',
        time: '14:30',
        vehicle: 'Fiat Panda',
        bookingCode: 'BK-001',
        workshopName: 'Officina',
        workshopAddress: 'Via Roma',
        workshopPhone: '+390212345',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('mock-email-id');
    });

    it('should return null for getEmailStatus', async () => {
      const result = await uninitializedService.getEmailStatus('email-123');

      expect(result).toBeNull();
    });

    it('should return invalid for verifyDomain', async () => {
      const result = await uninitializedService.verifyDomain('example.com');

      expect(result).toEqual({ valid: false });
    });
  });
});
