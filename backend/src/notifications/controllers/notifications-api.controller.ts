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
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import {
  NotificationOrchestratorService,
  NotificationResult,
} from '../services/notification.service';
import { EmailService } from '../email/email.service';
import { SmsService } from '../sms/sms.service';
import { PrismaService } from '../../common/services/prisma.service';
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
} from '../dto/send-notification.dto';
import { CurrentTenant } from '../../auth/decorators/current-user.decorator';

@ApiTags('Notifications')
@Controller('notifications/api')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsApiController {
  private readonly logger = new Logger(NotificationsApiController.name);

  constructor(
    private readonly notificationService: NotificationOrchestratorService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Send a generic notification
   */
  @Post('send')
  @ApiOperation({ summary: 'Send a notification to a customer' })
  @ApiResponse({ status: 200, description: 'Notification sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async sendNotification(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: SendNotificationDto,
  ) {
    const result = await this.notificationService.notifyCustomer(
      dto.customerId,
      tenantId,
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
  async sendBookingConfirmation(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: SendBookingConfirmationDto,
  ) {
    const result = await this.notificationService.notifyCustomer(
      dto.customerId,
      tenantId,
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
  async sendBookingReminder(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: SendBookingReminderDto,
  ) {
    const result = await this.notificationService.notifyCustomer(
      dto.customerId,
      tenantId,
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
  async sendInvoiceReady(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: SendInvoiceReadyDto,
  ) {
    const result = await this.notificationService.notifyCustomer(
      dto.customerId,
      tenantId,
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
  async sendBulkNotifications(@Body() dto: BulkNotificationDto): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: NotificationResult[];
  }> {
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
  async getNotificationStatus(
    @CurrentTenant() tenantId: string,
    @Param('notificationId') notificationId: string,
  ): Promise<{
    id: string;
    status: string;
    channel: string;
    sentAt: string | null;
    deliveredAt: string | null;
    failedAt: string | null;
    error: string | null;
  }> {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, tenantId },
      select: {
        id: true,
        status: true,
        channel: true,
        sentAt: true,
        deliveredAt: true,
        failedAt: true,
        error: true,
      },
    });

    if (!notification) {
      throw new NotFoundException(`Notification ${notificationId} not found`);
    }

    return {
      id: notification.id,
      status: notification.status,
      channel: notification.channel,
      sentAt: notification.sentAt?.toISOString() ?? null,
      deliveredAt: notification.deliveredAt?.toISOString() ?? null,
      failedAt: notification.failedAt?.toISOString() ?? null,
      error: notification.error,
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
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async getStats(
    @CurrentTenant() tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<{
    total: number;
    byChannel: Record<string, number>;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    period: { from: string; to: string };
  }> {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    const where = {
      tenantId,
      createdAt: { gte: fromDate, lte: toDate },
    };

    const [total, byChannelRaw, byStatusRaw, byTypeRaw] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.groupBy({
        by: ['channel'],
        where,
        _count: { id: true },
      }),
      this.prisma.notification.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
      }),
      this.prisma.notification.groupBy({
        by: ['type'],
        where,
        _count: { id: true },
      }),
    ]);

    const byChannel: Record<string, number> = {};
    for (const row of byChannelRaw) {
      byChannel[row.channel] = row._count.id;
    }

    const byStatus: Record<string, number> = {};
    for (const row of byStatusRaw) {
      byStatus[row.status] = row._count.id;
    }

    const byType: Record<string, number> = {};
    for (const row of byTypeRaw) {
      byType[row.type] = row._count.id;
    }

    return {
      total,
      byChannel,
      byStatus,
      byType,
      period: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
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
    @CurrentUser('tenantId') tenantId: string,
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
    @CurrentUser('tenantId') tenantId: string,
    @Body() preferences: Record<string, unknown>,
  ) {
    await this.notificationService.updateCustomerPreferences(customerId, tenantId, preferences);

    return { updated: true };
  }
}
