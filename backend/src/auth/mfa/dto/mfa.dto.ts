/**
 * MechMind OS - MFA Data Transfer Objects
 *
 * DTOs for Multi-Factor Authentication with TOTP
 */

import { IsString, IsBoolean, IsOptional, Length, Matches, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EnrollMfaDto {
  @ApiProperty({ description: 'User email for the TOTP account label' })
  @IsString()
  email: string;
}

export class EnrollMfaResponseDto {
  @ApiProperty({ description: 'TOTP secret (base32 encoded)' })
  secret: string;

  @ApiProperty({ description: 'QR Code as base64 image' })
  qrCode: string;

  @ApiProperty({ description: 'Manual entry key for authenticator apps' })
  manualEntryKey: string;

  @ApiProperty({ description: 'Backup codes (show only once)' })
  backupCodes: string[];

  @ApiProperty({ description: 'Warning message' })
  warning: string;
}

export class VerifyMfaDto {
  @ApiProperty({
    description: 'TOTP code from authenticator app or backup code',
    example: '123456',
    minLength: 6,
    maxLength: 9,
  })
  @IsString()
  @Length(6, 9)
  token: string;
}

export class VerifyLoginMfaDto {
  @ApiProperty({ description: 'Temporary token from login step' })
  @IsString()
  tempToken: string;

  @ApiProperty({
    description: 'TOTP code from authenticator app or backup code',
    example: '123456',
  })
  @IsString()
  @Length(6, 9)
  token: string;
}

export class DisableMfaDto {
  @ApiProperty({
    description: 'TOTP code or backup code',
    example: '123456',
  })
  @IsString()
  token: string;

  @ApiProperty({ description: 'User password for verification' })
  @IsString()
  password: string;
}

export class MfaStatusResponseDto {
  @ApiProperty({ description: 'Whether MFA is enabled' })
  enabled: boolean;

  @ApiProperty({ description: 'When MFA was verified/enabled' })
  verifiedAt?: Date;

  @ApiProperty({ description: 'Number of remaining backup codes' })
  backupCodesCount: number;
}

export class BackupCodesResponseDto {
  @ApiProperty({ description: 'New backup codes (show only once)' })
  backupCodes: string[];

  @ApiProperty({ description: 'Warning message' })
  warning: string;
}

export class MfaRequiredResponseDto {
  @ApiProperty({ description: 'Temporary token for MFA verification' })
  tempToken: string;

  @ApiProperty({ description: 'Whether MFA is required' })
  requiresMfa: true;

  @ApiProperty({ description: 'Methods available for MFA' })
  methods: ('totp' | 'backup')[];
}

export class MfaLoginDto {
  @ApiProperty({ description: 'Email address' })
  @IsString()
  email: string;

  @ApiProperty({ description: 'User password' })
  @IsString()
  password: string;

  @ApiProperty({ description: 'Tenant slug' })
  @IsString()
  tenantSlug: string;

  @ApiProperty({ description: 'TOTP code or backup code (if MFA enabled)', required: false })
  @IsOptional()
  @IsString()
  mfaCode?: string;
}
