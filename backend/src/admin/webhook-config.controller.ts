import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthRequest {
  user: { userId: string; tenantId: string };
}

@ApiTags('Webhooks Config')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('webhooks/config')
export class WebhookConfigController {
  @Get()
  @ApiOperation({ summary: 'Lista configurazioni webhook' })
  @ApiResponse({ status: 200, description: 'Configurazioni webhook del tenant' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  findAll(@Req() _req: AuthRequest): { success: boolean; data: unknown[] } {
    // Webhook configurations not yet stored in DB — return empty list
    return { success: true, data: [] };
  }
}
