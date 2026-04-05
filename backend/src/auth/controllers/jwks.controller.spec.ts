import { Test, TestingModule } from '@nestjs/testing';
import { JwksController } from './jwks.controller';
import { JwksService } from '../services/jwks.service';

describe('JwksController', () => {
  let controller: JwksController;
  let jwksService: jest.Mocked<JwksService>;

  const mockJwks = {
    keys: [
      {
        kty: 'EC',
        crv: 'P-256',
        x: 'abc',
        y: 'def',
        kid: 'key-001',
        use: 'sig',
        alg: 'ES256',
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JwksController],
      providers: [
        {
          provide: JwksService,
          useValue: {
            getJwks: jest.fn(),
            rotateKeys: jest.fn(),
            isAsymmetricEnabled: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<JwksController>(JwksController);
    jwksService = module.get(JwksService) as jest.Mocked<JwksService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getJwks', () => {
    it('should return JWKS from service', () => {
      jwksService.getJwks.mockReturnValue(mockJwks as never);

      const result = controller.getJwks();

      expect(jwksService.getJwks).toHaveBeenCalled();
      expect(result).toEqual(mockJwks);
    });
  });

  describe('rotateKeys', () => {
    it('should rotate keys when user is ADMIN', () => {
      const user = { id: 'user-001', role: 'ADMIN', tenantId: 'tenant-001' };

      const result = controller.rotateKeys(user as never);

      expect(jwksService.rotateKeys).toHaveBeenCalled();
      expect(result).toEqual({ success: true, message: 'Chiavi ruotate con successo' });
    });

    it('should rotate keys when user is SUPER_ADMIN', () => {
      const user = { id: 'user-001', role: 'SUPER_ADMIN', tenantId: 'tenant-001' };

      const result = controller.rotateKeys(user as never);

      expect(jwksService.rotateKeys).toHaveBeenCalled();
      expect(result).toEqual({ success: true, message: 'Chiavi ruotate con successo' });
    });

    it('should reject non-admin users', () => {
      const user = { id: 'user-001', role: 'MECHANIC', tenantId: 'tenant-001' };

      const result = controller.rotateKeys(user as never);

      expect(jwksService.rotateKeys).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: 'Solo gli admin possono ruotare le chiavi',
      });
    });
  });

  describe('getKeyInfo', () => {
    it('should return key info with asymmetric enabled', () => {
      jwksService.getJwks.mockReturnValue(mockJwks as never);
      jwksService.isAsymmetricEnabled.mockReturnValue(true);

      const result = controller.getKeyInfo();

      expect(result).toEqual({
        algorithm: 'ES256',
        asymmetricEnabled: true,
        keyCount: 1,
      });
    });

    it('should return key info with symmetric fallback', () => {
      jwksService.getJwks.mockReturnValue({ keys: [] } as never);
      jwksService.isAsymmetricEnabled.mockReturnValue(false);

      const result = controller.getKeyInfo();

      expect(result).toEqual({
        algorithm: 'HS256',
        asymmetricEnabled: false,
        keyCount: 0,
      });
    });
  });
});
