import { createHash } from 'crypto';
import { BadRequestException } from '@nestjs/common';
import { PasswordPolicyService } from './password-policy.service';

// Mock global fetch for HaveIBeenPwned API
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('PasswordPolicyService', () => {
  let service: PasswordPolicyService;

  beforeEach(() => {
    service = new PasswordPolicyService();
    mockFetch.mockReset();
    // Default: API returns no matches (password not breached)
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('AAAA1:5\r\nBBBB2:3\r\nCCCC3:1'),
    });
  });

  describe('validatePassword', () => {
    it('should accept a valid password', async () => {
      const result = await service.validatePassword('MySecureP@ss2024!');
      expect(result.valid).toBe(true);
      expect(['weak', 'fair', 'strong']).toContain(result.strength);
    });

    it('should reject passwords shorter than 8 characters', async () => {
      await expect(service.validatePassword('short')).rejects.toThrow(BadRequestException);
      await expect(service.validatePassword('short')).rejects.toThrow('almeno 8 caratteri');
    });

    it('should reject passwords longer than 128 characters', async () => {
      const long = 'a'.repeat(129);
      await expect(service.validatePassword(long)).rejects.toThrow('superare 128 caratteri');
    });

    it('should reject single-character repeated passwords', async () => {
      await expect(service.validatePassword('aaaaaaaa')).rejects.toThrow(
        'singolo carattere ripetuto',
      );
    });

    it('should reject sequential passwords', async () => {
      await expect(service.validatePassword('12345678')).rejects.toThrow('sequenza');
      await expect(service.validatePassword('abcdefgh')).rejects.toThrow('sequenza');
    });

    it('should reject common passwords', async () => {
      await expect(service.validatePassword('password')).rejects.toThrow('troppo comune');
      await expect(service.validatePassword('Password1')).rejects.toThrow('troppo comune');
    });

    it('should reject passwords containing username', async () => {
      await expect(
        service.validatePassword('mario_secret', { email: 'mario@test.com' }),
      ).rejects.toThrow('nome, email');
    });

    it('should reject passwords containing shop name', async () => {
      await expect(
        service.validatePassword('officina2024', { shopName: 'officina' }),
      ).rejects.toThrow('nome, email');
    });

    it('should not reject short context words (< 4 chars)', async () => {
      const result = await service.validatePassword('something_random_123', { name: 'Al' });
      expect(result.valid).toBe(true);
    });
  });

  describe('checkBreachedPassword', () => {
    it('should return breached: true when password found in HIBP', async () => {
      // SHA1 of 'test1234' = 16D7A4FACA05D114...
      // We mock the API to return our suffix with a count
      const sha1 = createHash('sha1').update('test1234').digest('hex').toUpperCase();
      const suffix = sha1.substring(5);

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(`${suffix}:42069\r\nAAAAA:1`),
      });

      const result = await service.checkBreachedPassword('test1234');
      expect(result.breached).toBe(true);
      expect(result.count).toBe(42069);
    });

    it('should return breached: false when password not found', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('AAAA1:5\r\nBBBB2:3'),
      });

      const result = await service.checkBreachedPassword('very_unique_password_xyz_123');
      expect(result.breached).toBe(false);
      expect(result.count).toBe(0);
    });

    it('should fail open when API is down', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await service.checkBreachedPassword('any_password');
      expect(result.breached).toBe(false);
    });

    it('should fail open when API returns non-200', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 503 });

      const result = await service.checkBreachedPassword('any_password');
      expect(result.breached).toBe(false);
    });

    it('should only send first 5 chars of SHA1 (k-anonymity)', async () => {
      await service.checkBreachedPassword('my_secret_password');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toMatch(/^https:\/\/api\.pwnedpasswords\.com\/range\/[A-F0-9]{5}$/);
    });
  });

  describe('strength assessment', () => {
    it('should rate short simple passwords as weak', async () => {
      const result = await service.validatePassword('abcd1234');
      expect(result.strength).toBe('weak');
    });

    it('should rate 15+ char mixed passwords as strong', async () => {
      const result = await service.validatePassword('MyL0ng&SecurePass!');
      expect(result.strength).toBe('strong');
    });
  });
});
