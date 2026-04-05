/**
 * MechMind OS - Benchmark Query DTOs
 */

import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BenchmarkPeriodQueryDto {
  @ApiProperty({ description: 'Periodo in formato YYYY-MM', example: '2026-03' })
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'Il periodo deve essere in formato YYYY-MM',
  })
  period: string;
}
