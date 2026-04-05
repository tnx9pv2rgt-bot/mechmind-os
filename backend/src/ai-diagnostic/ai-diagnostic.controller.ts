/**
 * MechMind OS - AI Diagnostic Assistant Controller
 *
 * Endpoints for AI-powered DTC code analysis, symptom analysis,
 * diagnostic history, and auto-estimate generation.
 */

import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, UserRole } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AiDiagnosticService } from './ai-diagnostic.service';
import { AnalyzeDtcDto, DtcDiagnosisResult } from './dto/analyze-dtc.dto';
import { AnalyzeSymptomsDto, SymptomDiagnosisResult } from './dto/analyze-symptoms.dto';
import { AiDecisionLog } from '@prisma/client';

@ApiTags('AI Diagnostic Assistant')
@Controller('ai-diagnostic')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AiDiagnosticController {
  constructor(private readonly aiDiagnosticService: AiDiagnosticService) {}

  @Post('analyze-dtc')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MECHANIC)
  @ApiOperation({ summary: 'Analizza codici DTC con IA' })
  @ApiResponse({ status: 201, description: 'Diagnosi DTC completata' })
  async analyzeDtc(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: AnalyzeDtcDto,
  ): Promise<DtcDiagnosisResult> {
    return this.aiDiagnosticService.analyzeDtcCodes(tenantId, dto.codes, dto.vehicleInfo);
  }

  @Post('analyze-symptoms')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MECHANIC)
  @ApiOperation({ summary: 'Analizza sintomi in linguaggio naturale con IA' })
  @ApiResponse({ status: 201, description: 'Analisi sintomi completata' })
  async analyzeSymptoms(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: AnalyzeSymptomsDto,
  ): Promise<SymptomDiagnosisResult> {
    return this.aiDiagnosticService.analyzeSymptoms(tenantId, dto.symptoms, dto.vehicleInfo);
  }

  @Get('history/:vehicleId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MECHANIC)
  @ApiOperation({ summary: 'Storico diagnosi IA per veicolo' })
  @ApiResponse({ status: 200, description: 'Lista diagnosi IA' })
  @ApiResponse({ status: 404, description: 'Veicolo non trovato' })
  async getHistory(
    @CurrentUser('tenantId') tenantId: string,
    @Param('vehicleId') vehicleId: string,
  ): Promise<AiDecisionLog[]> {
    return this.aiDiagnosticService.getDiagnosticHistory(tenantId, vehicleId);
  }

  @Post(':id/create-estimate')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Crea preventivo automatico da diagnosi IA' })
  @ApiResponse({ status: 201, description: 'Preventivo creato' })
  @ApiResponse({ status: 404, description: 'Diagnosi non trovata' })
  async createEstimate(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') diagnosisId: string,
  ): Promise<{ estimateId: string; totalCents: number; lineCount: number }> {
    return this.aiDiagnosticService.createEstimateFromDiagnosis(tenantId, diagnosisId);
  }
}
