import { IsString, IsOptional, IsNumber, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWorkOrderDto {
  @ApiProperty({ description: 'Vehicle ID' })
  @IsUUID()
  vehicleId: string;

  @ApiProperty({ description: 'Customer ID' })
  @IsUUID()
  customerId: string;

  @ApiPropertyOptional({ description: 'Technician ID' })
  @IsUUID()
  @IsOptional()
  technicianId?: string;

  @ApiPropertyOptional({ description: 'Booking ID' })
  @IsUUID()
  @IsOptional()
  bookingId?: string;

  @ApiPropertyOptional({ description: 'Diagnosis' })
  @IsString()
  @IsOptional()
  diagnosis?: string;

  @ApiPropertyOptional({ description: 'Customer request' })
  @IsString()
  @IsOptional()
  customerRequest?: string;

  @ApiPropertyOptional({ description: 'Mileage at intake' })
  @IsNumber()
  @IsOptional()
  mileageIn?: number;
}
