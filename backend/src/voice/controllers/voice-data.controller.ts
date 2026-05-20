import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { CurrentTenant } from '@auth/decorators/current-user.decorator';
import { PrismaService } from '@common/services/prisma.service';

@ApiTags('Voice')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'voice', version: '1' })
export class VoiceDataController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('calls')
  @ApiOperation({ summary: 'Lista chiamate vocali del tenant' })
  @ApiResponse({ status: 200 })
  async getCalls(
    @CurrentTenant() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('callId') callId?: string,
  ): Promise<{ success: boolean; data: unknown[]; total: number }> {
    const take = Math.min(parseInt(limit || '50', 10), 100);
    const skip = (Math.max(parseInt(page || '1', 10), 1) - 1) * take;
    const where: Record<string, unknown> = { tenantId };
    if (callId) where.callId = callId;

    const [events, total] = await Promise.all([
      this.prisma.voiceWebhookEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        select: {
          id: true,
          callId: true,
          eventType: true,
          customerPhone: true,
          processed: true,
          processedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.voiceWebhookEvent.count({ where }),
    ]);

    return { success: true, data: events, total };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiche chiamate vocali del tenant' })
  @ApiResponse({ status: 200 })
  async getStats(@CurrentTenant() tenantId: string): Promise<{ success: boolean; data: unknown }> {
    const [total, processed, unprocessed] = await Promise.all([
      this.prisma.voiceWebhookEvent.count({ where: { tenantId } }),
      this.prisma.voiceWebhookEvent.count({ where: { tenantId, processed: true } }),
      this.prisma.voiceWebhookEvent.count({ where: { tenantId, processed: false } }),
    ]);

    const uniqueCalls = await this.prisma.voiceWebhookEvent.groupBy({
      by: ['callId'],
      where: { tenantId },
      _count: { callId: true },
    });

    return {
      success: true,
      data: {
        totalEvents: total,
        processedEvents: processed,
        pendingEvents: unprocessed,
        totalCalls: uniqueCalls.length,
        processingRate: total > 0 ? Math.round((processed / total) * 100) : 0,
      },
    };
  }
}
