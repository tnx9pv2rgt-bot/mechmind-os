/**
 * MechMind OS - OBD Module
 */

import { Module } from '@nestjs/common';
import { ObdController } from './controllers/obd.controller';
import { ObdService } from './services/obd.service';
import { CommonModule } from '../common/common.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [CommonModule, NotificationsModule, AuthModule],
  controllers: [ObdController],
  providers: [ObdService],
  exports: [ObdService],
})
export class ObdModule {}
