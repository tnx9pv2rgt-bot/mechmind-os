import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminSetupService } from './admin-setup.service';

@Module({
  controllers: [AdminController],
  providers: [AdminSetupService],
})
export class AdminModule {}
