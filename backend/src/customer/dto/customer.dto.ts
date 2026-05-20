import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  Length,
  Matches,
} from 'class-validator';
import { CustomerType, ContactChannel, CustomerSource } from '@prisma/client';

export class CreateCustomerDto {
  @ApiProperty({
    description: 'Customer phone number',
    // eslint-disable-next-line sonarjs/no-duplicate-string
    example: '+390123456789',
  })
  @IsString()
  @Length(8, 20)
  phone: string;

  @ApiPropertyOptional({
    description: 'Customer email',
    // eslint-disable-next-line sonarjs/no-duplicate-string
    example: 'customer@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'First name',
    example: 'Mario',
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Last name',
    example: 'Rossi',
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'GDPR consent given',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  gdprConsent?: boolean;

  @ApiPropertyOptional({
    description: 'Marketing consent given',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  marketingConsent?: boolean;

  @ApiPropertyOptional({
    description: 'GDPR consent timestamp (ISO 8601)',
    example: '2026-03-15T10:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  gdprConsentAt?: string;

  @ApiPropertyOptional({
    description: 'Privacy policy version accepted',
    example: '2.0',
  })
  @IsOptional()
  @IsString()
  gdprPrivacyVersion?: string;

  @ApiPropertyOptional({
    description: 'Method used to collect GDPR consent',
    example: 'form-checkbox',
  })
  @IsOptional()
  @IsString()
  gdprConsentMethod?: string;

  @ApiPropertyOptional({
    description: 'Marketing consent timestamp (ISO 8601)',
    example: '2026-03-15T10:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  marketingConsentAt?: string;

  @ApiPropertyOptional({
    description: 'Customer notes',
    // eslint-disable-next-line sonarjs/no-duplicate-string
    example: 'Preferred contact time: morning',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  // Dati fiscali italiani
  @ApiPropertyOptional({
    description: 'Customer type',
    enum: CustomerType,
    default: 'PERSONA',
  })
  @IsOptional()
  @IsEnum(CustomerType)
  customerType?: CustomerType;

  @ApiPropertyOptional({
    description: 'Codice Fiscale (16 chars persona, 11 cifre azienda)',
    example: 'RSSMRA85M01H501Z',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$|^\d{11}$/, {
    message: 'Codice fiscale non valido',
  })
  codiceFiscale?: string;

  @ApiPropertyOptional({
    description: 'Partita IVA (11 cifre)',
    example: '12345678901',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/, { message: 'Partita IVA deve essere 11 cifre' })
  partitaIva?: string;

  @ApiPropertyOptional({
    description: 'Codice destinatario SDI (7 caratteri)',
    example: 'M5UXCR1',
  })
  @IsOptional()
  @IsString()
  @Length(7, 7)
  sdiCode?: string;

  @ApiPropertyOptional({
    description: 'PEC per fatturazione elettronica',
    example: 'azienda@pec.it',
  })
  @IsOptional()
  @IsEmail()
  pecEmail?: string;

  // Indirizzo
  @ApiPropertyOptional({ description: 'Indirizzo (via e numero civico)', example: 'Via Roma 1' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Città', example: 'Milano' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'CAP (5 cifre)', example: '20100' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{5}$/, { message: 'CAP deve essere 5 cifre' })
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Sigla provincia (2 lettere)', example: 'MI' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  province?: string;

  // Preferenze
  @ApiPropertyOptional({ description: 'Canale contatto preferito', enum: ContactChannel })
  @IsOptional()
  @IsEnum(ContactChannel)
  preferredChannel?: ContactChannel;

  @ApiPropertyOptional({ description: 'Fonte acquisizione cliente', enum: CustomerSource })
  @IsOptional()
  @IsEnum(CustomerSource)
  source?: CustomerSource;
}

export class UpdateCustomerDto {
  @ApiPropertyOptional({ example: '+390123456789' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'customer@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Mario' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Rossi' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: 'Preferred contact time: morning' })
  @IsOptional()
  @IsString()
  notes?: string;

  // Dati fiscali
  @ApiPropertyOptional({ enum: CustomerType })
  @IsOptional()
  @IsEnum(CustomerType)
  customerType?: CustomerType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$|^\d{11}$/, {
    message: 'Codice fiscale non valido',
  })
  codiceFiscale?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/, { message: 'Partita IVA deve essere 11 cifre' })
  partitaIva?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(7, 7)
  sdiCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  pecEmail?: string;

  // Indirizzo
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^\d{5}$/, { message: 'CAP deve essere 5 cifre' })
  postalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 2)
  province?: string;

  // Preferenze
  @ApiPropertyOptional({ enum: ContactChannel })
  @IsOptional()
  @IsEnum(ContactChannel)
  preferredChannel?: ContactChannel;

  @ApiPropertyOptional({ enum: CustomerSource })
  @IsOptional()
  @IsEnum(CustomerSource)
  source?: CustomerSource;
}

export class CustomerResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: '+390123456789' })
  phone: string;

  @ApiPropertyOptional({ example: 'customer@example.com' })
  email?: string;

  @ApiPropertyOptional({ example: 'Mario' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Rossi' })
  lastName?: string;

  @ApiProperty({ example: true })
  gdprConsent: boolean;

  @ApiProperty({ example: '2024-01-10T10:00:00Z' })
  gdprConsentAt?: Date;

  @ApiProperty({ example: false })
  marketingConsent: boolean;

  @ApiPropertyOptional({ example: 'Preferred contact time: morning' })
  notes?: string;

  @ApiPropertyOptional({ enum: CustomerType })
  customerType?: string;

  @ApiPropertyOptional()
  codiceFiscale?: string;

  @ApiPropertyOptional()
  partitaIva?: string;

  @ApiPropertyOptional()
  sdiCode?: string;

  @ApiPropertyOptional()
  pecEmail?: string;

  @ApiPropertyOptional()
  address?: string;

  @ApiPropertyOptional()
  city?: string;

  @ApiPropertyOptional()
  postalCode?: string;

  @ApiPropertyOptional()
  province?: string;

  @ApiProperty({ example: '2024-01-10T08:30:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-10T08:30:00Z' })
  updatedAt: Date;
}

export class CustomerSearchDto {
  @ApiPropertyOptional({
    description: 'Search by phone number',
    example: '+390123456789',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Search by email',
    example: 'customer@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Search by name',
    example: 'Mario',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Limit results',
    example: 20,
  })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Offset for pagination',
    example: 0,
  })
  @IsOptional()
  offset?: number;
}

export class GdprConsentDto {
  @ApiProperty({
    description: 'GDPR consent given',
    example: true,
  })
  @IsBoolean()
  consent: boolean;

  @ApiPropertyOptional({
    description: 'Consent timestamp',
    example: '2024-01-10T10:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  consentAt?: string;

  @ApiPropertyOptional({
    description: 'Consent method',
    example: 'web_form',
  })
  @IsOptional()
  @IsString()
  method?: string;
}

export class MarketingConsentDto {
  @ApiProperty({
    description: 'Marketing consent given',
    example: true,
  })
  @IsBoolean()
  consent: boolean;
}

export class CustomerWithBookingsDto extends CustomerResponseDto {
  @ApiProperty({
    description: 'Customer bookings',
    type: 'array',
  })
  bookings: unknown[];

  @ApiProperty({
    description: 'Customer vehicles',
    type: 'array',
  })
  vehicles: unknown[];
}
