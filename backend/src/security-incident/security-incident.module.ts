import { Module } from '@nestjs/common';
import { CommonModule } from '@common/common.module';
import { SecurityIncidentController } from './security-incident.controller';
import { SecurityIncidentService } from './security-incident.service';

@Module({
  imports: [CommonModule],
  controllers: [SecurityIncidentController],
  providers: [SecurityIncidentService],
  exports: [SecurityIncidentService],
})
export class SecurityIncidentModule {}
