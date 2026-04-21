import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard, UserRole } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import { WebhookSubscriptionService } from './webhook-subscription.service';
import {
  CreateWebhookSubscriptionDto,
  UpdateWebhookSubscriptionDto,
  TestWebhookPayloadDto,
  WebhookSubscriptionQueryDto,
} from './dto/webhook-subscription.dto';

@ApiTags('webhook-subscriptions')
@Controller('v1/webhook-subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WebhookSubscriptionController {
  constructor(private readonly service: WebhookSubscriptionService) {}

  /**
   * POST /v1/webhook-subscriptions
   * Create a new webhook subscription
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crea sottoscrizione webhook' })
  @ApiResponse({ status: 201, description: 'Sottoscrizione creata' })
  @ApiResponse({ status: 400, description: 'URL non HTTPS o evento non valido' })
  async create(
    @TenantId() tenantId: string,
    @Body() dto: CreateWebhookSubscriptionDto,
  ): Promise<ReturnType<typeof this.service.create>> {
    return this.service.create(tenantId, dto);
  }

  /**
   * GET /v1/webhook-subscriptions
   * List all webhook subscriptions with pagination and filters
   */
  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Elenca sottoscrizioni webhook' })
  @ApiResponse({ status: 200, description: 'Lista sottoscrizioni restituita' })
  async findAll(
    @TenantId() tenantId: string,
    @Query() query: WebhookSubscriptionQueryDto,
  ): Promise<ReturnType<typeof this.service.findAll>> {
    return this.service.findAll(tenantId, query);
  }

  /**
   * GET /v1/webhook-subscriptions/:id
   * Get single webhook subscription
   */
  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Dettaglio sottoscrizione webhook' })
  @ApiResponse({ status: 200, description: 'Sottoscrizione restituita' })
  @ApiResponse({ status: 404, description: 'Sottoscrizione non trovata' })
  async findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReturnType<typeof this.service.findOne>> {
    return this.service.findOne(tenantId, id);
  }

  /**
   * PATCH /v1/webhook-subscriptions/:id
   * Update webhook subscription
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Aggiorna sottoscrizione webhook' })
  @ApiResponse({ status: 200, description: 'Sottoscrizione aggiornata' })
  @ApiResponse({ status: 404, description: 'Sottoscrizione non trovata' })
  async update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWebhookSubscriptionDto,
  ): Promise<ReturnType<typeof this.service.update>> {
    return this.service.update(tenantId, id, dto);
  }

  /**
   * DELETE /v1/webhook-subscriptions/:id
   * Disable (soft delete) webhook subscription
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Disabilita sottoscrizione webhook' })
  @ApiResponse({ status: 204, description: 'Sottoscrizione disabilitata' })
  @ApiResponse({ status: 404, description: 'Sottoscrizione non trovata' })
  async remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.service.remove(tenantId, id);
  }

  /**
   * POST /v1/webhook-subscriptions/:id/test
   * Send test payload to webhook subscription
   */
  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Invia test payload a sottoscrizione webhook' })
  @ApiResponse({ status: 200, description: 'Test inviato (esito: true/false)' })
  @ApiResponse({ status: 404, description: 'Sottoscrizione non trovata' })
  async test(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TestWebhookPayloadDto,
  ): Promise<{ success: boolean }> {
    const success = await this.service.sendTest(tenantId, id, dto.event);
    return { success };
  }
}
