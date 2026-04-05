import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEmail } from 'class-validator';

export class CreateDestinationDto {
  @ApiProperty({ description: "Ragione sociale dell'impianto di destinazione" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'Codice fiscale o partita IVA', example: '09876543210' })
  @IsString()
  @IsNotEmpty()
  fiscalCode!: string;

  @ApiPropertyOptional({ description: 'Numero autorizzazione impianto' })
  @IsOptional()
  @IsString()
  authorizationNo?: string;

  @ApiPropertyOptional({ description: 'Tipo di operazione (es. R13, D15)' })
  @IsOptional()
  @IsString()
  operationType?: string;

  @ApiProperty({ description: "Indirizzo dell'impianto" })
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiPropertyOptional({ description: 'Numero di telefono' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Indirizzo email' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class UpdateDestinationDto extends PartialType(CreateDestinationDto) {
  @ApiPropertyOptional({ description: 'Stato attivo/disattivo della destinazione' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
