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
});
