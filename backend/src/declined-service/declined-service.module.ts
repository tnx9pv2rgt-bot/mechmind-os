import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { DeclinedServiceController } from './declined-service.controller';
import { DeclinedServiceService } from './declined-service.service';

@Module({
  imports: [CommonModule],
  controllers: [DeclinedServiceController],
  providers: [DeclinedServiceService],
  exports: [DeclinedServiceService],
})
export class DeclinedServiceModule {}
