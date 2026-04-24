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

    it('should return correct algorithm when asymmetric is true', () => {
      const keys = [
        { kty: 'EC', crv: 'P-256', x: 'a', y: 'b', kid: '1', use: 'sig', alg: 'ES256' },
        { kty: 'EC', crv: 'P-256', x: 'c', y: 'd', kid: '2', use: 'sig', alg: 'ES256' },
      ];
      jwksService.getJwks.mockReturnValue({ keys } as never);
      jwksService.isAsymmetricEnabled.mockReturnValue(true);

      const result = controller.getKeyInfo();

      expect(result.algorithm).toBe('ES256');
      expect(result.asymmetricEnabled).toBe(true);
      expect(result.keyCount).toBe(2);
    });

    it('should return correct algorithm when asymmetric is false', () => {
      jwksService.getJwks.mockReturnValue({ keys: [] } as never);
      jwksService.isAsymmetricEnabled.mockReturnValue(false);

      const result = controller.getKeyInfo();

      expect(result.algorithm).toBe('HS256');
      expect(result.asymmetricEnabled).toBe(false);
      expect(result.keyCount).toBe(0);
    });

    it('should count keys correctly in JWKS response', () => {
      const keys = [
        { kty: 'EC', crv: 'P-256', x: 'a', y: 'b', kid: '1', use: 'sig', alg: 'ES256' },
        { kty: 'EC', crv: 'P-256', x: 'c', y: 'd', kid: '2', use: 'sig', alg: 'ES256' },
        { kty: 'EC', crv: 'P-256', x: 'e', y: 'f', kid: '3', use: 'sig', alg: 'ES256' },
      ];
      jwksService.getJwks.mockReturnValue({ keys } as never);
      jwksService.isAsymmetricEnabled.mockReturnValue(true);

      const result = controller.getKeyInfo();

      expect(result.keyCount).toBe(3);
    });
  });

  describe('rotateKeys — edge cases', () => {
    it('should reject user with MANAGER role', () => {
      const user = { id: 'user-001', role: 'MANAGER', tenantId: 'tenant-001' };

      const result = controller.rotateKeys(user as never);

      expect(jwksService.rotateKeys).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: 'Solo gli admin possono ruotare le chiavi',
      });
    });

    it('should reject user with MECHANIC role', () => {
      const user = { id: 'user-001', role: 'MECHANIC', tenantId: 'tenant-001' };

      const result = controller.rotateKeys(user as never);

      expect(jwksService.rotateKeys).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
    });

    it('should reject user with RECEPTIONIST role', () => {
      const user = { id: 'user-001', role: 'RECEPTIONIST', tenantId: 'tenant-001' };

      const result = controller.rotateKeys(user as never);

      expect(result.success).toBe(false);
    });

    it('should accept user with ADMIN role', () => {
      const user = { id: 'user-001', role: 'ADMIN', tenantId: 'tenant-001' };

      const result = controller.rotateKeys(user as never);

      expect(jwksService.rotateKeys).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should accept user with SUPER_ADMIN role', () => {
      const user = { id: 'user-001', role: 'SUPER_ADMIN', tenantId: 'tenant-001' };

      const result = controller.rotateKeys(user as never);

      expect(jwksService.rotateKeys).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('getJwks — edge cases', () => {
    it('should return JWKS with single key', () => {
      const singleKeyJwks = {
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
      jwksService.getJwks.mockReturnValue(singleKeyJwks as never);

      const result = controller.getJwks();

      expect(result.keys).toHaveLength(1);
      expect(result.keys[0].kid).toBe('key-001');
    });

    it('should return JWKS with multiple keys', () => {
      const multiKeyJwks = {
        keys: [
          {
            kty: 'EC',
            crv: 'P-256',
            x: 'abc1',
            y: 'def1',
            kid: 'key-001',
            use: 'sig',
            alg: 'ES256',
          },
          {
            kty: 'EC',
            crv: 'P-256',
            x: 'abc2',
            y: 'def2',
            kid: 'key-002',
            use: 'sig',
            alg: 'ES256',
          },
        ],
      };
      jwksService.getJwks.mockReturnValue(multiKeyJwks as never);

      const result = controller.getJwks();

      expect(result.keys).toHaveLength(2);
    });

    it('should return JWKS with empty keys array', () => {
      const emptyJwks = { keys: [] };
      jwksService.getJwks.mockReturnValue(emptyJwks as never);

      const result = controller.getJwks();

      expect(result.keys).toEqual([]);
    });
  });
});
