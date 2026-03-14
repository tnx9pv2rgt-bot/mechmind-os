import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, Max, Length, IsIn } from 'class-validator';

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
    example: 'active',
    enum: ['active', 'in_service', 'waiting_parts', 'ready'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['active', 'in_service', 'waiting_parts', 'ready'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Current mileage in km',
    example: 45000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  mileage?: number;
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
    example: 'active',
    enum: ['active', 'in_service', 'waiting_parts', 'ready'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['active', 'in_service', 'waiting_parts', 'ready'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Current mileage in km',
    example: 45000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  mileage?: number;
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

  @ApiProperty({ example: '2024-01-10T08:30:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-10T08:30:00Z' })
  updatedAt: Date;
}
