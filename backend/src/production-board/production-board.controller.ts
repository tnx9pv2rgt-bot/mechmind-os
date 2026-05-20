import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../auth/decorators/current-user.decorator';
import { ProductionBoardService } from './production-board.service';
import { AssignBayDto } from './dto/assign-bay.dto';
import { MoveJobDto } from './dto/move-job.dto';
import { UpdateJobStatusDto } from './dto/update-status.dto';

@ApiTags('Production Board')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'production-board', version: '1' })
export class ProductionBoardController {
  constructor(private readonly productionBoardService: ProductionBoardService) {}

  @Get()
  @ApiOperation({ summary: 'Stato completo della lavagna di produzione' })
  @ApiResponse({ status: 200, description: 'Board state retrieved' })
  async getBoardState(
    @CurrentTenant() tenantId: string,
  ): Promise<{ success: boolean; data: unknown }> {
    const bays = await this.productionBoardService.getBoardState(tenantId);
    return { success: true, data: bays };
  }

  @Post('assign')
  @ApiOperation({ summary: 'Assegna ordine di lavoro a postazione' })
  @ApiResponse({ status: 200, description: 'Work order assigned to bay' })
  @ApiResponse({ status: 400, description: 'Bay not available' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async assignToBay(
    @CurrentTenant() tenantId: string,
    @Body() dto: AssignBayDto,
  ): Promise<{ success: boolean; data: unknown }> {
    const result = await this.productionBoardService.assignToBay(dto, tenantId);
    return { success: true, data: result };
  }

  @Post('move')
  @ApiOperation({ summary: 'Sposta ordine di lavoro tra postazioni' })
  @ApiResponse({ status: 200, description: 'Work order moved between bays' })
  @ApiResponse({ status: 400, description: 'Invalid move' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async moveJob(
    @CurrentTenant() tenantId: string,
    @Body() dto: MoveJobDto,
  ): Promise<{ success: boolean; data: unknown }> {
    const result = await this.productionBoardService.moveJob(dto, tenantId);
    return { success: true, data: result };
  }

  @Patch('jobs/:id/status')
  @ApiOperation({ summary: 'Aggiorna stato ordine di lavoro' })
  @ApiParam({ name: 'id', description: 'ID ordine di lavoro' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Work order not found' })
  async updateJobStatus(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateJobStatusDto,
  ): Promise<{ success: boolean; data: unknown }> {
    const result = await this.productionBoardService.updateJobStatus(id, dto.status, tenantId);
    return { success: true, data: result };
  }

  @Get('unassigned')
  @ApiOperation({ summary: 'Ordini di lavoro non assegnati a postazione' })
  @ApiResponse({ status: 200, description: 'Unassigned jobs listed' })
  async getUnassignedJobs(
    @CurrentTenant() tenantId: string,
  ): Promise<{ success: boolean; data: unknown }> {
    const jobs = await this.productionBoardService.getUnassignedJobs(tenantId);
    return { success: true, data: jobs };
  }

  @Get('kpis/today')
  @ApiOperation({ summary: 'KPI di produzione di oggi' })
  @ApiResponse({ status: 200, description: 'Today KPIs retrieved' })
  async getTodayKpis(
    @CurrentTenant() tenantId: string,
  ): Promise<{ success: boolean; data: unknown }> {
    const kpis = await this.productionBoardService.getTodayKpis(tenantId);
    return { success: true, data: kpis };
  }

  @Get('tv')
  @ApiOperation({ summary: 'Payload ottimizzato per display TV' })
  @ApiResponse({ status: 200, description: 'TV payload retrieved' })
  async getTvPayload(
    @CurrentTenant() tenantId: string,
  ): Promise<{ success: boolean; data: unknown }> {
    const payload = await this.productionBoardService.getTvPayload(tenantId);
    return { success: true, data: payload };
  }
}
