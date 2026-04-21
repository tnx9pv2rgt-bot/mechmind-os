import { ApiProperty } from '@nestjs/swagger';

export class QuickBooksExportRecord {
  @ApiProperty({ description: 'Invoice date (YYYY-MM-DD)' })
  date: string;

  @ApiProperty({ description: 'Invoice number' })
  invoiceNumber: string;

  @ApiProperty({ description: 'Customer ID' })
  customer: string;

  @ApiProperty({ description: 'Subtotal amount' })
  amount: string;

  @ApiProperty({ description: 'Tax amount' })
  tax: string;

  @ApiProperty({ description: 'Total amount including tax' })
  total: string;

  @ApiProperty({ description: 'Invoice status' })
  status: string;
}
