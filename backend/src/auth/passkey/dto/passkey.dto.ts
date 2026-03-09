import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterVerifyDto {
  @ApiProperty({ description: 'Session ID from registration options' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({ description: 'WebAuthn attestation response from browser' })
  @IsObject()
  attestation: Record<string, unknown>;

  @ApiProperty({ description: 'Optional device name', required: false })
  @IsOptional()
  @IsString()
  deviceName?: string;
}

export class AuthenticateVerifyDto {
  @ApiProperty({ description: 'Session ID from authentication options' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({ description: 'WebAuthn assertion response from browser' })
  @IsObject()
  assertion: Record<string, unknown>;
}
