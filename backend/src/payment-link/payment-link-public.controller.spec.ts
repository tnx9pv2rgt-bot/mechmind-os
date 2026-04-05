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
});
