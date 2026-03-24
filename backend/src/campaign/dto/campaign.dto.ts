import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCampaignDto {
  @ApiProperty({ description: 'Nome della campagna', example: 'Promo tagliando primavera 2026' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Tipo di campagna',
    enum: ['EMAIL', 'SMS', 'BOTH'],
    example: 'EMAIL',
  })
  @IsEnum(['EMAIL', 'SMS', 'BOTH'])
  type: 'EMAIL' | 'SMS' | 'BOTH';

  @ApiProperty({
    description: 'Template del messaggio con variabili {{nomeCliente}}, {{targa}}',
    example: 'Gentile {{nomeCliente}}, il tuo veicolo {{targa}} necessita di un tagliando.',
  })
  @IsString()
  @IsNotEmpty()
  template: string;

  @ApiPropertyOptional({ description: 'Oggetto email', example: 'Promemoria tagliando' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ description: 'Tipo di segmento', example: 'INACTIVE_6M' })
  @IsOptional()
  @IsString()
  segmentType?: string;

  @ApiPropertyOptional({ description: 'Filtri personalizzati per il segmento' })
  @IsOptional()
  @IsObject()
  segmentFilters?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Data di invio programmata',
    example: '2026-04-01T10:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class UpdateCampaignDto {
  @ApiPropertyOptional({ description: 'Nome della campagna' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Template del messaggio' })
  @IsOptional()
  @IsString()
  template?: string;

  @ApiPropertyOptional({ description: 'Oggetto email' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ description: 'Tipo di segmento' })
  @IsOptional()
  @IsString()
  segmentType?: string;

  @ApiPropertyOptional({ description: 'Filtri segmento' })
  @IsOptional()
  @IsObject()
  segmentFilters?: Record<string, unknown>;
}

export class ScheduleCampaignDto {
  @ApiProperty({ description: 'Data di invio programmata', example: '2026-04-01T10:00:00Z' })
  @IsDateString()
  scheduledAt: string;
}
