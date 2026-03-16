import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { FatturapaService } from './services/fatturapa.service';
import { PdfService } from './services/pdf.service';

@Module({
  imports: [CommonModule],
  controllers: [InvoiceController],
  providers: [InvoiceService, FatturapaService, PdfService],
  exports: [InvoiceService, FatturapaService, PdfService],
})
export class InvoiceModule {}
