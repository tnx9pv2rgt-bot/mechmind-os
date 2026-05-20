import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from '../services/notifications.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../auth/decorators/current-user.decorator';
import { PrismaService } from '../../common/services/prisma.service';
import { NotificationStatus } from '@prisma/client';

@ApiTags('Notifiche Legacy')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Ottieni lista notifiche' })
  @ApiResponse({ status: 200, description: 'Lista notifiche restituita' })
  // eslint-disable-next-line sonarjs/no-duplicate-string
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async getNotifications(
    @CurrentTenant() tenantId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('unreadOnly') unreadOnly: string = 'false',
  ): Promise<{
    notifications: {
      id: string;
      type: string;
      message: string;
      status: string;
      createdAt: Date;
      isRead: boolean;
    }[];
    pagination: { page: number; limit: number; total: number };
  }> {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const filterUnread = unreadOnly === 'true';

    const where = {
      tenantId,
      ...(filterUnread && { status: { not: NotificationStatus.DELIVERED as NotificationStatus } }),
    };

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        select: {
          id: true,
          type: true,
          message: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      notifications: notifications.map(n => ({
        ...n,
        type: n.type as string,
        status: n.status as string,
        isRead: n.status === NotificationStatus.DELIVERED,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
      },
    };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Ottieni conteggio notifiche non lette' })
  @ApiResponse({ status: 200, description: 'Conteggio restituito' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async getUnreadCount(@CurrentTenant() tenantId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: {
        tenantId,
        status: { not: NotificationStatus.DELIVERED },
      },
    });

    return { count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Segna notifica come letta' })
  @ApiResponse({ status: 200, description: 'Notifica segnata come letta' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  @ApiResponse({ status: 404, description: 'Risorsa non trovata' })
  async markAsRead(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean; notificationId: string }> {
    await this.prisma.notification.updateMany({
      where: { id, tenantId },
      data: { status: NotificationStatus.DELIVERED, deliveredAt: new Date() },
    });

    return { success: true, notificationId: id };
  }

  @Post('mark-all-read')
  @ApiOperation({ summary: 'Segna tutte le notifiche come lette' })
  @ApiResponse({ status: 201, description: 'Tutte le notifiche segnate come lette' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async markAllAsRead(
    @CurrentTenant() tenantId: string,
  ): Promise<{ success: boolean; updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        tenantId,
        status: { not: NotificationStatus.DELIVERED },
      },
      data: { status: NotificationStatus.DELIVERED, deliveredAt: new Date() },
    });

    return { success: true, updated: result.count };
  }

  @Post('test')
  @ApiOperation({ summary: 'Invia notifica di test' })
  @ApiResponse({ status: 201, description: 'Notifica di test inviata' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async sendTestNotification(
    @CurrentTenant() tenantId: string,
    @Body() body: { userId: string },
  ): Promise<{ success: boolean; message: string }> {
    await this.notificationsService.sendNotification({
      tenantId,
      userId: body.userId,
      type: 'booking_created',
      title: 'Notifica di Test',
      message: 'Questa è una notifica di test da MechMind OS',
      data: { test: true },
    });
    return { success: true, message: 'Notifica inviata' };
  }
}
