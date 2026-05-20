/**
 * MechMind OS - S3 Service
 *
 * AWS S3 operations for file storage with tenant isolation
 * Uses AWS SDK v3 (@aws-sdk/client-s3)
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as path from 'path';

export interface S3UploadResult {
  Location: string;
  ETag: string;
  Bucket: string;
  Key: string;
}

@Injectable()
export class S3Service {
  private readonly s3: S3Client;
  private readonly defaultBucket: string;
  private readonly region: string;

  constructor(private readonly config: ConfigService) {
    this.region = this.config.get<string>('AWS_REGION', 'eu-west-1');
    this.s3 = new S3Client({ region: this.region });
    this.defaultBucket = this.config.get<string>('AWS_S3_BUCKET', 'mechmind-uploads');
  }

  /**
   * Validate key to prevent path traversal attacks
   */
  private validateKey(key: string): void {
    const normalized = path.posix.normalize(key);
    if (normalized.startsWith('..') || normalized.includes('/../') || key.includes('..')) {
      throw new BadRequestException('Invalid file path: path traversal detected');
    }
  }

  /**
   * Build tenant-scoped key
   */
  private buildTenantKey(tenantId: string, key: string): string {
    this.validateKey(key);
    return `tenants/${tenantId}/${key}`;
  }

  async upload(
    bucket: string,
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<S3UploadResult> {
    this.validateKey(key);
    await this.s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return {
      Location: `https://${bucket}.s3.${this.region}.amazonaws.com/${key}`,
      ETag: '',
      Bucket: bucket,
      Key: key,
    };
  }

  /**
   * Upload a buffer with tenant isolation
   */
  async uploadBuffer(
    body: Buffer,
    key: string,
    contentType: string,
    tenantId?: string,
  ): Promise<S3UploadResult> {
    const finalKey = tenantId ? this.buildTenantKey(tenantId, key) : key;
    this.validateKey(finalKey);
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.defaultBucket,
        Key: finalKey,
        Body: body,
        ContentType: contentType,
      }),
    );
    return {
      Location: `https://${this.defaultBucket}.s3.${this.region}.amazonaws.com/${finalKey}`,
      ETag: '',
      Bucket: this.defaultBucket,
      Key: finalKey,
    };
  }

  async getSignedDownloadUrl(bucket: string, key: string, expiresIn: number): Promise<string> {
    this.validateKey(key);
    return getSignedUrl(this.s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
  }

  /**
   * Get signed URL with tenant isolation
   */
  async getSignedUrlForKey(
    key: string,
    expiresIn: number = 3600,
    tenantId?: string,
  ): Promise<string> {
    const finalKey = tenantId ? this.buildTenantKey(tenantId, key) : key;
    this.validateKey(finalKey);
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.defaultBucket, Key: finalKey }),
      { expiresIn },
    );
  }

  async delete(bucket: string, key: string): Promise<void> {
    this.validateKey(key);
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
  }
}
