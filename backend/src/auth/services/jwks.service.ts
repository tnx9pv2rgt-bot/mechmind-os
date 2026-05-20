import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  KeyObject,
} from 'crypto';

/**
 * JSON Web Key Set (JWKS) service for ES256 asymmetric JWT signing.
 *
 * Google/Microsoft/Apple 2024-2026 pattern:
 * - Sign tokens with private key (ES256 / ECDSA P-256)
 * - Verify tokens with public key from JWKS endpoint
 * - Support key rotation via `kid` header
 * - Serve public keys at /.well-known/jwks.json
 *
 * Key sources (in order of priority):
 * 1. JWT_PRIVATE_KEY_PEM env var (production — from secrets manager)
 * 2. Auto-generated ephemeral keys (development only)
 */
export interface JwkPublicKey {
  kty: 'EC';
  crv: 'P-256';
  x: string;
  y: string;
  kid: string;
  use: 'sig';
  alg: 'ES256';
}

export interface JwksResponse {
  keys: JwkPublicKey[];
}

interface ManagedKey {
  kid: string;
  privateKey: KeyObject;
  publicKey: KeyObject;
  createdAt: Date;
  isActive: boolean; // active = used for signing; inactive = only used for verification
}

@Injectable()
export class JwksService implements OnModuleInit {
  private readonly logger = new Logger(JwksService.name);
  private keys: ManagedKey[] = [];
  private useAsymmetric = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    this.loadOrGenerateKeys();
  }

  /**
   * Whether ES256 asymmetric signing is enabled.
   * Falls back to HS256 (symmetric) if no keys are configured.
   */
  isAsymmetricEnabled(): boolean {
    return this.useAsymmetric;
  }

  /**
   * Get the active private key for signing new tokens.
   */
  getSigningKey(): { privateKey: KeyObject; kid: string } | null {
    const active = this.keys.find(k => k.isActive);
    if (!active) return null;
    return { privateKey: active.privateKey, kid: active.kid };
  }

  /**
   * Get a public key by kid for verification.
   * Returns null if kid not found (key was rotated out).
   */
  getVerificationKey(kid: string): KeyObject | null {
    const key = this.keys.find(k => k.kid === kid);
    return key?.publicKey || null;
  }

  /**
   * Get all public keys (for JWKS endpoint).
   * Includes both active and recently-rotated keys.
   */
  getJwks(): JwksResponse {
    return {
      keys: this.keys.map(k => this.keyObjectToJwk(k)),
    };
  }

  /**
   * Rotate keys: generate new signing key, demote current to verification-only.
   * Old keys are kept for 48h to allow in-flight tokens to still verify.
   */
  rotateKeys(): void {
    // Demote current active key
    for (const key of this.keys) {
      key.isActive = false;
    }

    // Remove keys older than 48h
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    this.keys = this.keys.filter(k => k.createdAt > cutoff);

    // Generate new active key
    const newKey = this.generateKeyPair();
    this.keys.push(newKey);

    this.logger.log(`Key rotated. New kid: ${newKey.kid}. Total keys: ${this.keys.length}`);
  }

  /**
   * Get the secret or key config for passport-jwt verification.
   * Supports both HS256 (secret string) and ES256 (public key callback).
   */
  getPassportJwtOptions(): {
    algorithms: string[];
    secretOrKeyProvider?: (
      request: unknown,
      rawJwtToken: string,
      done: (err: Error | null, key: string | KeyObject | null) => void,
    ) => void;
    secretOrKey?: string;
  } {
    if (!this.useAsymmetric) {
      return {
        algorithms: ['HS256'],
        secretOrKey: this.configService.get<string>('JWT_SECRET'),
      };
    }

    return {
      algorithms: ['ES256'],
      secretOrKeyProvider: (_request: unknown, rawJwtToken: string, done) => {
        try {
          // Decode header to get kid
          const headerPart = rawJwtToken.split('.')[0];
          const header = JSON.parse(Buffer.from(headerPart, 'base64url').toString());
          const kid = header.kid;

          if (!kid) {
            // Try all keys (fallback for tokens without kid)
            const key = this.keys[0]?.publicKey;
            return done(null, key || null);
          }

          const publicKey = this.getVerificationKey(kid);
          if (!publicKey) {
            return done(new Error(`Unknown kid: ${kid}`), null);
          }

          done(null, publicKey);
        } catch (err) {
          done(err instanceof Error ? err : new Error('JWT header parse failed'), null);
        }
      },
    };
  }

  /**
   * Get signing options for JwtService.signAsync().
   */
  getSigningOptions(): {
    algorithm: 'ES256' | 'HS256';
    privateKey?: KeyObject;
    secret?: string;
    header?: { kid: string };
  } {
    if (!this.useAsymmetric) {
      return {
        algorithm: 'HS256',
        secret: this.configService.get<string>('JWT_SECRET'),
      };
    }

    const signing = this.getSigningKey();
    if (!signing) {
      throw new Error('No active signing key available');
    }

    return {
      algorithm: 'ES256',
      privateKey: signing.privateKey,
      header: { kid: signing.kid },
    };
  }

  // ── Private methods ──

  private loadOrGenerateKeys(): void {
    const privatePem = this.configService.get<string>('JWT_PRIVATE_KEY_PEM');

    if (privatePem) {
      // Production: load from environment
      try {
        const privateKey = createPrivateKey({
          key: privatePem.replace(/\\n/g, '\n'),
          format: 'pem',
        });
        const publicKey = createPublicKey(privateKey);

        const kid = this.generateKid(publicKey);

        this.keys.push({
          kid,
          privateKey,
          publicKey,
          createdAt: new Date(),
          isActive: true,
        });

        this.useAsymmetric = true;
        this.logger.log(`ES256 asymmetric JWT enabled (kid: ${kid})`);
      } catch (err) {
        this.logger.error(`Failed to load JWT_PRIVATE_KEY_PEM, falling back to HS256: ${err}`);
        this.useAsymmetric = false;
      }
    } else {
      // Development: auto-generate ephemeral keys
      const autoGenerate = this.configService.get<string>('JWT_AUTO_GENERATE_KEYS', 'false');

      if (autoGenerate === 'true') {
        const key = this.generateKeyPair();
        this.keys.push(key);
        this.useAsymmetric = true;
        this.logger.warn(
          'ES256 keys auto-generated (ephemeral). Set JWT_PRIVATE_KEY_PEM for production.',
        );
      } else {
        this.useAsymmetric = false;
        this.logger.log(
          'Using HS256 symmetric JWT. Set JWT_PRIVATE_KEY_PEM for ES256 asymmetric signing.',
        );
      }
    }
  }

  private generateKeyPair(): ManagedKey {
    const { privateKey, publicKey } = generateKeyPairSync('ec', {
      namedCurve: 'P-256',
    });

    const kid = this.generateKid(publicKey);

    return {
      kid,
      privateKey,
      publicKey,
      createdAt: new Date(),
      isActive: true,
    };
  }

  private generateKid(publicKey: KeyObject): string {
    const jwk = publicKey.export({ format: 'jwk' });
    // kid = truncated SHA-256 of the public key coordinates
    return createHash('sha256').update(`${jwk.x}:${jwk.y}`).digest('hex').substring(0, 16);
  }

  private keyObjectToJwk(managedKey: ManagedKey): JwkPublicKey {
    const jwk = managedKey.publicKey.export({ format: 'jwk' });
    return {
      kty: 'EC',
      crv: 'P-256',
      x: jwk.x as string,
      y: jwk.y as string,
      kid: managedKey.kid,
      use: 'sig',
      alg: 'ES256',
    };
  }
}
