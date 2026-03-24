/**
 * MechMind OS - Location Management DTOs
 */

import { IsString, IsOptional, IsEmail, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// ==========================================
// Request DTOs
// ==========================================

export class CreateLocationDto {
  @ApiProperty({ description: 'Nome della sede' })
  @IsString()
  name: string;

  @ApiProperty({ required: false, description: 'Indirizzo della sede' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false, description: 'Città' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false, description: 'CAP' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiProperty({ required: false, description: 'Paese (default: IT)', default: 'IT' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ required: false, description: 'Telefono della sede' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false, description: 'Email della sede' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, description: 'Se è la sede principale', default: false })
  @IsOptional()
  @IsBoolean()
  isMain?: boolean;
}

export class UpdateLocationDto {
  @ApiProperty({ required: false, description: 'Nome della sede' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false, description: 'Indirizzo della sede' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false, description: 'Città' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false, description: 'CAP' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiProperty({ required: false, description: 'Paese' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ required: false, description: 'Telefono della sede' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false, description: 'Email della sede' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, description: 'Se è la sede principale' })
  @IsOptional()
  @IsBoolean()
  isMain?: boolean;
}

// ==========================================
// Response DTOs
// ==========================================

export class LocationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false, nullable: true })
  address: string | null;

  @ApiProperty({ required: false, nullable: true })
  city: string | null;

  @ApiProperty({ required: false, nullable: true })
  postalCode: string | null;

  @ApiProperty()
  country: string;

  @ApiProperty({ required: false, nullable: true })
  phone: string | null;

  @ApiProperty({ required: false, nullable: true })
  email: string | null;

  @ApiProperty()
  isMain: boolean;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
