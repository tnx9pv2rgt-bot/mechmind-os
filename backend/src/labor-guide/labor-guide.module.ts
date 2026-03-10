import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { LaborGuideController } from './controllers/labor-guide.controller';
import { LaborGuideService } from './services/labor-guide.service';

@Module({
  imports: [CommonModule],
  controllers: [LaborGuideController],
  providers: [LaborGuideService],
  exports: [LaborGuideService],
})
export class LaborGuideModule {}
