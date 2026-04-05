import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ManualRecordDto {
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
