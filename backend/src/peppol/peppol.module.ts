import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { PeppolController } from './peppol.controller';
import { PeppolService } from './peppol.service';

@Module({
  imports: [CommonModule],
  controllers: [PeppolController],
  providers: [PeppolService],
  exports: [PeppolService],
})
export class PeppolModule {}
