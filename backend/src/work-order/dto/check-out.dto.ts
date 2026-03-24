import { IsString, IsOptional, IsInt, IsEnum, IsArray, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FuelLevel } from '@prisma/client';

export class VehicleCheckOutDto {
  @ApiProperty({ description: 'Chilometraggio alla riconsegna', example: 125050 })
  @IsInt()
  @Min(0)
  mileageOut: number;

  @ApiProperty({
    description: 'Livello carburante alla riconsegna',
    enum: FuelLevel,
    example: 'THREE_QUARTERS',
  })
  @IsEnum(FuelLevel)
  fuelLevel: FuelLevel;

  @ApiPropertyOptional({
    description: 'URL foto del veicolo alla riconsegna',
    example: ['https://s3.example.com/checkout1.jpg'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @ApiPropertyOptional({
    description: 'Firma del cliente alla riconsegna (base64)',
    example: 'data:image/png;base64,...',
  })
  @IsOptional()
  @IsString()
  customerSignature?: string;

  @ApiPropertyOptional({
    description: 'Auto di cortesia restituita',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  courtesyCarReturned?: boolean;

  @ApiPropertyOptional({
    description: 'Note alla riconsegna',
    example: 'Veicolo lavato e sanificato',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
