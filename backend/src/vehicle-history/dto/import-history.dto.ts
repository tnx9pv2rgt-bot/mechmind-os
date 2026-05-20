import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export enum VehicleHistorySourceDto {
  MOTORNET = 'MOTORNET',
  CARFAX = 'CARFAX',
  MANUAL = 'MANUAL',
}

export class ImportHistoryRecordDto {
  @ApiProperty({ description: 'Tipo evento (SERVICE, REPAIR, INSPECTION, ACCIDENT, SALE)' })
  @IsString()
  eventType: string;

  @ApiProperty({ description: 'Data evento', example: '2025-06-15T10:00:00Z' })
  @IsDateString()
  eventDate: string;

  @ApiProperty({ description: 'Descrizione intervento' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: "Chilometraggio al momento dell'evento" })
  @IsOptional()
  @IsInt()
  @Min(0)
  mileage?: number;

  @ApiPropertyOptional({ description: 'Nome officina esterna' })
  @IsOptional()
  @IsString()
  shopName?: string;

  @ApiPropertyOptional({ description: 'Costo in centesimi' })
  @IsOptional()
  @IsInt()
  @Min(0)
  costCents?: number;

  @ApiPropertyOptional({ description: 'VIN del veicolo' })
  @IsOptional()
  @IsString()
  vin?: string;

  @ApiPropertyOptional({ description: 'Metadati aggiuntivi' })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class ImportHistoryDto {
  @ApiProperty({
    description: 'Sorgente dei dati importati',
    enum: VehicleHistorySourceDto,
    example: 'MOTORNET',
  })
  @IsEnum(VehicleHistorySourceDto)
  source: VehicleHistorySourceDto;

  @ApiProperty({ description: 'Record da importare', type: [ImportHistoryRecordDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportHistoryRecordDto)
  records: ImportHistoryRecordDto[];
}
