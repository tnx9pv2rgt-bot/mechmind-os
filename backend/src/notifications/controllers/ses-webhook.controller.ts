import { Controller, Post, Body, Headers, Logger } from '@nestjs/common';

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

@Controller('webhooks/ses')
export class SesWebhookController {
  private readonly logger = new Logger(SesWebhookController.name);

  @Post('bounce')
  async handleBounce(
    @Body() payload: { Message: string },
    @Headers('x-amz-sns-message-type') messageType: string,
  ): Promise<void> {
    this.logger.log('Received SES bounce notification');

    try {
      const message: SesEvent = JSON.parse(payload.Message);

      if (message.eventType === 'Bounce' && message.bounce) {
        for (const recipient of message.bounce.bouncedRecipients) {
          this.logger.warn(`Bounce received for ${recipient.emailAddress}: ${recipient.status}`);

          // Update email log status
          await this.updateEmailStatus(message.mail.messageId, 'bounced', {
            reason: message.bounce.bounceType,
            subType: message.bounce.bounceSubType,
          });

          // If hard bounce, mark email as invalid
          if (message.bounce.bounceType === 'Permanent') {
            await this.markEmailAsInvalid(recipient.emailAddress);
          }
        }
      }
    } catch (error) {
      this.logger.error('Error processing bounce:', error.message);
    }
  }

  @Post('complaint')
  async handleComplaint(
    @Body() payload: { Message: string },
    @Headers('x-amz-sns-message-type') messageType: string,
  ): Promise<void> {
    this.logger.log('Received SES complaint notification');

    try {
      const message: SesEvent = JSON.parse(payload.Message);

      if (message.eventType === 'Complaint' && message.complaint) {
        for (const recipient of message.complaint.complainedRecipients) {
          this.logger.warn(`Complaint received from ${recipient.emailAddress}`);

          // Update email log status
          await this.updateEmailStatus(message.mail.messageId, 'complained', {
            subType: message.complaint.complaintSubType,
          });

          // Immediately unsubscribe and flag
          await this.unsubscribeEmail(recipient.emailAddress);
        }
      }
    } catch (error) {
      this.logger.error('Error processing complaint:', error.message);
    }
  }

  @Post('delivery')
  async handleDelivery(@Body() payload: { Message: string }): Promise<void> {
    try {
      const message: SesEvent = JSON.parse(payload.Message);

      if (message.eventType === 'Delivery' && message.delivery) {
        this.logger.log(`Email delivered: ${message.mail.messageId}`);

        await this.updateEmailStatus(message.mail.messageId, 'delivered', {
          deliveredAt: message.delivery.timestamp,
        });
      }
    } catch (error) {
      this.logger.error('Error processing delivery:', error.message);
    }
  }

  private async updateEmailStatus(
    messageId: string,
    status: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    // Implementation would update database
    this.logger.log(`Updating email ${messageId} status to ${status}`);
  }

  private async markEmailAsInvalid(email: string): Promise<void> {
    this.logger.warn(`Marking email as invalid: ${email}`);
    // Implementation would update customer record
  }

  private async unsubscribeEmail(email: string): Promise<void> {
    this.logger.warn(`Unsubscribing email: ${email}`);
    // Implementation would update subscription status
  }
}
