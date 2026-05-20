import {
  Controller,
  Sse,
  UseGuards,
  Req,
  MessageEvent,
  Logger,
  Headers,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SseService } from '../services/sse.service';
import { Request } from 'express';

type AuthenticatedRequest = Omit<Request, 'user'> & {
  user: { id: string; tenantId: string };
};
import { v4 as uuidv4 } from 'uuid';

@ApiTags('SSE Notifiche')
@Controller('notifications/sse')
@UseGuards(JwtAuthGuard)
export class SseController {
  private readonly logger = new Logger(SseController.name);

  constructor(private readonly sseService: SseService) {}

  /**
   * SSE endpoint for real-time notifications
   *
   * Client connects to: /api/notifications/sse/stream
   *
   * Headers:
   * - Authorization: Bearer <jwt_token>
   * - Last-Event-ID: <last_event_id> (optional, for reconnection)
   *
   * Query params:
   * - userOnly: boolean (optional, filter to user-specific notifications only)
   */
  @Sse('stream')
  @ApiOperation({ summary: 'Stream SSE notifiche in tempo reale' })
  @ApiResponse({ status: 200, description: 'Stream SSE connesso' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  notificationsStream(
    @Req() req: AuthenticatedRequest,
    @Headers('last-event-id') lastEventId?: string,
    @Query('userOnly') userOnly?: string,
  ): Observable<MessageEvent> {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;

    if (!userId || !tenantId) {
      throw new UnauthorizedException('User not authenticated');
    }
    const clientId = uuidv4();

    this.logger.log(
      `SSE connection request from user ${userId} (tenant: ${tenantId}, lastEventId: ${lastEventId || 'none'})`,
    );

    // Create event stream - filter by user if userOnly=true
    const targetUserId = userOnly === 'true' ? userId : undefined;

    return this.sseService.createEventStream(
      clientId,
      tenantId,
      targetUserId,
    ) as Observable<MessageEvent>;
  }

  /**
   * Alternative SSE endpoint that only sends notifications for the specific user
   * Useful for personal notification feeds
   */
  @Sse('stream/personal')
  @ApiOperation({ summary: 'Stream SSE notifiche personali utente' })
  @ApiResponse({ status: 200, description: 'Stream SSE personale connesso' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  personalNotificationsStream(
    @Req() req: AuthenticatedRequest,
    @Headers('last-event-id') _lastEventId?: string,
  ): Observable<MessageEvent> {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;

    if (!userId || !tenantId) {
      throw new UnauthorizedException('User not authenticated');
    }
    const clientId = uuidv4();

    this.logger.log(`Personal SSE connection request from user ${userId} (tenant: ${tenantId})`);

    return this.sseService.createEventStream(
      clientId,
      tenantId,
      userId, // Always filter by user
    ) as Observable<MessageEvent>;
  }
}
