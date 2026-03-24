/**
 * MechMind OS - Vehicle Twin Controller
 */

import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { VehicleTwinService } from '../services/vehicle-twin.service';
import {
  UpdateComponentDto,
  RecordHistoryDto,
  RecordDamageDto,
  UpdateVisualizationConfigDto,
  HealthTrendQueryDto,
  VehicleTwinStateDto,
  ComponentResponseDto,
  PredictiveAlertDto,
  WearPredictionDto,
} from '../dto/vehicle-twin.dto';
import {
  ComponentHistory,
  DamageRecord,
  TwinVisualizationConfig,
  VehicleTwinState,
} from '../interfaces/vehicle-twin.interface';
import { UserRole } from '../../../auth/guards/roles.guard';

@ApiTags('Vehicle Twin')
@Controller('vehicle-twin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class VehicleTwinController {
  constructor(private readonly vehicleTwinService: VehicleTwinService) {}

  @Get(':vehicleId')
  @ApiOperation({ summary: 'Get vehicle twin state' })
  @ApiResponse({ status: 200, type: VehicleTwinStateDto })
  async getTwinState(
    @CurrentUser('tenantId') tenantId: string,
    @Param('vehicleId') vehicleId: string,
  ): Promise<VehicleTwinState> {
    return await this.vehicleTwinService.getOrCreateTwin(tenantId, vehicleId);
  }

  @Patch(':vehicleId/components/:componentId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MECHANIC)
  @ApiOperation({ summary: 'Update component status' })
  @ApiResponse({ status: 200, type: ComponentResponseDto })
  async updateComponent(
    @CurrentUser('tenantId') tenantId: string,
    @Param('vehicleId') vehicleId: string,
    @Param('componentId') componentId: string,
    @Body() dto: UpdateComponentDto,
  ): Promise<ComponentResponseDto> {
    return await this.vehicleTwinService.updateComponentStatus(
      tenantId,
      vehicleId,
      componentId,
      dto,
    );
  }

  @Post(':vehicleId/history')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MECHANIC)
  @ApiOperation({ summary: 'Record component history event' })
  @ApiResponse({ status: 201 })
  async recordHistory(
    @CurrentUser('tenantId') tenantId: string,
    @Param('vehicleId') vehicleId: string,
    @Body() dto: RecordHistoryDto,
  ): Promise<ComponentHistory> {
    const history: Omit<ComponentHistory, 'id'> = {
      ...dto,
      date: dto.date ? new Date(dto.date) : new Date(),
      partsUsed: dto.partsUsed || [],
      photos: dto.photos || [],
      documents: dto.documents || [],
    };
    return await this.vehicleTwinService.recordComponentHistory(tenantId, vehicleId, history);
  }

  @Post(':vehicleId/damage')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MECHANIC)
  @ApiOperation({ summary: 'Record damage' })
  @ApiResponse({ status: 201 })
  async recordDamage(
    @CurrentUser('tenantId') tenantId: string,
    @Param('vehicleId') vehicleId: string,
    @Body() dto: RecordDamageDto,
  ): Promise<DamageRecord> {
    const damage: Omit<DamageRecord, 'id'> = {
      ...dto,
      location: dto.location || { x: 0, y: 0, z: 0 },
      photos: dto.photos || [],
      reportedAt: dto.reportedAt ? new Date(dto.reportedAt) : new Date(),
    };
    return await this.vehicleTwinService.recordDamage(tenantId, vehicleId, damage);
  }

  @Get(':vehicleId/alerts')
  @ApiOperation({ summary: 'Get predictive alerts' })
  @ApiResponse({ status: 200, type: [PredictiveAlertDto] })
  async getPredictiveAlerts(
    @CurrentUser('tenantId') tenantId: string,
    @Param('vehicleId') vehicleId: string,
  ): Promise<PredictiveAlertDto[]> {
    return await this.vehicleTwinService.getPredictiveAlerts(tenantId, vehicleId);
  }

  @Get(':vehicleId/components/:componentId/wear-prediction')
  @ApiOperation({ summary: 'Get component wear prediction' })
  @ApiResponse({ status: 200, type: WearPredictionDto })
  async getWearPrediction(
    @CurrentUser('tenantId') tenantId: string,
    @Param('vehicleId') vehicleId: string,
    @Param('componentId') componentId: string,
  ): Promise<WearPredictionDto> {
    return await this.vehicleTwinService.getWearPrediction(tenantId, vehicleId, componentId);
  }

  @Get(':vehicleId/visualization-config')
  @ApiOperation({ summary: 'Get 3D visualization config' })
  @ApiResponse({ status: 200 })
  async getVisualizationConfig(
    @CurrentUser('tenantId') tenantId: string,
    @Param('vehicleId') vehicleId: string,
  ): Promise<TwinVisualizationConfig> {
    return await this.vehicleTwinService.getVisualizationConfig(tenantId, vehicleId);
  }

  @Patch(':vehicleId/visualization-config')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update visualization config' })
  @ApiResponse({ status: 200 })
  async updateVisualizationConfig(
    @CurrentUser('tenantId') tenantId: string,
    @Param('vehicleId') vehicleId: string,
    @Body() dto: UpdateVisualizationConfigDto,
  ): Promise<TwinVisualizationConfig> {
    return await this.vehicleTwinService.updateVisualizationConfig(tenantId, vehicleId, dto);
  }

  @Get(':vehicleId/health-trend')
  @ApiOperation({ summary: 'Get health trend over time' })
  @ApiResponse({ status: 200 })
  async getHealthTrend(
    @CurrentUser('tenantId') tenantId: string,
    @Param('vehicleId') vehicleId: string,
    @Query() query: HealthTrendQueryDto,
  ): Promise<{ date: Date; overallHealth: number; componentHealth: Record<string, number> }[]> {
    return await this.vehicleTwinService.getHealthTrend(
      tenantId,
      vehicleId,
      new Date(query.from),
      new Date(query.to),
    );
  }
}
