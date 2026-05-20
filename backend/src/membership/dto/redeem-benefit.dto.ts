import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RedeemBenefitDto {
  @ApiProperty({ description: 'Tipo di benefit da riscattare', example: 'OIL_CHANGE' })
  @IsString()
  benefitType!: string;

  @ApiPropertyOptional({ description: 'ID della prenotazione associata' })
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiPropertyOptional({ description: "ID dell'ordine di lavoro associato" })
  @IsOptional()
  @IsString()
  workOrderId?: string;

  @ApiPropertyOptional({ description: 'Valore in centesimi del benefit riscattato', example: 5000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  valueCents?: number;
}
