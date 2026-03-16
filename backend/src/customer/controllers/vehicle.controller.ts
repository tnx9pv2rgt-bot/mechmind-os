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
import { VehicleService } from '../services/vehicle.service';
import { VinDecoderService } from '../services/vin-decoder.service';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard, UserRole } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';
import { CurrentTenant } from '@auth/decorators/current-user.decorator';
import { CreateVehicleDto, UpdateVehicleDto, VehicleResponseDto } from '../dto/vehicle.dto';

@ApiTags('Vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vehicles')
export class VehicleController {
  constructor(
    private readonly vehicleService: VehicleService,
    private readonly vinDecoderService: VinDecoderService,
  ) {}

  @Get()
  @Roles(UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all vehicles with filtering and pagination' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({ status: 200, type: [VehicleResponseDto] })
  async getVehicles(
    @CurrentTenant() tenantId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ): Promise<{
    success: boolean;
    data: unknown[];
    meta: { total: number; limit: number; offset: number };
  }> {
    const result = await this.vehicleService.findAll(tenantId, {
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
      search,
      status,
    });

    return {
      success: true,
      data: result.vehicles,
      meta: {
        total: result.total,
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0,
      },
    };
  }

  @Get(':id')
  @Roles(UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get vehicle by ID' })
  @ApiParam({ name: 'id', description: 'Vehicle ID' })
  @ApiResponse({ status: 200, type: VehicleResponseDto })
  async getVehicle(
    @CurrentTenant() tenantId: string,
    @Param('id') vehicleId: string,
  ): Promise<{ success: boolean; data: unknown }> {
    const vehicle = await this.vehicleService.findById(tenantId, vehicleId);
    return {
      success: true,
      data: vehicle,
    };
  }

  @Post()
  @Roles(UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create vehicle (requires customerId in body)' })
  @ApiResponse({ status: 201, type: VehicleResponseDto })
  async createVehicle(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateVehicleDto & { customerId: string },
  ): Promise<{ success: boolean; data: unknown }> {
    const { customerId, ...dto } = body;
    const vehicle = await this.vehicleService.create(tenantId, customerId, dto);
    return {
      success: true,
      data: vehicle,
    };
  }

  @Patch(':id')
  @Roles(UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update vehicle' })
  @ApiParam({ name: 'id', description: 'Vehicle ID' })
  @ApiResponse({ status: 200, type: VehicleResponseDto })
  async updateVehicle(
    @CurrentTenant() tenantId: string,
    @Param('id') vehicleId: string,
    @Body() dto: UpdateVehicleDto,
  ): Promise<{ success: boolean; data: unknown }> {
    const vehicle = await this.vehicleService.update(tenantId, vehicleId, dto);
    return {
      success: true,
      data: vehicle,
    };
  }

  @Get('decode-vin/:vin')
  @Roles(UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Decode a VIN using NHTSA API' })
  @ApiParam({ name: 'vin', description: '17-character VIN' })
  async decodeVin(@Param('vin') vin: string) {
    const result = await this.vinDecoderService.decode(vin);
    return { success: true, data: result };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete vehicle' })
  @ApiParam({ name: 'id', description: 'Vehicle ID' })
  async deleteVehicle(
    @CurrentTenant() tenantId: string,
    @Param('id') vehicleId: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.vehicleService.delete(tenantId, vehicleId);
    return {
      success: true,
      message: 'Vehicle deleted successfully',
    };
  }
}
