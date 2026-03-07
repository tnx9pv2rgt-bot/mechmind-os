/**
 * MechMind OS v10 - Voice Webhook Handler Unit Tests
 * AI voice booking integration testing with HMAC verification
 */

import { Test, TestingModule } from '@nestjs/testing';
import { VoiceWebhookHandler } from '@/voice/voice-webhook.handler';
import { BookingService } from '@/booking/booking.service';
import { CustomerService } from '@/customers/customer.service';
import { NotificationService } from '@/notifications/notification.service';
import { IntentRecognitionService } from '@/voice/intent-recognition.service';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { 
  UnauthorizedException, 
  BadRequestException,
  RequestTimeoutException 
} from '@nestjs/common';
import * as crypto from 'crypto';

describe('VoiceWebhookHandler', () => {
  let handler: VoiceWebhookHandler;
  let bookingService: jest.Mocked<BookingService>;
  let customerService: jest.Mocked<CustomerService>;
  let notificationService: jest.Mocked<NotificationService>;
  let intentService: jest.Mocked<IntentRecognitionService>;

  // Test configuration
  const webhookSecret = 'test-webhook-secret-12345';
  const tenantId = 'test-tenant-123';
  const shopId = 'test-shop-456';

  beforeEach(async () => {
    const mockBookingService = {
      createBooking: jest.fn(),
      getAvailableSlots: jest.fn(),
      findBookingByPhone: jest.fn(),
      cancelBooking: jest.fn(),
    };

    const mockCustomerService = {
      findOrCreateCustomer: jest.fn(),
      getCustomerByPhone: jest.fn(),
    };

    const mockNotificationService = {
      sendSMS: jest.fn(),
      sendBookingConfirmation: jest.fn(),
    };

    const mockIntentService = {
      extractIntent: jest.fn(),
      extractEntities: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'VOICE_WEBHOOK_SECRET') return webhookSecret;
        if (key === 'VOICE_TIMEOUT_MS') return 5000;
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoiceWebhookHandler,
        { provide: BookingService, useValue: mockBookingService },
        { provide: CustomerService, useValue: mockCustomerService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: IntentRecognitionService, useValue: mockIntentService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: Logger, useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn() } },
      ],
    }).compile();

    handler = module.get<VoiceWebhookHandler>(VoiceWebhookHandler);
    bookingService = module.get(BookingService);
    customerService = module.get(CustomerService);
    notificationService = module.get(NotificationService);
    intentService = module.get(IntentRecognitionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('HMAC Signature Verification', () => {
    it('should verify HMAC signature correctly', () => {
      // Arrange
      const payload = JSON.stringify({ event: 'call.completed', call_id: '123' });
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');

      // Act & Assert
      expect(handler.verifySignature(payload, signature)).toBe(true);
    });

    it('should reject invalid HMAC signature', () => {
      // Arrange
      const payload = JSON.stringify({ event: 'call.completed', call_id: '123' });
      const invalidSignature = 'invalid-signature';

      // Act & Assert
      expect(handler.verifySignature(payload, invalidSignature)).toBe(false);
    });

    it('should reject tampered payload', () => {
      // Arrange
      const originalPayload = JSON.stringify({ event: 'call.completed', call_id: '123' });
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(originalPayload)
        .digest('hex');
      
      const tamperedPayload = JSON.stringify({ event: 'call.completed', call_id: '456' });

      // Act & Assert
      expect(handler.verifySignature(tamperedPayload, signature)).toBe(false);
    });

    it('should reject request with missing signature', async () => {
      // Arrange
      const payload = { event: 'call.completed', call_id: '123' };

      // Act & Assert
      await expect(handler.handleWebhook(tenantId, payload, ''))
        .rejects
        .toThrow(UnauthorizedException);
    });

    it('should reject request with wrong secret', () => {
      // Arrange
      const payload = JSON.stringify({ event: 'call.completed' });
      const wrongSignature = crypto
        .createHmac('sha256', 'wrong-secret')
        .update(payload)
        .digest('hex');

      // Act & Assert
      expect(handler.verifySignature(payload, wrongSignature)).toBe(false);
    });
  });

  describe('Intent Extraction', () => {
    it('should extract intent from transcript', async () => {
      // Arrange
      const transcript = 'I want to book an oil change for tomorrow at 2pm';
      intentService.extractIntent.mockResolvedValue({
        intent: 'booking_request',
        confidence: 0.95,
      });
      intentService.extractEntities.mockResolvedValue({
        service: 'oil_change',
        date: '2024-01-16',
        time: '14:00',
      });

      // Act
      const result = await handler.extractIntent(transcript);

      // Assert
      expect(result.intent).toBe('booking_request');
      expect(result.entities.service).toBe('oil_change');
    });

    it('should handle unclear intent', async () => {
      // Arrange
      const transcript = 'I have a question about my car';
      intentService.extractIntent.mockResolvedValue({
        intent: 'unclear',
        confidence: 0.3,
      });

      // Act
      const result = await handler.extractIntent(transcript);

      // Assert
      expect(result.intent).toBe('unclear');
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should extract multiple entities', async () => {
      // Arrange
      const transcript = 'Book tire rotation for next Tuesday at 10am for John Doe';
      intentService.extractEntities.mockResolvedValue({
        service: 'tire_rotation',
        date: '2024-01-23',
        time: '10:00',
        customer_name: 'John Doe',
      });

      // Act
      const result = await handler.extractEntities(transcript);

      // Assert
      expect(result.service).toBe('tire_rotation');
      expect(result.customer_name).toBe('John Doe');
    });
  });

  describe('Booking Flow', () => {
    const validWebhookPayload = {
      event: 'call.completed',
      call_id: 'call-123',
      timestamp: new Date().toISOString(),
      phone_number: '+1234567890',
      transcript: 'I need to book an oil change for tomorrow at 2pm',
      recording_url: 'https://example.com/recording.mp3',
    };

    it('should handle complete booking flow', async () => {
      // Arrange
      const payload = JSON.stringify(validWebhookPayload);
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');

      intentService.extractIntent.mockResolvedValue({
        intent: 'booking_request',
        confidence: 0.95,
      });
      intentService.extractEntities.mockResolvedValue({
        service: 'oil_change',
        date: '2024-01-16',
        time: '14:00',
      });
      customerService.findOrCreateCustomer.mockResolvedValue({
        id: 'customer-123',
        phone: '+1234567890',
      });
      bookingService.getAvailableSlots.mockResolvedValue([
        { time: '14:00', available: true },
      ]);
      bookingService.createBooking.mockResolvedValue({
        id: 'booking-123',
        status: 'confirmed',
        scheduledAt: new Date('2024-01-16T14:00:00Z'),
      });

      // Act
      const result = await handler.handleBookingRequest(
        tenantId,
        shopId,
        validWebhookPayload
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.bookingId).toBe('booking-123');
      expect(bookingService.createBooking).toHaveBeenCalled();
      expect(notificationService.sendBookingConfirmation).toHaveBeenCalled();
    });

    it('should handle booking with existing customer', async () => {
      // Arrange
      intentService.extractIntent.mockResolvedValue({
        intent: 'booking_request',
        confidence: 0.95,
      });
      intentService.extractEntities.mockResolvedValue({
        service: 'tire_rotation',
        date: '2024-01-16',
        time: '10:00',
      });
      customerService.getCustomerByPhone.mockResolvedValue({
        id: 'existing-customer',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
      });
      bookingService.createBooking.mockResolvedValue({
        id: 'booking-456',
        status: 'confirmed',
      });

      // Act
      const result = await handler.handleBookingRequest(
        tenantId,
        shopId,
        validWebhookPayload
      );

      // Assert
      expect(customerService.getCustomerByPhone).toHaveBeenCalledWith('+1234567890');
      expect(result.success).toBe(true);
    });

    it('should handle unavailable time slot', async () => {
      // Arrange
      intentService.extractIntent.mockResolvedValue({
        intent: 'booking_request',
        confidence: 0.95,
      });
      intentService.extractEntities.mockResolvedValue({
        service: 'oil_change',
        date: '2024-01-16',
        time: '14:00',
      });
      bookingService.getAvailableSlots.mockResolvedValue([
        { time: '14:00', available: false },
        { time: '15:00', available: true },
      ]);

      // Act
      const result = await handler.handleBookingRequest(
        tenantId,
        shopId,
        validWebhookPayload
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.alternativeSlots).toContain('15:00');
    });

    it('should handle cancellation request', async () => {
      // Arrange
      const cancelPayload = {
        ...validWebhookPayload,
        transcript: 'I need to cancel my appointment',
      };
      
      intentService.extractIntent.mockResolvedValue({
        intent: 'cancellation_request',
        confidence: 0.9,
      });
      bookingService.findBookingByPhone.mockResolvedValue({
        id: 'booking-to-cancel',
        scheduledAt: new Date('2024-01-16T14:00:00Z'),
      });
      bookingService.cancelBooking.mockResolvedValue({
        id: 'booking-to-cancel',
        status: 'cancelled',
      });

      // Act
      const result = await handler.handleCancellationRequest(
        tenantId,
        cancelPayload
      );

      // Assert
      expect(result.success).toBe(true);
      expect(bookingService.cancelBooking).toHaveBeenCalledWith(
        tenantId,
        'booking-to-cancel',
        'Cancelled via voice'
      );
    });
  });

  describe('Timeout Handling', () => {
    it('should escalate on timeout', async () => {
      // Arrange
      const payload = {
        event: 'call.completed',
        call_id: 'call-timeout',
        phone_number: '+1234567890',
        transcript: '', // Empty transcript indicates timeout
      };

      // Act
      const result = await handler.handleTimeout(tenantId, shopId, payload);

      // Assert
      expect(result.escalated).toBe(true);
      expect(result.message).toContain('human agent');
    });

    it('should send SMS fallback on timeout', async () => {
      // Arrange
      const payload = {
        event: 'call.timeout',
        call_id: 'call-123',
        phone_number: '+1234567890',
      };

      // Act
      await handler.handleTimeout(tenantId, shopId, payload);

      // Assert
      expect(notificationService.sendSMS).toHaveBeenCalledWith(
        '+1234567890',
        expect.stringContaining('online booking')
      );
    });

    it('should throw RequestTimeoutException on processing timeout', async () => {
      // Arrange
      const payload = JSON.stringify(validWebhookPayload);
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');

      // Mock slow intent extraction
      intentService.extractIntent.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 10000))
      );

      // Act & Assert
      await expect(
        handler.handleWebhook(tenantId, JSON.parse(payload), signature)
      ).rejects.toThrow(RequestTimeoutException);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON payload', async () => {
      // Arrange
      const invalidPayload = 'not-valid-json';
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(invalidPayload)
        .digest('hex');

      // Act & Assert
      await expect(
        handler.handleWebhook(tenantId, invalidPayload as any, signature)
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle missing required fields', async () => {
      // Arrange
      const incompletePayload = { event: 'call.completed' }; // Missing call_id
      const payload = JSON.stringify(incompletePayload);
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');

      // Act & Assert
      await expect(
        handler.handleWebhook(tenantId, incompletePayload, signature)
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      const payload = JSON.stringify(validWebhookPayload);
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');

      intentService.extractIntent.mockRejectedValue(new Error('AI service unavailable'));

      // Act
      const result = await handler.handleWebhook(
        tenantId,
        validWebhookPayload,
        signature
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('unavailable');
      expect(result.escalated).toBe(true);
    });
  });

  describe('Webhook Processing', () => {
    it('should process valid webhook', async () => {
      // Arrange
      const payload = JSON.stringify(validWebhookPayload);
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');

      intentService.extractIntent.mockResolvedValue({
        intent: 'booking_request',
        confidence: 0.95,
      });

      // Act
      const result = await handler.handleWebhook(
        tenantId,
        validWebhookPayload,
        signature
      );

      // Assert
      expect(result.processed).toBe(true);
    });

    it('should verify timestamp to prevent replay attacks', () => {
      // Arrange
      const oldTimestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 minutes ago
      const payload = JSON.stringify({
        ...validWebhookPayload,
        timestamp: oldTimestamp,
      });

      // Act & Assert
      expect(handler.isTimestampValid(oldTimestamp)).toBe(false);
    });

    it('should accept recent timestamps', () => {
      // Arrange
      const recentTimestamp = new Date(Date.now() - 30 * 1000).toISOString(); // 30 seconds ago

      // Act & Assert
      expect(handler.isTimestampValid(recentTimestamp)).toBe(true);
    });
  });

  describe('Response Latency', () => {
    it('should respond within 2 seconds (p99 requirement)', async () => {
      // Arrange
      const latencies: number[] = [];
      
      intentService.extractIntent.mockResolvedValue({
        intent: 'booking_request',
        confidence: 0.95,
      });

      // Act - measure 100 requests
      for (let i = 0; i < 100; i++) {
        const start = Date.now();
        await handler.extractIntent('Book oil change for tomorrow');
        latencies.push(Date.now() - start);
      }

      // Assert - p99 should be under 2000ms
      const sorted = latencies.sort((a, b) => a - b);
      const p99 = sorted[Math.floor(sorted.length * 0.99)];
      
      expect(p99).toBeLessThan(2000);
    });
  });

  describe('Phone Number Normalization', () => {
    it('should normalize various phone formats', () => {
      // Act & Assert
      expect(handler.normalizePhone('(123) 456-7890')).toBe('+11234567890');
      expect(handler.normalizePhone('123-456-7890')).toBe('+11234567890');
      expect(handler.normalizePhone('+1 234 567 8900')).toBe('+12345678900');
      expect(handler.normalizePhone('123.456.7890')).toBe('+11234567890');
    });

    it('should handle international numbers', () => {
      expect(handler.normalizePhone('+44 20 7946 0958')).toBe('+442079460958');
    });
  });
});
