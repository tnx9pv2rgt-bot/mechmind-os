import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { NotificationOrchestratorService } from '../services/notification.service';
import { EmailService } from '../email/email.service';
import { SmsService } from '../sms/sms.service';
import {
  SendNotificationDto,
  SendBookingConfirmationDto,
  SendBookingReminderDto,
  SendInvoiceReadyDto,
  SendGdprExportDto,
  BulkNotificationDto,
  TestNotificationDto,
  NotificationType,
  NotificationChannel,
  NotificationStatusDto,
} from '../dto/send-notification.dto';

@ApiTags('Notifications')
@Controller('api/v1/notifications')
export class NotificationsApiController {
  private readonly logger = new Logger(NotificationsApiController.name);

  constructor(
    private readonly notificationService: NotificationOrchestratorService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
  ) {}

  /**
   * Send a generic notification
   */
  @Post('send')
  @ApiOperation({ summary: 'Send a notification to a customer' })
  @ApiResponse({ status: 200, description: 'Notification sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async sendNotification(@Body() dto: SendNotificationDto) {
    const result = await this.notificationService.notifyCustomer(
      dto.customerId,
      dto.tenantId,
      dto.type,
      dto.data,
      dto.channel,
    );

    return {
      success: result.success,
      channel: result.channel,
      messageId: result.messageId,
      fallbackUsed: result.fallbackUsed,
      ...(result.error && { error: result.error }),
    };
  }

  /**
   * Send booking confirmation
   */
  @Post('booking/confirmation')
  @ApiOperation({ summary: 'Send booking confirmation notification' })
  @ApiResponse({ status: 200, description: 'Confirmation sent' })
  async sendBookingConfirmation(@Body() dto: SendBookingConfirmationDto) {
    const result = await this.notificationService.notifyCustomer(
      dto.customerId,
      dto.tenantId,
      NotificationType.BOOKING_CONFIRMATION,
      {
        service: dto.service,
        date: dto.date,
        time: dto.time,
        vehicle: dto.vehicle,
        bookingCode: dto.bookingCode,
        notes: dto.notes,
      },
      dto.channel || NotificationChannel.AUTO,
    );

    return {
      success: result.success,
      channel: result.channel,
      messageId: result.messageId,
      fallbackUsed: result.fallbackUsed,
    };
  }

  /**
   * Send booking reminder
   */
  @Post('booking/reminder')
  @ApiOperation({ summary: 'Send booking reminder notification' })
  @ApiResponse({ status: 200, description: 'Reminder sent' })
  async sendBookingReminder(@Body() dto: SendBookingReminderDto) {
    const result = await this.notificationService.notifyCustomer(
      dto.customerId,
      dto.tenantId,
      NotificationType.BOOKING_REMINDER,
      {
        service: dto.service,
        date: dto.date,
        time: dto.time,
        vehicle: dto.vehicle,
        bookingCode: dto.bookingCode,
        reminderType: dto.reminderType,
      },
      dto.channel || NotificationChannel.AUTO,
    );

    return {
      success: result.success,
      channel: result.channel,
      messageId: result.messageId,
      fallbackUsed: result.fallbackUsed,
    };
  }

  /**
   * Send invoice ready notification
   */
  @Post('invoice/ready')
  @ApiOperation({ summary: 'Send invoice ready notification' })
  @ApiResponse({ status: 200, description: 'Invoice notification sent' })
  async sendInvoiceReady(@Body() dto: SendInvoiceReadyDto) {
    const result = await this.notificationService.notifyCustomer(
      dto.customerId,
      dto.tenantId,
      NotificationType.INVOICE_READY,
      {
        invoiceNumber: dto.invoiceNumber,
        invoiceDate: dto.invoiceDate,
        amount: dto.amount,
        downloadUrl: dto.downloadUrl,
      },
      dto.channel || NotificationChannel.AUTO,
    );

    return {
      success: result.success,
      channel: result.channel,
      messageId: result.messageId,
      fallbackUsed: result.fallbackUsed,
    };
  }

  /**
   * Send GDPR export ready notification
   */
  @Post('gdpr/export-ready')
  @ApiOperation({ summary: 'Send GDPR data export ready notification' })
  @ApiResponse({ status: 200, description: 'Export notification sent' })
  async sendGdprExportReady(@Body() dto: SendGdprExportDto) {
    const result = await this.notificationService.notifyCustomer(
      dto.customerId,
      'system', // GDPR operations are system-wide
      NotificationType.GDPR_EXPORT_READY,
      {
        downloadUrl: dto.downloadUrl,
        expiryDate: dto.expiryDate,
        requestId: dto.requestId,
      },
      NotificationChannel.EMAIL, // GDPR always via email for security
    );

    return {
      success: result.success,
      channel: result.channel,
      messageId: result.messageId,
    };
  }

  /**
   * Send bulk notifications
   */
  @Post('bulk')
  @ApiOperation({ summary: 'Send notifications to multiple customers' })
  @ApiResponse({ status: 200, description: 'Bulk notifications processed' })
  async sendBulkNotifications(@Body() dto: BulkNotificationDto) {
    const results = await this.notificationService.sendBulkNotifications(
      dto.notifications,
      dto.options,
    );

    return results;
  }

  /**
   * Queue notification for later
   */
  @Post('queue')
  @ApiOperation({ summary: 'Queue notification for scheduled delivery' })
  @ApiResponse({ status: 200, description: 'Notification queued' })
  async queueNotification(@Body() dto: SendNotificationDto & { delayMinutes?: number }) {
    const delayMs = dto.delayMinutes ? dto.delayMinutes * 60 * 1000 : undefined;
    
    const result = await this.notificationService.queueNotification(dto, delayMs);

    return {
      queued: true,
      jobId: result.jobId,
      scheduledFor: result.scheduledFor,
    };
  }

  /**
   * Test notification
   */
  @Post('test')
  @ApiOperation({ summary: 'Send test notification' })
  @ApiResponse({ status: 200, description: 'Test notification sent' })
  async sendTestNotification(@Body() dto: TestNotificationDto) {
    let result;

    if (dto.channel === NotificationChannel.EMAIL || dto.channel === NotificationChannel.BOTH) {
      result = await this.emailService.sendRawEmail({
        to: dto.recipient,
        subject: 'Test Email da MechMind',
        html: `
          <h1>Test Email</h1>
          <p>Questa è un'email di test dal sistema MechMind.</p>
          <p>Tipo: ${dto.type}</p>
          <p>Data: ${new Date().toISOString()}</p>
        `,
      });
    }

    if (dto.channel === NotificationChannel.SMS || dto.channel === NotificationChannel.BOTH) {
      result = await this.smsService.sendCustom(
        dto.recipient,
        `Test SMS da MechMind - Tipo: ${dto.type} - Data: ${new Date().toLocaleString('it-IT')}`,
        'test',
      );
    }

    return {
      success: result?.success ?? false,
      channel: dto.channel,
      messageId: result?.messageId,
    };
  }

  /**
   * Get notification status
   */
  @Get('status/:notificationId')
  @ApiOperation({ summary: 'Get notification delivery status' })
  @ApiParam({ name: 'notificationId', description: 'Notification ID' })
  async getNotificationStatus(@Param('notificationId') notificationId: string) {
    // Query from database
    // For now, return mock data
    return {
      id: notificationId,
      status: 'delivered',
      channel: 'email',
      sentAt: new Date().toISOString(),
      deliveredAt: new Date().toISOString(),
    };
  }

  /**
   * Get SMS templates
   */
  @Get('sms/templates')
  @ApiOperation({ summary: 'Get available SMS templates' })
  @ApiResponse({ status: 200, description: 'Templates retrieved' })
  async getSmsTemplates() {
    return this.smsService.getTemplates();
  }

  /**
   * Calculate SMS cost estimate
   */
  @Post('sms/calculate-cost')
  @ApiOperation({ summary: 'Calculate SMS cost estimate' })
  @ApiResponse({ status: 200, description: 'Cost calculated' })
  async calculateSmsCost(@Body('message') message: string) {
    if (!message) {
      throw new BadRequestException('Message is required');
    }

    return this.smsService.calculateCost(message);
  }

  /**
   * Validate phone number
   */
  @Post('sms/validate-phone')
  @ApiOperation({ summary: 'Validate phone number format' })
  @ApiResponse({ status: 200, description: 'Phone validated' })
  async validatePhone(@Body('phone') phone: string) {
    if (!phone) {
      throw new BadRequestException('Phone is required');
    }

    const result = await this.smsService.validatePhoneNumber(phone);
    return result;
  }

  /**
   * Get email delivery status from Resend
   */
  @Get('email/status/:emailId')
  @ApiOperation({ summary: 'Get email delivery status from Resend' })
  @ApiParam({ name: 'emailId', description: 'Resend Email ID' })
  async getEmailStatus(@Param('emailId') emailId: string) {
    const status = await this.emailService.getEmailStatus(emailId);
    
    if (!status) {
      throw new NotFoundException('Email not found');
    }

    return status;
  }

  /**
   * Get notification statistics
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get notification statistics' })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async getStats(
    @Query('tenantId') tenantId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    // Query statistics from database
    // For now, return mock data
    return {
      total: 0,
      byChannel: {
        sms: 0,
        email: 0,
      },
      byStatus: {
        sent: 0,
        delivered: 0,
        failed: 0,
      },
      byType: {},
      period: {
        from: from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        to: to || new Date().toISOString(),
      },
    };
  }

  /**
   * Health check for notification services
   */
  @Get('health')
  @ApiOperation({ summary: 'Check notification services health' })
  async healthCheck() {
    const [smsHealth, emailHealth] = await Promise.all([
      this.smsService.healthCheck(),
      Promise.resolve({ healthy: true }), // Email health check
    ]);

    return {
      sms: smsHealth,
      email: emailHealth,
      overall: smsHealth.healthy && emailHealth.healthy,
    };
  }

  /**
   * Get customer notification preferences
   */
  @Get('preferences/:customerId')
  @ApiOperation({ summary: 'Get customer notification preferences' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  async getCustomerPreferences(
    @Param('customerId') customerId: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.notificationService.getCustomerPreferences(customerId, tenantId);
  }

  /**
   * Update customer notification preferences
   */
  @Post('preferences/:customerId')
  @ApiOperation({ summary: 'Update customer notification preferences' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  async updateCustomerPreferences(
    @Param('customerId') customerId: string,
    @Query('tenantId') tenantId: string,
    @Body() preferences: any,
  ) {
    await this.notificationService.updateCustomerPreferences(
      customerId,
      tenantId,
      preferences,
    );

    return { updated: true };
  }
}
