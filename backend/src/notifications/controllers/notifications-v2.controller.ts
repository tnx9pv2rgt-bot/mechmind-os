/**
 * Notifications v2 Controller
 * API endpoints for enhanced notification system
 */

import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';
import {
  NotificationV2Service,
  CreateNotificationDTO,
  NotificationTemplateData,
} from '../services/notification-v2.service';
import { NotificationType, NotificationChannel } from '@prisma/client';
import { UserRole } from '@auth/guards/roles.guard';

class SendNotificationDto implements CreateNotificationDTO {
  customerId: string;
  tenantId: string;
  type: NotificationType;
  channel: NotificationChannel;
  message?: string;
  metadata?: Record<string, unknown>;
}

class UpdatePreferenceDto {
  customerId: string;
  channel: NotificationChannel;
  enabled: boolean;
}

@Controller('api/notifications/v2')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsV2Controller {
  constructor(private readonly notificationService: NotificationV2Service) {}

  @Get('history')
  async getHistory(
    @Query('customerId') customerId: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.notificationService.getHistory(customerId, {
      type: type as NotificationType,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });
  }

  @Post('send')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST)
  async send(@Body() dto: SendNotificationDto) {
    return this.notificationService.sendImmediate(dto);
  }

  @Post('queue')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST)
  async queue(@Body() dto: CreateNotificationDTO) {
    return this.notificationService.queueNotification(dto);
  }

  @Post('batch')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async sendBatch(@Body() dto: { notifications: CreateNotificationDTO[] }) {
    return this.notificationService.sendBatch(dto.notifications);
  }

  @Post('process-pending')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async processPending() {
    return this.notificationService.processPending();
  }

  @Get('templates')
  async getTemplates() {
    return {
      templates: this.notificationService.getAvailableTemplates(),
    };
  }

  @Post('templates/preview')
  async previewTemplate(
    @Body() dto: { type: NotificationType; language: string; vars: Record<string, string> },
  ) {
    const message = this.notificationService.generateMessage(
      dto.type,
      dto.language,
      dto.vars as unknown as NotificationTemplateData,
    );
    return { message };
  }

  @Get('preferences')
  async getPreferences(@Query('customerId') customerId: string) {
    return this.notificationService.getPreferences(customerId);
  }

  @Post('preferences')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST)
  async updatePreference(@Body() dto: UpdatePreferenceDto) {
    await this.notificationService.updatePreference(dto.customerId, dto.channel, dto.enabled);
    return { success: true };
  }

  @Get(':id/status')
  async getStatus(@Param('id') id: string) {
    // Implementation would fetch notification by ID
    return { id, status: 'PENDING' };
  }

  @Post(':id/retry')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST)
  async retry(@Param('id') id: string) {
    return this.notificationService.retryNotification(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async delete(@Param('id') _id: string) {
    // Implementation would delete notification
    return { success: true };
  }
}
