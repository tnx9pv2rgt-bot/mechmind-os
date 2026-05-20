import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateCannedResponseDto {
  @ApiProperty({ description: 'Categoria (DVI, COMUNICAZIONE, DIAGNOSI)', example: 'DVI' })
  @IsString()
  category: string;

  @ApiProperty({
    description: 'Testo risposta predefinita',
    example: 'Usura pastiglie freno anteriori al 80%',
  })
  @IsString()
  text: string;

  @ApiPropertyOptional({ description: 'Severita (LOW, MEDIUM, HIGH, CRITICAL)', example: 'HIGH' })
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiPropertyOptional({ description: 'Attivo', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCannedResponseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
