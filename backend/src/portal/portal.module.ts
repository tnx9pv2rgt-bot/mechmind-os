import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';

@Module({
  imports: [CommonModule],
  controllers: [PortalController],
  providers: [PortalService],
})
export class PortalModule {}
