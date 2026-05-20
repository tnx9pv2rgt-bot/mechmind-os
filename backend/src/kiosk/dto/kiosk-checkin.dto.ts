import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class KioskCheckinDto {
  @ApiProperty({
    description: 'ID della prenotazione',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  bookingId: string;

  @ApiProperty({
    description: 'ID del tenant',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  tenantId: string;

  @ApiPropertyOptional({
    description: 'Note aggiuntive dal cliente',
    example: 'Rumore sospetto al motore da ieri',
  })
  @IsOptional()
  @IsString()
  customerNotes?: string;
}
