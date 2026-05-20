/**
 * MechMind OS - Payment Link DTOs
 *
 * DTO per invio link di pagamento e verifica stato.
 */

import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PaymentLinkChannel {
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
}

export class SendPaymentLinkDto {
  @ApiProperty({
    description: 'Canale di invio del link di pagamento',
    enum: PaymentLinkChannel,
    example: 'SMS',
  })
  @IsEnum(PaymentLinkChannel)
  channel!: PaymentLinkChannel;

  @ApiPropertyOptional({ description: 'Numero telefono override (se diverso dal cliente)' })
  @IsOptional()
  @IsString()
  phoneOverride?: string;

  @ApiPropertyOptional({ description: 'Email override (se diverso dal cliente)' })
  @IsOptional()
  @IsString()
  emailOverride?: string;
}
