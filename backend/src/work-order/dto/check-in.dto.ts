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
  @ApiPropertyOptional({ description: 'Booking ID to link' })
  @IsUUID()
  @IsOptional()
  bookingId?: string;

  @ApiProperty({ description: 'Vehicle ID' })
  @IsUUID()
  vehicleId: string;

  @ApiProperty({ description: 'Customer ID' })
  @IsUUID()
  customerId: string;

  @ApiProperty({ description: 'Mileage at intake' })
  @IsInt()
  @Min(0)
  mileageIn: number;

  @ApiProperty({ description: 'Fuel level at intake', enum: FuelLevel })
  @IsEnum(FuelLevel)
  fuelLevel: FuelLevel;

  @ApiPropertyOptional({ description: 'Photo URLs from S3' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @ApiPropertyOptional({ description: 'Notes about vehicle damage' })
  @IsOptional()
  @IsString()
  damageNotes?: string;

  @ApiPropertyOptional({ description: 'Items left in car by customer' })
  @IsOptional()
  @IsString()
  itemsLeftInCar?: string;

  @ApiPropertyOptional({ description: 'Customer signature (base64)' })
  @IsOptional()
  @IsString()
  customerSignature?: string;

  @ApiPropertyOptional({ description: 'Parking spot assigned' })
  @IsOptional()
  @IsString()
  parkingSpot?: string;

  @ApiPropertyOptional({ description: 'Estimated pickup date' })
  @IsOptional()
  @IsDateString()
  estimatedPickup?: string;

  @ApiPropertyOptional({ description: 'Whether a courtesy car was provided' })
  @IsOptional()
  @IsBoolean()
  courtesyCarProvided?: boolean;

  @ApiPropertyOptional({ description: 'Courtesy car license plate' })
  @IsOptional()
  @IsString()
  courtesyCarPlate?: string;
}
