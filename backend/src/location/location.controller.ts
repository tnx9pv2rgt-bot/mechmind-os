/**
 * MechMind OS - Location Management Controller
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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LocationService } from './location.service';
import { CreateLocationDto, UpdateLocationDto, LocationResponseDto } from './dto/location.dto';

@ApiTags('Locations')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('locations')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Post()
  @ApiOperation({ summary: 'Crea una nuova sede' })
  @ApiResponse({ status: 201, description: 'Sede creata', type: LocationResponseDto })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateLocationDto,
  ): Promise<LocationResponseDto> {
    const location = await this.locationService.create(tenantId, dto);
    return location as unknown as LocationResponseDto;
  }

  @Get()
  @ApiOperation({ summary: 'Elenco sedi attive del tenant' })
  @ApiResponse({ status: 200, description: 'Lista delle sedi' })
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{
    data: LocationResponseDto[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const result = await this.locationService.findAll(
      tenantId,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
    return result as unknown as {
      data: LocationResponseDto[];
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Dettaglio sede per ID' })
  @ApiParam({ name: 'id', description: 'ID della sede' })
  @ApiResponse({ status: 200, description: 'Dettaglio sede', type: LocationResponseDto })
  @ApiResponse({ status: 404, description: 'Sede non trovata' })
  async findById(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<LocationResponseDto> {
    const location = await this.locationService.findById(tenantId, id);
    return location as unknown as LocationResponseDto;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Aggiorna una sede' })
  @ApiParam({ name: 'id', description: 'ID della sede' })
  @ApiResponse({ status: 200, description: 'Sede aggiornata', type: LocationResponseDto })
  @ApiResponse({ status: 404, description: 'Sede non trovata' })
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto,
  ): Promise<LocationResponseDto> {
    const location = await this.locationService.update(tenantId, id, dto);
    return location as unknown as LocationResponseDto;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disattiva una sede (soft delete)' })
  @ApiParam({ name: 'id', description: 'ID della sede' })
  @ApiResponse({ status: 200, description: 'Sede disattivata', type: LocationResponseDto })
  @ApiResponse({ status: 404, description: 'Sede non trovata' })
  async delete(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<LocationResponseDto> {
    const location = await this.locationService.delete(tenantId, id);
    return location as unknown as LocationResponseDto;
  }
}
