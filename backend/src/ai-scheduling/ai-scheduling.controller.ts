/**
 * MechMind OS - AI Smart Scheduling Controller
 *
 * Endpoints for AI-powered slot suggestions, day optimization,
 * and capacity forecasting.
 */

import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, UserRole } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AiSchedulingService } from './ai-scheduling.service';
import { SuggestSlotsDto, SuggestedSlot } from './dto/suggest-slots.dto';
import { OptimizeDayDto, OptimizeDayResult, CapacityDay } from './dto/optimize-day.dto';

@ApiTags('AI Smart Scheduling')
@Controller('ai-scheduling')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AiSchedulingController {
  constructor(private readonly aiSchedulingService: AiSchedulingService) {}

  @Post('suggest-slots')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MECHANIC)
  @ApiOperation({ summary: 'Suggerisci slot ottimali con IA' })
  @ApiResponse({ status: 201, description: 'Slot suggeriti' })
  async suggestSlots(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: SuggestSlotsDto,
  ): Promise<SuggestedSlot[]> {
    return this.aiSchedulingService.suggestOptimalSlots(tenantId, dto);
  }

  @Post('optimize-day')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Ottimizza programma giornaliero' })
  @ApiResponse({ status: 201, description: 'Programma ottimizzato' })
  async optimizeDay(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: OptimizeDayDto,
  ): Promise<OptimizeDayResult> {
    return this.aiSchedulingService.optimizeDaySchedule(tenantId, dto.date);
  }

  @Get('capacity')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Previsione capacita per periodo' })
  @ApiResponse({ status: 200, description: 'Previsione capacita' })
  @ApiQuery({
    name: 'from',
    required: true,
    description: 'Data inizio (ISO)',
    example: '2026-03-28',
  })
  @ApiQuery({ name: 'to', required: true, description: 'Data fine (ISO)', example: '2026-04-04' })
  async getCapacity(
    @CurrentUser('tenantId') tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ): Promise<CapacityDay[]> {
    return this.aiSchedulingService.getCapacityForecast(tenantId, from, to);
  }
}
