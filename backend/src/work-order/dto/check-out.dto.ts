import { IsString, IsOptional, IsInt, IsEnum, IsArray, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FuelLevel } from '@prisma/client';

export class VehicleCheckOutDto {
  @ApiProperty({ description: 'Mileage at delivery' })
  @IsInt()
  @Min(0)
  mileageOut: number;

  @ApiProperty({ description: 'Fuel level at delivery', enum: FuelLevel })
  @IsEnum(FuelLevel)
  fuelLevel: FuelLevel;

  @ApiPropertyOptional({ description: 'Photo URLs of vehicle at checkout' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @ApiPropertyOptional({ description: 'Customer signature (base64)' })
  @IsOptional()
  @IsString()
  customerSignature?: string;

  @ApiPropertyOptional({ description: 'Whether courtesy car was returned' })
  @IsOptional()
  @IsBoolean()
  courtesyCarReturned?: boolean;

  @ApiPropertyOptional({ description: 'Checkout notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
