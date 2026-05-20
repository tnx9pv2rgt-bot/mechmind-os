import { validate } from 'class-validator';
import { PaymentLinkChannel, SendPaymentLinkDto } from './send-payment-link.dto';

describe('SendPaymentLinkDto', () => {
  it('should be defined', () => {
    expect(SendPaymentLinkDto).toBeDefined();
  });

  describe('PaymentLinkChannel Enum', () => {
    it('should have SMS channel', () => {
      expect(PaymentLinkChannel.SMS).toBe('SMS');
    });

    it('should have WHATSAPP channel', () => {
      expect(PaymentLinkChannel.WHATSAPP).toBe('WHATSAPP');
    });

    it('should have EMAIL channel', () => {
      expect(PaymentLinkChannel.EMAIL).toBe('EMAIL');
    });
  });

  describe('SendPaymentLinkDto validation', () => {
    it('should accept valid DTO with SMS channel', async () => {
      const dto = new SendPaymentLinkDto();
      dto.channel = PaymentLinkChannel.SMS;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept valid DTO with WHATSAPP channel', async () => {
      const dto = new SendPaymentLinkDto();
      dto.channel = PaymentLinkChannel.WHATSAPP;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept valid DTO with EMAIL channel', async () => {
      const dto = new SendPaymentLinkDto();
      dto.channel = PaymentLinkChannel.EMAIL;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept DTO with phoneOverride', async () => {
      const dto = new SendPaymentLinkDto();
      dto.channel = PaymentLinkChannel.SMS;
      dto.phoneOverride = '+393331234567';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept DTO with emailOverride', async () => {
      const dto = new SendPaymentLinkDto();
      dto.channel = PaymentLinkChannel.EMAIL;
      dto.emailOverride = 'override@example.com';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept DTO with both phoneOverride and emailOverride', async () => {
      const dto = new SendPaymentLinkDto();
      dto.channel = PaymentLinkChannel.SMS;
      dto.phoneOverride = '+393331234567';
      dto.emailOverride = 'override@example.com';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid channel', async () => {
      const dto = new SendPaymentLinkDto();
      dto.channel = 'INVALID' as PaymentLinkChannel;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('channel');
    });

    it('should reject non-string phoneOverride', async () => {
      const dto = new SendPaymentLinkDto();
      dto.channel = PaymentLinkChannel.SMS;
      (dto as any).phoneOverride = 12345;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject non-string emailOverride', async () => {
      const dto = new SendPaymentLinkDto();
      dto.channel = PaymentLinkChannel.EMAIL;
      (dto as any).emailOverride = {};

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
