/**
 * MechMind OS - Digital Vehicle Inspection Module
 */

import { Module } from '@nestjs/common';
import { InspectionController } from './controllers/inspection.controller';
import { InspectionPublicController } from './controllers/inspection-public.controller';
import { InspectionService } from './services/inspection.service';
import { CommonModule } from '../common/common.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { PublicTokenModule } from '../public-token/public-token.module';

@Module({
  imports: [CommonModule, AuthModule, NotificationsModule, PublicTokenModule],
  controllers: [InspectionController, InspectionPublicController],
  providers: [InspectionService],
  exports: [InspectionService],
})
export class DviModule {}
