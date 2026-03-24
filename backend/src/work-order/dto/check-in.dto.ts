import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  IsEnum,
  IsArray,
  IsBoolean,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FuelLevel } from '@prisma/client';

export class VehicleCheckInDto {
  @ApiPropertyOptional({
    description: 'ID della prenotazione collegata',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  bookingId?: string;

  @ApiProperty({ description: 'ID del veicolo', example: '550e8400-e29b-41d4-a716-446655440001' })
  @IsUUID()
  vehicleId: string;

  @ApiProperty({ description: 'ID del cliente', example: '550e8400-e29b-41d4-a716-446655440002' })
  @IsUUID()
  customerId: string;

  @ApiProperty({ description: 'Chilometraggio in ingresso', example: 125000 })
  @IsInt()
  @Min(0)
  mileageIn: number;

  @ApiPropertyOptional({
    description: 'Livello carburante in ingresso',
    enum: FuelLevel,
    example: 'HALF',
  })
  @IsOptional()
  @IsEnum(FuelLevel)
  fuelLevel?: FuelLevel;

  @ApiPropertyOptional({
    description: 'URL foto del veicolo in ingresso',
    example: ['https://s3.example.com/photo1.jpg'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @ApiPropertyOptional({
    description: 'Note su danni preesistenti',
    example: 'Graffio paraurti anteriore destro',
  })
  @IsOptional()
  @IsString()
  damageNotes?: string;

  @ApiPropertyOptional({
    description: 'Oggetti lasciati dal cliente nel veicolo',
    example: 'Seggiolino bambino, ombrello',
  })
  @IsOptional()
  @IsString()
  itemsLeftInCar?: string;

  @ApiPropertyOptional({
    description: 'Firma del cliente (base64)',
    example: 'data:image/png;base64,...',
  })
  @IsOptional()
  @IsString()
  customerSignature?: string;

  @ApiPropertyOptional({ description: 'Posto auto assegnato', example: 'P3' })
  @IsOptional()
  @IsString()
  parkingSpot?: string;

  @ApiPropertyOptional({ description: 'Data stimata di ritiro', example: '2026-03-18T17:00:00Z' })
  @IsOptional()
  @IsDateString()
  estimatedPickup?: string;

  @ApiPropertyOptional({ description: 'Auto di cortesia fornita', example: false })
  @IsOptional()
  @IsBoolean()
  courtesyCarProvided?: boolean;

  @ApiPropertyOptional({ description: 'Targa auto di cortesia', example: 'FI 123 AB' })
  @IsOptional()
  @IsString()
  courtesyCarPlate?: string;
}
