import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CommonModule } from '../common/common.module';
import { ProductionBoardService } from './production-board.service';
import { ProductionBoardController } from './production-board.controller';

@Module({
  imports: [CommonModule, EventEmitterModule.forRoot()],
  controllers: [ProductionBoardController],
  providers: [ProductionBoardService],
  exports: [ProductionBoardService],
})
export class ProductionBoardModule {}
