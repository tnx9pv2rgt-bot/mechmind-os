import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentLinkService } from './payment-link.service';
import { PrismaService } from '../../common/services/prisma.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { Decimal } from '@prisma/client/runtime/library';

// Mock Stripe
const mockCheckoutSessionsCreate = jest.fn();
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: mockCheckoutSessionsCreate,
      },
    },
  }));
});

const TENANT_ID = 'tenant-001';
const INVOICE_ID = 'invoice-001';
const MOCK_SESSION_URL = 'https://checkout.stripe.com/pay/cs_test_abc123';
const MOCK_SESSION_ID = 'cs_test_abc123';

function makeMockInvoice(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: INVOICE_ID,
    tenantId: TENANT_ID,
    customerId: 'customer-001',
    invoiceNumber: 'INV-2026-0001',
    status: 'SENT',
    total: new Decimal('183.00'),
    paymentLinkUrl: null,
    paymentLinkId: null,
    customer: {
      id: 'customer-001',
      encryptedFirstName: 'enc_Mario',
      encryptedLastName: 'enc_Rossi',
    },
    invoiceItems: [],
    ...overrides,
  };
}

describe('PaymentLinkService', () => {
  let service: PaymentLinkService;
  let prisma: { invoice: { findFirst: jest.Mock; findUnique: jest.Mock; update: jest.Mock } };
  let encryption: { decrypt: jest.Mock };

  beforeEach(async () => {
    prisma = {
      invoice: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    encryption = { decrypt: jest.fn().mockReturnValue('Mario') };

    mockCheckoutSessionsCreate.mockReset();
    mockCheckoutSessionsCreate.mockResolvedValue({
      id: MOCK_SESSION_ID,
      url: MOCK_SESSION_URL,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentLinkService,
        { provide: PrismaService, useValue: prisma },
        { provide: EncryptionService, useValue: encryption },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, defaultVal?: string) => {
              if (key === 'STRIPE_SECRET_KEY') return 'sk_test_fake';
              if (key === 'FRONTEND_URL') return defaultVal ?? 'https://app.mechmind.io';
              return defaultVal ?? '';
            }),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentLinkService>(PaymentLinkService);
  });

  describe('createPaymentLink', () => {
    it('should create Stripe checkout session for valid invoice', async () => {
      const invoice = makeMockInvoice();
      prisma.invoice.findFirst.mockResolvedValue(invoice);
      prisma.invoice.update.mockResolvedValue({ ...invoice, paymentLinkUrl: MOCK_SESSION_URL });

      const result = await service.createPaymentLink(INVOICE_ID, TENANT_ID);

      expect(result.url).toBe(MOCK_SESSION_URL);
      expect(result.linkId).toBe(MOCK_SESSION_ID);
      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_method_types: ['card'],
          mode: 'payment',
          line_items: [
            expect.objectContaining({
              price_data: expect.objectContaining({
                currency: 'eur',
                unit_amount: 18300,
                product_data: { name: 'Fattura INV-2026-0001' },
              }),
              quantity: 1,
            }),
          ],
          metadata: { invoiceId: INVOICE_ID, tenantId: TENANT_ID },
        }),
      );
      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: INVOICE_ID },
          data: expect.objectContaining({
            paymentLinkUrl: MOCK_SESSION_URL,
            paymentLinkId: MOCK_SESSION_ID,
          }),
        }),
      );
    });

    it('should throw NotFoundException if invoice not found', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);
      await expect(service.createPaymentLink(INVOICE_ID, TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if invoice already paid', async () => {
      prisma.invoice.findFirst.mockResolvedValue(makeMockInvoice({ status: 'PAID' }));
      await expect(service.createPaymentLink(INVOICE_ID, TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if invoice cancelled', async () => {
      prisma.invoice.findFirst.mockResolvedValue(makeMockInvoice({ status: 'CANCELLED' }));
      await expect(service.createPaymentLink(INVOICE_ID, TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('sendPaymentSms', () => {
    it('should send SMS with existing payment link', async () => {
      const invoice = makeMockInvoice({ paymentLinkUrl: 'https://existing-link.io' });
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.sendPaymentSms(INVOICE_ID, TENANT_ID);

      expect(result.sent).toBe(true);
      expect(result.paymentUrl).toBe('https://existing-link.io');
    });

    it('should create payment link via Stripe if none exists', async () => {
      const invoice = makeMockInvoice({ paymentLinkUrl: null });
      prisma.invoice.findFirst.mockResolvedValue(invoice);
      prisma.invoice.update.mockResolvedValue(invoice);

      const result = await service.sendPaymentSms(INVOICE_ID, TENANT_ID);

      expect(result.sent).toBe(true);
      expect(result.paymentUrl).toBe(MOCK_SESSION_URL);
      expect(mockCheckoutSessionsCreate).toHaveBeenCalled();
    });

    it('should throw if invoice already paid', async () => {
      prisma.invoice.findFirst.mockResolvedValue(makeMockInvoice({ status: 'PAID' }));
      await expect(service.sendPaymentSms(INVOICE_ID, TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('handlePaymentWebhook', () => {
    const STRIPE_EVENT_ID = 'evt_test_abc123';

    it('should mark invoice as PAID and store stripeEventId', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null); // no prior event
      prisma.invoice.findUnique.mockResolvedValue(makeMockInvoice());
      prisma.invoice.update.mockResolvedValue({});

      await service.handlePaymentWebhook(INVOICE_ID, 'cs_test123', STRIPE_EVENT_ID);

      expect(prisma.invoice.findFirst).toHaveBeenCalledWith({
        where: { stripeEventId: STRIPE_EVENT_ID },
      });
      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: INVOICE_ID },
          data: expect.objectContaining({
            status: 'PAID',
            paidAt: expect.any(Date),
            paymentMethod: 'CARTA',
            stripeEventId: STRIPE_EVENT_ID,
          }),
        }),
      );
    });

    it('should skip if Stripe event already processed (idempotency)', async () => {
      // Simulate a previously processed event found by stripeEventId
      prisma.invoice.findFirst.mockResolvedValue(makeMockInvoice({ status: 'PAID' }));

      await service.handlePaymentWebhook(INVOICE_ID, 'cs_test123', STRIPE_EVENT_ID);

      expect(prisma.invoice.findUnique).not.toHaveBeenCalled();
      expect(prisma.invoice.update).not.toHaveBeenCalled();
    });

    it('should skip if invoice not found', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null); // no prior event
      prisma.invoice.findUnique.mockResolvedValue(null);
      await service.handlePaymentWebhook(INVOICE_ID, 'cs_test123', STRIPE_EVENT_ID);
      expect(prisma.invoice.update).not.toHaveBeenCalled();
    });

    it('should skip if invoice already paid', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null); // no prior event
      prisma.invoice.findUnique.mockResolvedValue(makeMockInvoice({ status: 'PAID' }));
      await service.handlePaymentWebhook(INVOICE_ID, 'cs_test123', STRIPE_EVENT_ID);
      expect(prisma.invoice.update).not.toHaveBeenCalled();
    });
  });
});
