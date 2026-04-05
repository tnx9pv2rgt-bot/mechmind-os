import { Module } from '@nestjs/common';
import { CommonModule } from '@common/common.module';
import { PredictiveMaintenanceController } from './predictive-maintenance.controller';
import { PredictiveMaintenanceService } from './predictive-maintenance.service';

@Module({
  imports: [CommonModule],
  controllers: [PredictiveMaintenanceController],
  providers: [PredictiveMaintenanceService],
  exports: [PredictiveMaintenanceService],
})
export class PredictiveMaintenanceModule {}
