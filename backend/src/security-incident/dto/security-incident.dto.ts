import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  IsArray,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ─── Enums (mirrors Prisma) ───

export const INCIDENT_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];

export const INCIDENT_STATUSES = [
  'DETECTED',
  'INVESTIGATING',
  'CONTAINED',
  'RESOLVED',
  'REPORTED_ACN',
  'CLOSED',
] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const INCIDENT_TYPES = [
  'data_breach',
  'unauthorized_access',
  'malware',
  'ddos',
  'phishing',
  'insider_threat',
  'other',
] as const;
export type IncidentType = (typeof INCIDENT_TYPES)[number];

// ─── Create DTO ───

export class CreateSecurityIncidentDto {
  @ApiProperty({ description: 'Titolo dell\'incidente', example: 'Accesso non autorizzato al database' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Descrizione dettagliata dell\'incidente' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Gravità', enum: INCIDENT_SEVERITIES })
  @IsEnum(INCIDENT_SEVERITIES)
  severity: IncidentSeverity;

  @ApiProperty({ description: 'Data/ora di rilevamento (ISO 8601)', example: '2026-03-24T10:30:00Z' })
  @IsDateString()
  detectedAt: string;

  @ApiProperty({
    description: 'Tipo di incidente',
    enum: INCIDENT_TYPES,
    example: 'unauthorized_access',
  })
  @IsEnum(INCIDENT_TYPES)
  incidentType: IncidentType;

  @ApiPropertyOptional({
    description: 'Sistemi interessati',
    example: ['database', 'auth-service'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  affectedSystems?: string[];

  @ApiPropertyOptional({ description: 'Numero utenti interessati', example: 150 })
  @IsOptional()
  @IsInt()
  @Min(0)
  affectedUsers?: number;

  @ApiPropertyOptional({ description: 'Violazione dati personali', example: false })
  @IsOptional()
  @IsBoolean()
  dataBreached?: boolean;

  @ApiPropertyOptional({ description: 'Azioni di risposta intraprese' })
  @IsOptional()
  @IsString()
  responseActions?: string;
}

// ─── Update DTO ───

export class UpdateSecurityIncidentDto {
  @ApiPropertyOptional({ description: 'Titolo dell\'incidente' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Descrizione dettagliata' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Gravità', enum: INCIDENT_SEVERITIES })
  @IsOptional()
  @IsEnum(INCIDENT_SEVERITIES)
  severity?: IncidentSeverity;

  @ApiPropertyOptional({ description: 'Tipo di incidente', enum: INCIDENT_TYPES })
  @IsOptional()
  @IsEnum(INCIDENT_TYPES)
  incidentType?: IncidentType;

  @ApiPropertyOptional({ description: 'Sistemi interessati', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  affectedSystems?: string[];

  @ApiPropertyOptional({ description: 'Numero utenti interessati' })
  @IsOptional()
  @IsInt()
  @Min(0)
  affectedUsers?: number;

  @ApiPropertyOptional({ description: 'Violazione dati personali' })
  @IsOptional()
  @IsBoolean()
  dataBreached?: boolean;

  @ApiPropertyOptional({ description: 'Azioni di risposta intraprese' })
  @IsOptional()
  @IsString()
  responseActions?: string;

  @ApiPropertyOptional({ description: 'Causa radice' })
  @IsOptional()
  @IsString()
  rootCause?: string;

  @ApiPropertyOptional({ description: 'Misure preventive' })
  @IsOptional()
  @IsString()
  preventiveMeasures?: string;
}

// ─── Status Transition DTO ───

export class UpdateIncidentStatusDto {
  @ApiProperty({
    description: 'Nuovo stato',
    enum: INCIDENT_STATUSES,
    example: 'INVESTIGATING',
  })
  @IsEnum(INCIDENT_STATUSES)
  status: IncidentStatus;
}

// ─── Query DTO ───

export class IncidentQueryDto {
  @ApiPropertyOptional({ description: 'Filtra per stato', enum: INCIDENT_STATUSES })
  @IsOptional()
  @IsEnum(INCIDENT_STATUSES)
  status?: IncidentStatus;

  @ApiPropertyOptional({ description: 'Filtra per gravità', enum: INCIDENT_SEVERITIES })
  @IsOptional()
  @IsEnum(INCIDENT_SEVERITIES)
  severity?: IncidentSeverity;

  @ApiPropertyOptional({ description: 'Filtra per tipo', enum: INCIDENT_TYPES })
  @IsOptional()
  @IsEnum(INCIDENT_TYPES)
  incidentType?: IncidentType;

  @ApiPropertyOptional({ description: 'Pagina', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Elementi per pagina', example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
