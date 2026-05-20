import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from '../common/common.module';
import { InvoiceController } from './invoice.controller';
import { BnplWebhookController } from './controllers/bnpl-webhook.controller';
import { InvoiceService } from './invoice.service';
import { FatturapaService } from './services/fatturapa.service';
import { PdfService } from './services/pdf.service';
import { PaymentLinkService } from './services/payment-link.service';
import { BnplService } from './services/bnpl.service';

@Module({
  imports: [CommonModule, ConfigModule],
  controllers: [InvoiceController, BnplWebhookController],
  providers: [InvoiceService, FatturapaService, PdfService, PaymentLinkService, BnplService],
  exports: [InvoiceService, FatturapaService, PdfService, PaymentLinkService, BnplService],
})
export class InvoiceModule {}
