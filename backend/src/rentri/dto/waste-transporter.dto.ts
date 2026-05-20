import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEmail } from 'class-validator';

export class CreateTransporterDto {
  @ApiProperty({ description: 'Ragione sociale del trasportatore' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'Codice fiscale o partita IVA', example: '01234567890' })
  @IsString()
  @IsNotEmpty()
  fiscalCode!: string;

  @ApiPropertyOptional({ description: 'Numero iscrizione Albo Gestori Ambientali' })
  @IsOptional()
  @IsString()
  alboCategoryNo?: string;

  @ApiPropertyOptional({ description: 'Categoria Albo Gestori Ambientali' })
  @IsOptional()
  @IsString()
  alboCategory?: string;

  @ApiPropertyOptional({ description: 'Indirizzo sede legale' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Numero di telefono' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Indirizzo email' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class UpdateTransporterDto extends PartialType(CreateTransporterDto) {
  @ApiPropertyOptional({ description: 'Stato attivo/disattivo del trasportatore' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
