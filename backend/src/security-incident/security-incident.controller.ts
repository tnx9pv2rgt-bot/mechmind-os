import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard, UserRole } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import { SecurityIncidentService } from './security-incident.service';
import {
  CreateSecurityIncidentDto,
  UpdateSecurityIncidentDto,
  UpdateIncidentStatusDto,
  IncidentQueryDto,
} from './dto/security-incident.dto';

@ApiTags('Security Incidents (NIS2)')
@Controller('security-incidents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SecurityIncidentController {
  constructor(private readonly service: SecurityIncidentService) {}

  /**
   * GET /v1/security-incidents/dashboard
   * NIS2 incident dashboard: stats, timelines, deadline alerts
   */
  @Get('dashboard')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Dashboard incidenti NIS2' })
  @ApiResponse({ status: 200, description: 'Dashboard restituita' })
  async getDashboard(
    @CurrentUser('tenantId') tenantId: string,
  ): Promise<ReturnType<typeof this.service.getDashboard>> {
    return this.service.getDashboard(tenantId);
  }

  /**
   * GET /v1/security-incidents/compliance
   * NIS2 compliance overview checklist
   */
  @Get('compliance')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Panoramica conformità NIS2' })
  @ApiResponse({ status: 200, description: 'Checklist conformità restituita' })
  async getCompliance(
    @CurrentUser('tenantId') tenantId: string,
  ): Promise<ReturnType<typeof this.service.getComplianceOverview>> {
    return this.service.getComplianceOverview(tenantId);
  }

  /**
   * GET /v1/security-incidents
   * List all security incidents with pagination and filters
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Elenca incidenti di sicurezza' })
  @ApiResponse({ status: 200, description: 'Lista incidenti restituita' })
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: IncidentQueryDto,
  ): Promise<ReturnType<typeof this.service.findAll>> {
    return this.service.findAll(tenantId, query);
  }

  /**
   * GET /v1/security-incidents/:id
   * Get single incident details
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Dettaglio incidente di sicurezza' })
  @ApiResponse({ status: 200, description: 'Incidente restituito' })
  @ApiResponse({ status: 404, description: 'Incidente non trovato' })
  async findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReturnType<typeof this.service.findOne>> {
    return this.service.findOne(tenantId, id);
  }

  /**
   * POST /v1/security-incidents
   * Create a new security incident
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crea incidente di sicurezza' })
  @ApiResponse({ status: 201, description: 'Incidente creato' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateSecurityIncidentDto,
  ): Promise<ReturnType<typeof this.service.create>> {
    return this.service.create(tenantId, dto, userId);
  }

  /**
   * PATCH /v1/security-incidents/:id
   * Update incident details
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Aggiorna incidente di sicurezza' })
  @ApiResponse({ status: 200, description: 'Incidente aggiornato' })
  @ApiResponse({ status: 404, description: 'Incidente non trovato' })
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSecurityIncidentDto,
  ): Promise<ReturnType<typeof this.service.update>> {
    return this.service.update(tenantId, id, dto);
  }

  /**
   * PATCH /v1/security-incidents/:id/status
   * Transition incident status (state machine)
   */
  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Transizione stato incidente (state machine NIS2)' })
  @ApiResponse({ status: 200, description: 'Stato aggiornato' })
  @ApiResponse({ status: 400, description: 'Transizione non valida' })
  @ApiResponse({ status: 404, description: 'Incidente non trovato' })
  async updateStatus(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIncidentStatusDto,
  ): Promise<ReturnType<typeof this.service.updateStatus>> {
    return this.service.updateStatus(tenantId, id, dto);
  }
}
