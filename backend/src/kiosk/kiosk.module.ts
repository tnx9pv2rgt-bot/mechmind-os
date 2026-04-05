import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CommonModule } from '@common/common.module';
import { KioskController } from './kiosk.controller';
import { KioskService } from './kiosk.service';

@Module({
  imports: [CommonModule, EventEmitterModule.forRoot()],
  controllers: [KioskController],
  providers: [KioskService],
  exports: [KioskService],
})
export class KioskModule {}
