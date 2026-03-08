/**
 * MechMind OS - Parts Catalog Module
 */

import { Module } from '@nestjs/common';
import { PartsController } from './controllers/parts.controller';
import { PartsService } from './services/parts.service';
import { PrismaService } from '../common/services/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [PartsController],
  providers: [
    PartsService,
    PrismaService,
  ],
  exports: [PartsService],
})
export class PartsModule {}
