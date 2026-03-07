import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
} from 'class-validator';

export class FindAvailableSlotsDto {
  @ApiProperty({
    description: 'Date to find slots for',
    example: '2024-01-15',
  })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({
    description: 'Service ID to check availability for',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional({
    description: 'Required duration in minutes',
    example: 60,
    minimum: 15,
  })
  @IsOptional()
  @IsInt()
  @Min(15)
  duration?: number;
}

export class CreateSlotDto {
  @ApiProperty({
    description: 'Slot start time',
    example: '2024-01-15T09:00:00Z',
  })
  @IsDateString()
  startTime: string;

  @ApiProperty({
    description: 'Slot end time',
    example: '2024-01-15T10:00:00Z',
  })
  @IsDateString()
  endTime: string;
}

export class BookingSlotResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: '2024-01-15T09:00:00Z' })
  startTime: Date;

  @ApiProperty({ example: '2024-01-15T10:00:00Z' })
  endTime: Date;

  @ApiProperty({ example: 'AVAILABLE', enum: ['AVAILABLE', 'BOOKED', 'BLOCKED', 'RESERVED'] })
  status: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  createdAt: Date;
}

export class SlotAvailabilityResponseDto {
  @ApiProperty({ example: '2024-01-15' })
  date: string;

  @ApiProperty({
    description: 'Available time slots',
    type: [BookingSlotResponseDto],
  })
  availableSlots: BookingSlotResponseDto[];

  @ApiProperty({ example: 8 })
  totalSlots: number;

  @ApiProperty({ example: 5 })
  availableCount: number;
}
