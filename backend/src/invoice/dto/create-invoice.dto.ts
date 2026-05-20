import {
  IsString,
  IsArray,
  IsOptional,
  IsNumber,
  IsEnum,
  IsUUID,
  IsDateString,
  ValidateNested,
  IsNotEmpty,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  InvoiceItemType,
  PaymentMethod,
  PaymentTerms,
  TaxRegime,
  InvoiceDocumentType,
} from '@prisma/client';

export class CreateInvoiceItemDto {
  @ApiProperty({ description: 'Descrizione riga', example: 'Cambio olio motore' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Tipo riga', enum: InvoiceItemType, example: 'LABOR' })
  @IsEnum(InvoiceItemType)
  itemType: InvoiceItemType;

  @ApiProperty({ description: 'Quantità', example: 1 })
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiProperty({ description: 'Prezzo unitario', example: 50.0 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ description: 'Aliquota IVA (22, 10, 4, 0)', example: 22 })
  @IsNumber()
  @Min(0)
  @Max(100)
  vatRate: number;

  @ApiPropertyOptional({ description: 'Sconto % su riga', example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discount?: number;

  @ApiPropertyOptional({
    description: 'Codice Natura IVA (N1-N7) per esenzioni/esclusioni',
    example: 'N4',
  })
  @IsOptional()
  @IsString()
  naturaIva?: string;

  @ApiPropertyOptional({ description: 'Part ID se ricambio' })
  @IsOptional()
  @IsUUID()
  partId?: string;
}

// Legacy DTO kept for backward compatibility with existing JSON items
export class InvoiceItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty()
  @IsNumber()
  qty: number;

  @ApiProperty()
  @IsNumber()
  price: number;
}

export class CreateInvoiceDto {
  @ApiProperty({ description: 'ID cliente' })
  @IsUUID()
  customerId: string;

  @ApiProperty({ type: [CreateInvoiceItemDto], description: 'Righe fattura con IVA per riga' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items: CreateInvoiceItemDto[];

  @ApiPropertyOptional({ description: 'Tipo documento', enum: InvoiceDocumentType })
  @IsOptional()
  @IsEnum(InvoiceDocumentType)
  documentType?: InvoiceDocumentType;

  @ApiPropertyOptional({ description: 'Data scadenza pagamento' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Metodo pagamento', enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: 'Termini pagamento', enum: PaymentTerms })
  @IsOptional()
  @IsEnum(PaymentTerms)
  paymentTerms?: PaymentTerms;

  @ApiPropertyOptional({ description: 'Regime fiscale', enum: TaxRegime })
  @IsOptional()
  @IsEnum(TaxRegime)
  taxRegime?: TaxRegime;

  @ApiPropertyOptional({ description: 'Aliquota IVA globale (legacy, prefer per-riga)' })
  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @ApiPropertyOptional({ description: 'Note' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'ID prenotazione collegata' })
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @ApiPropertyOptional({ description: 'ID ordine di lavoro collegato' })
  @IsOptional()
  @IsUUID()
  workOrderId?: string;

  @ApiPropertyOptional({
    description: 'Data operazione Art. 226 #8 (se diversa da data emissione)',
  })
  @IsOptional()
  @IsDateString()
  operationDate?: string;

  @ApiPropertyOptional({
    description: 'Tipo ritenuta (RT01=persone fisiche, RT02=persone giuridiche)',
    example: 'RT01',
  })
  @IsOptional()
  @IsString()
  ritenutaType?: string;

  @ApiPropertyOptional({ description: 'Aliquota ritenuta %', example: 20 })
  @IsOptional()
  @IsNumber()
  ritenutaRate?: number;

  @ApiPropertyOptional({ description: 'Causale pagamento ritenuta (A-Z per CU)', example: 'A' })
  @IsOptional()
  @IsString()
  ritenutaCausale?: string;
}
