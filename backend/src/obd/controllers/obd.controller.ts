/**
 * MechMind OS - OBD Controller
 */

import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ObdService } from '../services/obd.service';
import { Throttle } from '@nestjs/throttler';
import {
  RegisterDeviceDto,
  UpdateDeviceDto,
  ObdReadingDto,
  TroubleCodeDto,
  ClearTroubleCodesDto,
  ReadingQueryDto,
  ObdDeviceResponseDto,
  ObdReadingResponseDto,
  TroubleCodeResponseDto,
  VehicleHealthReportDto,
} from '../dto/obd.dto';
import { UserRole } from '../../auth/guards/roles.guard';

@ApiTags('OBD Diagnostics')
@Controller('obd')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ObdController {
  constructor(private readonly obdService: ObdService) {}

  // ============== DEVICE MANAGEMENT ==============

  @Post('devices')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Register new OBD device' })
  @ApiResponse({ status: 201, type: ObdDeviceResponseDto })
  async registerDevice(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: RegisterDeviceDto,
  ): Promise<ObdDeviceResponseDto> {
    return this.obdService.registerDevice(tenantId, dto);
  }

  @Get('devices')
  @ApiOperation({ summary: 'List OBD devices' })
  @ApiResponse({ status: 200, type: [ObdDeviceResponseDto] })
  async listDevices(
    @CurrentUser('tenantId') tenantId: string,
    @Query('vehicleId') vehicleId?: string,
  ): Promise<ObdDeviceResponseDto[]> {
    return this.obdService.listDevices(tenantId, vehicleId);
  }

  @Get('devices/:id')
  @ApiOperation({ summary: 'Get device details' })
  @ApiResponse({ status: 200, type: ObdDeviceResponseDto })
  async getDevice(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<ObdDeviceResponseDto> {
    return this.obdService.getDevice(tenantId, id);
  }

  @Patch('devices/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update device' })
  @ApiResponse({ status: 200, type: ObdDeviceResponseDto })
  async updateDevice(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDeviceDto,
  ): Promise<ObdDeviceResponseDto> {
    return this.obdService.updateDevice(tenantId, id, dto);
  }

  // ============== DATA COLLECTION (from devices) ==============

  @Post('readings')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MECHANIC)
  @Throttle({ default: { ttl: 60000, limit: 1000 } }) // High limit for device data
  @ApiOperation({ summary: 'Record OBD reading (from device)' })
  @ApiResponse({ status: 201, type: ObdReadingResponseDto })
  async recordReading(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: ObdReadingDto,
  ): Promise<ObdReadingResponseDto> {
    return this.obdService.recordReading(dto, tenantId);
  }

  @Post('devices/:id/codes')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MECHANIC)
  @Throttle({ default: { ttl: 60000, limit: 100 } })
  @ApiOperation({ summary: 'Record trouble codes (from device)' })
  @ApiResponse({ status: 201 })
  async recordTroubleCodes(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') deviceId: string,
    @Body() codes: TroubleCodeDto[],
  ): Promise<void> {
    return this.obdService.recordTroubleCodes(deviceId, codes, tenantId);
  }

  // ============== DATA RETRIEVAL ==============

  @Get('readings')
  @ApiOperation({ summary: 'Get OBD readings' })
  @ApiResponse({ status: 200, type: [ObdReadingResponseDto] })
  async getReadings(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: ReadingQueryDto,
  ): Promise<ObdReadingResponseDto[]> {
    return this.obdService.getReadings(tenantId, {
      deviceId: query.deviceId,
      vehicleId: query.vehicleId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      limit: query.limit,
    });
  }

  @Get('devices/:id/readings/latest')
  @ApiOperation({ summary: 'Get latest reading from device' })
  @ApiResponse({ status: 200, type: ObdReadingResponseDto })
  async getLatestReading(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') deviceId: string,
  ): Promise<ObdReadingResponseDto | null> {
    return this.obdService.getLatestReading(tenantId, deviceId);
  }

  @Get('trouble-codes')
  @ApiOperation({ summary: 'Get trouble codes' })
  @ApiResponse({ status: 200, type: [TroubleCodeResponseDto] })
  async getTroubleCodes(
    @CurrentUser('tenantId') tenantId: string,
    @Query('deviceId') deviceId?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('active') active?: string,
  ): Promise<TroubleCodeResponseDto[]> {
    return this.obdService.getTroubleCodes(tenantId, {
      deviceId,
      vehicleId,
      active: active !== undefined ? active === 'true' : undefined,
    });
  }

  @Post('devices/:id/codes/clear')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MECHANIC)
  @ApiOperation({ summary: 'Clear trouble codes' })
  @ApiResponse({ status: 200 })
  async clearTroubleCodes(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') deviceId: string,
    @Body() dto: ClearTroubleCodesDto,
  ): Promise<void> {
    return this.obdService.clearTroubleCodes(tenantId, deviceId, {
      ...dto,
      clearedBy: userId,
    });
  }

  // ============== HEALTH REPORTS ==============

  @Get('vehicles/:id/health')
  @ApiOperation({ summary: 'Get vehicle health report' })
  @ApiResponse({ status: 200, type: VehicleHealthReportDto })
  async getHealthReport(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') vehicleId: string,
  ): Promise<VehicleHealthReportDto> {
    return this.obdService.generateHealthReport(tenantId, vehicleId);
  }
}
