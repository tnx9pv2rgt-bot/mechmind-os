import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsDateString,
  IsNumber,
  Min,
  IsInt,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { WasteFirStatus, WasteHazardClass, WastePhysicalState } from '@prisma/client';

export class CreateFirDto {
  @ApiProperty({ description: 'Codice CER del rifiuto', example: '130205*' })
  @IsString()
  @IsNotEmpty()
  cerCode!: string;

  @ApiProperty({ description: 'Descrizione del codice CER' })
  @IsString()
  @IsNotEmpty()
  cerDescription!: string;

  @ApiProperty({ description: 'Quantita in kg', minimum: 0.001 })
  @IsNumber()
  @Min(0.001)
  quantityKg!: number;

  @ApiProperty({ description: 'Classe di pericolosita', enum: WasteHazardClass })
  @IsEnum(WasteHazardClass)
  hazardClass!: WasteHazardClass;

  @ApiProperty({ description: 'Stato fisico del rifiuto', enum: WastePhysicalState })
  @IsEnum(WastePhysicalState)
  physicalState!: WastePhysicalState;

  @ApiProperty({ description: 'ID del trasportatore' })
  @IsUUID()
  transporterId!: string;

  @ApiProperty({ description: 'ID della destinazione' })
  @IsUUID()
  destinationId!: string;

  @ApiProperty({ description: 'Data programmata per il ritiro', example: '2026-04-01' })
  @IsDateString()
  scheduledDate!: string;

  @ApiPropertyOptional({ description: 'Classe ADR per trasporto merci pericolose' })
  @IsOptional()
  @IsString()
  adrClass?: string;

  @ApiPropertyOptional({ description: 'Numero UN ADR' })
  @IsOptional()
  @IsString()
  adrUnNumber?: string;

  @ApiPropertyOptional({ description: 'Targa del veicolo di trasporto' })
  @IsOptional()
  @IsString()
  vehiclePlate?: string;

  @ApiPropertyOptional({ description: 'Note aggiuntive' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Numero di unita' })
  @IsOptional()
  @IsInt()
  quantityUnits?: number;

  @ApiPropertyOptional({ description: 'Tipo di unita' })
  @IsOptional()
  @IsString()
  unitType?: string;
}

export class UpdateFirStatusDto {
  @ApiProperty({ description: 'Nuovo stato del FIR', enum: WasteFirStatus })
  @IsEnum(WasteFirStatus)
  status!: WasteFirStatus;
}

export class VidimateFirDto {
  @ApiProperty({ description: 'Codice ViViFIR di vidimazione', example: 'VF2026-ABC123' })
  @IsString()
  @IsNotEmpty()
  vivifirCode!: string;
}

export class FirQueryDto {
  @ApiPropertyOptional({ description: 'Numero di pagina', default: 1 })
  @IsOptional()
  @IsInt()
  page?: number;

  @ApiPropertyOptional({ description: 'Elementi per pagina', default: 20 })
  @IsOptional()
  @IsInt()
  limit?: number;

  @ApiPropertyOptional({ description: 'Filtra per stato', enum: WasteFirStatus })
  @IsOptional()
  @IsEnum(WasteFirStatus)
  status?: WasteFirStatus;
}
