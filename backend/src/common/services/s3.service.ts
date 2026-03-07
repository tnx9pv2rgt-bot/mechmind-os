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

  constructor(private readonly config: ConfigService) {
    this.s3 = new AWS.S3({
      region: this.config.get<string>('AWS_REGION', 'eu-west-1'),
    });
  }

  async upload(
    bucket: string,
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<AWS.S3.ManagedUpload.SendData> {
    return this.s3.upload({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }).promise();
  }

  async getSignedUrl(bucket: string, key: string, expiresIn: number): Promise<string> {
    return this.s3.getSignedUrlPromise('getObject', {
      Bucket: bucket,
      Key: key,
      Expires: expiresIn,
    });
  }

  async delete(bucket: string, key: string): Promise<void> {
    await this.s3.deleteObject({
      Bucket: bucket,
      Key: key,
    }).promise();
  }
}
