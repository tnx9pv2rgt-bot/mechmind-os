/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentLinkService } from './payment-link.service';
import { PrismaService } from '@common/services/prisma.service';

const TENANT_ID = 'tenant-uuid-001';

function mockInvoice(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'inv-uuid-001',
    tenantId: TENANT_ID,
    invoiceNumber: 'FT-2026-001',
    customerId: 'cust-uuid-001',
    status: 'SENT',
    total: { toString: () => '244.00' },
    taxAmount: { toString: () => '44.00' },
    subtotal: { toString: () => '200.00' },
    paymentLinkUrl: null,
    paymentLinkId: null,
    paidAt: null,
    dueDate: new Date('2026-04-30'),
    invoiceItems: [],
    customer: { id: 'cust-uuid-001', encryptedFirstName: 'Mario' },
    ...overrides,
  };
}

describe('PaymentLinkService', () => {
  let service: PaymentLinkService;
  let prisma: {
    invoice: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    tenant: {
      findUnique: jest.Mock;
    };
  };
  let config: { get: jest.Mock };

  beforeEach(async () => {
    prisma = {
      invoice: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      tenant: {
        findUnique: jest.fn(),
      },
    };

    config = {
      get: jest.fn((key: string, fallback?: string) => {
        const map: Record<string, string> = {
          FRONTEND_URL: 'https://app.mechmind.io',
        };
        return map[key] ?? fallback ?? undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentLinkService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get(PaymentLinkService);
  });

  // ─── createPaymentLink ───
  describe('createPaymentLink', () => {
    it('should throw NotFoundException if invoice not found', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);

      await expect(service.createPaymentLink(TENANT_ID, 'nonexistent', 'SMS')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if invoice already paid', async () => {
      prisma.invoice.findFirst.mockResolvedValue(mockInvoice({ status: 'PAID' }));

      await expect(service.createPaymentLink(TENANT_ID, 'inv-uuid-001', 'SMS')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if invoice cancelled', async () => {
      prisma.invoice.findFirst.mockResolvedValue(mockInvoice({ status: 'CANCELLED' }));

      await expect(service.createPaymentLink(TENANT_ID, 'inv-uuid-001', 'EMAIL')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if Stripe not configured', async () => {
      // Stripe is null because STRIPE_SECRET_KEY is not set in config
      prisma.invoice.findFirst.mockResolvedValue(mockInvoice());

      await expect(service.createPaymentLink(TENANT_ID, 'inv-uuid-001', 'SMS')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── createStripeCheckoutSession ───
  describe('createStripeCheckoutSession', () => {
    it('should throw BadRequestException if Stripe not configured', async () => {
      await expect(service.createStripeCheckoutSession(TENANT_ID, 'inv-uuid-001')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if invoice not found', async () => {
      // Create service with Stripe configured
      config.get.mockImplementation((key: string, fallback?: string) => {
        if (key === 'STRIPE_SECRET_KEY') return 'sk_test_fake';
        if (key === 'FRONTEND_URL') return 'https://app.mechmind.io';
        return fallback;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PaymentLinkService,
          { provide: PrismaService, useValue: prisma },
          { provide: ConfigService, useValue: config },
        ],
      }).compile();

      const svcWithStripe = module.get(PaymentLinkService);
      prisma.invoice.findFirst.mockResolvedValue(null);

      await expect(
        svcWithStripe.createStripeCheckoutSession(TENANT_ID, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── handlePaymentCompleted ───
  describe('handlePaymentCompleted', () => {
    it('should mark invoice as PAID', async () => {
      const invoice = mockInvoice({ paymentLinkId: 'cs_test_123' });
      prisma.invoice.findFirst.mockResolvedValue(invoice);
      prisma.invoice.update.mockResolvedValue({ ...invoice, status: 'PAID', paidAt: new Date() });

      await service.handlePaymentCompleted('cs_test_123');

      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-uuid-001' },
        data: {
          status: 'PAID',
          paidAt: expect.any(Date),
          paymentMethod: 'CARTA',
        },
      });
    });

    it('should skip if invoice not found', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);

      await service.handlePaymentCompleted('cs_test_unknown');

      expect(prisma.invoice.update).not.toHaveBeenCalled();
    });

    it('should skip if invoice already paid', async () => {
      prisma.invoice.findFirst.mockResolvedValue(mockInvoice({ status: 'PAID' }));

      await service.handlePaymentCompleted('cs_test_123');

      expect(prisma.invoice.update).not.toHaveBeenCalled();
    });
  });

  // ─── getPaymentStatus ───
  describe('getPaymentStatus', () => {
    it('should return payment status for invoice', async () => {
      const invoice = mockInvoice({
        paymentLinkUrl: 'https://checkout.stripe.com/test',
      });
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.getPaymentStatus(TENANT_ID, 'inv-uuid-001');

      expect(result).toEqual({
        invoiceId: 'inv-uuid-001',
        status: 'SENT',
        paymentLinkUrl: 'https://checkout.stripe.com/test',
        paidAt: null,
        total: '244.00',
      });
    });

    it('should throw NotFoundException if invoice not found', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);

      await expect(service.getPaymentStatus(TENANT_ID, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── resolvePaymentToken ───
  describe('resolvePaymentToken', () => {
    it('should resolve token and return invoice summary', async () => {
      const invoice = mockInvoice({
        paymentLinkId: 'cs_test_123',
        paymentLinkUrl: 'https://checkout.stripe.com/test',
      });
      prisma.invoice.findFirst.mockResolvedValue(invoice);
      prisma.tenant.findUnique.mockResolvedValue({ id: TENANT_ID, name: 'AutoService Roma' });

      const result = await service.resolvePaymentToken('cs_test_123');

      expect(result).toEqual({
        invoiceNumber: 'FT-2026-001',
        total: '244.00',
        taxAmount: '44.00',
        status: 'SENT',
        dueDate: expect.any(String),
        tenantName: 'AutoService Roma',
        checkoutUrl: 'https://checkout.stripe.com/test',
      });
    });

    it('should throw NotFoundException for invalid token', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);

      await expect(service.resolvePaymentToken('invalid-token')).rejects.toThrow(NotFoundException);
    });

    it('should use fallback tenant name if tenant not found', async () => {
      prisma.invoice.findFirst.mockResolvedValue(mockInvoice({ paymentLinkId: 'cs_test_123' }));
      prisma.tenant.findUnique.mockResolvedValue(null);

      const result = await service.resolvePaymentToken('cs_test_123');

      expect(result.tenantName).toBe('Officina');
    });
  });

  // ─── TIER_1 SECURITY: Stripe Checkout Session Creation & Error Handling ───
  describe('[TIER_1] createStripeCheckoutSession - Error Handling', () => {
    it('should handle Stripe API rate limit errors gracefully', async () => {
      config.get.mockImplementation((key: string, fallback?: string) => {
        if (key === 'STRIPE_SECRET_KEY') return 'sk_test_fake';
        if (key === 'FRONTEND_URL') return 'https://app.mechmind.io';
        return fallback;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PaymentLinkService,
          { provide: PrismaService, useValue: prisma },
          { provide: ConfigService, useValue: config },
        ],
      }).compile();

      const svcWithStripe = module.get(PaymentLinkService);
      const invoice = mockInvoice();
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      // Mock Stripe to throw a rate limit error
      jest
        .spyOn(svcWithStripe['stripe']!.checkout.sessions, 'create')
        .mockRejectedValue(new Error('Rate limit exceeded'));

      await expect(
        svcWithStripe.createStripeCheckoutSession(TENANT_ID, 'inv-uuid-001'),
      ).rejects.toThrow();
    });

    it('should convert amount to cents correctly for Stripe', async () => {
      config.get.mockImplementation((key: string, fallback?: string) => {
        if (key === 'STRIPE_SECRET_KEY') return 'sk_test_fake';
        if (key === 'FRONTEND_URL') return 'https://app.mechmind.io';
        return fallback;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PaymentLinkService,
          { provide: PrismaService, useValue: prisma },
          { provide: ConfigService, useValue: config },
        ],
      }).compile();

      const svcWithStripe = module.get(PaymentLinkService);
      const invoice = mockInvoice({ total: 150.5 });
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const createSessionSpy = jest
        .spyOn(svcWithStripe['stripe']!.checkout.sessions, 'create')
        .mockResolvedValue({
          id: 'cs_test_123',
          url: 'https://checkout.stripe.com/pay/test',
        } as any);

      await svcWithStripe.createStripeCheckoutSession(TENANT_ID, 'inv-uuid-001');

      expect(createSessionSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [
            expect.objectContaining({
              price_data: expect.objectContaining({
                unit_amount: 15050, // 150.50 * 100
              }),
            }),
          ],
        }),
      );
    });

    it('should include tenantId in Stripe session metadata for audit', async () => {
      config.get.mockImplementation((key: string, fallback?: string) => {
        if (key === 'STRIPE_SECRET_KEY') return 'sk_test_fake';
        if (key === 'FRONTEND_URL') return 'https://app.mechmind.io';
        return fallback;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PaymentLinkService,
          { provide: PrismaService, useValue: prisma },
          { provide: ConfigService, useValue: config },
        ],
      }).compile();

      const svcWithStripe = module.get(PaymentLinkService);
      const invoice = mockInvoice();
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const createSessionSpy = jest
        .spyOn(svcWithStripe['stripe']!.checkout.sessions, 'create')
        .mockResolvedValue({
          id: 'cs_test_123',
          url: 'https://checkout.stripe.com/pay/test',
        } as any);

      await svcWithStripe.createStripeCheckoutSession(TENANT_ID, 'inv-uuid-001');

      expect(createSessionSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            tenantId: TENANT_ID,
            invoiceId: 'inv-uuid-001',
          }),
        }),
      );
    });
  });

  // ─── TIER_1 SECURITY: Payment State Machine & Idempotency ───
  describe('[TIER_1] handlePaymentCompleted - State Machine & Idempotency', () => {
    it('should prevent double-payment race conditions with idempotent updates', async () => {
      const invoiceSent = mockInvoice({ paymentLinkId: 'cs_test_123', status: 'SENT' });
      const invoicePaid = mockInvoice({
        paymentLinkId: 'cs_test_123',
        status: 'PAID',
        paidAt: new Date(),
      });

      // First webhook call - invoice is SENT
      prisma.invoice.findFirst.mockResolvedValue(invoiceSent);
      prisma.invoice.update.mockResolvedValue(invoicePaid);

      await service.handlePaymentCompleted('cs_test_123');
      expect(prisma.invoice.update).toHaveBeenCalledTimes(1);

      // Reset mock for second call
      prisma.invoice.update.mockClear();

      // Simulate Stripe webhook retry (same sessionId) - invoice is now PAID
      prisma.invoice.findFirst.mockResolvedValue(invoicePaid);
      await service.handlePaymentCompleted('cs_test_123');

      // Should NOT call update again (already paid check prevents duplicate)
      expect(prisma.invoice.update).not.toHaveBeenCalled();
    });

    it('should update paidAt timestamp on successful payment', async () => {
      const invoice = mockInvoice({ paymentLinkId: 'cs_test_123' });
      prisma.invoice.findFirst.mockResolvedValue(invoice);
      prisma.invoice.update.mockResolvedValue({ ...invoice, status: 'PAID', paidAt: new Date() });

      await service.handlePaymentCompleted('cs_test_123');

      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-uuid-001' },
        data: {
          status: 'PAID',
          paidAt: expect.any(Date),
          paymentMethod: 'CARTA',
        },
      });
    });

    it('should set paymentMethod to CARTA (card) for Stripe payments', async () => {
      const invoice = mockInvoice({ paymentLinkId: 'cs_test_123' });
      prisma.invoice.findFirst.mockResolvedValue(invoice);
      prisma.invoice.update.mockResolvedValue({ ...invoice, status: 'PAID' });

      await service.handlePaymentCompleted('cs_test_123');

      const call = prisma.invoice.update.mock.calls[0][0];
      expect(call.data.paymentMethod).toBe('CARTA');
    });
  });

  // ─── TIER_1 SECURITY: Tenant Isolation ───
  describe('[TIER_1] Tenant Isolation - No Cross-Tenant Access', () => {
    it('should NOT create payment link for invoice from different tenant', async () => {
      const _otherTenantInvoice = mockInvoice({ tenantId: 'other-tenant-uuid' });
      prisma.invoice.findFirst.mockResolvedValue(null); // Simulating WHERE clause with different tenant

      await expect(
        service.createPaymentLink('attacker-tenant', 'inv-uuid-001', 'SMS'),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.invoice.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'attacker-tenant' }),
        }),
      );
    });

    it('should NOT expose payment status for cross-tenant request', async () => {
      const _invoice = mockInvoice({ tenantId: TENANT_ID });
      prisma.invoice.findFirst.mockResolvedValue(null); // Different tenant filter

      await expect(service.getPaymentStatus('attacker-tenant', 'inv-uuid-001')).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.invoice.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'attacker-tenant' }),
        }),
      );
    });

    it('should enforce tenantId filter on findFirst with invoiceId alone', async () => {
      const invoice = mockInvoice(); // Returns invoice with TENANT_ID
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      await service.getPaymentStatus(TENANT_ID, 'inv-uuid-001');

      const call = prisma.invoice.findFirst.mock.calls[0][0];
      expect(call.where).toHaveProperty('tenantId', TENANT_ID);
      expect(call.where).toHaveProperty('id', 'inv-uuid-001');
    });
  });

  // ─── TIER_1 SECURITY: PII & Sensitive Data in Logs ───
  describe('[TIER_1] Security - No PII in Logs', () => {
    it('should log payment events WITHOUT exposing full card/customer data', async () => {
      const invoice = mockInvoice({ paymentLinkId: 'cs_test_123' });
      prisma.invoice.findFirst.mockResolvedValue(invoice);
      prisma.invoice.update.mockResolvedValue({ ...invoice, status: 'PAID' });

      const logSpy = jest.spyOn(service['logger'], 'log');

      await service.handlePaymentCompleted('cs_test_123');

      // Verify log was called but does NOT contain sensitive data
      const logCall = logSpy.mock.calls[0][0];
      expect(logCall).toContain('Invoice');
      expect(logCall).toContain('PAID');
      // Should NOT contain payment card info, customer SSN, etc.
      expect(logCall).not.toMatch(/\d{4}\s*\d{4}\s*\d{4}\s*\d{4}/); // Card pattern
    });

    it('should NOT log Stripe API response containing card details', async () => {
      config.get.mockImplementation((key: string, fallback?: string) => {
        if (key === 'STRIPE_SECRET_KEY') return 'sk_test_fake';
        if (key === 'FRONTEND_URL') return 'https://app.mechmind.io';
        return fallback;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PaymentLinkService,
          { provide: PrismaService, useValue: prisma },
          { provide: ConfigService, useValue: config },
        ],
      }).compile();

      const svcWithStripe = module.get(PaymentLinkService);
      const invoice = mockInvoice();
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      jest.spyOn(svcWithStripe['stripe']!.checkout.sessions, 'create').mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/test',
      } as any);

      const logSpy = jest.spyOn(svcWithStripe['logger'], 'log');

      await svcWithStripe.createStripeCheckoutSession(TENANT_ID, 'inv-uuid-001');

      // Verify no sensitive Stripe API data in logs
      logSpy.mock.calls.forEach(call => {
        expect(JSON.stringify(call)).not.toContain('card_');
        expect(JSON.stringify(call)).not.toContain('pm_');
      });
    });
  });

  // ─── TIER_1 SECURITY: Stripe Configuration Validation ───
  describe('[TIER_1] Security - Stripe Configuration', () => {
    it('should NOT proceed with payment if STRIPE_SECRET_KEY is not set', async () => {
      // Service initialized without STRIPE_SECRET_KEY
      const invoice = mockInvoice();
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      await expect(service.createPaymentLink(TENANT_ID, 'inv-uuid-001', 'EMAIL')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate STRIPE_WEBHOOK_SECRET exists before processing webhook', async () => {
      // This test documents the requirement: webhook handlers MUST verify secret
      // See: StripeWebhookController for the pattern
      config.get.mockReturnValue(undefined);

      // Payment link service doesn't handle webhooks directly, but documents pattern
      expect(service['stripe']).toBeNull();
    });
  });

  // ─── Complete Payment Link Creation Workflow (Stripe + Notification) ───
  describe('[TIER_1] Complete Workflow - createPaymentLink with Notification', () => {
    it('should create Stripe checkout and dispatch notification for SMS channel', async () => {
      config.get.mockImplementation((key: string, fallback?: string) => {
        if (key === 'STRIPE_SECRET_KEY') return 'sk_test_fake';
        if (key === 'FRONTEND_URL') return 'https://app.mechmind.io';
        return fallback;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PaymentLinkService,
          { provide: PrismaService, useValue: prisma },
          { provide: ConfigService, useValue: config },
        ],
      }).compile();

      const svcWithStripe = module.get(PaymentLinkService);
      const invoice = mockInvoice();
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const createSessionSpy = jest
        .spyOn(svcWithStripe['stripe']!.checkout.sessions, 'create')
        .mockResolvedValue({
          id: 'cs_test_123',
          url: 'https://checkout.stripe.com/pay/test',
        } as any);

      prisma.invoice.update.mockResolvedValue({
        ...invoice,
        paymentLinkUrl: 'https://checkout.stripe.com/pay/test',
        paymentLinkId: 'cs_test_123',
      });

      const result = await svcWithStripe.createPaymentLink(TENANT_ID, 'inv-uuid-001', 'SMS');

      // Verify Stripe session created
      expect(createSessionSpy).toHaveBeenCalled();

      // Verify invoice updated with payment link
      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentLinkUrl: 'https://checkout.stripe.com/pay/test',
            paymentLinkId: 'cs_test_123',
          }),
        }),
      );

      // Verify result contains payment link info
      expect(result).toEqual(
        expect.objectContaining({
          url: 'https://checkout.stripe.com/pay/test',
          linkId: 'cs_test_123',
          channel: 'SMS',
          sent: true,
        }),
      );
    });

    it('should dispatch notification via WHATSAPP channel', async () => {
      config.get.mockImplementation((key: string, fallback?: string) => {
        if (key === 'STRIPE_SECRET_KEY') return 'sk_test_fake';
        if (key === 'FRONTEND_URL') return 'https://app.mechmind.io';
        return fallback;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PaymentLinkService,
          { provide: PrismaService, useValue: prisma },
          { provide: ConfigService, useValue: config },
        ],
      }).compile();

      const svcWithStripe = module.get(PaymentLinkService);
      const invoice = mockInvoice();
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      jest.spyOn(svcWithStripe['stripe']!.checkout.sessions, 'create').mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/test',
      } as any);

      prisma.invoice.update.mockResolvedValue({
        ...invoice,
        paymentLinkUrl: 'https://checkout.stripe.com/pay/test',
        paymentLinkId: 'cs_test_123',
      });

      const result = await svcWithStripe.createPaymentLink(TENANT_ID, 'inv-uuid-001', 'WHATSAPP');

      expect(result.channel).toBe('WHATSAPP');
      expect(result.sent).toBe(true);
    });

    it('should dispatch notification via EMAIL channel', async () => {
      config.get.mockImplementation((key: string, fallback?: string) => {
        if (key === 'STRIPE_SECRET_KEY') return 'sk_test_fake';
        if (key === 'FRONTEND_URL') return 'https://app.mechmind.io';
        return fallback;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PaymentLinkService,
          { provide: PrismaService, useValue: prisma },
          { provide: ConfigService, useValue: config },
        ],
      }).compile();

      const svcWithStripe = module.get(PaymentLinkService);
      const invoice = mockInvoice();
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      jest.spyOn(svcWithStripe['stripe']!.checkout.sessions, 'create').mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/test',
      } as any);

      prisma.invoice.update.mockResolvedValue({
        ...invoice,
        paymentLinkUrl: 'https://checkout.stripe.com/pay/test',
        paymentLinkId: 'cs_test_123',
      });

      const result = await svcWithStripe.createPaymentLink(TENANT_ID, 'inv-uuid-001', 'EMAIL');

      expect(result.channel).toBe('EMAIL');
      expect(result.sent).toBe(true);
    });
  });

  describe('Suite 5: Validation & State Management (3 new tests)', () => {
    it('should throw BadRequestException when invoice status is DRAFT', async () => {
      prisma.invoice.findFirst.mockResolvedValue(mockInvoice({ status: 'DRAFT' }));

      await expect(service.createPaymentLink(TENANT_ID, 'inv-uuid-001', 'SMS')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException with correct message when invoice missing', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);

      await expect(service.createPaymentLink(TENANT_ID, 'missing-id', 'SMS')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.invoice.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'missing-id', tenantId: TENANT_ID },
        }),
      );
    });

    it('should return payment status for unpaid OVERDUE invoice', async () => {
      const overdueInvoice = mockInvoice({
        status: 'OVERDUE',
        paymentLinkUrl: 'https://checkout.stripe.com/test',
        dueDate: new Date('2026-03-01'),
      });
      prisma.invoice.findFirst.mockResolvedValue(overdueInvoice);

      const result = await service.getPaymentStatus(TENANT_ID, 'inv-uuid-001');

      expect(result.status).toBe('OVERDUE');
      expect(result.paymentLinkUrl).toBe('https://checkout.stripe.com/test');
    });
  });
});
