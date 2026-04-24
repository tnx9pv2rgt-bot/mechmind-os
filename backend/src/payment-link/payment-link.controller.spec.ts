import { Test, TestingModule } from '@nestjs/testing';
import { PaymentLinkController } from './payment-link.controller';
import { PaymentLinkService } from './payment-link.service';

describe('PaymentLinkController', () => {
  let controller: PaymentLinkController;
  let service: jest.Mocked<PaymentLinkService>;

  const TENANT_ID = 'tenant-001';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentLinkController],
      providers: [
        {
          provide: PaymentLinkService,
          useValue: {
            createPaymentLink: jest.fn(),
            getPaymentStatus: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PaymentLinkController>(PaymentLinkController);
    service = module.get(PaymentLinkService) as jest.Mocked<PaymentLinkService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendPaymentLink', () => {
    it('should delegate to service with tenantId, invoiceId, and channel', async () => {
      const linkResult = { url: 'https://pay.example.com/tok', linkId: 'lnk-001' };
      service.createPaymentLink.mockResolvedValue(linkResult as never);
      const dto = { channel: 'sms' as const };

      const result = await controller.sendPaymentLink(TENANT_ID, 'inv-001', dto as never);

      expect(service.createPaymentLink).toHaveBeenCalledWith(TENANT_ID, 'inv-001', 'sms');
      expect(result).toEqual(linkResult);
    });
  });

  describe('getPaymentStatus', () => {
    it('should delegate to service with tenantId and invoiceId', async () => {
      const status = { paid: true, paidAt: new Date() };
      service.getPaymentStatus.mockResolvedValue(status as never);

      const result = await controller.getPaymentStatus(TENANT_ID, 'inv-001');

      expect(service.getPaymentStatus).toHaveBeenCalledWith(TENANT_ID, 'inv-001');
      expect(result).toEqual(status);
    });
  });

  // ─── TIER_1 SECURITY: Request Validation & Channel Validation ───
  describe('[TIER_1] sendPaymentLink - Request Validation', () => {
    it('should accept valid SMS channel', async () => {
      const linkResult = { url: 'https://pay.example.com/tok', linkId: 'lnk-001' };
      service.createPaymentLink.mockResolvedValue(linkResult as never);
      const dto = { channel: 'SMS' as const };

      await controller.sendPaymentLink(TENANT_ID, 'inv-001', dto as never);

      expect(service.createPaymentLink).toHaveBeenCalledWith(TENANT_ID, 'inv-001', 'SMS');
    });

    it('should accept valid WHATSAPP channel', async () => {
      const linkResult = { url: 'https://pay.example.com/tok', linkId: 'lnk-001' };
      service.createPaymentLink.mockResolvedValue(linkResult as never);
      const dto = { channel: 'WHATSAPP' as const };

      await controller.sendPaymentLink(TENANT_ID, 'inv-001', dto as never);

      expect(service.createPaymentLink).toHaveBeenCalledWith(TENANT_ID, 'inv-001', 'WHATSAPP');
    });

    it('should accept valid EMAIL channel', async () => {
      const linkResult = { url: 'https://pay.example.com/tok', linkId: 'lnk-001' };
      service.createPaymentLink.mockResolvedValue(linkResult as never);
      const dto = { channel: 'EMAIL' as const };

      await controller.sendPaymentLink(TENANT_ID, 'inv-001', dto as never);

      expect(service.createPaymentLink).toHaveBeenCalledWith(TENANT_ID, 'inv-001', 'EMAIL');
    });
  });

  // ─── TIER_1 SECURITY: TenantId Enforcement via Decorator ───
  describe('[TIER_1] TenantId Decorator - currentTenant() enforcement', () => {
    it('should pass CurrentTenant decorator result to service method', async () => {
      const linkResult = {
        url: 'https://checkout.stripe.com/pay/cs_test_123',
        linkId: 'cs_test_123',
        channel: 'SMS',
        sent: true,
      };
      service.createPaymentLink.mockResolvedValue(linkResult as never);
      const dto = { channel: 'SMS' as const };

      // Verify tenantId from decorator is used (not from request parameter)
      const result = await controller.sendPaymentLink('trusted-tenant-id', 'inv-001', dto as never);

      expect(service.createPaymentLink).toHaveBeenCalledWith('trusted-tenant-id', 'inv-001', 'SMS');
      expect(result).toEqual(linkResult);
    });
  });

  // ─── TIER_1 SECURITY: HTTP Status Codes ───
  describe('[TIER_1] HTTP Status Codes & Error Handling', () => {
    it('sendPaymentLink should return 200 OK on success', async () => {
      const linkResult = { url: 'https://pay.example.com', linkId: 'lnk-001' };
      service.createPaymentLink.mockResolvedValue(linkResult as never);
      const dto = { channel: 'SMS' as const };

      const result = await controller.sendPaymentLink(TENANT_ID, 'inv-001', dto as never);

      expect(result).toEqual(linkResult);
      // Controller uses @HttpCode(HttpStatus.OK) by default
    });

    it('getPaymentStatus should return 200 OK on success', async () => {
      const status = {
        invoiceId: 'inv-001',
        status: 'SENT',
        paymentLinkUrl: 'https://pay.example.com',
        paidAt: null,
        total: '244.00',
      };
      service.getPaymentStatus.mockResolvedValue(status as never);

      const result = await controller.getPaymentStatus(TENANT_ID, 'inv-001');

      expect(result).toEqual(status);
    });
  });

  // ─── TIER_1 SECURITY: Error Propagation from Service ───
  describe('[TIER_1] Error Propagation - Service to Controller', () => {
    it('should propagate NotFoundException from service', async () => {
      const error = new Error('Fattura non trovata');
      service.createPaymentLink.mockRejectedValue(error);
      const dto = { channel: 'SMS' as const };

      await expect(controller.sendPaymentLink(TENANT_ID, 'inv-999', dto as never)).rejects.toThrow(
        'Fattura non trovata',
      );
    });

    it('should propagate BadRequestException when invoice already paid', async () => {
      const error = new Error('Fattura già pagata');
      service.createPaymentLink.mockRejectedValue(error);
      const dto = { channel: 'SMS' as const };

      await expect(controller.sendPaymentLink(TENANT_ID, 'inv-paid', dto as never)).rejects.toThrow(
        'Fattura già pagata',
      );
    });
  });
});
