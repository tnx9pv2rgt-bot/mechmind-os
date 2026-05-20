/**
 * MechMind OS - Declined Service DTOs
 *
 * DTO per filtri, follow-up e conversione servizi rifiutati.
 */

import { IsOptional, IsString, IsDateString, IsBoolean, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class DeclinedServiceFilterDto {
  @ApiPropertyOptional({ description: 'Filtra per ID cliente' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Filtra per gravità (CRITICAL, WARNING, INFO)' })
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiPropertyOptional({ description: 'Data inizio (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Data fine (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Filtra per stato follow-up (true = inviato, false = non inviato)',
  })
  @IsOptional()
  @IsBoolean()
  followedUp?: boolean;

  @ApiPropertyOptional({ description: 'Pagina (default: 1)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Elementi per pagina (default: 20)', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

export class MarkFollowUpDto {
  @ApiPropertyOptional({ description: 'ID campagna associata al follow-up' })
  @IsOptional()
  @IsString()
  campaignId?: string;
}

export class MarkConvertedDto {
  @ApiProperty({ description: 'ID della prenotazione risultante dalla conversione' })
  @IsString()
  bookingId!: string;
}

export class FollowUpCandidatesQueryDto {
  @ApiPropertyOptional({ description: 'Giorni trascorsi dal rifiuto (default: 30)', default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  daysAgo?: number;
}
