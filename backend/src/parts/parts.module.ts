/**
 * MechMind OS - Parts Catalog Module
 */

import { Module } from '@nestjs/common';
import { PartsController } from './controllers/parts.controller';
import { PartsService } from './services/parts.service';
import { PrismaService } from '../common/services/prisma.service';
import { NotificationsService } from '../notifications/services/notifications.service';

@Module({
  controllers: [PartsController],
  providers: [
    PartsService,
    PrismaService,
    NotificationsService,
  ],
  exports: [PartsService],
})
export class PartsModule {}
