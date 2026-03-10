/**
 * MechMind OS - S3 Service
 *
 * AWS S3 operations for file storage
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';

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

  async upload(
    bucket: string,
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<AWS.S3.ManagedUpload.SendData> {
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
   * Upload a buffer directly to S3 using default bucket
   */
  async uploadBuffer(
    body: Buffer,
    key: string,
    contentType: string,
  ): Promise<AWS.S3.ManagedUpload.SendData> {
    return this.s3
      .upload({
        Bucket: this.defaultBucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
      .promise();
  }

  async getSignedUrl(bucket: string, key: string, expiresIn: number): Promise<string> {
    return this.s3.getSignedUrlPromise('getObject', {
      Bucket: bucket,
      Key: key,
      Expires: expiresIn,
    });
  }

  /**
   * Get signed URL for a key using default bucket
   */
  async getSignedUrlForKey(key: string, expiresIn: number = 3600): Promise<string> {
    return this.s3.getSignedUrlPromise('getObject', {
      Bucket: this.defaultBucket,
      Key: key,
      Expires: expiresIn,
    });
  }

  async delete(bucket: string, key: string): Promise<void> {
    await this.s3
      .deleteObject({
        Bucket: bucket,
        Key: key,
      })
      .promise();
  }
}
