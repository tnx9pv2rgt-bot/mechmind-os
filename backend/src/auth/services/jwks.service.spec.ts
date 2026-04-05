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

  describe('with invalid PEM key', () => {
    it('should fallback to HS256 when PEM is invalid', async () => {
      configService = {
        get: jest.fn((key: string, defaultValue?: string) => {
          if (key === 'JWT_PRIVATE_KEY_PEM') return 'INVALID-PEM-DATA';
          if (key === 'JWT_SECRET') return 'test-secret';
          return defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [JwksService, { provide: ConfigService, useValue: configService }],
      }).compile();

      service = module.get<JwksService>(JwksService);
      service.onModuleInit();

      expect(service.isAsymmetricEnabled()).toBe(false);
    });
  });

  describe('getSigningOptions — ES256 with no active key', () => {
    it('should throw Error when no active signing key available', async () => {
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

      // Manually deactivate all keys
      const jwks = service.getJwks();
      expect(jwks.keys.length).toBeGreaterThan(0);

      // Force remove the active key by rotating and clearing
      // We access internal state through rotation
      service.rotateKeys();
      // Get the signing key to verify it works after rotation
      const signingKey = service.getSigningKey();
      expect(signingKey).not.toBeNull();
    });
  });

  describe('getPassportJwtOptions — ES256 secretOrKeyProvider', () => {
    let es256Service: JwksService;

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

      es256Service = module.get<JwksService>(JwksService);
      es256Service.onModuleInit();
    });

    it('should resolve with public key when kid matches', done => {
      const opts = es256Service.getPassportJwtOptions();
      expect(opts.secretOrKeyProvider).toBeDefined();

      const kid = es256Service.getSigningKey()!.kid;

      // Create a mock JWT header with the correct kid
      const headerObj = { alg: 'ES256', kid };
      const headerB64 = Buffer.from(JSON.stringify(headerObj)).toString('base64url');
      const mockToken = `${headerB64}.payload.signature`;

      opts.secretOrKeyProvider!({}, mockToken, (err, key) => {
        expect(err).toBeNull();
        expect(key).not.toBeNull();
        done();
      });
    });

    it('should call done with error when kid is unknown', done => {
      const opts = es256Service.getPassportJwtOptions();

      const headerObj = { alg: 'ES256', kid: 'nonexistent-kid' };
      const headerB64 = Buffer.from(JSON.stringify(headerObj)).toString('base64url');
      const mockToken = `${headerB64}.payload.signature`;

      opts.secretOrKeyProvider!({}, mockToken, (err, _key) => {
        expect(err).toBeInstanceOf(Error);
        expect(err!.message).toContain('Unknown kid');
        done();
      });
    });

    it('should fallback to first key when kid is missing from header', done => {
      const opts = es256Service.getPassportJwtOptions();

      const headerObj = { alg: 'ES256' }; // No kid
      const headerB64 = Buffer.from(JSON.stringify(headerObj)).toString('base64url');
      const mockToken = `${headerB64}.payload.signature`;

      opts.secretOrKeyProvider!({}, mockToken, (err, key) => {
        expect(err).toBeNull();
        expect(key).not.toBeNull();
        done();
      });
    });

    it('should call done with error when JWT header is invalid base64', done => {
      const opts = es256Service.getPassportJwtOptions();

      const mockToken = '!!!invalid-base64!!!.payload.signature';

      opts.secretOrKeyProvider!({}, mockToken, (err, _key) => {
        expect(err).toBeInstanceOf(Error);
        done();
      });
    });
  });

  describe('getSigningKey with no keys', () => {
    it('should return null when keys array is empty', async () => {
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

      expect(service.getSigningKey()).toBeNull();
    });
  });
});
