/**
 * MechMind OS - Payroll Query DTOs
 *
 * DTO per query e approvazione payroll.
 */

import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PayrollPeriodQueryDto {
  @ApiProperty({ description: 'Periodo in formato YYYY-MM', example: '2026-03' })
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'Il periodo deve essere in formato YYYY-MM',
  })
  period: string;
}

export class ApprovePayrollDto {
  @ApiProperty({ description: 'ID utente che approva', example: 'user-001' })
  @IsString()
  approvedBy: string;
}
