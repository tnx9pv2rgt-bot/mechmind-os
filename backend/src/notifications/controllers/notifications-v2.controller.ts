/**
 * Notifications v2 Controller
 * API endpoints for enhanced notification system
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';
import { CurrentTenant } from '@auth/decorators/current-user.decorator';
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

@ApiTags('Notifiche v2')
@Controller('api/notifications/v2')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsV2Controller {
  constructor(private readonly notificationService: NotificationV2Service) {}

  @Get('history')
  @ApiOperation({ summary: 'Ottieni cronologia notifiche' })
  @ApiResponse({ status: 200, description: 'Cronologia restituita' })
  // eslint-disable-next-line sonarjs/no-duplicate-string
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async getHistory(
    @CurrentTenant() tenantId: string,
    @Query('customerId') customerId: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.notificationService.getHistory(tenantId, customerId, {
      type: type as NotificationType,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });
  }

  @Post('send')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Invia notifica immediata' })
  @ApiResponse({ status: 201, description: 'Notifica inviata' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  // eslint-disable-next-line sonarjs/no-duplicate-string
  @ApiResponse({ status: 403, description: 'Accesso negato' })
  async send(@Body() dto: SendNotificationDto) {
    return this.notificationService.sendImmediate(dto);
  }

  @Post('queue')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Accoda notifica per invio differito' })
  @ApiResponse({ status: 201, description: 'Notifica accodata' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  @ApiResponse({ status: 403, description: 'Accesso negato' })
  async queue(@Body() dto: CreateNotificationDTO) {
    return this.notificationService.queueNotification(dto);
  }

  @Post('batch')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Invia notifiche in batch' })
  @ApiResponse({ status: 201, description: 'Batch inviato' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  @ApiResponse({ status: 403, description: 'Accesso negato' })
  async sendBatch(@Body() dto: { notifications: CreateNotificationDTO[] }) {
    return this.notificationService.sendBatch(dto.notifications);
  }

  @Post('process-pending')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Processa notifiche in attesa' })
  @ApiResponse({ status: 201, description: 'Notifiche processate' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  @ApiResponse({ status: 403, description: 'Accesso negato' })
  async processPending() {
    return this.notificationService.processPending();
  }

  @Get('templates')
  @ApiOperation({ summary: 'Ottieni template disponibili' })
  @ApiResponse({ status: 200, description: 'Lista template restituita' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async getTemplates() {
    return {
      templates: this.notificationService.getAvailableTemplates(),
    };
  }

  @Post('templates/preview')
  @ApiOperation({ summary: 'Anteprima messaggio da template' })
  @ApiResponse({ status: 201, description: 'Anteprima generata' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
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
  @ApiOperation({ summary: 'Ottieni preferenze notifiche cliente' })
  @ApiResponse({ status: 200, description: 'Preferenze restituite' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async getPreferences(@Query('customerId') customerId: string) {
    return this.notificationService.getPreferences(customerId);
  }

  @Post('preferences')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Aggiorna preferenza notifiche' })
  @ApiResponse({ status: 201, description: 'Preferenza aggiornata' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  @ApiResponse({ status: 403, description: 'Accesso negato' })
  async updatePreference(@Body() dto: UpdatePreferenceDto) {
    await this.notificationService.updatePreference(dto.customerId, dto.channel, dto.enabled);
    return { success: true };
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Ottieni stato notifica per ID' })
  @ApiResponse({ status: 200, description: 'Stato restituito' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  // eslint-disable-next-line sonarjs/no-duplicate-string
  @ApiResponse({ status: 404, description: 'Risorsa non trovata' })
  async getStatus(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<{
    id: string;
    status: string;
    channel: string;
    type: string;
    sentAt: Date | null;
    deliveredAt: Date | null;
    failedAt: Date | null;
    retries: number;
    error: string | null;
  }> {
    const notification = await this.notificationService.getNotificationById(tenantId, id);
    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found`);
    }
    return {
      id: notification.id,
      status: notification.status,
      channel: notification.channel,
      type: notification.type,
      sentAt: notification.sentAt,
      deliveredAt: notification.deliveredAt,
      failedAt: notification.failedAt,
      retries: notification.retries,
      error: notification.error,
    };
  }

  @Post(':id/retry')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Ritenta invio notifica fallita' })
  @ApiResponse({ status: 201, description: 'Retry avviato' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  @ApiResponse({ status: 403, description: 'Accesso negato' })
  @ApiResponse({ status: 404, description: 'Risorsa non trovata' })
  async retry(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.notificationService.retryNotification(tenantId, id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Elimina notifica per ID' })
  @ApiResponse({ status: 200, description: 'Notifica eliminata' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  @ApiResponse({ status: 403, description: 'Accesso negato' })
  @ApiResponse({ status: 404, description: 'Risorsa non trovata' })
  async delete(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    await this.notificationService.deleteNotification(tenantId, id);
    return { success: true };
  }
}
