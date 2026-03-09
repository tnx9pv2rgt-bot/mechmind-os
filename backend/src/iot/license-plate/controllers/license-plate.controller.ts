/**
 * MechMind OS - License Plate Controller
 */

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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { LicensePlateService } from '../services/license-plate.service';
import {
  DetectLicensePlateDto,
  RecordEntryExitDto,
  RegisterCameraDto,
  LookupPlateDto,
  LprStatsQueryDto,
  LicensePlateDetectionDto,
  VehicleEntryExitDto,
  ParkingSessionDto,
  LprCameraDto,
  LprStatsDto,
  VehicleLookupResponseDto,
} from '../dto/license-plate.dto';
import { UserRole } from '../../../auth/guards/roles.guard';

@ApiTags('License Plate Recognition')
@Controller('lpr')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LicensePlateController {
  constructor(private readonly licensePlateService: LicensePlateService) {}

  @Post('detect')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Detect license plate from image' })
  @ApiResponse({ status: 201, type: LicensePlateDetectionDto })
  async detectLicensePlate(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: DetectLicensePlateDto,
  ): Promise<LicensePlateDetectionDto> {
    return await this.licensePlateService.detectLicensePlate(file.buffer, {
      cameraId: dto.cameraId,
      provider: dto.provider,
      minConfidence: dto.minConfidence,
    });
  }

  @Post('entry-exit')
  @ApiOperation({ summary: 'Record vehicle entry or exit' })
  @ApiResponse({ status: 201, type: VehicleEntryExitDto })
  async recordEntryExit(
    @Body() dto: RecordEntryExitDto,
  ): Promise<VehicleEntryExitDto> {
    // Get the detection first
    const detection = await this.licensePlateService.detectLicensePlate(
      Buffer.from(''), // Mock - would get actual detection
      { cameraId: dto.cameraId },
    );

    return await this.licensePlateService.recordEntryExit(detection, dto.type, {
      location: dto.location,
      isAuthorized: dto.isAuthorized,
    });
  }

  @Post('cameras')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Register LPR camera' })
  @ApiResponse({ status: 201, type: LprCameraDto })
  async registerCamera(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: RegisterCameraDto,
  ): Promise<LprCameraDto> {
    return await this.licensePlateService.registerCamera(tenantId, dto);
  }

  @Get('cameras')
  @ApiOperation({ summary: 'Get all cameras' })
  @ApiResponse({ status: 200, type: [LprCameraDto] })
  async getCameras(
    @CurrentUser('tenantId') tenantId: string,
  ): Promise<LprCameraDto[]> {
    return await this.licensePlateService.getCameras(tenantId);
  }

  @Get('cameras/:id')
  @ApiOperation({ summary: 'Get camera details' })
  @ApiResponse({ status: 200, type: LprCameraDto })
  async getCamera(
    @Param('id') cameraId: string,
  ): Promise<LprCameraDto> {
    return await this.licensePlateService.getCamera(cameraId);
  }

  @Patch('cameras/:id/status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update camera status' })
  @ApiResponse({ status: 200, type: LprCameraDto })
  async updateCameraStatus(
    @Param('id') cameraId: string,
    @Body('isActive') isActive: boolean,
  ): Promise<LprCameraDto> {
    return await this.licensePlateService.updateCameraStatus(cameraId, isActive);
  }

  @Get('lookup/:plate')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MECHANIC, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Lookup vehicle by license plate' })
  @ApiResponse({ status: 200, type: VehicleLookupResponseDto })
  async lookupVehicle(
    @CurrentUser('tenantId') tenantId: string,
    @Param('plate') plate: string,
  ): Promise<VehicleLookupResponseDto> {
    return await this.licensePlateService.lookupVehicle(plate);
  }

  @Get('sessions/active')
  @ApiOperation({ summary: 'Get active parking sessions' })
  @ApiResponse({ status: 200, type: [ParkingSessionDto] })
  async getActiveSessions(
    @CurrentUser('tenantId') tenantId?: string,
  ): Promise<ParkingSessionDto[]> {
    return await this.licensePlateService.getActiveSessions(tenantId);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get LPR statistics' })
  @ApiResponse({ status: 200, type: LprStatsDto })
  async getStats(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: LprStatsQueryDto,
  ): Promise<LprStatsDto> {
    return await this.licensePlateService.getStats(
      tenantId,
      new Date(query.from),
      new Date(query.to),
    );
  }
}
