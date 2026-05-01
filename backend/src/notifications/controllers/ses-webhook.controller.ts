import * as https from 'https';
import * as crypto from 'crypto';

import { Controller, Post, Body, Headers, Logger, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../../common/services/prisma.service';

interface SesEvent {
  eventType: 'Bounce' | 'Complaint' | 'Delivery' | 'Send';
  mail: {
    messageId: string;
    destination: string[];
    headers: Array<{ name: string; value: string }>;
    commonHeaders: {
      from: string[];
      to: string[];
      subject: string;
    };
  };
  bounce?: {
    bounceType: string;
    bounceSubType: string;
    bouncedRecipients: Array<{ emailAddress: string; status: string }>;
    timestamp: string;
  };
  complaint?: {
    complaintSubType?: string;
    complainedRecipients: Array<{ emailAddress: string }>;
    timestamp: string;
  };
  delivery?: {
    timestamp: string;
    recipients: string[];
  };
}

@ApiTags('Webhook SES')
@Controller('webhooks/ses')
export class SesWebhookController {
  private readonly logger = new Logger(SesWebhookController.name);
  private readonly certCache = new Map<string, string>();

  constructor(private readonly prisma: PrismaService) {}

  private async fetchCertificate(url: string): Promise<string> {
    if (this.certCache.has(url)) return this.certCache.get(url)!;
    return new Promise<string>((resolve, reject) => {
      https
        .get(url, res => {
          let data = '';
          res.on('data', (chunk: string) => (data += chunk));
          res.on('end', () => {
            this.certCache.set(url, data);
            resolve(data);
          });
          res.on('error', reject);
        })
        .on('error', reject);
    });
  }

  async verifySnsSignature(message: Record<string, unknown>): Promise<boolean> {
    let certUrl: URL;
    try {
      certUrl = new URL(message['SigningCertURL'] as string);
    } catch {
      return false;
    }

    if (certUrl.protocol !== 'https:' || !certUrl.hostname.endsWith('.amazonaws.com')) {
      return false;
    }

    const cert = await this.fetchCertificate(certUrl.href);

    const fieldsToSign =
      message['Type'] === 'Notification'
        ? ['Message', 'MessageId', 'Subject', 'Timestamp', 'TopicArn', 'Type']
        : ['Message', 'MessageId', 'SubscribeURL', 'Timestamp', 'Token', 'TopicArn', 'Type'];

    let stringToSign = '';
    for (const field of fieldsToSign) {
      // eslint-disable-next-line security/detect-object-injection
      if (message[field] !== undefined) {
        // eslint-disable-next-line security/detect-object-injection
        stringToSign += `${field}\n${message[field] as string}\n`;
      }
    }

    try {
      const verifier = crypto.createVerify('SHA1withRSA');
      verifier.update(stringToSign);
      return verifier.verify(cert, message['Signature'] as string, 'base64');
    } catch {
      return false;
    }
  }

  @Post('bounce')
  @ApiOperation({ summary: 'Gestione notifica bounce SES' })
  @ApiResponse({ status: 201, description: 'Bounce processato' })
  async handleBounce(
    @Body() payload: Record<string, unknown>,
    @Headers('x-amz-sns-message-type') _messageType: string,
  ): Promise<void> {
    this.logger.log('Received SES bounce notification');

    const valid = await this.verifySnsSignature(payload);
    if (!valid) {
      // eslint-disable-next-line sonarjs/no-duplicate-string
      throw new UnauthorizedException('Invalid SNS signature');
    }

    try {
      const message: SesEvent = JSON.parse(payload['Message'] as string);

      if (message.eventType === 'Bounce' && message.bounce) {
        for (const recipient of message.bounce.bouncedRecipients) {
          this.logger.warn(`Bounce received for ${recipient.emailAddress}: ${recipient.status}`);

          // Update email log status
          await this.updateEmailStatus(message.mail.messageId, 'bounced', {
            reason: message.bounce.bounceType,
            subType: message.bounce.bounceSubType,
          });

          // If hard bounce, mark email as invalid — pass notification ID for tenant scoping
          if (message.bounce.bounceType === 'Permanent') {
            const notif = await this.prisma.notification.findFirst({
              where: { messageId: message.mail.messageId },
              select: { id: true },
            });
            await this.markEmailAsInvalid(recipient.emailAddress, notif?.id);
          }
        }
      }
    } catch (error) {
      this.logger.error(
        'Error processing bounce:',
        // eslint-disable-next-line sonarjs/no-duplicate-string
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  @Post('complaint')
  @ApiOperation({ summary: 'Gestione notifica complaint SES' })
  @ApiResponse({ status: 201, description: 'Complaint processato' })
  async handleComplaint(
    @Body() payload: Record<string, unknown>,
    @Headers('x-amz-sns-message-type') _messageType: string,
  ): Promise<void> {
    this.logger.log('Received SES complaint notification');

    const valid = await this.verifySnsSignature(payload);
    if (!valid) {
      throw new UnauthorizedException('Invalid SNS signature');
    }

    try {
      const message: SesEvent = JSON.parse(payload['Message'] as string);

      if (message.eventType === 'Complaint' && message.complaint) {
        for (const recipient of message.complaint.complainedRecipients) {
          this.logger.warn(`Complaint received from ${recipient.emailAddress}`);

          // Update email log status
          await this.updateEmailStatus(message.mail.messageId, 'complained', {
            subType: message.complaint.complaintSubType,
          });

          // Immediately unsubscribe and flag — pass messageId for tenant scoping
          await this.unsubscribeEmail(recipient.emailAddress, message.mail.messageId);
        }
      }
    } catch (error) {
      this.logger.error(
        'Error processing complaint:',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  @Post('delivery')
  @ApiOperation({ summary: 'Gestione notifica delivery SES' })
  @ApiResponse({ status: 201, description: 'Delivery processato' })
  async handleDelivery(@Body() payload: Record<string, unknown>): Promise<void> {
    const valid = await this.verifySnsSignature(payload);
    if (!valid) {
      throw new UnauthorizedException('Invalid SNS signature');
    }

    try {
      const message: SesEvent = JSON.parse(payload['Message'] as string);

      if (message.eventType === 'Delivery' && message.delivery) {
        this.logger.log(`Email delivered: ${message.mail.messageId}`);

        await this.updateEmailStatus(message.mail.messageId, 'delivered', {
          deliveredAt: message.delivery.timestamp,
        });
      }
    } catch (error) {
      this.logger.error(
        'Error processing delivery:',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  private async updateEmailStatus(
    messageId: string,
    status: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    this.logger.log(`Updating email ${messageId} status to ${status}`);

    const statusMap: Record<string, 'DELIVERED' | 'FAILED'> = {
      delivered: 'DELIVERED',
      bounced: 'FAILED',
      complained: 'FAILED',
    };

    // eslint-disable-next-line security/detect-object-injection
    const mappedStatus = statusMap[status];
    if (!mappedStatus) return;

    const notification = await this.prisma.notification.findFirst({
      where: { messageId },
    });

    if (!notification) {
      this.logger.warn(`No notification found for messageId: ${messageId}`);
      return;
    }

    const updateData: Record<string, unknown> = {
      status: mappedStatus,
      metadata: notification.metadata
        ? {
            ...(notification.metadata as Record<string, unknown>),
            sesEvent: { status, ...metadata },
          }
        : { sesEvent: { status, ...metadata } },
    };

    if (mappedStatus === 'DELIVERED') {
      updateData.deliveredAt = metadata?.deliveredAt
        ? new Date(metadata.deliveredAt as string)
        : new Date();
    } else if (mappedStatus === 'FAILED') {
      updateData.failedAt = new Date();
      updateData.error = `SES ${status}: ${(metadata?.reason as string) ?? 'unknown'}`;
    }

    await this.prisma.notification.update({
      where: { id: notification.id },
      data: updateData,
    });
  }

  private async markEmailAsInvalid(email: string, sourceNotificationId?: string): Promise<void> {
    this.logger.warn(`Marking email as invalid: ${email}`);

    // If we have the source notification, scope to its tenant
    if (sourceNotificationId) {
      const sourceNotification = await this.prisma.notification.findUnique({
        where: { id: sourceNotificationId },
        select: { tenantId: true, customerId: true },
      });

      if (sourceNotification) {
        await this.prisma.customerNotificationPreference.upsert({
          where: {
            customerId_channel: { customerId: sourceNotification.customerId, channel: 'EMAIL' },
          },
          update: { enabled: false },
          create: {
            customerId: sourceNotification.customerId,
            channel: 'EMAIL',
            enabled: false,
          },
        });
        return;
      }
    }

    // Fallback: find bounced notifications scoped by channel + status
    const notifications = await this.prisma.notification.findMany({
      where: {
        channel: 'EMAIL',
        status: 'FAILED',
      },
      select: { customerId: true },
      take: 100,
      orderBy: { updatedAt: 'desc' },
    });

    const affectedCustomerIds = new Set<string>();
    for (const n of notifications) {
      affectedCustomerIds.add(n.customerId);
    }

    for (const customerId of affectedCustomerIds) {
      await this.prisma.customerNotificationPreference.upsert({
        where: {
          customerId_channel: { customerId, channel: 'EMAIL' },
        },
        update: { enabled: false },
        create: {
          customerId,
          channel: 'EMAIL',
          enabled: false,
        },
      });
    }
  }

  private async unsubscribeEmail(email: string, messageId?: string): Promise<void> {
    this.logger.warn(`Unsubscribing email: ${email}`);

    // Find the notification by messageId (from SES event) for precise scoping
    const notification = messageId
      ? await this.prisma.notification.findFirst({
          where: { messageId, channel: 'EMAIL' },
          select: { customerId: true, tenantId: true },
        })
      : null;

    if (!notification) {
      this.logger.warn(`No notification found for email unsubscribe: ${email}`);
      return;
    }

    // Disable EMAIL notification preference for this customer
    await this.prisma.customerNotificationPreference.upsert({
      where: {
        customerId_channel: { customerId: notification.customerId, channel: 'EMAIL' },
      },
      update: { enabled: false },
      create: {
        customerId: notification.customerId,
        channel: 'EMAIL',
        enabled: false,
      },
    });

    // Also revoke marketing consent — scoped by tenantId
    await this.prisma.customer.updateMany({
      where: { id: notification.customerId, tenantId: notification.tenantId },
      data: {
        marketingConsent: false,
        marketingConsentAt: new Date(),
      },
    });
  }
}
