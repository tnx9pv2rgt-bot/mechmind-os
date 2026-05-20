import { IsEmail, IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMagicLinkDto {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Tenant slug (opzionale se login da pagina generica)',
    example: 'garage-roma',
    required: false,
  })
  @IsString()
  @IsOptional()
  tenantSlug?: string;
}

export class VerifyMagicLinkDto {
  @ApiProperty({ description: 'Magic link token from email' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
