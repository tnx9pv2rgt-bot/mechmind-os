import { IsString, IsOptional, IsNumber, IsUUID, IsBoolean, IsDateString } from 'class-validator';
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

  // --- New DMS fields ---

  @ApiPropertyOptional({
    description: 'Priorità ordine di lavoro (NORMAL, HIGH, URGENT)',
    required: false,
    example: 'NORMAL',
  })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({
    description: 'Tipo ordine di lavoro (CUSTOMER_PAY, WARRANTY, INTERNAL, INSURANCE)',
    required: false,
    example: 'CUSTOMER_PAY',
  })
  @IsOptional()
  @IsString()
  woType?: string;

  @ApiPropertyOptional({
    description: 'ID del consulente di servizio assegnato',
    required: false,
  })
  @IsOptional()
  @IsString()
  serviceAdvisorId?: string;

  @ApiPropertyOptional({
    description: 'Modalità di consegna veicolo (WALK_IN, APPOINTMENT, TOW, LOANER)',
    required: false,
    example: 'APPOINTMENT',
  })
  @IsOptional()
  @IsString()
  dropOffType?: string;

  @ApiPropertyOptional({
    description: 'Il cliente ha richiesto un veicolo sostitutivo',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  courtesyCarRequested?: boolean;

  @ApiPropertyOptional({
    description: 'Targa del veicolo sostitutivo assegnato',
    required: false,
    example: 'AB123CD',
  })
  @IsOptional()
  @IsString()
  courtesyCarPlate?: string;

  @ApiPropertyOptional({
    description: 'Note interne (non visibili al cliente)',
    required: false,
  })
  @IsOptional()
  @IsString()
  internalNotes?: string;

  @ApiPropertyOptional({
    description: 'Note visibili al cliente sul portale',
    required: false,
  })
  @IsOptional()
  @IsString()
  customerVisibleNotes?: string;

  @ApiPropertyOptional({
    description: 'Descrizione dei danni preesistenti al veicolo',
    required: false,
  })
  @IsOptional()
  @IsString()
  preExistingDamage?: string;

  @ApiPropertyOptional({
    description: 'Test drive effettuato prima della riparazione',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  testDriveBefore?: boolean;

  @ApiPropertyOptional({
    description: 'Canale di acquisizione del cliente (es. Google, Passaparola)',
    required: false,
    example: 'Google',
  })
  @IsOptional()
  @IsString()
  marketingSource?: string;

  @ApiPropertyOptional({
    description: 'Importo pre-autorizzato per i lavori (EUR)',
    required: false,
    example: 500.0,
  })
  @IsOptional()
  @IsNumber()
  preAuthAmount?: number;

  @ApiPropertyOptional({
    description: 'Il cliente è esente IVA',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  taxExempt?: boolean;

  @ApiPropertyOptional({
    description: 'Numero certificato esenzione IVA',
    required: false,
  })
  @IsOptional()
  @IsString()
  taxExemptCert?: string;

  @ApiPropertyOptional({
    description: 'Controllo richiami attivi effettuato',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  recallCheckDone?: boolean;

  @ApiPropertyOptional({
    description: 'Posto parcheggio assegnato al veicolo',
    required: false,
    example: 'A12',
  })
  @IsOptional()
  @IsString()
  parkingSpot?: string;

  @ApiPropertyOptional({
    description: 'Numero/etichetta del portachiavi',
    required: false,
    example: 'K-042',
  })
  @IsOptional()
  @IsString()
  keyTag?: string;

  @ApiPropertyOptional({
    description: 'Modalità di contatto preferita dal cliente (PHONE, EMAIL, SMS, WHATSAPP)',
    required: false,
    example: 'SMS',
  })
  @IsOptional()
  @IsString()
  preferredContact?: string;

  @ApiPropertyOptional({
    description: 'Data/ora stimata di completamento lavori (ISO 8601)',
    required: false,
    example: '2026-03-30T17:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  estimatedCompletion?: string;

  @ApiPropertyOptional({
    description: 'Data/ora stimata di ritiro del veicolo da parte del cliente (ISO 8601)',
    required: false,
    example: '2026-03-30T18:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  estimatedPickup?: string;

  @ApiPropertyOptional({
    description: 'ID del box/baia di lavoro assegnata',
    required: false,
  })
  @IsOptional()
  @IsString()
  assignedBayId?: string;
}
