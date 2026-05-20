import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class KioskLookupDto {
  @ApiPropertyOptional({
    description: 'Hash SHA-256 del numero di telefono del cliente',
    example: 'a1b2c3d4e5f6...',
  })
  @IsOptional()
  @IsString()
  phoneHash?: string;

  @ApiPropertyOptional({
    description: 'Targa del veicolo',
    example: 'AB123CD',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  licensePlate?: string;
}
