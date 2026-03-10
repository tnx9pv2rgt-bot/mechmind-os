import { Module } from '@nestjs/common';
import { AccountingController } from './controllers/accounting.controller';
import { AccountingService } from './services/accounting.service';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [AccountingController],
  providers: [AccountingService],
  exports: [AccountingService],
})
export class AccountingModule {}
