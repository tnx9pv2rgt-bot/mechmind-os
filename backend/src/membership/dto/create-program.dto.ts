import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class BenefitItemDto {
  @ApiProperty({
    description: 'Tipo di benefit (es. OIL_CHANGE, BRAKE_CHECK)',
    example: 'OIL_CHANGE',
  })
  @IsString()
  type!: string;

  @ApiProperty({ description: 'Descrizione del benefit', example: 'Tagliando incluso' })
  @IsString()
  description!: string;

  @ApiProperty({ description: 'Massimo utilizzi al mese', example: 1 })
  @IsInt()
  @Min(1)
  maxPerMonth!: number;

  @ApiProperty({ description: 'Percentuale di sconto (0-100)', example: 100 })
  @IsNumber()
  @Min(0)
  discountPercent!: number;
}

export class CreateProgramDto {
  @ApiProperty({ description: 'Nome del programma', example: 'Piano Premium' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({
    description: 'Descrizione del programma',
    example: 'Piano con tagliando e controlli inclusi',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Prezzo mensile in euro', example: 29.99 })
  @IsNumber()
  @Min(0)
  priceMonthly!: number;

  @ApiPropertyOptional({ description: 'Prezzo annuale in euro', example: 299.99 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceYearly?: number;

  @ApiPropertyOptional({ description: 'ID prezzo Stripe mensile' })
  @IsOptional()
  @IsString()
  stripePriceMonthlyId?: string;

  @ApiPropertyOptional({ description: 'ID prezzo Stripe annuale' })
  @IsOptional()
  @IsString()
  stripePriceYearlyId?: string;

  @ApiProperty({
    description: 'Lista dei benefit inclusi nel programma',
    type: [BenefitItemDto],
    example: [
      {
        type: 'OIL_CHANGE',
        description: 'Tagliando incluso',
        maxPerMonth: 1,
        discountPercent: 100,
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BenefitItemDto)
  benefits!: BenefitItemDto[];

  @ApiPropertyOptional({ description: 'Massimo riscatti al mese', example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxRedemptionsPerMonth?: number;

  @ApiPropertyOptional({ description: 'Programma attivo', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateProgramDto {
  @ApiPropertyOptional({ description: 'Nome del programma' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Descrizione del programma' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Prezzo mensile in euro' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceMonthly?: number;

  @ApiPropertyOptional({ description: 'Prezzo annuale in euro' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceYearly?: number;

  @ApiPropertyOptional({ description: 'ID prezzo Stripe mensile' })
  @IsOptional()
  @IsString()
  stripePriceMonthlyId?: string;

  @ApiPropertyOptional({ description: 'ID prezzo Stripe annuale' })
  @IsOptional()
  @IsString()
  stripePriceYearlyId?: string;

  @ApiPropertyOptional({
    description: 'Lista dei benefit inclusi nel programma',
    type: [BenefitItemDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BenefitItemDto)
  benefits?: BenefitItemDto[];

  @ApiPropertyOptional({ description: 'Massimo riscatti al mese' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxRedemptionsPerMonth?: number;

  @ApiPropertyOptional({ description: 'Programma attivo' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
