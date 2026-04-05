import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class PredictionFilterDto {
  @ApiPropertyOptional({ description: 'Filtra per veicolo' })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiPropertyOptional({ description: 'Filtra per cliente' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Filtra per tipo servizio (OIL_CHANGE, BRAKE_PADS, etc.)' })
  @IsOptional()
  @IsString()
  serviceType?: string;

  @ApiPropertyOptional({ description: 'Data inizio range previsioni' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Data fine range previsioni' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ description: 'Solo previsioni non ancora prenotate', default: false })
  @IsOptional()
  unbookedOnly?: boolean;

  @ApiPropertyOptional({ description: 'Limite risultati', default: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset per paginazione', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}
