import { Test, TestingModule } from '@nestjs/testing';
import { LoginThrottleService } from './login-throttle.service';
import { RedisService } from '../../common/services/redis.service';

describe('LoginThrottleService', () => {
  let service: LoginThrottleService;
  let redis: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginThrottleService,
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

    service = module.get(LoginThrottleService);
    redis = module.get(RedisService) as jest.Mocked<RedisService>;
  });

  describe('getDelay', () => {
    it('should return 0 delay for first 3 attempts', async () => {
      redis.get.mockResolvedValue('2');
      const result = await service.getDelay('user@test.com', '1.2.3.4');
      expect(result.delay).toBe(0);
      expect(result.attempts).toBe(2);
    });

    it('should return 1s delay for attempts 4-5', async () => {
      redis.get.mockResolvedValue('4');
      const result = await service.getDelay('user@test.com', '1.2.3.4');
      expect(result.delay).toBe(1000);
    });

    it('should return 5s delay for attempts 6-7', async () => {
      redis.get.mockResolvedValue('6');
      const result = await service.getDelay('user@test.com', '1.2.3.4');
      expect(result.delay).toBe(5000);
    });

    it('should return 30s delay for attempts 8+', async () => {
      redis.get.mockResolvedValue('9');
      const result = await service.getDelay('user@test.com', '1.2.3.4');
      expect(result.delay).toBe(30000);
    });

    it('should return 0 when Redis is unavailable', async () => {
      Object.defineProperty(redis, 'isAvailable', { value: false });
      const result = await service.getDelay('user@test.com', '1.2.3.4');
      expect(result.delay).toBe(0);
    });
  });

  describe('recordFailure', () => {
    it('should increment attempt count in Redis', async () => {
      redis.get.mockResolvedValue('2');
      const count = await service.recordFailure('user@test.com', '1.2.3.4');
      expect(count).toBe(3);
      expect(redis.set).toHaveBeenCalledWith('login-throttle:user@test.com:1.2.3.4', '3', 900);
    });

    it('should start at 1 for first failure', async () => {
      redis.get.mockResolvedValue(null);
      const count = await service.recordFailure('user@test.com', '1.2.3.4');
      expect(count).toBe(1);
    });

    it('should normalize email to lowercase', async () => {
      redis.get.mockResolvedValue(null);
      await service.recordFailure('User@Test.COM', '1.2.3.4');
      expect(redis.set).toHaveBeenCalledWith('login-throttle:user@test.com:1.2.3.4', '1', 900);
    });
  });

  describe('resetOnSuccess', () => {
    it('should delete the throttle key', async () => {
      await service.resetOnSuccess('user@test.com', '1.2.3.4');
      expect(redis.del).toHaveBeenCalledWith('login-throttle:user@test.com:1.2.3.4');
    });
  });

  describe('getHeaders', () => {
    it('should return GitHub-style rate limit headers', () => {
      const headers = service.getHeaders(3);
      expect(headers['X-RateLimit-Limit']).toBe('10');
      expect(headers['X-RateLimit-Remaining']).toBe('7');
      expect(headers['X-RateLimit-Reset']).toBeDefined();
    });

    it('should not go below 0 remaining', () => {
      const headers = service.getHeaders(15);
      expect(headers['X-RateLimit-Remaining']).toBe('0');
    });
  });

  // ============== Additional branches ==============

  describe('getDelay — edge cases', () => {
    it('should return 0 delay when Redis returns null (no prior attempts)', async () => {
      redis.get.mockResolvedValue(null);
      const result = await service.getDelay('user@test.com', '1.2.3.4');
      expect(result.delay).toBe(0);
      expect(result.attempts).toBe(0);
    });

    it('should return 1s delay for exactly 5 attempts', async () => {
      redis.get.mockResolvedValue('5');
      const result = await service.getDelay('user@test.com', '1.2.3.4');
      expect(result.delay).toBe(1000);
      expect(result.attempts).toBe(5);
    });

    it('should return 5s delay for exactly 7 attempts', async () => {
      redis.get.mockResolvedValue('7');
      const result = await service.getDelay('user@test.com', '1.2.3.4');
      expect(result.delay).toBe(5000);
    });

    it('should return 30s delay for exactly 10 attempts', async () => {
      redis.get.mockResolvedValue('10');
      const result = await service.getDelay('user@test.com', '1.2.3.4');
      expect(result.delay).toBe(30000);
      expect(result.attempts).toBe(10);
    });

    it('should normalize email with spaces in getDelay', async () => {
      redis.get.mockResolvedValue('3');
      await service.getDelay('  User@Test.COM  ', '1.2.3.4');
      expect(redis.get).toHaveBeenCalledWith('login-throttle:user@test.com:1.2.3.4');
    });
  });

  describe('recordFailure — Redis unavailable', () => {
    it('should return 0 when Redis is unavailable', async () => {
      Object.defineProperty(redis, 'isAvailable', { value: false });
      const count = await service.recordFailure('user@test.com', '1.2.3.4');
      expect(count).toBe(0);
      expect(redis.get).not.toHaveBeenCalled();
    });
  });

  describe('resetOnSuccess — Redis unavailable', () => {
    it('should return immediately when Redis is unavailable', async () => {
      Object.defineProperty(redis, 'isAvailable', { value: false });
      await service.resetOnSuccess('user@test.com', '1.2.3.4');
      expect(redis.del).not.toHaveBeenCalled();
    });

    it('should normalize email in resetOnSuccess', async () => {
      await service.resetOnSuccess('  USER@Test.COM  ', '1.2.3.4');
      expect(redis.del).toHaveBeenCalledWith('login-throttle:user@test.com:1.2.3.4');
    });
  });
});
