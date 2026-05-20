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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, UserRole } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { LaborGuideService } from '../services/labor-guide.service';
import {
  CreateLaborGuideDto,
  UpdateLaborGuideDto,
  CreateLaborGuideEntryDto,
  UpdateLaborGuideEntryDto,
  SearchLaborGuideDto,
} from '../dto/labor-guide.dto';
import { LaborGuide } from '@prisma/client';

@ApiTags('Labor Guide')
@Controller('labor-guides')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LaborGuideController {
  constructor(private readonly laborGuideService: LaborGuideService) {}

  // ============== GUIDES ==============

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create labor guide' })
  @ApiResponse({ status: 201 })
  async createGuide(@CurrentUser('tenantId') tenantId: string, @Body() dto: CreateLaborGuideDto) {
    return this.laborGuideService.createGuide(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all labor guides' })
  @ApiResponse({ status: 200 })
  async findAllGuides(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{
    data: LaborGuide[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    return this.laborGuideService.findAllGuides(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('search')
  @ApiOperation({ summary: 'Search labor guide entries by vehicle' })
  @ApiResponse({ status: 200 })
  async searchEntries(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: SearchLaborGuideDto,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.laborGuideService.searchEntries(
      tenantId,
      query.make,
      query.model,
      query.category,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get labor guide with entries' })
  @ApiResponse({ status: 200 })
  async findGuideById(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.laborGuideService.findGuideById(tenantId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update labor guide' })
  @ApiResponse({ status: 200 })
  async updateGuide(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLaborGuideDto,
  ) {
    return this.laborGuideService.updateGuide(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Soft delete labor guide' })
  @ApiResponse({ status: 200 })
  async deleteGuide(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.laborGuideService.deleteGuide(tenantId, id);
  }

  // ============== ENTRIES ==============

  @Post(':guideId/entries')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Add entry to labor guide' })
  @ApiResponse({ status: 201 })
  async addEntry(
    @CurrentUser('tenantId') tenantId: string,
    @Param('guideId') guideId: string,
    @Body() dto: CreateLaborGuideEntryDto,
  ) {
    return this.laborGuideService.addEntry(tenantId, guideId, dto);
  }

  @Patch('entries/:entryId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update labor guide entry' })
  @ApiResponse({ status: 200 })
  async updateEntry(
    @CurrentUser('tenantId') tenantId: string,
    @Param('entryId') entryId: string,
    @Body() dto: UpdateLaborGuideEntryDto,
  ) {
    return this.laborGuideService.updateEntry(tenantId, entryId, dto);
  }

  @Delete('entries/:entryId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete labor guide entry' })
  @ApiResponse({ status: 200 })
  async deleteEntry(@CurrentUser('tenantId') tenantId: string, @Param('entryId') entryId: string) {
    return this.laborGuideService.deleteEntry(tenantId, entryId);
  }
}
