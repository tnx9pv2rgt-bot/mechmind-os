import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMagicLinkDto {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Tenant slug', example: 'garage-roma' })
  @IsString()
  @IsNotEmpty()
  tenantSlug: string;
}

export class VerifyMagicLinkDto {
  @ApiProperty({ description: 'Magic link token from email' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
