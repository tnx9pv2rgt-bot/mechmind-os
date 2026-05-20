import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from '../common/common.module';
import { PaymentLinkController } from './payment-link.controller';
import { PaymentLinkPublicController } from './payment-link-public.controller';
import { PaymentLinkService } from './payment-link.service';

@Module({
  imports: [CommonModule, ConfigModule],
  controllers: [PaymentLinkController, PaymentLinkPublicController],
  providers: [PaymentLinkService],
  exports: [PaymentLinkService],
})
export class PaymentLinkModule {}
