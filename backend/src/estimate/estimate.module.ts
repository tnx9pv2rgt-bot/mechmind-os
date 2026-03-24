import { Module } from '@nestjs/common';
import { EstimateController } from './controllers/estimate.controller';
import { EstimateService } from './services/estimate.service';
import { CommonModule } from '../common/common.module';
import { InvoiceModule } from '../invoice/invoice.module';

@Module({
  imports: [CommonModule, InvoiceModule],
  controllers: [EstimateController],
  providers: [EstimateService],
  exports: [EstimateService],
})
export class EstimateModule {}
