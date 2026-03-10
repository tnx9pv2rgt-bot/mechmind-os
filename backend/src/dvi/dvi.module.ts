/**
 * MechMind OS - Digital Vehicle Inspection Module
 */

import { Module } from '@nestjs/common';
import { InspectionController } from './controllers/inspection.controller';
import { InspectionService } from './services/inspection.service';
import { CommonModule } from '../common/common.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [CommonModule, AuthModule, NotificationsModule],
  controllers: [InspectionController],
  providers: [InspectionService],
  exports: [InspectionService],
})
export class DviModule {}
