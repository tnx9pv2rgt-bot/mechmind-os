/**
 * MechMind OS - Tire Set Controller
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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '../../auth/guards/roles.guard';
import { TireService } from '../services/tire.service';
import {
  CreateTireSetDto,
  UpdateTireSetDto,
  MountTireDto,
  StoreTireDto,
  TireSetQueryDto,
} from '../dto/tire.dto';
import { TireSet } from '@prisma/client';

@ApiTags('Tires')
@Controller('tires')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TireController {
  constructor(private readonly tireService: TireService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create tire set' })
  @ApiResponse({ status: 201 })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateTireSetDto,
  ): Promise<TireSet> {
    return this.tireService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List tire sets' })
  @ApiResponse({ status: 200 })
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: TireSetQueryDto,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ data: TireSet[]; total: number; page: number; limit: number; pages: number }> {
    return this.tireService.findAll(tenantId, {
      vehicleId: query.vehicleId,
      season: query.season,
      isStored: query.isStored,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tire set by ID' })
  @ApiResponse({ status: 200 })
  async findById(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<TireSet> {
    return this.tireService.findById(tenantId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update tire set' })
  @ApiResponse({ status: 200 })
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTireSetDto,
  ): Promise<TireSet> {
    return this.tireService.update(tenantId, id, dto);
  }

  @Post(':id/mount')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Mount tire set on vehicle' })
  @ApiResponse({ status: 200 })
  async mount(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: MountTireDto,
  ): Promise<TireSet> {
    return this.tireService.mount(tenantId, id, dto.vehicleId);
  }

  @Post(':id/unmount')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Unmount tire set from vehicle' })
  @ApiResponse({ status: 200 })
  async unmount(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<TireSet> {
    return this.tireService.unmount(tenantId, id);
  }

  @Post(':id/store')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Put tire set in storage' })
  @ApiResponse({ status: 200 })
  async store(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: StoreTireDto,
  ): Promise<TireSet> {
    return this.tireService.store(tenantId, id, dto.storageLocation);
  }

  @Post(':id/retrieve')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Remove tire set from storage' })
  @ApiResponse({ status: 200 })
  async retrieve(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<TireSet> {
    return this.tireService.retrieve(tenantId, id);
  }
}
