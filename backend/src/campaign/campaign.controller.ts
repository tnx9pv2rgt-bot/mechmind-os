import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/guards/roles.guard';
import { CurrentTenant } from '../auth/decorators/current-user.decorator';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto, UpdateCampaignDto, ScheduleCampaignDto } from './dto/campaign.dto';

@ApiTags('Campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('campaigns')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Crea una nuova campagna marketing' })
  @ApiResponse({ status: 201, description: 'Campagna creata' })
  async create(@CurrentTenant() tenantId: string, @Body() dto: CreateCampaignDto) {
    const campaign = await this.campaignService.create(tenantId, dto);
    return { success: true, data: campaign };
  }

  @Get()
  @ApiOperation({ summary: 'Lista campagne marketing' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'CANCELLED'],
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista campagne' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.campaignService.findAll(
      tenantId,
      status,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
    return { success: true, ...result };
  }

  @Get('segments/preview')
  @ApiOperation({ summary: 'Anteprima destinatari per segmento' })
  @ApiQuery({ name: 'segmentType', required: false })
  @ApiResponse({ status: 200, description: 'Anteprima destinatari' })
  async previewRecipients(
    @CurrentTenant() tenantId: string,
    @Query('segmentType') segmentType?: string,
  ) {
    const result = await this.campaignService.previewRecipients(tenantId, segmentType);
    return { success: true, data: result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Dettaglio campagna con statistiche' })
  // eslint-disable-next-line sonarjs/no-duplicate-string
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Dettaglio campagna' })
  @ApiResponse({ status: 404, description: 'Campagna non trovata' })
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const campaign = await this.campaignService.findOne(id, tenantId);
    return { success: true, data: campaign };
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Statistiche campagna' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Statistiche campagna' })
  async getStats(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const stats = await this.campaignService.getStats(id, tenantId);
    return { success: true, data: stats };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Modifica campagna (solo DRAFT)' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Campagna aggiornata' })
  @ApiResponse({ status: 400, description: 'Solo campagne in bozza modificabili' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    const campaign = await this.campaignService.update(id, tenantId, dto);
    return { success: true, data: campaign };
  }

  @Post(':id/send')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invia campagna ai destinatari' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Campagna inviata' })
  @ApiResponse({ status: 400, description: 'Campagna non inviabile' })
  async send(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const campaign = await this.campaignService.send(id, tenantId);
    return { success: true, data: campaign };
  }

  @Post(':id/schedule')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Programma invio campagna' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Campagna programmata' })
  async schedule(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: ScheduleCampaignDto,
  ) {
    const campaign = await this.campaignService.schedule(id, tenantId, new Date(dto.scheduledAt));
    return { success: true, data: campaign };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Elimina campagna (solo DRAFT)' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Campagna eliminata' })
  @ApiResponse({ status: 400, description: 'Solo campagne in bozza eliminabili' })
  async remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.campaignService.remove(id, tenantId);
    return { success: true, message: 'Campagna eliminata' };
  }
}
