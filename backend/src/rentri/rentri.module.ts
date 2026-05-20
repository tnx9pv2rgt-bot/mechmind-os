import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { RentriController } from './controllers/rentri.controller';
import { RentriService } from './services/rentri.service';
import { FirService } from './services/fir.service';
import { MudService } from './services/mud.service';

@Module({
  imports: [CommonModule],
  controllers: [RentriController],
  providers: [RentriService, FirService, MudService],
  exports: [RentriService],
})
export class RentriModule {}
