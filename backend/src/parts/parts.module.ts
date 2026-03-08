/**
 * MechMind OS - Parts Catalog Module
 */

import { Module } from '@nestjs/common';
import { PartsController } from './controllers/parts.controller';
import { PartsService } from './services/parts.service';
import { CommonModule } from '../common/common.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [CommonModule, NotificationsModule, AuthModule],
  controllers: [PartsController],
  providers: [
    PartsService,
  ],
  exports: [PartsService],
})
export class PartsModule {}
