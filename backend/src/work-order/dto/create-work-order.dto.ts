import { IsString, IsOptional, IsNumber, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWorkOrderDto {
  @ApiProperty({ description: 'ID del veicolo', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  vehicleId: string;

  @ApiProperty({ description: 'ID del cliente', example: '550e8400-e29b-41d4-a716-446655440001' })
  @IsUUID()
  customerId: string;

  @ApiPropertyOptional({
    description: 'ID del tecnico assegnato (cuid)',
  })
  @IsString()
  @IsOptional()
  technicianId?: string;

  @ApiPropertyOptional({
    description: 'ID della prenotazione collegata',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  @IsUUID()
  @IsOptional()
  bookingId?: string;

  @ApiPropertyOptional({
    description: 'Diagnosi iniziale',
    example: 'Rumore anomalo al motore durante accelerazione',
  })
  @IsString()
  @IsOptional()
  diagnosis?: string;

  @ApiPropertyOptional({
    description: 'Richiesta del cliente',
    example: 'Tagliando completo e controllo freni',
  })
  @IsString()
  @IsOptional()
  customerRequest?: string;

  @ApiPropertyOptional({ description: 'Chilometraggio in ingresso', example: 125000 })
  @IsNumber()
  @IsOptional()
  mileageIn?: number;
}
