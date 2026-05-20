import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { BenchmarkingController } from './benchmarking.controller';
import { BenchmarkingService } from './benchmarking.service';

@Module({
  imports: [CommonModule],
  controllers: [BenchmarkingController],
  providers: [BenchmarkingService],
  exports: [BenchmarkingService],
})
export class BenchmarkingModule {}
