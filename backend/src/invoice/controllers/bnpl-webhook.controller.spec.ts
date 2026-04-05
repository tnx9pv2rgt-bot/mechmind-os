import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BnplWebhookController } from './bnpl-webhook.controller';
import { BnplService } from '../services/bnpl.service';
import * as crypto from 'crypto';

describe('BnplWebhookController', () => {
  let controller: BnplWebhookController;
  let bnplService: { handleBnplWebhook: jest.Mock };
  let configService: { get: jest.Mock };

  const WEBHOOK_SECRET = 'test-webhook-secret-key';

  function createValidPayload(
    orderId: string,
    status: string,
  ): { rawBody: Buffer; signature: string } {
    const body = JSON.stringify({ orderId, status });
    const rawBody = Buffer.from(body);
    const signature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('base64');
    return { rawBody, signature };
  }

  beforeEach(async () => {
    bnplService = { handleBnplWebhook: jest.fn().mockResolvedValue(undefined) };
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'SCALAPAY_WEBHOOK_SECRET') return WEBHOOK_SECRET;
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BnplWebhookController],
      providers: [
        { provide: BnplService, useValue: bnplService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    controller = module.get<BnplWebhookController>(BnplWebhookController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // =========================================================================
  // Missing webhook secret
  // =========================================================================
  describe('when SCALAPAY_WEBHOOK_SECRET is not configured', () => {
    it('should throw InternalServerErrorException', async () => {
      configService.get.mockReturnValue(undefined);

      const req = { rawBody: Buffer.from('{}') } as never;

      await expect(controller.handleWebhook(req, 'some-sig')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // =========================================================================
  // Missing raw body
  // =========================================================================
  describe('when raw body is missing', () => {
    it('should throw BadRequestException', async () => {
      const req = { rawBody: undefined } as never;

      await expect(controller.handleWebhook(req, 'some-sig')).rejects.toThrow(BadRequestException);
      await expect(controller.handleWebhook(req, 'some-sig')).rejects.toThrow(
        'Raw body non disponibile',
      );
    });
  });

  // =========================================================================
  // Missing HMAC header
  // =========================================================================
  describe('when HMAC signature header is missing', () => {
    it('should throw BadRequestException', async () => {
      const req = { rawBody: Buffer.from('{}') } as never;

      await expect(controller.handleWebhook(req, '')).rejects.toThrow(BadRequestException);
      await expect(controller.handleWebhook(req, '')).rejects.toThrow(
        'Missing x-scalapay-hmac-sha256 header',
      );
    });

    it('should throw for undefined signature', async () => {
      const req = { rawBody: Buffer.from('{}') } as never;

      await expect(controller.handleWebhook(req, undefined as unknown as string)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // =========================================================================
  // Invalid HMAC signature
  // =========================================================================
  describe('when HMAC signature is invalid', () => {
    it('should throw BadRequestException', async () => {
      const req = { rawBody: Buffer.from('{"orderId":"ord-1","status":"APPROVED"}') } as never;

      await expect(controller.handleWebhook(req, 'invalid-signature')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw when signature has wrong length (timingSafeEqual throws)', async () => {
      const req = { rawBody: Buffer.from('{"orderId":"ord-1","status":"APPROVED"}') } as never;

      // A signature that's a valid base64 but wrong content
      await expect(controller.handleWebhook(req, 'AAAA')).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // Valid webhook — APPROVED
  // =========================================================================
  describe('when webhook is valid', () => {
    it('should process APPROVED webhook', async () => {
      const { rawBody, signature } = createValidPayload('order-001', 'APPROVED');
      const req = { rawBody } as never;

      const result = await controller.handleWebhook(req, signature);

      expect(result).toEqual({ received: true });
      expect(bnplService.handleBnplWebhook).toHaveBeenCalledWith('order-001', 'APPROVED');
    });

    it('should process DECLINED webhook', async () => {
      const { rawBody, signature } = createValidPayload('order-002', 'DECLINED');
      const req = { rawBody } as never;

      const result = await controller.handleWebhook(req, signature);

      expect(result).toEqual({ received: true });
      expect(bnplService.handleBnplWebhook).toHaveBeenCalledWith('order-002', 'DECLINED');
    });

    it('should process COMPLETED webhook', async () => {
      const { rawBody, signature } = createValidPayload('order-003', 'COMPLETED');
      const req = { rawBody } as never;

      const result = await controller.handleWebhook(req, signature);

      expect(result).toEqual({ received: true });
      expect(bnplService.handleBnplWebhook).toHaveBeenCalledWith('order-003', 'COMPLETED');
    });
  });
});
