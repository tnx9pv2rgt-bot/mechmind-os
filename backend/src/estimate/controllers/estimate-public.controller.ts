/**
 * MechMind OS - Estimate Public Approval Controller
 *
 * Public (no auth) endpoints for customer estimate approval via token.
 */

import { Controller, Get, Post, Param, Body, HttpCode, HttpStatus, Ip } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstimateService } from '../services/estimate.service';

// ======================== DTOs ========================

export class LineApprovalDto {
  @ApiProperty({ description: 'ID della riga del preventivo' })
  @IsString()
  lineId: string;

  @ApiProperty({ description: 'Approvato o rifiutato' })
  @IsBoolean()
  approved: boolean;

  @ApiPropertyOptional({ description: 'Motivo del rifiuto' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ApproveEstimateLinesDto {
  @ApiProperty({ description: 'Approvazioni per singola riga', type: [LineApprovalDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineApprovalDto)
  approvals: LineApprovalDto[];

  @ApiProperty({
    description: 'Nome cliente come firma digitale (D.Lgs. 206/2005)',
    example: 'Mario Rossi',
  })
  @IsString()
  @MinLength(2)
  customerSignature: string;

  @ApiProperty({ description: 'Accettazione termini e condizioni' })
  @IsBoolean()
  termsAccepted: boolean;
}

export class ApproveAllDto {
  @ApiProperty({
    description: 'Nome cliente come firma digitale (D.Lgs. 206/2005)',
    example: 'Mario Rossi',
  })
  @IsString()
  @MinLength(2)
  customerSignature: string;

  @ApiProperty({ description: 'Accettazione termini e condizioni' })
  @IsBoolean()
  termsAccepted: boolean;
}

// ======================== Controller ========================

@ApiTags('Estimates - Public Approval')
@Controller('public/estimates')
export class EstimatePublicController {
  constructor(private readonly estimateService: EstimateService) {}

  @Get(':token')
  @ApiOperation({ summary: 'Visualizza preventivo tramite token pubblico' })
  // eslint-disable-next-line sonarjs/no-duplicate-string
  @ApiParam({ name: 'token', description: 'Token di approvazione' })
  @ApiResponse({ status: 200, description: 'Preventivo con righe' })
  @ApiResponse({ status: 404, description: 'Token non trovato o scaduto' })
  async getEstimateByToken(
    @Param('token') token: string,
  ): Promise<{ success: boolean; data: unknown }> {
    const estimate = await this.estimateService.getByApprovalToken(token);
    return { success: true, data: estimate };
  }

  @Post(':token/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approva/rifiuta singole righe del preventivo' })
  @ApiParam({ name: 'token', description: 'Token di approvazione' })
  @ApiResponse({ status: 200, description: 'Approvazione processata' })
  async approveLines(
    @Param('token') token: string,
    @Body() dto: ApproveEstimateLinesDto,
    @Ip() ip: string,
  ): Promise<{ success: boolean; data: unknown; message: string }> {
    const estimate = await this.estimateService.processApproval(
      token,
      dto.approvals,
      dto.customerSignature,
      dto.termsAccepted,
      ip,
    );
    return {
      success: true,
      data: estimate,
      message: 'Approvazione processata con successo',
    };
  }

  @Post(':token/approve-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approva tutte le righe del preventivo' })
  @ApiParam({ name: 'token', description: 'Token di approvazione' })
  @ApiResponse({ status: 200, description: 'Tutte le righe approvate' })
  async approveAll(
    @Param('token') token: string,
    @Body() dto: ApproveAllDto,
    @Ip() ip: string,
  ): Promise<{ success: boolean; data: unknown; message: string }> {
    const estimate = await this.estimateService.approveAll(
      token,
      dto.customerSignature,
      dto.termsAccepted,
      ip,
    );
    return {
      success: true,
      data: estimate,
      message: 'Preventivo approvato completamente',
    };
  }
}
