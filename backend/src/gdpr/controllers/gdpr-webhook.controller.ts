import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { GdprRequestService, DataSubjectRequestType } from '../services/gdpr-request.service';
import { LoggerService } from '@common/services/logger.service';

/**
 * GDPR Webhook Controller
 *
 * Handles incoming webhooks for GDPR-related events:
 * - Data subject requests from external forms
 * - Third-party consent updates
 * - Sub-processor notifications
 * - Automated deletion confirmations
 */
@Controller('webhooks/gdpr')
export class GdprWebhookController {
  constructor(
    private readonly requestService: GdprRequestService,
    private readonly loggerService: LoggerService,
  ) {}

  /**
   * Handle data subject request from external form
   *
   * @param body Webhook payload
   * @param signature Webhook signature for verification
   */
  @Post('requests')
  @HttpCode(HttpStatus.ACCEPTED)
  async handleDataSubjectRequest(
    @Body()
    body: {
      tenantId: string;
      requestType: string;
      requesterEmail?: string;
      requesterPhone?: string;
      customerId?: string;
      message?: string;
      source: string;
    },
    @Headers('x-webhook-signature') _signature?: string,
  ) {
    if (!body?.tenantId || !body?.requestType || !body?.source) {
      throw new BadRequestException('Missing required fields: tenantId, requestType, source');
    }

    this.loggerService.log(
      `Received data subject request webhook from ${body.source}`,
      'GdprWebhookController',
    );

    // Create the request
    const request = await this.requestService.createRequest({
      tenantId: body.tenantId,
      requestType: body.requestType as DataSubjectRequestType,
      requesterEmail: body.requesterEmail,
      requesterPhone: body.requesterPhone,
      customerId: body.customerId,
      source: body.source as 'EMAIL' | 'WEB_FORM' | 'PHONE' | 'MAIL',
      notes: body.message,
    });

    return {
      received: true,
      ticketNumber: request.ticketNumber,
      message: 'Your request has been received and will be processed within 30 days.',
    };
  }

  /**
   * Handle consent update from external source
   *
   * @param body Consent update payload
   */
  @Post('consent')
  @HttpCode(HttpStatus.OK)
  async handleConsentUpdate(
    @Body()
    body: {
      tenantId: string;
      customerId: string;
      consentType: string;
      granted: boolean;
      timestamp: string;
      source: string;
    },
  ) {
    if (!body?.tenantId || !body?.customerId || !body?.consentType) {
      throw new BadRequestException('Missing required fields: tenantId, customerId, consentType');
    }

    this.loggerService.log(
      `Received consent update webhook: customer=${body.customerId}, type=${body.consentType}, granted=${body.granted}`,
      'GdprWebhookController',
    );

    // Process consent update
    // This would typically delegate to GdprConsentService

    return { processed: true };
  }

  /**
   * Handle sub-processor data deletion confirmation
   *
   * @param body Deletion confirmation payload
   */
  @Post('deletion-confirmation')
  @HttpCode(HttpStatus.OK)
  async handleDeletionConfirmation(
    @Body()
    body: {
      subProcessor: string;
      customerId: string;
      deletionType: string;
      deletedAt: string;
      confirmationId: string;
    },
  ) {
    if (!body?.subProcessor || !body?.confirmationId) {
      throw new BadRequestException('Missing required fields: subProcessor, confirmationId');
    }

    this.loggerService.log(
      `Received deletion confirmation from ${body.subProcessor}: ${body.confirmationId}`,
      'GdprWebhookController',
    );

    // Log sub-processor deletion confirmation
    // This would update the deletion audit trail

    return { acknowledged: true };
  }

  /**
   * Verify webhook signature (placeholder)
   */
  private verifyWebhookSignature(_payload: string, signature?: string): boolean {
    if (!signature) return false;
    // In production: Implement HMAC verification
    return true;
  }
}
