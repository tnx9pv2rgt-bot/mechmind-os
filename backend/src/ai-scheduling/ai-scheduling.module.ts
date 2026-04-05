/**
 * MechMind OS - AI Smart Scheduling Module
 */

import { Module } from '@nestjs/common';
import { AiSchedulingController } from './ai-scheduling.controller';
import { AiSchedulingService } from './ai-scheduling.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AiSchedulingController],
  providers: [AiSchedulingService],
  exports: [AiSchedulingService],
})
export class AiSchedulingModule {}
