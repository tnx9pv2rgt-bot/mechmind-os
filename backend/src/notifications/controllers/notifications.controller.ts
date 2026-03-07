import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from '../services/notifications.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('unreadOnly') unreadOnly: string = 'false',
  ) {
    // Mock implementation - in production query from database
    return {
      notifications: [],
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: 0,
      },
    };
  }

  @Get('unread-count')
  async getUnreadCount() {
    return { count: 0 };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    return { success: true, notificationId: id };
  }

  @Post('mark-all-read')
  async markAllAsRead() {
    return { success: true };
  }

  @Post('test')
  async sendTestNotification(@Body() body: { userId: string; tenantId: string }) {
    await this.notificationsService.sendNotification({
      tenantId: body.tenantId,
      userId: body.userId,
      type: 'booking_created',
      title: 'Test Notification',
      message: 'This is a test notification from MechMind OS',
      data: { test: true },
    });
    return { success: true, message: 'Notification sent' };
  }
}
