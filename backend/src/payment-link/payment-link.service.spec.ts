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
});
