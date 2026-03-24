/**
 * MechMind OS - AI Compliance Controller (EU AI Act)
 *
 * Endpoints for AI decision logging, human review/override,
 * and compliance dashboard.
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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, UserRole } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AiComplianceService } from './ai-compliance.service';
import {
  LogAiDecisionDto,
  HumanReviewDto,
  AiDecisionQueryDto,
  AiComplianceDashboardDto,
} from './dto/ai-compliance.dto';
import { AiDecisionLog } from '@prisma/client';

@ApiTags('AI Compliance (EU AI Act)')
@Controller('v1/ai-compliance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AiComplianceController {
  constructor(private readonly aiComplianceService: AiComplianceService) {}

  @Get('decisions')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'List AI decisions with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of AI decisions' })
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: AiDecisionQueryDto,
  ): Promise<{ data: AiDecisionLog[]; total: number }> {
    return this.aiComplianceService.findAll(tenantId, query);
  }

  @Get('dashboard')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'AI compliance dashboard statistics' })
  @ApiResponse({ status: 200, type: AiComplianceDashboardDto })
  async getDashboard(
    @CurrentUser('tenantId') tenantId: string,
  ): Promise<AiComplianceDashboardDto> {
    return this.aiComplianceService.getDashboard(tenantId);
  }

  @Get('decisions/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get single AI decision detail' })
  @ApiResponse({ status: 200, description: 'AI decision detail' })
  @ApiResponse({ status: 404, description: 'Decision not found' })
  async findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<AiDecisionLog> {
    return this.aiComplianceService.findOne(tenantId, id);
  }

  @Post('decisions')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MECHANIC)
  @ApiOperation({ summary: 'Log a new AI decision (internal use)' })
  @ApiResponse({ status: 201, description: 'AI decision logged' })
  async logDecision(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: LogAiDecisionDto,
  ): Promise<AiDecisionLog> {
    return this.aiComplianceService.logDecision(tenantId, dto);
  }

  @Patch('decisions/:id/review')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MECHANIC)
  @ApiOperation({ summary: 'Record human review/override on an AI decision' })
  @ApiResponse({ status: 200, description: 'Review recorded' })
  @ApiResponse({ status: 404, description: 'Decision not found' })
  async recordReview(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: HumanReviewDto,
  ): Promise<AiDecisionLog> {
    return this.aiComplianceService.recordHumanReview(tenantId, id, dto, userId);
  }
}
