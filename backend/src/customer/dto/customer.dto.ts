import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsDateString, IsEmail, Length } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({
    description: 'Customer phone number',
    example: '+390123456789',
  })
  @IsString()
  @Length(8, 20)
  phone: string;

  @ApiPropertyOptional({
    description: 'Customer email',
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
    example: 'Preferred contact time: morning',
  })
  @IsOptional()
  @IsString()
  notes?: string;
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
