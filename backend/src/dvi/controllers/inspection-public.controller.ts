/**
 * MechMind OS - Inspection Public Controller
 *
 * Public (no auth) endpoints for customer DVI report viewing and repair approval via token.
 */

import { Controller, Get, Post, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { InspectionService } from '../services/inspection.service';

// ======================== DTOs ========================

export class ApproveRepairsDto {
  @ApiProperty({ description: 'IDs dei riscontri approvati per la riparazione', type: [String] })
  @IsArray()
  @IsString({ each: true })
  approvedFindingIds: string[];

  @ApiProperty({ description: 'IDs dei riscontri rifiutati', type: [String] })
  @IsArray()
  @IsString({ each: true })
  declinedFindingIds: string[];
}

// ======================== Controller ========================

@ApiTags('Inspections - Public')
@Controller('public/inspections')
export class InspectionPublicController {
  constructor(private readonly inspectionService: InspectionService) {}

  @Get(':token')
  @ApiOperation({ summary: 'Visualizza ispezione tramite token pubblico' })
  @ApiParam({ name: 'token', description: 'Token pubblico di accesso' })
  @ApiResponse({ status: 200, description: 'Ispezione con dettagli completi' })
  @ApiResponse({ status: 404, description: 'Token non trovato o scaduto' })
  async getInspectionByToken(
    @Param('token') token: string,
  ): Promise<{ success: boolean; data: unknown }> {
    const inspection = await this.inspectionService.getByPublicToken(token);
    return { success: true, data: inspection };
  }

  @Post(':token/approve-repairs')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approva riparazioni raccomandate dal cliente' })
  @ApiParam({ name: 'token', description: 'Token pubblico di accesso' })
  @ApiResponse({ status: 200, description: 'Riparazioni approvate' })
  async approveRepairs(
    @Param('token') token: string,
    @Body() dto: ApproveRepairsDto,
  ): Promise<{ success: boolean; message: string }> {
    await this.inspectionService.approveRepairsViaToken(
      token,
      dto.approvedFindingIds,
      dto.declinedFindingIds,
    );
    return {
      success: true,
      message: 'Riparazioni approvate con successo',
    };
  }
}
