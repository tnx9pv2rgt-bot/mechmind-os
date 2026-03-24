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
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WasteEntryType, WasteHazardClass, WastePhysicalState } from '@prisma/client';

export class CreateWasteEntryDto {
  @ApiProperty({ description: 'Codice CER del rifiuto', example: '130205*' })
  @IsString()
  @IsNotEmpty()
  cerCode!: string;

  @ApiProperty({ description: 'Descrizione del codice CER', example: 'Oli minerali per motori' })
  @IsString()
  @IsNotEmpty()
  cerDescription!: string;

  @ApiProperty({ description: 'Tipo di movimento: CARICO o SCARICO', enum: WasteEntryType })
  @IsEnum(WasteEntryType)
  entryType!: WasteEntryType;

  @ApiProperty({ description: 'Data del movimento', example: '2026-03-24' })
  @IsDateString()
  entryDate!: string;

  @ApiProperty({ description: 'Quantita in kg', example: 25.5, minimum: 0.001 })
  @IsNumber()
  @Min(0.001)
  quantityKg!: number;

  @ApiProperty({ description: 'Classe di pericolosita', enum: WasteHazardClass })
  @IsEnum(WasteHazardClass)
  hazardClass!: WasteHazardClass;

  @ApiProperty({ description: 'Stato fisico del rifiuto', enum: WastePhysicalState })
  @IsEnum(WastePhysicalState)
  physicalState!: WastePhysicalState;

  @ApiPropertyOptional({ description: 'Numero di unita', example: 4 })
  @IsOptional()
  @IsInt()
  quantityUnits?: number;

  @ApiPropertyOptional({ description: 'Tipo di unita (es. fusti, taniche)', example: 'fusti' })
  @IsOptional()
  @IsString()
  unitType?: string;

  @ApiPropertyOptional({ description: 'Descrizione della provenienza del rifiuto' })
  @IsOptional()
  @IsString()
  originDescription?: string;

  @ApiPropertyOptional({ description: 'Produzione propria', default: true })
  @IsOptional()
  @IsBoolean()
  isOwnProduction?: boolean;

  @ApiPropertyOptional({ description: 'ID del trasportatore' })
  @IsOptional()
  @IsUUID()
  transporterId?: string;

  @ApiPropertyOptional({ description: 'ID della destinazione' })
  @IsOptional()
  @IsUUID()
  destinationId?: string;

  @ApiPropertyOptional({ description: 'ID dell\'ordine di lavoro collegato' })
  @IsOptional()
  @IsUUID()
  workOrderId?: string;

  @ApiPropertyOptional({ description: 'Codice area di stoccaggio', example: 'MAG-A1' })
  @IsOptional()
  @IsString()
  storageLocationCode?: string;

  @ApiPropertyOptional({ description: 'Note aggiuntive' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class WasteEntryQueryDto {
  @ApiPropertyOptional({ description: 'Numero di pagina', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @ApiPropertyOptional({ description: 'Elementi per pagina', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;

  @ApiPropertyOptional({ description: 'Filtra per codice CER' })
  @IsOptional()
  @IsString()
  cerCode?: string;

  @ApiPropertyOptional({ description: 'Filtra per tipo movimento', enum: WasteEntryType })
  @IsOptional()
  @IsEnum(WasteEntryType)
  entryType?: WasteEntryType;

  @ApiPropertyOptional({ description: 'Data inizio filtro', example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Data fine filtro', example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Ricerca testuale' })
  @IsOptional()
  @IsString()
  search?: string;
}
