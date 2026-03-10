/**
 * MechMind OS - Tire Module
 *
 * Manages seasonal tire storage and swap tracking.
 */

import { Module } from '@nestjs/common';
import { TireController } from './controllers/tire.controller';
import { TireService } from './services/tire.service';
import { CommonModule } from '../common/common.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [CommonModule, AuthModule],
  controllers: [TireController],
  providers: [TireService],
  exports: [TireService],
})
export class TireModule {}
