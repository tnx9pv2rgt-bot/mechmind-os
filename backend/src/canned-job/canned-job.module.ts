import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { CannedJobController } from './canned-job.controller';
import { CannedResponseController } from './canned-response.controller';
import { CannedJobService } from './canned-job.service';
import { CannedResponseService } from './canned-response.service';

@Module({
  imports: [CommonModule],
  controllers: [CannedJobController, CannedResponseController],
  providers: [CannedJobService, CannedResponseService],
  exports: [CannedJobService, CannedResponseService],
})
export class CannedJobModule {}
