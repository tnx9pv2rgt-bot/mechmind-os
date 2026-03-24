import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwksService } from './jwks.service';
import { generateKeyPairSync } from 'crypto';

describe('JwksService', () => {
  let service: JwksService;
  let configService: { get: jest.Mock };

  describe('with HS256 fallback (no keys configured)', () => {
    beforeEach(async () => {
      configService = {
        get: jest.fn((key: string, defaultValue?: string) => {
          if (key === 'JWT_SECRET') return 'test-secret';
          if (key === 'JWT_AUTO_GENERATE_KEYS') return 'false';
          return defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [JwksService, { provide: ConfigService, useValue: configService }],
      }).compile();

      service = module.get<JwksService>(JwksService);
      service.onModuleInit();
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should default to HS256 when no keys configured', () => {
      expect(service.isAsymmetricEnabled()).toBe(false);
    });

    it('should return empty JWKS when HS256', () => {
      const jwks = service.getJwks();
      expect(jwks.keys).toHaveLength(0);
    });

    it('should return HS256 signing options', () => {
      const opts = service.getSigningOptions();
      expect(opts.algorithm).toBe('HS256');
      expect(opts.secret).toBe('test-secret');
      expect(opts.privateKey).toBeUndefined();
    });

    it('should return HS256 passport options', () => {
      const opts = service.getPassportJwtOptions();
      expect(opts.algorithms).toEqual(['HS256']);
      expect(opts.secretOrKey).toBe('test-secret');
      expect(opts.secretOrKeyProvider).toBeUndefined();
    });
  });

  describe('with auto-generated ES256 keys', () => {
    beforeEach(async () => {
      configService = {
        get: jest.fn((key: string, defaultValue?: string) => {
          if (key === 'JWT_AUTO_GENERATE_KEYS') return 'true';
          if (key === 'JWT_SECRET') return 'test-secret';
          return defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [JwksService, { provide: ConfigService, useValue: configService }],
      }).compile();

      service = module.get<JwksService>(JwksService);
      service.onModuleInit();
    });

    it('should enable asymmetric signing', () => {
      expect(service.isAsymmetricEnabled()).toBe(true);
    });

    it('should return one key in JWKS', () => {
      const jwks = service.getJwks();
      expect(jwks.keys).toHaveLength(1);
      expect(jwks.keys[0].kty).toBe('EC');
      expect(jwks.keys[0].crv).toBe('P-256');
      expect(jwks.keys[0].alg).toBe('ES256');
      expect(jwks.keys[0].use).toBe('sig');
      expect(jwks.keys[0].kid).toBeDefined();
      expect(jwks.keys[0].x).toBeDefined();
      expect(jwks.keys[0].y).toBeDefined();
    });

    it('should return ES256 signing options with private key', () => {
      const opts = service.getSigningOptions();
      expect(opts.algorithm).toBe('ES256');
      expect(opts.privateKey).toBeDefined();
      expect(opts.header).toBeDefined();
      expect(opts.header?.kid).toBeDefined();
    });

    it('should return ES256 passport options with secretOrKeyProvider', () => {
      const opts = service.getPassportJwtOptions();
      expect(opts.algorithms).toEqual(['ES256']);
      expect(opts.secretOrKeyProvider).toBeDefined();
      expect(opts.secretOrKey).toBeUndefined();
    });

    it('should return signing key with kid', () => {
      const key = service.getSigningKey();
      expect(key).not.toBeNull();
      expect(key!.kid).toBeDefined();
      expect(key!.privateKey).toBeDefined();
    });

    it('should return verification key by kid', () => {
      const signingKey = service.getSigningKey()!;
      const pubKey = service.getVerificationKey(signingKey.kid);
      expect(pubKey).not.toBeNull();
    });

    it('should return null for unknown kid', () => {
      const pubKey = service.getVerificationKey('unknown-kid');
      expect(pubKey).toBeNull();
    });
  });

  describe('key rotation', () => {
    beforeEach(async () => {
      configService = {
        get: jest.fn((key: string, defaultValue?: string) => {
          if (key === 'JWT_AUTO_GENERATE_KEYS') return 'true';
          if (key === 'JWT_SECRET') return 'test-secret';
          return defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [JwksService, { provide: ConfigService, useValue: configService }],
      }).compile();

      service = module.get<JwksService>(JwksService);
      service.onModuleInit();
    });

    it('should generate new active key on rotation', () => {
      const oldKid = service.getSigningKey()!.kid;
      service.rotateKeys();
      const newKid = service.getSigningKey()!.kid;

      expect(newKid).not.toBe(oldKid);
    });

    it('should keep old key for verification after rotation', () => {
      const oldKid = service.getSigningKey()!.kid;
      service.rotateKeys();

      // Old key still available for verification
      const oldPubKey = service.getVerificationKey(oldKid);
      expect(oldPubKey).not.toBeNull();
    });

    it('should have 2 keys in JWKS after one rotation', () => {
      service.rotateKeys();
      const jwks = service.getJwks();
      expect(jwks.keys).toHaveLength(2);
    });

    it('should have 3 keys after two rotations', () => {
      service.rotateKeys();
      service.rotateKeys();
      const jwks = service.getJwks();
      expect(jwks.keys).toHaveLength(3);
    });
  });

  describe('with PEM key from environment', () => {
    beforeEach(async () => {
      // Generate a real EC key pair for testing
      const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
      const pem = privateKey.export({ type: 'sec1', format: 'pem' }) as string;

      configService = {
        get: jest.fn((key: string, defaultValue?: string) => {
          if (key === 'JWT_PRIVATE_KEY_PEM') return pem;
          if (key === 'JWT_SECRET') return 'test-secret';
          return defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [JwksService, { provide: ConfigService, useValue: configService }],
      }).compile();

      service = module.get<JwksService>(JwksService);
      service.onModuleInit();
    });

    it('should enable ES256 from PEM key', () => {
      expect(service.isAsymmetricEnabled()).toBe(true);
    });

    it('should serve public key in JWKS', () => {
      const jwks = service.getJwks();
      expect(jwks.keys).toHaveLength(1);
      expect(jwks.keys[0].kty).toBe('EC');
      expect(jwks.keys[0].crv).toBe('P-256');
    });
  });
});
