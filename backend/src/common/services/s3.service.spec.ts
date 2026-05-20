import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Service } from './s3.service';
import * as s3Presigner from '@aws-sdk/s3-request-presigner';

// ---------------------------------------------------------------------------
// Mock AWS SDK
// ---------------------------------------------------------------------------

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
    PutObjectCommand: jest.fn().mockImplementation(input => ({ ...input, _type: 'PutObject' })),
    DeleteObjectCommand: jest
      .fn()
      .mockImplementation(input => ({ ...input, _type: 'DeleteObject' })),
    GetObjectCommand: jest.fn().mockImplementation(input => ({ ...input, _type: 'GetObject' })),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://signed-url.example.com/object'),
}));

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const TEST_BUCKET = 'mechmind-uploads';
const TEST_REGION = 'eu-west-1';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('S3Service', () => {
  let service: S3Service;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3Service,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              if (key === 'AWS_REGION') return TEST_REGION;
              if (key === 'AWS_S3_BUCKET') return TEST_BUCKET;
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<S3Service>(S3Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // Key validation (path traversal prevention)
  // -----------------------------------------------------------------------

  describe('key validation', () => {
    it('should reject keys with ".." traversal', async () => {
      const body = Buffer.from('test');

      await expect(
        service.upload(TEST_BUCKET, '../etc/passwd', body, 'text/plain'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject keys containing "/../"', async () => {
      const body = Buffer.from('test');

      await expect(
        service.upload(TEST_BUCKET, 'valid/../../secret', body, 'text/plain'),
      ).rejects.toThrow('path traversal detected');
    });

    it('should accept valid keys', async () => {
      mockSend.mockResolvedValueOnce({});
      const body = Buffer.from('test');

      const result = await service.upload(TEST_BUCKET, 'uploads/photo.jpg', body, 'image/jpeg');

      expect(result.Key).toBe('uploads/photo.jpg');
    });
  });

  // -----------------------------------------------------------------------
  // Tenant key building
  // -----------------------------------------------------------------------

  describe('tenant key building', () => {
    it('should prefix key with tenant path via uploadBuffer', async () => {
      mockSend.mockResolvedValueOnce({});
      const body = Buffer.from('pdf-content');

      const result = await service.uploadBuffer(
        body,
        'invoices/inv-001.pdf',
        'application/pdf',
        TENANT_ID,
      );

      expect(result.Key).toBe(`tenants/${TENANT_ID}/invoices/inv-001.pdf`);
      expect(result.Bucket).toBe(TEST_BUCKET);
    });

    it('should use key as-is when no tenantId provided', async () => {
      mockSend.mockResolvedValueOnce({});
      const body = Buffer.from('data');

      const result = await service.uploadBuffer(body, 'shared/file.txt', 'text/plain');

      expect(result.Key).toBe('shared/file.txt');
    });

    it('should reject traversal in tenant-scoped keys', async () => {
      const body = Buffer.from('data');

      await expect(
        service.uploadBuffer(body, '../escape/file.txt', 'text/plain', TENANT_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // -----------------------------------------------------------------------
  // upload
  // -----------------------------------------------------------------------

  describe('upload', () => {
    it('should send PutObjectCommand with correct parameters', async () => {
      mockSend.mockResolvedValueOnce({});
      const body = Buffer.from('image-data');

      const result = await service.upload(TEST_BUCKET, 'photos/car.png', body, 'image/png');

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        Location: `https://${TEST_BUCKET}.s3.${TEST_REGION}.amazonaws.com/photos/car.png`,
        ETag: '',
        Bucket: TEST_BUCKET,
        Key: 'photos/car.png',
      });
    });

    it('should propagate S3 errors', async () => {
      mockSend.mockRejectedValueOnce(new Error('Access Denied'));
      const body = Buffer.from('data');

      await expect(service.upload(TEST_BUCKET, 'key', body, 'text/plain')).rejects.toThrow(
        'Access Denied',
      );
    });
  });

  // -----------------------------------------------------------------------
  // delete
  // -----------------------------------------------------------------------

  describe('delete', () => {
    it('should send DeleteObjectCommand', async () => {
      mockSend.mockResolvedValueOnce({});

      await service.delete(TEST_BUCKET, 'photos/old.png');

      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should reject traversal keys on delete', async () => {
      await expect(service.delete(TEST_BUCKET, '../../etc/passwd')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // -----------------------------------------------------------------------
  // getSignedDownloadUrl
  // -----------------------------------------------------------------------

  describe('getSignedDownloadUrl', () => {
    it('should return signed URL', async () => {
      const { getSignedUrl } = s3Presigner as unknown as { getSignedUrl: jest.Mock };
      getSignedUrl.mockResolvedValueOnce('https://signed.example.com/file');

      const url = await service.getSignedDownloadUrl(TEST_BUCKET, 'file.pdf', 3600);

      expect(url).toBe('https://signed.example.com/file');
      expect(getSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        expiresIn: 3600,
      });
    });

    it('should reject traversal keys', async () => {
      await expect(service.getSignedDownloadUrl(TEST_BUCKET, '../secret', 3600)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // -----------------------------------------------------------------------
  // getSignedUrlForKey (tenant-scoped)
  // -----------------------------------------------------------------------

  describe('getSignedUrlForKey', () => {
    it('should build tenant key and return signed URL', async () => {
      const { getSignedUrl } = s3Presigner as unknown as { getSignedUrl: jest.Mock };
      getSignedUrl.mockResolvedValueOnce('https://signed.example.com/tenant-file');

      const url = await service.getSignedUrlForKey('report.pdf', 7200, TENANT_ID);

      expect(url).toBe('https://signed.example.com/tenant-file');
    });

    it('should use default expiresIn of 3600', async () => {
      const { getSignedUrl } = s3Presigner as unknown as { getSignedUrl: jest.Mock };
      getSignedUrl.mockResolvedValueOnce('https://signed.example.com/file');

      await service.getSignedUrlForKey('file.pdf');

      expect(getSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        expiresIn: 3600,
      });
    });
  });
});
