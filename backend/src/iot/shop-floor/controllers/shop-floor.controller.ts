/**
 * MechMind OS - Shop Floor Controller
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { ShopFloorService } from '../services/shop-floor.service';
import {
  InitializeShopFloorDto,
  AddBaySensorDto,
  SensorReadingDto,
  AssignVehicleDto,
  UpdateTechnicianLocationDto,
  UpdateJobStatusDto,
  AnalyticsQueryDto,
  BayResponseDto,
  TechnicianLocationDto,
  WorkOrderProgressDto,
  ShopFloorEventDto,
  ShopFloorAnalyticsDto,
} from '../dto/shop-floor.dto';
import { UserRole } from '../../../auth/guards/roles.guard';

@ApiTags('Shop Floor')
@Controller('v1/shop-floor')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ShopFloorController {
  constructor(private readonly shopFloorService: ShopFloorService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Initialize shop floor' })
  @ApiResponse({ status: 201, type: [BayResponseDto] })
  async initializeShopFloor(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: InitializeShopFloorDto,
  ): Promise<BayResponseDto[]> {
    return await this.shopFloorService.initializeShopFloor(tenantId, dto);
  }

  @Get('bays')
  @ApiOperation({ summary: 'Get all bays' })
  @ApiResponse({ status: 200, type: [BayResponseDto] })
  async getAllBays(
    @CurrentUser('tenantId') tenantId: string,
  ): Promise<BayResponseDto[]> {
    return await this.shopFloorService.getAllBays(tenantId);
  }

  @Get('bays/:id')
  @ApiOperation({ summary: 'Get bay details' })
  @ApiResponse({ status: 200, type: BayResponseDto })
  async getBay(
    @Param('id') bayId: string,
  ): Promise<BayResponseDto> {
    return await this.shopFloorService.getBay(bayId);
  }

  @Post('bays/:id/sensors')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Add sensor to bay' })
  @ApiResponse({ status: 201 })
  async addBaySensor(
    @Param('id') bayId: string,
    @Body() dto: AddBaySensorDto,
  ): Promise<any> {
    return await this.shopFloorService.addBaySensor(bayId, {
      type: dto.type,
      name: dto.name,
      isActive: dto.isActive === 'true',
      batteryLevel: dto.batteryLevel,
      config: dto.config || {},
    });
  }

  @Post('sensor-readings')
  @ApiOperation({ summary: 'Process sensor reading' })
  @ApiResponse({ status: 201 })
  async processSensorReading(
    @Body() dto: SensorReadingDto,
  ): Promise<void> {
    await this.shopFloorService.processSensorReading(dto);
  }

  @Post('bays/:id/assign')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Assign vehicle to bay' })
  @ApiResponse({ status: 200, type: BayResponseDto })
  async assignVehicleToBay(
    @Param('id') bayId: string,
    @Body() dto: AssignVehicleDto,
  ): Promise<BayResponseDto> {
    return await this.shopFloorService.assignVehicleToBay(
      bayId,
      dto.vehicleId,
      dto.workOrderId,
      dto.technicianIds,
    );
  }

  @Post('bays/:id/release')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MECHANIC)
  @ApiOperation({ summary: 'Release bay' })
  @ApiResponse({ status: 200, type: BayResponseDto })
  async releaseBay(
    @Param('id') bayId: string,
  ): Promise<BayResponseDto> {
    return await this.shopFloorService.releaseBay(bayId);
  }

  @Post('technicians/:id/location')
  @ApiOperation({ summary: 'Update technician location' })
  @ApiResponse({ status: 200, type: TechnicianLocationDto })
  async updateTechnicianLocation(
    @Param('id') technicianId: string,
    @Body() dto: UpdateTechnicianLocationDto,
  ): Promise<TechnicianLocationDto> {
    return await this.shopFloorService.updateTechnicianLocation(technicianId, {
      x: dto.x,
      y: dto.y,
      floor: dto.floor,
      beaconId: dto.beaconId,
    });
  }

  @Get('technicians/active')
  @ApiOperation({ summary: 'Get active technicians' })
  @ApiResponse({ status: 200, type: [TechnicianLocationDto] })
  async getActiveTechnicians(
    @CurrentUser('tenantId') tenantId: string,
  ): Promise<TechnicianLocationDto[]> {
    return await this.shopFloorService.getActiveTechnicians(tenantId);
  }

  @Get('work-orders/:id/progress')
  @ApiOperation({ summary: 'Get work order progress' })
  @ApiResponse({ status: 200, type: WorkOrderProgressDto })
  async getWorkOrderProgress(
    @Param('id') workOrderId: string,
  ): Promise<WorkOrderProgressDto> {
    return await this.shopFloorService.getWorkOrderProgress(workOrderId);
  }

  @Patch('work-orders/:id/status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MECHANIC)
  @ApiOperation({ summary: 'Update job status' })
  @ApiResponse({ status: 200, type: WorkOrderProgressDto })
  async updateJobStatus(
    @Param('id') workOrderId: string,
    @Body() dto: UpdateJobStatusDto,
  ): Promise<WorkOrderProgressDto> {
    return await this.shopFloorService.updateJobStatus(workOrderId, dto.status);
  }

  @Get('analytics')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get shop floor analytics' })
  @ApiResponse({ status: 200, type: ShopFloorAnalyticsDto })
  async getShopFloorAnalytics(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: AnalyticsQueryDto,
  ): Promise<ShopFloorAnalyticsDto> {
    return await this.shopFloorService.getShopFloorAnalytics(
      tenantId,
      new Date(query.from),
      new Date(query.to),
    );
  }

  @Get('events')
  @ApiOperation({ summary: 'Get recent events' })
  @ApiResponse({ status: 200, type: [ShopFloorEventDto] })
  async getRecentEvents(
    @CurrentUser('tenantId') tenantId: string,
    @Query('limit') limit?: number,
  ): Promise<ShopFloorEventDto[]> {
    return await this.shopFloorService.getRecentEvents(tenantId, limit || 50);
  }
}
