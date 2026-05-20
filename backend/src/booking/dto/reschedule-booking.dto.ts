import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class RescheduleBookingDto {
  @ApiProperty({
    description: 'New scheduled date and time',
    example: '2024-01-20T10:00:00Z',
  })
  @IsDateString()
  newDate: string;

  @ApiPropertyOptional({
    description: 'New slot ID to move booking to',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsOptional()
  @IsUUID()
  newSlotId?: string;

  @ApiPropertyOptional({
    description: 'Reason for rescheduling',
    example: 'Customer requested different time',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
