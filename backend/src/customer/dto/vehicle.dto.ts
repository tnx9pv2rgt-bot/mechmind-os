import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  IsDateString,
  Min,
  Max,
  Length,
  IsIn,
} from 'class-validator';
import { FuelType, TransmissionType, DriveType } from '@prisma/client';

export class CreateVehicleDto {
  @ApiProperty({
    description: 'License plate number',
    example: 'AB123CD',
  })
  @IsString()
  @Length(4, 15)
  licensePlate: string;

  @ApiProperty({
    description: 'Vehicle make',
    example: 'Fiat',
  })
  @IsString()
  make: string;

  @ApiProperty({
    description: 'Vehicle model',
    example: 'Panda',
  })
  @IsString()
  model: string;

  @ApiPropertyOptional({
    description: 'Vehicle year',
    example: 2020,
  })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  year?: number;

  @ApiPropertyOptional({
    description: 'Vehicle VIN',
    example: 'ZFA3120000J123456',
  })
  @IsOptional()
  @IsString()
  @Length(17, 17)
  vin?: string;

  @ApiPropertyOptional({
    description: 'Vehicle notes',
    example: 'Previous accident on left side',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Vehicle status',
    example: 'ACTIVE',
    enum: ['ACTIVE', 'IN_SERVICE', 'WAITING_PARTS', 'READY'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'IN_SERVICE', 'WAITING_PARTS', 'READY'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Current mileage in km',
    example: 45000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  mileage?: number;

  // Dati tecnici veicolo
  @ApiPropertyOptional({ description: 'Tipo carburante', enum: FuelType })
  @IsOptional()
  @IsEnum(FuelType)
  fuelType?: FuelType;

  @ApiPropertyOptional({ description: 'Cilindrata in cc', example: 1248 })
  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(10000)
  engineDisplacement?: number;

  @ApiPropertyOptional({ description: 'Potenza in kW', example: 55 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2000)
  power?: number;

  @ApiPropertyOptional({ description: 'Tipo cambio', enum: TransmissionType })
  @IsOptional()
  @IsEnum(TransmissionType)
  transmissionType?: TransmissionType;

  @ApiPropertyOptional({ description: 'Colore veicolo', example: 'Bianco' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Tipo trazione', enum: DriveType })
  @IsOptional()
  @IsEnum(DriveType)
  driveType?: DriveType;

  @ApiPropertyOptional({ description: 'Data prima immatricolazione' })
  @IsOptional()
  @IsDateString()
  registrationDate?: string;

  @ApiPropertyOptional({ description: 'Scadenza assicurazione' })
  @IsOptional()
  @IsDateString()
  insuranceExpiry?: string;

  @ApiPropertyOptional({ description: 'Scadenza bollo auto' })
  @IsOptional()
  @IsDateString()
  taxExpiry?: string;
}

export class UpdateVehicleDto {
  @ApiPropertyOptional({ example: 'AB123CD' })
  @IsOptional()
  @IsString()
  licensePlate?: string;

  @ApiPropertyOptional({ example: 'Fiat' })
  @IsOptional()
  @IsString()
  make?: string;

  @ApiPropertyOptional({ example: 'Panda' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ example: 2020 })
  @IsOptional()
  @IsInt()
  year?: number;

  @ApiPropertyOptional({ example: 'ZFA3120000J123456' })
  @IsOptional()
  @IsString()
  vin?: string;

  @ApiPropertyOptional({ example: 'Previous accident on left side' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Vehicle status',
    example: 'ACTIVE',
    enum: ['ACTIVE', 'IN_SERVICE', 'WAITING_PARTS', 'READY'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'IN_SERVICE', 'WAITING_PARTS', 'READY'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Current mileage in km',
    example: 45000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  mileage?: number;

  // Dati tecnici veicolo
  @ApiPropertyOptional({ enum: FuelType })
  @IsOptional()
  @IsEnum(FuelType)
  fuelType?: FuelType;

  @ApiPropertyOptional({ description: 'Cilindrata in cc' })
  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(10000)
  engineDisplacement?: number;

  @ApiPropertyOptional({ description: 'Potenza in kW' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2000)
  power?: number;

  @ApiPropertyOptional({ enum: TransmissionType })
  @IsOptional()
  @IsEnum(TransmissionType)
  transmissionType?: TransmissionType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ enum: DriveType })
  @IsOptional()
  @IsEnum(DriveType)
  driveType?: DriveType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  registrationDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  insuranceExpiry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  taxExpiry?: string;

  @ApiPropertyOptional({ description: 'Scadenza revisione' })
  @IsOptional()
  @IsDateString()
  revisionExpiry?: string;
}

export class VehicleResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'AB123CD' })
  licensePlate: string;

  @ApiProperty({ example: 'Fiat' })
  make: string;

  @ApiProperty({ example: 'Panda' })
  model: string;

  @ApiPropertyOptional({ example: 2020 })
  year?: number;

  @ApiPropertyOptional({ example: 'ZFA3120000J123456' })
  vin?: string;

  @ApiPropertyOptional({ example: 'Previous accident on left side' })
  notes?: string;

  @ApiPropertyOptional({ example: 'active' })
  status?: string;

  @ApiPropertyOptional({ example: 45000 })
  mileage?: number;

  @ApiPropertyOptional({ enum: FuelType })
  fuelType?: string;

  @ApiPropertyOptional()
  engineDisplacement?: number;

  @ApiPropertyOptional()
  power?: number;

  @ApiPropertyOptional({ enum: TransmissionType })
  transmissionType?: string;

  @ApiPropertyOptional()
  color?: string;

  @ApiPropertyOptional({ enum: DriveType })
  driveType?: string;

  @ApiProperty({ example: '2024-01-10T08:30:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-10T08:30:00Z' })
  updatedAt: Date;
}
