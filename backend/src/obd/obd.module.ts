/**
 * MechMind OS - OBD Module
 */

import { Module } from '@nestjs/common';
import { ObdController } from './controllers/obd.controller';
import { ObdService } from './services/obd.service';
import { PrismaService } from '../common/services/prisma.service';
import { NotificationsService } from '../notifications/services/notifications.service';

@Module({
  controllers: [ObdController],
  providers: [
    ObdService,
    PrismaService,
    NotificationsService,
  ],
  exports: [ObdService],
})
export class ObdModule {}
