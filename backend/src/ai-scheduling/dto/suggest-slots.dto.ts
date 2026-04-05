/**
 * MechMind OS - AI Scheduling: Suggest Slots DTO
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsArray, IsDateString, Min } from 'class-validator';

export class SuggestSlotsDto {
  @ApiProperty({ description: 'Tipo di servizio richiesto', example: 'TAGLIANDO' })
  @IsString()
  serviceType: string;

  @ApiProperty({ description: 'Durata stimata in minuti', example: 90 })
  @IsInt()
  @Min(15)
  estimatedDuration: number;

  @ApiPropertyOptional({
    description: 'Competenze richieste del tecnico',
    example: ['ENGINE', 'ELECTRICAL'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredSkills?: string[];

  @ApiPropertyOptional({ description: 'Data preferita (ISO)', example: '2026-03-30' })
  @IsOptional()
  @IsDateString()
  preferredDate?: string;

  @ApiPropertyOptional({ description: 'ID cliente (per priorità)' })
  @IsOptional()
  @IsString()
  customerId?: string;
}

export interface SuggestedSlot {
  date: string;
  startTime: string;
  endTime: string;
  bayId: string;
  technicianId: string;
  technicianName: string;
  score: number;
  reasoning: string;
}
