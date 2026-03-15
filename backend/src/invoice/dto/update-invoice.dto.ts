import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateInvoiceDto } from './create-invoice.dto';

export class UpdateInvoiceDto extends PartialType(CreateInvoiceDto) {
  @ApiPropertyOptional({ enum: ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'] })
  @IsString()
  @IsOptional()
  status?: string;
}
