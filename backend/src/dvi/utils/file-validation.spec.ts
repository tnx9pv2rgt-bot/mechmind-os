import { validateImageMimetype, getFileSizeInMb, validateFileSize } from './file-validation';

describe('file-validation utilities', () => {
  describe('validateImageMimetype', () => {
    it('should accept image/jpeg mimetype', () => {
      const result = validateImageMimetype('image/jpeg');
      expect(result).toBe(true);
    });

    it('should accept image/jpg mimetype', () => {
      const result = validateImageMimetype('image/jpg');
      expect(result).toBe(true);
    });

    it('should accept image/png mimetype', () => {
      const result = validateImageMimetype('image/png');
      expect(result).toBe(true);
    });

    it('should accept image/webp mimetype', () => {
      const result = validateImageMimetype('image/webp');
      expect(result).toBe(true);
    });

    it('should reject video/mp4 mimetype', () => {
      const result = validateImageMimetype('video/mp4');
      expect(result).toBe(false);
    });

    it('should reject text/plain mimetype', () => {
      const result = validateImageMimetype('text/plain');
      expect(result).toBe(false);
    });

    it('should reject application/pdf mimetype', () => {
      const result = validateImageMimetype('application/pdf');
      expect(result).toBe(false);
    });

    it('should reject empty string', () => {
      const result = validateImageMimetype('');
      expect(result).toBe(false);
    });

    it('should reject null-like input', () => {
      const result = validateImageMimetype(null as unknown as string);
      expect(result).toBe(false);
    });

    it('should reject undefined-like input', () => {
      const result = validateImageMimetype(undefined as unknown as string);
      expect(result).toBe(false);
    });

    it('should be case-sensitive and reject uppercase JPEG', () => {
      const result = validateImageMimetype('image/JPEG');
      expect(result).toBe(false);
    });
  });

  describe('getFileSizeInMb', () => {
    it('should convert 1MB in bytes to 1 MB', () => {
      const sizeInBytes = 1024 * 1024;
      const result = getFileSizeInMb(sizeInBytes);
      expect(result).toBe(1);
    });

    it('should convert 10MB in bytes to 10 MB', () => {
      const sizeInBytes = 10 * 1024 * 1024;
      const result = getFileSizeInMb(sizeInBytes);
      expect(result).toBe(10);
    });

    it('should handle partial MB sizes', () => {
      const sizeInBytes = 512 * 1024; // 0.5 MB
      const result = getFileSizeInMb(sizeInBytes);
      expect(result).toBeCloseTo(0.5, 5);
    });

    it('should handle zero bytes', () => {
      const result = getFileSizeInMb(0);
      expect(result).toBe(0);
    });

    it('should handle very large sizes', () => {
      const sizeInBytes = 1000 * 1024 * 1024; // 1000 MB
      const result = getFileSizeInMb(sizeInBytes);
      expect(result).toBe(1000);
    });
  });

  describe('validateFileSize', () => {
    it('should accept file size under 10MB limit', () => {
      const sizeInBytes = 5 * 1024 * 1024;
      const result = validateFileSize(sizeInBytes);
      expect(result).toBe(true);
    });

    it('should accept file size exactly at 10MB limit', () => {
      const sizeInBytes = 10 * 1024 * 1024;
      const result = validateFileSize(sizeInBytes);
      expect(result).toBe(true);
    });

    it('should reject file size over 10MB limit', () => {
      const sizeInBytes = 11 * 1024 * 1024;
      const result = validateFileSize(sizeInBytes);
      expect(result).toBe(false);
    });

    it('should accept file size with custom limit', () => {
      const sizeInBytes = 15 * 1024 * 1024;
      const result = validateFileSize(sizeInBytes, 20);
      expect(result).toBe(true);
    });

    it('should reject file size over custom limit', () => {
      const sizeInBytes = 25 * 1024 * 1024;
      const result = validateFileSize(sizeInBytes, 20);
      expect(result).toBe(false);
    });

    it('should accept zero byte file', () => {
      const result = validateFileSize(0);
      expect(result).toBe(true);
    });

    it('should reject file exactly 1 byte over limit', () => {
      const sizeInBytes = 10 * 1024 * 1024 + 1;
      const result = validateFileSize(sizeInBytes);
      expect(result).toBe(false);
    });

    it('should work with very small limits', () => {
      const sizeInBytes = 1024; // 1 KB
      const result = validateFileSize(sizeInBytes, 0.5);
      expect(result).toBe(true);
    });

    it('should work with very large limits', () => {
      const sizeInBytes = 100 * 1024 * 1024;
      const result = validateFileSize(sizeInBytes, 1000);
      expect(result).toBe(true);
    });
  });
});
