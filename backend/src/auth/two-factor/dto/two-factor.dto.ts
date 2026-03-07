/**
 * MechMind OS - 2FA/MFA Data Transfer Objects
 * 
 * DTOs for Two-Factor Authentication with TOTP
 */

import { IsString, IsBoolean, IsOptional, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetupTwoFactorResponseDto {
  @ApiProperty({ description: 'TOTP secret (base32 encoded)' })
  secret: string;

  @ApiProperty({ description: 'QR Code URI for authenticator apps' })
  qrCodeUri: string;

  @ApiProperty({ description: 'QR Code as base64 image' })
  qrCodeImage: string;

  @ApiProperty({ description: 'Manual entry key' })
  manualEntryKey: string;

  @ApiProperty({ description: 'Backup codes (show only once)' })
  backupCodes: string[];
}

export class VerifyTwoFactorDto {
  @ApiProperty({ description: 'TOTP code from authenticator app', example: '123456' })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'Code must be 6 digits' })
  code: string;
}

export class DisableTwoFactorDto {
  @ApiProperty({ description: 'TOTP code or backup code', example: '123456' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'User password for verification' })
  @IsString()
  password: string;
}

export class TwoFactorLoginDto {
  @ApiProperty({ description: 'Email address' })
  @IsString()
  email: string;

  @ApiProperty({ description: 'User password' })
  @IsString()
  password: string;

  @ApiProperty({ description: 'Tenant slug' })
  @IsString()
  tenantSlug: string;

  @ApiProperty({ description: 'TOTP code or backup code', required: false })
  @IsOptional()
  @IsString()
  totpCode?: string;
}

export class TwoFactorStatusDto {
  @ApiProperty({ description: 'Whether 2FA is enabled' })
  enabled: boolean;

  @ApiProperty({ description: 'When 2FA was verified' })
  verifiedAt?: Date;

  @ApiProperty({ description: 'Number of remaining backup codes' })
  backupCodesCount: number;
}

export class TwoFactorRequiredResponseDto {
  @ApiProperty({ description: 'Temporary token for 2FA verification' })
  tempToken: string;

  @ApiProperty({ description: 'Whether 2FA is required' })
  requiresTwoFactor: true;

  @ApiProperty({ description: 'Methods available for 2FA' })
  methods: ('totp' | 'backup')[];
}

export class RegenerateBackupCodesResponseDto {
  @ApiProperty({ description: 'New backup codes (show only once)' })
  backupCodes: string[];

  @ApiProperty({ description: 'Warning message' })
  warning: string;
}
