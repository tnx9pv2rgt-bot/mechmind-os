import { IsString, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWorkOrderDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  vehicleId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  technicianId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bookingId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  diagnosis?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  customerRequest?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  mileageIn?: number;
}
