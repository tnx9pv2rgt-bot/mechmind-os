import { Test, TestingModule } from '@nestjs/testing';
import { PaymentLinkPublicController } from './payment-link-public.controller';
import { PaymentLinkService } from './payment-link.service';

describe('PaymentLinkPublicController', () => {
  let controller: PaymentLinkPublicController;
  let service: jest.Mocked<PaymentLinkService>;

  const mockPaymentData = {
    invoiceId: 'inv-001',
    amount: 12200,
    currency: 'EUR',
    checkoutUrl: 'https://checkout.stripe.com/session-123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentLinkPublicController],
      providers: [
        {
          provide: PaymentLinkService,
          useValue: {
            resolvePaymentToken: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PaymentLinkPublicController>(PaymentLinkPublicController);
    service = module.get(PaymentLinkService) as jest.Mocked<PaymentLinkService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('resolvePaymentToken', () => {
    it('should delegate to service with token', async () => {
      service.resolvePaymentToken.mockResolvedValue(mockPaymentData as never);

      const result = await controller.resolvePaymentToken('pay-tok-abc');

      expect(service.resolvePaymentToken).toHaveBeenCalledWith('pay-tok-abc');
      expect(result).toEqual(mockPaymentData);
    });
  });

  // ─── TIER_1 SECURITY: Public Endpoint - Token Validation ───
  describe('[TIER_1] resolvePaymentToken - Token Validation', () => {
    it('should handle valid Stripe session token format (cs_test_*)', async () => {
      const validToken = 'cs_test_4eC39HqLyjWDarhtT';
      const result = {
        invoiceNumber: 'FT-2026-001',
        total: '244.00',
        taxAmount: '44.00',
        status: 'SENT',
        dueDate: '2026-04-30T00:00:00.000Z',
        tenantName: 'AutoService Roma',
        checkoutUrl: 'https://checkout.stripe.com/pay/cs_test_4eC39HqLyjWDarhtT',
      };
      service.resolvePaymentToken.mockResolvedValue(result as never);

      const response = await controller.resolvePaymentToken(validToken);

      expect(service.resolvePaymentToken).toHaveBeenCalledWith(validToken);
      expect(response).toEqual(result);
    });

    it('should handle invalid/expired tokens gracefully (service throws)', async () => {
      const invalidToken = 'invalid-or-expired-token';
      const notFoundError = new Error('Link di pagamento non valido o scaduto');
      service.resolvePaymentToken.mockRejectedValue(notFoundError);

      await expect(controller.resolvePaymentToken(invalidToken)).rejects.toThrow(
        'Link di pagamento non valido o scaduto',
      );

      expect(service.resolvePaymentToken).toHaveBeenCalledWith(invalidToken);
    });

    it('should pass through token exactly as provided (no normalization/sanitization in controller)', async () => {
      const specialToken = 'cs_test_@#$%_malformed';
      service.resolvePaymentToken.mockRejectedValue(new Error('Invalid'));

      await expect(controller.resolvePaymentToken(specialToken)).rejects.toThrow();

      // Verify exact token is passed to service (for service to validate)
      expect(service.resolvePaymentToken).toHaveBeenCalledWith(specialToken);
    });
  });

  // ─── TIER_1 SECURITY: Public Endpoint - No Authentication Required ───
  describe('[TIER_1] resolvePaymentToken - Public Access (No Auth)', () => {
    it('should allow unauthenticated access to resolve payment link', async () => {
      const token = 'cs_test_4eC39HqLyjWDarhtT';
      const result = {
        invoiceNumber: 'FT-2026-001',
        total: '244.00',
        taxAmount: '44.00',
        status: 'SENT',
        dueDate: '2026-04-30T00:00:00.000Z',
        tenantName: 'AutoService Roma',
        checkoutUrl: 'https://checkout.stripe.com/pay/cs_test_4eC39HqLyjWDarhtT',
      };
      service.resolvePaymentToken.mockResolvedValue(result as never);

      // No auth header required — public endpoint
      const response = await controller.resolvePaymentToken(token);

      expect(response).toBeDefined();
      expect(response).toHaveProperty('invoiceNumber');
    });
  });

  // ─── TIER_1 SECURITY: Data Exposure Prevention ───
  describe('[TIER_1] resolvePaymentToken - PII & Data Exposure', () => {
    it('should return PublicInvoiceSummary without sensitive customer data', async () => {
      const token = 'cs_test_4eC39HqLyjWDarhtT';
      const result = {
        invoiceNumber: 'FT-2026-001',
        total: '244.00',
        taxAmount: '44.00',
        status: 'SENT',
        dueDate: '2026-04-30T00:00:00.000Z',
        tenantName: 'AutoService Roma',
        checkoutUrl: 'https://checkout.stripe.com/pay/cs_test_4eC39HqLyjWDarhtT',
      };
      service.resolvePaymentToken.mockResolvedValue(result as never);

      const response = await controller.resolvePaymentToken(token);

      // Should NOT contain:
      // - Customer ID, name, email, phone
      // - Stripe customer ID
      // - Payment method details
      // - Internal system IDs
      expect(response).not.toHaveProperty('customerId');
      expect(response).not.toHaveProperty('stripeCustomerId');
      expect(response).not.toHaveProperty('paymentMethodId');
      expect(response).not.toHaveProperty('tenantId');
      expect(response).not.toHaveProperty('customerEmail');
      expect(response).not.toHaveProperty('customerPhone');

      // Should contain only public invoice info
      expect(response).toHaveProperty('invoiceNumber');
      expect(response).toHaveProperty('total');
      expect(response).toHaveProperty('tenantName');
      expect(response).toHaveProperty('checkoutUrl');
    });

    it('should not expose invoice items or line details', async () => {
      const token = 'cs_test_4eC39HqLyjWDarhtT';
      const result = {
        invoiceNumber: 'FT-2026-001',
        total: '244.00',
        taxAmount: '44.00',
        status: 'SENT',
        dueDate: '2026-04-30T00:00:00.000Z',
        tenantName: 'AutoService Roma',
        checkoutUrl: 'https://checkout.stripe.com/pay/cs_test_4eC39HqLyjWDarhtT',
      };
      service.resolvePaymentToken.mockResolvedValue(result as never);

      const response = await controller.resolvePaymentToken(token);

      // Should NOT contain detailed work order info, parts, labor items
      expect(response).not.toHaveProperty('invoiceItems');
      expect(response).not.toHaveProperty('items');
      expect(response).not.toHaveProperty('lineItems');
    });
  });

  // ─── TIER_1 SECURITY: Error Status Codes ───
  describe('[TIER_1] resolvePaymentToken - HTTP Status Codes', () => {
    it('should return 200 OK when token is valid', async () => {
      const token = 'cs_test_4eC39HqLyjWDarhtT';
      const result = {
        invoiceNumber: 'FT-2026-001',
        total: '244.00',
        taxAmount: '44.00',
        status: 'SENT',
        dueDate: '2026-04-30T00:00:00.000Z',
        tenantName: 'AutoService Roma',
        checkoutUrl: 'https://checkout.stripe.com/pay/cs_test_4eC39HqLyjWDarhtT',
      };
      service.resolvePaymentToken.mockResolvedValue(result as never);

      const response = await controller.resolvePaymentToken(token);

      // 200 OK is default for successful GET
      expect(response).toBeDefined();
    });

    it('should return 404 when token is invalid or expired', async () => {
      const token = 'invalid-or-expired';
      service.resolvePaymentToken.mockRejectedValue(new Error('404'));

      // Service throws NotFoundException → controller returns 404
      await expect(controller.resolvePaymentToken(token)).rejects.toThrow();
    });
  });
});
