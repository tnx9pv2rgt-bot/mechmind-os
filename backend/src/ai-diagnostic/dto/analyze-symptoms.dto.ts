/**
 * MechMind OS - AI Diagnostic: Analyze Symptoms DTO
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsString, ValidateNested, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { VehicleInfoDto } from './analyze-dtc.dto';

export class AnalyzeSymptomsDto {
  @ApiProperty({
    description: 'Descrizione sintomi in linguaggio naturale',
    example: 'Il motore fa un rumore strano quando accelero e il consumo di carburante è aumentato',
  })
  @IsString()
  @MinLength(10)
  symptoms: string;

  @ApiProperty({ description: 'Informazioni veicolo', type: VehicleInfoDto })
  @ValidateNested()
  @Type(() => VehicleInfoDto)
  vehicleInfo: VehicleInfoDto;
}

export interface SymptomDiagnosisResult {
  diagnosisId: string;
  diagnosis: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  probableCauses: string[];
  suggestedDtcCodes: string[];
  recommendedActions: string[];
  confidence: number;
  modelUsed: string;
}
