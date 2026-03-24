import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TrustDeviceDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  @ApiProperty({
    required: false,
    default: 30,
    description: 'Numero di giorni per cui il dispositivo sarà considerato fidato (1-90)',
    example: 30,
  })
  days?: number;
}

export interface DeviceListItem {
  id: string;
  deviceName: string;
  deviceType: string;
  osType: string;
  browserType: string | null;
  lastLoginAt: Date | null;
  lastIpAddress: string | null;
  lastLocationCity: string | null;
  lastLocationCountry: string | null;
  isTrusted: boolean;
  isCompromised: boolean;
  createdAt: Date;
}
