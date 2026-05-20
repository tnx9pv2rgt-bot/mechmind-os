import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  ValidateNested,
  Matches,
  Min,
  Max,
  Length,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum RegimeFiscale {
  ORDINARIO = 'ORDINARIO',
  SEMPLIFICATO = 'SEMPLIFICATO',
  FORFETTARIO = 'FORFETTARIO',
}

export class BusinessHoursEntry {
  @ApiProperty({ example: '08:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  open: string;

  @ApiProperty({ example: '18:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  close: string;

  @ApiPropertyOptional({ example: '12:30' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  lunchStart?: string;

  @ApiPropertyOptional({ example: '13:30' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  lunchEnd?: string;
}

export class PartMarkupRule {
  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0)
  maxCostPrice: number;

  @ApiProperty({ example: 75 })
  @IsNumber()
  @Min(0)
  @Max(1000)
  markupPercent: number;
}

export class PartMarkupMatrix {
  @ApiProperty({ type: [PartMarkupRule] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartMarkupRule)
  rules: PartMarkupRule[];
}

export class UpdateTenantSettingsDto {
  // Dati fiscali
  @ApiPropertyOptional({ description: 'Ragione Sociale', example: 'Officina Rossi S.r.l.' })
  @IsOptional()
  @IsString()
  ragioneSociale?: string;

  @ApiPropertyOptional({ description: 'Partita IVA (11 cifre)', example: '12345678901' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/, { message: 'Partita IVA deve essere di 11 cifre' })
  partitaIva?: string;

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

  @ApiPropertyOptional({ description: 'Regime fiscale', enum: RegimeFiscale })
  @IsOptional()
  @IsEnum(RegimeFiscale)
  regimeFiscale?: RegimeFiscale;

  // Indirizzo
  @ApiPropertyOptional({ description: 'Indirizzo', example: 'Via Roma 1' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Città', example: 'Roma' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'CAP (5 cifre)', example: '00100' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{5}$/, { message: 'CAP deve essere di 5 cifre' })
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Provincia (2 lettere)', example: 'RM' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: 'Provincia deve essere di 2 lettere maiuscole' })
  province?: string;

  @ApiPropertyOptional({ description: 'Paese', example: 'IT' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;

  // Contatti
  @ApiPropertyOptional({ description: 'Telefono' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Email' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Sito web' })
  @IsOptional()
  @IsString()
  website?: string;

  // Operativi
  @ApiPropertyOptional({ description: 'URL logo' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

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

  @ApiPropertyOptional({ description: 'Termini pagamento default', example: 'IMMEDIATO' })
  @IsOptional()
  @IsString()
  defaultPaymentTerms?: string;

  @ApiPropertyOptional({ description: 'Valuta', example: 'EUR' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({ description: 'Durata slot in minuti', example: 60 })
  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(480)
  slotDurationMinutes?: number;

  @ApiPropertyOptional({ description: 'Numero postazioni (bay)', example: 4 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  numberOfBays?: number;

  // Orari
  @ApiPropertyOptional({ description: 'Orari lavorativi per giorno (null = chiuso)' })
  @IsOptional()
  @IsObject()
  businessHours?: Record<string, BusinessHoursEntry | null>;

  @ApiPropertyOptional({ description: 'Date di chiusura', example: ['2026-12-25'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  closedDates?: string[];

  // Matrix pricing
  @ApiPropertyOptional({ description: 'Matrice markup ricambi' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PartMarkupMatrix)
  partMarkupMatrix?: PartMarkupMatrix;
}
