/**
 * MechMind OS - OBD Module
 */

import { Module } from '@nestjs/common';
import { ObdController } from './controllers/obd.controller';
import { ObdService } from './services/obd.service';
import { PrismaService } from '../common/services/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ObdController],
  providers: [
    ObdService,
    PrismaService,
  ],
  exports: [ObdService],
})
export class ObdModule {}
