import { Module } from '@nestjs/common';
import { EstimateController } from './controllers/estimate.controller';
import { EstimatePublicController } from './controllers/estimate-public.controller';
import { EstimateService } from './services/estimate.service';
import { CommonModule } from '../common/common.module';
import { InvoiceModule } from '../invoice/invoice.module';
import { PublicTokenModule } from '../public-token/public-token.module';

@Module({
  imports: [CommonModule, InvoiceModule, PublicTokenModule],
  controllers: [EstimateController, EstimatePublicController],
  providers: [EstimateService],
  exports: [EstimateService],
})
export class EstimateModule {}
