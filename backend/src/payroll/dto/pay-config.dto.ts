/**
 * MechMind OS - Pay Configuration DTOs
 *
 * DTO per configurazione retribuzione tecnici.
 */

import { IsEnum, IsOptional, IsNumber, IsDateString, IsObject, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PayType } from '@prisma/client';

export class CreatePayConfigDto {
  @ApiProperty({ enum: PayType, description: 'Tipo di retribuzione' })
  @IsEnum(PayType)
  payType: PayType;

  @ApiPropertyOptional({ description: 'Tariffa oraria in centesimi', example: 2500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRateCents?: number;

  @ApiPropertyOptional({ description: 'Tariffa fissa per lavoro in centesimi', example: 5000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  flatRatePerJobCents?: number;

  @ApiPropertyOptional({ description: 'Moltiplicatore straordinario', example: 1.5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  overtimeMultiplier?: number;

  @ApiPropertyOptional({ description: 'Soglia ore straordinario', example: 40 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  overtimeThresholdHours?: number;

  @ApiPropertyOptional({ description: 'Regole bonus in formato JSON' })
  @IsOptional()
  @IsObject()
  bonusRules?: Record<string, unknown>;

  @ApiProperty({ description: 'Data inizio validità', example: '2026-03-01' })
  @IsDateString()
  effectiveFrom: string;

  @ApiPropertyOptional({ description: 'Data fine validità', example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}
