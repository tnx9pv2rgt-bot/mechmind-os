/**
 * MechMind OS - Digital Vehicle Inspection Module
 */

import { Module } from '@nestjs/common';
import { InspectionController } from './controllers/inspection.controller';
import { InspectionService } from './services/inspection.service';
import { PrismaService } from '../common/services/prisma.service';
import { S3Service } from '../common/services/s3.service';
import { NotificationsService } from '../notifications/services/notifications.service';

@Module({
  controllers: [InspectionController],
  providers: [
    InspectionService,
    PrismaService,
    S3Service,
    NotificationsService,
  ],
  exports: [InspectionService],
})
export class DviModule {}
