/**
 * MechMind OS - AI Compliance Module (EU AI Act)
 */

import { Module } from '@nestjs/common';
import { AiComplianceController } from './ai-compliance.controller';
import { AiComplianceService } from './ai-compliance.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AiComplianceController],
  providers: [AiComplianceService],
  exports: [AiComplianceService],
})
export class AiComplianceModule {}
