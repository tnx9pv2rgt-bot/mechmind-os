import {
  Controller,
  Sse,
  UseGuards,
  Req,
  MessageEvent,
  Logger,
  Headers,
  Query,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SseService } from '../services/sse.service';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: any;
}
import { v4 as uuidv4 } from 'uuid';

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
  notificationsStream(
    @Req() req: AuthenticatedRequest,
    @Headers('last-event-id') lastEventId?: string,
    @Query('userOnly') userOnly?: string,
  ): Observable<MessageEvent> {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;

    if (!userId || !tenantId) {
      throw new Error('User not authenticated');
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
  personalNotificationsStream(
    @Req() req: AuthenticatedRequest,
    @Headers('last-event-id') lastEventId?: string,
  ): Observable<MessageEvent> {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;

    if (!userId || !tenantId) {
      throw new Error('User not authenticated');
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
