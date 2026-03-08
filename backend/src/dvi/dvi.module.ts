/**
 * MechMind OS - Digital Vehicle Inspection Module
 */

import { Module } from '@nestjs/common';
import { InspectionController } from './controllers/inspection.controller';
import { InspectionService } from './services/inspection.service';
import { PrismaService } from '../common/services/prisma.service';
import { S3Service } from '../common/services/s3.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [InspectionController],
  providers: [
    InspectionService,
    PrismaService,
    S3Service,
  ],
  exports: [InspectionService],
})
export class DviModule {}
