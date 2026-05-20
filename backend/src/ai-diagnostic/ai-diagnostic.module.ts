/**
 * MechMind OS - AI Diagnostic Assistant Module
 */

import { Module } from '@nestjs/common';
import { AiDiagnosticController } from './ai-diagnostic.controller';
import { AiDiagnosticService } from './ai-diagnostic.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AiDiagnosticController],
  providers: [AiDiagnosticService],
  exports: [AiDiagnosticService],
})
export class AiDiagnosticModule {}
