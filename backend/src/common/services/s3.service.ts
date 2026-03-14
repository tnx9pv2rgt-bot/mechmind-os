/**
 * MechMind OS - S3 Service
 *
 * AWS S3 operations for file storage with tenant isolation
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import * as path from 'path';

@Injectable()
export class S3Service {
  private readonly s3: AWS.S3;
  private readonly defaultBucket: string;

  constructor(private readonly config: ConfigService) {
    this.s3 = new AWS.S3({
      region: this.config.get<string>('AWS_REGION', 'eu-west-1'),
    });
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
  ): Promise<AWS.S3.ManagedUpload.SendData> {
    this.validateKey(key);
    return this.s3
      .upload({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
      .promise();
  }

  /**
   * Upload a buffer with tenant isolation
   */
  async uploadBuffer(
    body: Buffer,
    key: string,
    contentType: string,
    tenantId?: string,
  ): Promise<AWS.S3.ManagedUpload.SendData> {
    const finalKey = tenantId ? this.buildTenantKey(tenantId, key) : key;
    this.validateKey(finalKey);
    return this.s3
      .upload({
        Bucket: this.defaultBucket,
        Key: finalKey,
        Body: body,
        ContentType: contentType,
      })
      .promise();
  }

  async getSignedUrl(bucket: string, key: string, expiresIn: number): Promise<string> {
    this.validateKey(key);
    return this.s3.getSignedUrlPromise('getObject', {
      Bucket: bucket,
      Key: key,
      Expires: expiresIn,
    });
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
    return this.s3.getSignedUrlPromise('getObject', {
      Bucket: this.defaultBucket,
      Key: finalKey,
      Expires: expiresIn,
    });
  }

  async delete(bucket: string, key: string): Promise<void> {
    this.validateKey(key);
    await this.s3
      .deleteObject({
        Bucket: bucket,
        Key: key,
      })
      .promise();
  }
}
