import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../common/services/redis.service';

/** TTL for refresh token family tracking (8 days — slightly longer than refresh token lifetime) */
const REFRESH_FAMILY_TTL = 8 * 24 * 60 * 60;

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Blacklist a specific token by its jti (JWT ID)
   * TTL = remaining seconds until token expiry
   */
  async blacklistToken(jti: string, ttlSeconds: number): Promise<void> {
    if (!jti) return;
    const effectiveTtl = Math.max(ttlSeconds, 1);
    await this.redis.set(`blacklist:${jti}`, '1', effectiveTtl);
    this.logger.log(`Token ${jti.slice(0, 8)}... blacklisted (TTL: ${effectiveTtl}s)`);
  }

  /**
   * Check if a token is blacklisted
   */
  async isBlacklisted(jti: string): Promise<boolean> {
    if (!jti) return false;
    if (!this.redis.isAvailable) return false;
    const result = await this.redis.get(`blacklist:${jti}`);
    return result !== null;
  }

  /**
   * Invalidate all sessions for a user by storing a timestamp.
   * Any token issued before this timestamp is considered invalid.
   */
  async invalidateAllUserSessions(userId: string): Promise<void> {
    if (!userId) return;
    await this.redis.set(`user-invalidated:${userId}`, Date.now().toString());
    this.logger.log(`All sessions invalidated for user ${userId}`);
  }

  /**
   * Check if a token's issuedAt is after the user's invalidation timestamp
   */
  async isSessionValid(userId: string, tokenIssuedAt: number): Promise<boolean> {
    if (!userId) return true;
    if (!this.redis.isAvailable) return true;
    const invalidatedAt = await this.redis.get(`user-invalidated:${userId}`);
    if (!invalidatedAt) return true;
    return tokenIssuedAt * 1000 > parseInt(invalidatedAt);
  }

  // ============== REFRESH TOKEN ROTATION ==============

  /**
   * Mark a refresh token JTI as used within its family.
   * Returns true if the JTI was already used (= reuse attack detected).
   */
  async markRefreshTokenUsed(jti: string, familyId: string): Promise<boolean> {
    if (!jti || !familyId) return false;
    if (!this.redis.isAvailable) return false;

    // Check if this JTI was already consumed
    const alreadyUsed = await this.redis.get(`rt-used:${jti}`);
    if (alreadyUsed) {
      this.logger.warn(
        `REUSE DETECTED: refresh token ${jti.slice(0, 8)}... in family ${familyId.slice(0, 8)}...`,
      );
      return true; // REUSE DETECTED — caller must invalidate all sessions
    }

    // Mark this JTI as consumed
    await this.redis.set(`rt-used:${jti}`, familyId, REFRESH_FAMILY_TTL);
    return false;
  }

  /**
   * Invalidate an entire refresh token family (used on reuse detection or logout).
   * All refresh tokens in this family become invalid.
   */
  async invalidateRefreshFamily(familyId: string): Promise<void> {
    if (!familyId) return;
    await this.redis.set(`rt-family-revoked:${familyId}`, '1', REFRESH_FAMILY_TTL);
    this.logger.log(`Refresh token family ${familyId.slice(0, 8)}... revoked`);
  }

  /**
   * Check if a refresh token family has been revoked.
   */
  async isRefreshFamilyRevoked(familyId: string): Promise<boolean> {
    if (!familyId) return false;
    if (!this.redis.isAvailable) return false;
    const result = await this.redis.get(`rt-family-revoked:${familyId}`);
    return result !== null;
  }
}
