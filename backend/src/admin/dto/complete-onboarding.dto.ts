import {
  IsString,
  IsOptional,
  IsNumber,
  IsObject,
  Matches,
  Min,
  Max,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessHoursEntry } from './update-tenant-settings.dto';

export class CompleteOnboardingDto {
  @ApiProperty({ description: 'Ragione Sociale', example: 'Officina Rossi S.r.l.' })
  @IsString()
  ragioneSociale: string;

  @ApiProperty({ description: 'Partita IVA (11 cifre)', example: '12345678901' })
  @IsString()
  @Matches(/^\d{11}$/, { message: 'Partita IVA deve essere di 11 cifre' })
  partitaIva: string;

  @ApiPropertyOptional({
    description: 'Codice Fiscale (11 o 16 caratteri)',
    example: 'RSSMRA80A01H501A',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9]{11,16}$/, { message: 'Codice Fiscale non valido' })
  codiceFiscale?: string;

  @ApiPropertyOptional({ description: 'Codice SDI (7 caratteri)', example: '0000000' })
  @IsOptional()
  @IsString()
  @Length(7, 7, { message: 'Codice SDI deve essere di 7 caratteri' })
  sdiCode?: string;

  @ApiPropertyOptional({ description: 'PEC Email' })
  @IsOptional()
  @IsString()
  pecEmail?: string;

  @ApiPropertyOptional({ description: 'Orari lavorativi per giorno (null = chiuso)' })
  @IsOptional()
  @IsObject()
  businessHours?: Record<string, BusinessHoursEntry | null>;

  @ApiPropertyOptional({ description: 'Numero postazioni (bay)', example: 4 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  numberOfBays?: number;

  @ApiPropertyOptional({ description: 'Durata slot in minuti', example: 60 })
  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(480)
  slotDurationMinutes?: number;

  @ApiPropertyOptional({ description: 'Aliquota IVA default', example: 22 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  defaultVatRate?: number;

  @ApiPropertyOptional({ description: 'Formato numero fattura', example: 'FT-{YEAR}-{SEQ}' })
  @IsOptional()
  @IsString()
  invoiceNumberFormat?: string;

  @ApiPropertyOptional({ description: 'Valuta', example: 'EUR' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}
