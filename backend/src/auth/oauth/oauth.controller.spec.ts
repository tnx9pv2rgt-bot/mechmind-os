import { Test, TestingModule } from '@nestjs/testing';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';

// Mock jose ESM module before it gets imported by OAuthService
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn(),
}));

describe('OAuthController', () => {
  let controller: OAuthController;
  let service: jest.Mocked<OAuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OAuthController],
      providers: [
        {
          provide: OAuthService,
          useValue: {
            loginWithGoogle: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<OAuthController>(OAuthController);
    service = module.get(OAuthService) as jest.Mocked<OAuthService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('loginWithGoogle', () => {
    it('should delegate to oauthService.loginWithGoogle with correct args', async () => {
      const tokens = { accessToken: 'at', refreshToken: 'rt', expiresIn: 3600 };
      service.loginWithGoogle.mockResolvedValue(tokens);

      const dto = { credential: 'google-id-token-abc', tenantSlug: 'acme' };
      const result = await controller.loginWithGoogle(dto as never, '192.168.1.1');

      expect(service.loginWithGoogle).toHaveBeenCalledWith(
        'google-id-token-abc',
        'acme',
        '192.168.1.1',
      );
      expect(result).toEqual(tokens);
    });

    it('should return AuthTokens shape', async () => {
      const tokens = { accessToken: 'access-123', refreshToken: 'refresh-456', expiresIn: 7200 };
      service.loginWithGoogle.mockResolvedValue(tokens);

      const dto = { credential: 'cred', tenantSlug: 'shop' };
      const result = await controller.loginWithGoogle(dto as never, '10.0.0.1');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');
    });

    it('should handle loginWithGoogle with undefined tenantSlug', async () => {
      const tokens = { accessToken: 'at', refreshToken: 'rt', expiresIn: 3600 };
      service.loginWithGoogle.mockResolvedValue(tokens);

      const dto = { credential: 'cred', tenantSlug: undefined };
      const result = await controller.loginWithGoogle(dto as never, '192.168.1.1');

      expect(service.loginWithGoogle).toHaveBeenCalledWith('cred', undefined, '192.168.1.1');
      expect(result).toEqual(tokens);
    });

    it('should handle errors from oauthService', async () => {
      service.loginWithGoogle.mockRejectedValue(new Error('Invalid token'));

      const dto = { credential: 'invalid-token', tenantSlug: 'acme' };

      await expect(controller.loginWithGoogle(dto as never, '192.168.1.1')).rejects.toThrow(
        'Invalid token',
      );
    });

    it('should pass ip from request context', async () => {
      const tokens = { accessToken: 'at', refreshToken: 'rt', expiresIn: 3600 };
      service.loginWithGoogle.mockResolvedValue(tokens);

      const dto = { credential: 'token', tenantSlug: 'test' };
      const ipAddresses = ['127.0.0.1', '192.168.0.1', '::1', '2001:db8::1'];

      for (const ip of ipAddresses) {
        await controller.loginWithGoogle(dto as never, ip);
        expect(service.loginWithGoogle).toHaveBeenCalledWith('token', 'test', ip);
      }
    });
  });
});
