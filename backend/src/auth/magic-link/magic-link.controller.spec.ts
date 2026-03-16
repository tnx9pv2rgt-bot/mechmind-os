import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MagicLinkController } from './magic-link.controller';
import { MagicLinkService, MagicLinkError } from './magic-link.service';
import { Request } from 'express';

describe('MagicLinkController', () => {
  let controller: MagicLinkController;
  let service: jest.Mocked<MagicLinkService>;

  const mockRequest = {
    headers: { 'user-agent': 'Mozilla/5.0 Test' },
  } as unknown as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MagicLinkController],
      providers: [
        {
          provide: MagicLinkService,
          useValue: {
            sendMagicLink: jest.fn(),
            verifyMagicLink: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MagicLinkController>(MagicLinkController);
    service = module.get(MagicLinkService) as jest.Mocked<MagicLinkService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('send', () => {
    it('should delegate to magicLinkService.sendMagicLink with correct args', async () => {
      service.sendMagicLink.mockResolvedValue({ sent: true });

      const dto = { email: 'user@example.com', tenantSlug: 'acme' };
      const result = await controller.send(dto as never, '127.0.0.1', mockRequest);

      expect(service.sendMagicLink).toHaveBeenCalledWith(
        'user@example.com',
        'acme',
        '127.0.0.1',
        'Mozilla/5.0 Test',
      );
      expect(result).toEqual({ sent: true });
    });
  });

  describe('verify', () => {
    it('should delegate to magicLinkService.verifyMagicLink with correct args', async () => {
      const tokens = { accessToken: 'at', refreshToken: 'rt', expiresIn: 3600 };
      service.verifyMagicLink.mockResolvedValue(tokens);

      const dto = { token: 'magic-token-123' };
      const result = await controller.verify(dto as never, '127.0.0.1');

      expect(service.verifyMagicLink).toHaveBeenCalledWith('magic-token-123', '127.0.0.1');
      expect(result).toEqual(tokens);
    });

    it('should throw BadRequestException when MagicLinkError is thrown', async () => {
      service.verifyMagicLink.mockRejectedValue(new MagicLinkError('Token expired'));

      const dto = { token: 'expired-token' };

      await expect(controller.verify(dto as never, '127.0.0.1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.verify(dto as never, '127.0.0.1')).rejects.toThrow('Token expired');
    });

    it('should re-throw non-MagicLinkError errors', async () => {
      const genericError = new Error('Unexpected error');
      service.verifyMagicLink.mockRejectedValue(genericError);

      const dto = { token: 'some-token' };

      await expect(controller.verify(dto as never, '127.0.0.1')).rejects.toThrow(genericError);
    });
  });
});
