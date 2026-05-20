import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { InvoiceModule } from '../invoice/invoice.module';
import { WorkOrderService } from './work-order.service';
import { WorkOrderController } from './work-order.controller';
import { WorkflowController } from './workflow.controller';

@Module({
  imports: [CommonModule, InvoiceModule],
  controllers: [WorkOrderController, WorkflowController],
  providers: [WorkOrderService],
  exports: [WorkOrderService],
})
export class WorkOrderModule {}
