import { Module } from '@nestjs/common';
import { CommonModule } from '@common/common.module';
import { VehicleHistoryController } from './vehicle-history.controller';
import { VehicleHistoryService } from './vehicle-history.service';

@Module({
  imports: [CommonModule],
  controllers: [VehicleHistoryController],
  providers: [VehicleHistoryService],
  exports: [VehicleHistoryService],
})
export class VehicleHistoryModule {}
