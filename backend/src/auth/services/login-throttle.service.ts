import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../common/services/redis.service';

/**
 * Progressive login throttling (GitHub-style exponential backoff).
 *
 * Attempts 1-3:  No delay
 * Attempts 4-5:  1 second delay
 * Attempts 6-7:  5 second delay
 * Attempts 8-9:  30 second delay
 * Attempts 10+:  Account locked for 15 minutes (handled by AuthService)
 *
 * Tracked per email+IP combination. Resets on successful login.
 * Window: 15 minutes sliding window.
 */
@Injectable()
export class LoginThrottleService {
  private readonly logger = new Logger(LoginThrottleService.name);
  private static readonly WINDOW_SECONDS = 900; // 15 minutes

  /** Delay schedule: [minAttempts, delayMs] */
  private static readonly DELAY_SCHEDULE: [number, number][] = [
    [8, 30_000], // attempts 8-9: 30s
    [6, 5_000], // attempts 6-7: 5s
    [4, 1_000], // attempts 4-5: 1s
  ];

  constructor(private readonly redis: RedisService) {}

  /**
   * Check if a login attempt should be delayed.
   * Returns the delay in milliseconds (0 = no delay).
   */
  async getDelay(email: string, ip: string): Promise<{ delay: number; attempts: number }> {
    if (!this.redis.isAvailable) return { delay: 0, attempts: 0 };

    const key = this.getKey(email, ip);
    const attemptsStr = await this.redis.get(key);
    const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;

    for (const [minAttempts, delayMs] of LoginThrottleService.DELAY_SCHEDULE) {
      if (attempts >= minAttempts) {
        return { delay: delayMs, attempts };
      }
    }

    return { delay: 0, attempts };
  }

  /**
   * Record a failed login attempt. Returns the new attempt count.
   */
  async recordFailure(email: string, ip: string): Promise<number> {
    if (!this.redis.isAvailable) return 0;

    const key = this.getKey(email, ip);
    const current = await this.redis.get(key);
    const newCount = (current ? parseInt(current, 10) : 0) + 1;
    await this.redis.set(key, newCount.toString(), LoginThrottleService.WINDOW_SECONDS);

    this.logger.warn(`Login failure #${newCount} for ${email} from ${ip}`);

    return newCount;
  }

  /**
   * Reset throttle on successful login.
   */
  async resetOnSuccess(email: string, ip: string): Promise<void> {
    if (!this.redis.isAvailable) return;

    const key = this.getKey(email, ip);
    await this.redis.del(key);
  }

  /**
   * Get the response headers for rate limiting (GitHub-style).
   */
  getHeaders(attempts: number): Record<string, string> {
    const limit = 10;
    return {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': Math.max(0, limit - attempts).toString(),
      'X-RateLimit-Reset': Math.floor(
        (Date.now() + LoginThrottleService.WINDOW_SECONDS * 1000) / 1000,
      ).toString(),
    };
  }

  private getKey(email: string, ip: string): string {
    // Normalize email to prevent bypass with case variations
    return `login-throttle:${email.toLowerCase().trim()}:${ip}`;
  }
}
