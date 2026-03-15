import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { WorkOrderService } from './work-order.service';
import { WorkOrderController } from './work-order.controller';

@Module({
  imports: [CommonModule],
  controllers: [WorkOrderController],
  providers: [WorkOrderService],
  exports: [WorkOrderService],
})
export class WorkOrderModule {}
