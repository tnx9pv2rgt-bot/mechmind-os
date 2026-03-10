/**
 * MechMind OS - Fleet Management Controller
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, UserRole } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { FleetService } from '../services/fleet.service';
import {
  CreateFleetDto,
  UpdateFleetDto,
  AddFleetVehicleDto,
  FleetResponseDto,
} from '../dto/fleet.dto';

@ApiTags('Fleets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('fleets')
export class FleetController {
  constructor(private readonly fleetService: FleetService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new fleet' })
  @ApiResponse({ status: 201, description: 'Fleet created', type: FleetResponseDto })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateFleetDto,
  ): Promise<FleetResponseDto> {
    const fleet = await this.fleetService.create(tenantId, dto);
    return fleet as FleetResponseDto;
  }

  @Get()
  @ApiOperation({ summary: 'List all active fleets' })
  @ApiResponse({ status: 200, description: 'List of fleets', type: [FleetResponseDto] })
  async findAll(@CurrentUser('tenantId') tenantId: string): Promise<FleetResponseDto[]> {
    const fleets = await this.fleetService.findAll(tenantId);
    return fleets as FleetResponseDto[];
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get fleet by ID with vehicles' })
  @ApiParam({ name: 'id', description: 'Fleet ID' })
  @ApiResponse({ status: 200, description: 'Fleet details', type: FleetResponseDto })
  @ApiResponse({ status: 404, description: 'Fleet not found' })
  async findById(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<FleetResponseDto> {
    const fleet = await this.fleetService.findById(tenantId, id);
    return fleet as FleetResponseDto;
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update a fleet' })
  @ApiParam({ name: 'id', description: 'Fleet ID' })
  @ApiResponse({ status: 200, description: 'Fleet updated', type: FleetResponseDto })
  @ApiResponse({ status: 404, description: 'Fleet not found' })
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFleetDto,
  ): Promise<FleetResponseDto> {
    const fleet = await this.fleetService.update(tenantId, id, dto);
    return fleet as FleetResponseDto;
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a fleet (set isActive=false)' })
  @ApiParam({ name: 'id', description: 'Fleet ID' })
  @ApiResponse({ status: 200, description: 'Fleet deactivated', type: FleetResponseDto })
  @ApiResponse({ status: 404, description: 'Fleet not found' })
  async delete(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<FleetResponseDto> {
    const fleet = await this.fleetService.delete(tenantId, id);
    return fleet as FleetResponseDto;
  }

  @Post(':fleetId/vehicles')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Add a vehicle to a fleet' })
  @ApiParam({ name: 'fleetId', description: 'Fleet ID' })
  @ApiResponse({ status: 201, description: 'Vehicle added to fleet' })
  @ApiResponse({ status: 400, description: 'Vehicle already assigned' })
  @ApiResponse({ status: 404, description: 'Fleet or vehicle not found' })
  async addVehicle(
    @CurrentUser('tenantId') tenantId: string,
    @Param('fleetId') fleetId: string,
    @Body() dto: AddFleetVehicleDto,
  ): Promise<Record<string, unknown>> {
    return this.fleetService.addVehicle(tenantId, fleetId, dto.vehicleId);
  }

  @Delete(':fleetId/vehicles/:vehicleId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a vehicle from a fleet' })
  @ApiParam({ name: 'fleetId', description: 'Fleet ID' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID' })
  @ApiResponse({ status: 200, description: 'Vehicle removed from fleet' })
  @ApiResponse({ status: 404, description: 'Fleet-vehicle assignment not found' })
  async removeVehicle(
    @CurrentUser('tenantId') tenantId: string,
    @Param('fleetId') fleetId: string,
    @Param('vehicleId') vehicleId: string,
  ): Promise<Record<string, unknown>> {
    return this.fleetService.removeVehicle(tenantId, fleetId, vehicleId);
  }
}
