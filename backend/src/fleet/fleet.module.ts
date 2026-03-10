/**
 * MechMind OS - Fleet Management Module
 */

import { Module } from '@nestjs/common';
import { FleetController } from './controllers/fleet.controller';
import { FleetService } from './services/fleet.service';
import { CommonModule } from '../common/common.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [CommonModule, AuthModule],
  controllers: [FleetController],
  providers: [FleetService],
  exports: [FleetService],
})
export class FleetModule {}
