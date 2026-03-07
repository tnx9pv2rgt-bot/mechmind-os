import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsDateString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsArray,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BookingSource } from '@prisma/client';

export class CreateBookingDto {
  @ApiProperty({
    description: 'Customer ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  customerId: string;

  @ApiPropertyOptional({
    description: 'Vehicle ID (optional)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiProperty({
    description: 'Booking slot ID',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsUUID()
  slotId: string;

  @ApiProperty({
    description: 'Scheduled date and time',
    example: '2024-01-15T09:00:00Z',
  })
  @IsDateString()
  scheduledDate: string;

  @ApiPropertyOptional({
    description: 'Duration in minutes',
    example: 60,
    minimum: 15,
    maximum: 480,
  })
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(480)
  durationMinutes?: number;

  @ApiPropertyOptional({
    description: 'Service IDs to include in booking',
    example: ['550e8400-e29b-41d4-a716-446655440003'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  serviceIds?: string[];

  @ApiPropertyOptional({
    description: 'Booking notes',
    example: 'Customer reported engine noise',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Booking source',
    enum: BookingSource,
    example: BookingSource.WEB,
  })
  @IsOptional()
  @IsEnum(BookingSource)
  source?: BookingSource;

  @ApiPropertyOptional({
    description: 'Vapi call ID if booked via voice',
    example: 'call_123456789',
  })
  @IsOptional()
  @IsString()
  vapiCallId?: string;
}

export class ReserveSlotDto {
  @ApiProperty({
    description: 'Slot ID to reserve',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsUUID()
  slotId: string;

  @ApiProperty({
    description: 'Customer ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  customerId: string;

  @ApiPropertyOptional({
    description: 'Vehicle ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiPropertyOptional({
    description: 'Service IDs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  serviceIds?: string[];

  @ApiPropertyOptional({
    description: 'Booking notes',
    example: 'Urgent repair needed',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateBookingDto {
  @ApiPropertyOptional({
    description: 'New status',
    enum: ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'New scheduled date',
    example: '2024-01-15T14:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiPropertyOptional({
    description: 'Updated notes',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BookingResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'CONFIRMED' })
  status: string;

  @ApiProperty({ example: '2024-01-15T09:00:00Z' })
  scheduledDate: Date;

  @ApiProperty({ example: 60 })
  durationMinutes: number;

  @ApiProperty({ example: 'WEB' })
  source: string;

  @ApiProperty({ example: '2024-01-10T08:30:00Z' })
  createdAt: Date;

  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  };

  vehicle?: {
    id: string;
    licensePlate: string;
    make: string;
    model: string;
  };

  services?: {
    id: string;
    name: string;
    price: number;
  }[];
}

export class ConflictResponseDto {
  @ApiProperty({ example: 409 })
  statusCode: number;

  @ApiProperty({ example: 'Slot already reserved' })
  message: string;

  @ApiProperty({ example: 'CONFLICT' })
  error: string;

  @ApiProperty({
    description: 'Retry information',
    example: {
      retryAfter: 5000,
      queuePosition: 1,
    },
  })
  retryInfo?: {
    retryAfter: number;
    queuePosition: number;
  };
}
