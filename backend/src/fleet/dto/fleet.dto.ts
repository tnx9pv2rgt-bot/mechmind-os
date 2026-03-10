/**
 * MechMind OS - Fleet Management DTOs
 */

import { IsString, IsOptional, IsUUID, IsEmail, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// ==========================================
// Fleet DTOs
// ==========================================

export class CreateFleetDto {
  @ApiProperty({ description: 'Fleet name' })
  @IsString()
  name: string;

  @ApiProperty({ required: false, description: 'Fleet description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Company name associated with the fleet' })
  @IsString()
  companyName: string;

  @ApiProperty({ required: false, description: 'Primary contact name' })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiProperty({ required: false, description: 'Primary contact email' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiProperty({ required: false, description: 'Primary contact phone' })
  @IsOptional()
  @IsString()
  contactPhone?: string;
}

export class UpdateFleetDto {
  @ApiProperty({ required: false, description: 'Fleet name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false, description: 'Fleet description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, description: 'Company name' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiProperty({ required: false, description: 'Primary contact name' })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiProperty({ required: false, description: 'Primary contact email' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiProperty({ required: false, description: 'Primary contact phone' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiProperty({ required: false, description: 'Whether the fleet is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AddFleetVehicleDto {
  @ApiProperty({ description: 'Vehicle ID to add to the fleet' })
  @IsUUID()
  vehicleId: string;
}

// ==========================================
// Response DTOs
// ==========================================

export class FleetVehicleResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fleetId: string;

  @ApiProperty()
  vehicleId: string;

  @ApiProperty()
  assignedAt: Date;

  @ApiProperty({ required: false, nullable: true })
  removedAt: Date | null;
}

export class FleetResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false, nullable: true })
  description: string | null;

  @ApiProperty()
  companyName: string;

  @ApiProperty({ required: false, nullable: true })
  contactName: string | null;

  @ApiProperty({ required: false, nullable: true })
  contactEmail: string | null;

  @ApiProperty({ required: false, nullable: true })
  contactPhone: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ required: false, type: [FleetVehicleResponseDto] })
  vehicles?: FleetVehicleResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
