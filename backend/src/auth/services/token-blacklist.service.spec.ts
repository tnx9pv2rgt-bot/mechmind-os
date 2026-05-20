import { Test, TestingModule } from '@nestjs/testing';
import { TokenBlacklistService } from './token-blacklist.service';
import { RedisService } from '../../common/services/redis.service';

describe('TokenBlacklistService', () => {
  let service: TokenBlacklistService;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenBlacklistService,
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            isAvailable: true,
          },
        },
      ],
    }).compile();

    service = module.get<TokenBlacklistService>(TokenBlacklistService);
    redisService = module.get(RedisService) as jest.Mocked<RedisService>;
  });

  describe('blacklistToken', () => {
    it('should store token jti in Redis with TTL', async () => {
      await service.blacklistToken('test-jti-123', 3600);
      expect(redisService.set).toHaveBeenCalledWith('blacklist:test-jti-123', '1', 3600);
    });

    it('should use minimum TTL of 1 second', async () => {
      await service.blacklistToken('test-jti-123', -10);
      expect(redisService.set).toHaveBeenCalledWith('blacklist:test-jti-123', '1', 1);
    });

    it('should skip if jti is empty', async () => {
      await service.blacklistToken('', 3600);
      expect(redisService.set).not.toHaveBeenCalled();
    });
  });

  describe('isBlacklisted', () => {
    it('should return false when jti is empty string (line 28 true branch)', async () => {
      const result = await service.isBlacklisted('');
      expect(result).toBe(false);
      expect(redisService.get).not.toHaveBeenCalled();
    });

    it('should return true if token is blacklisted', async () => {
      redisService.get.mockResolvedValue('1');
      const result = await service.isBlacklisted('test-jti-123');
      expect(result).toBe(true);
    });

    it('should return false if token is not blacklisted', async () => {
      redisService.get.mockResolvedValue(null);
      const result = await service.isBlacklisted('test-jti-123');
      expect(result).toBe(false);
    });

    it('should return false if Redis is unavailable', async () => {
      Object.defineProperty(redisService, 'isAvailable', { value: false });
      const result = await service.isBlacklisted('test-jti-123');
      expect(result).toBe(false);
    });
  });

  describe('invalidateAllUserSessions', () => {
    it('should skip when userId is empty string (line 39 true branch)', async () => {
      await service.invalidateAllUserSessions('');
      expect(redisService.set).not.toHaveBeenCalled();
    });

    it('should store invalidation timestamp in Redis', async () => {
      const before = Date.now();
      await service.invalidateAllUserSessions('user-123');
      expect(redisService.set).toHaveBeenCalled();
      const [key, value] = redisService.set.mock.calls[0];
      expect(key).toBe('user-invalidated:user-123');
      const storedTime = parseInt(value);
      expect(storedTime).toBeGreaterThanOrEqual(before);
    });
  });

  describe('markRefreshTokenUsed', () => {
    it('should return false on first use (not reused)', async () => {
      redisService.get.mockResolvedValue(null);
      const result = await service.markRefreshTokenUsed('jti-1', 'family-1');
      expect(result).toBe(false);
      expect(redisService.set).toHaveBeenCalledWith('rt-used:jti-1', 'family-1', 691200);
    });

    it('should return true if JTI was already used (reuse detected)', async () => {
      redisService.get.mockResolvedValue('family-1');
      const result = await service.markRefreshTokenUsed('jti-1', 'family-1');
      expect(result).toBe(true);
      // Should NOT call set again
      expect(redisService.set).not.toHaveBeenCalled();
    });

    it('should return false if jti or familyId is empty', async () => {
      const result = await service.markRefreshTokenUsed('', 'family-1');
      expect(result).toBe(false);
    });

    it('should return false if Redis is unavailable', async () => {
      Object.defineProperty(redisService, 'isAvailable', { value: false });
      const result = await service.markRefreshTokenUsed('jti-1', 'family-1');
      expect(result).toBe(false);
    });
  });

  describe('invalidateRefreshFamily', () => {
    it('should store revocation flag in Redis', async () => {
      await service.invalidateRefreshFamily('family-1');
      expect(redisService.set).toHaveBeenCalledWith('rt-family-revoked:family-1', '1', 691200);
    });

    it('should skip if familyId is empty', async () => {
      await service.invalidateRefreshFamily('');
      expect(redisService.set).not.toHaveBeenCalled();
    });
  });

  describe('isRefreshFamilyRevoked', () => {
    it('should return false when familyId is empty string (line 93 true branch)', async () => {
      const result = await service.isRefreshFamilyRevoked('');
      expect(result).toBe(false);
      expect(redisService.get).not.toHaveBeenCalled();
    });

    it('should return true if family is revoked', async () => {
      redisService.get.mockResolvedValue('1');
      const result = await service.isRefreshFamilyRevoked('family-1');
      expect(result).toBe(true);
    });

    it('should return false if family is not revoked', async () => {
      redisService.get.mockResolvedValue(null);
      const result = await service.isRefreshFamilyRevoked('family-1');
      expect(result).toBe(false);
    });

    it('should return false if Redis is unavailable', async () => {
      Object.defineProperty(redisService, 'isAvailable', { value: false });
      const result = await service.isRefreshFamilyRevoked('family-1');
      expect(result).toBe(false);
    });
  });

  describe('isSessionValid', () => {
    it('should return true when userId is empty string (line 48 true branch)', async () => {
      const result = await service.isSessionValid('', 1000);
      expect(result).toBe(true);
      expect(redisService.get).not.toHaveBeenCalled();
    });

    it('should return true if no invalidation timestamp exists', async () => {
      redisService.get.mockResolvedValue(null);
      const result = await service.isSessionValid('user-123', 1000);
      expect(result).toBe(true);
    });

    it('should return false if token was issued before invalidation', async () => {
      const invalidatedAt = Date.now();
      redisService.get.mockResolvedValue(invalidatedAt.toString());
      // Token issued at epoch 1000 (seconds) = 1000000 ms, which is before invalidatedAt
      const result = await service.isSessionValid('user-123', 1000);
      expect(result).toBe(false);
    });

    it('should return true if token was issued after invalidation', async () => {
      const invalidatedAt = Date.now() - 10000; // 10 seconds ago
      redisService.get.mockResolvedValue(invalidatedAt.toString());
      // Token issued at current time (seconds)
      const result = await service.isSessionValid('user-123', Math.floor(Date.now() / 1000));
      expect(result).toBe(true);
    });

    it('should return true if Redis is unavailable', async () => {
      Object.defineProperty(redisService, 'isAvailable', { value: false });
      const result = await service.isSessionValid('user-123', 1000);
      expect(result).toBe(true);
    });
  });
});
