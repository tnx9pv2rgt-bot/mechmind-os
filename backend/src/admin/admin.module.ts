import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminSetupService } from './admin-setup.service';
import { TenantSettingsController } from './tenant-settings.controller';
import { TenantSettingsService } from './tenant-settings.service';

@Module({
  controllers: [AdminController, TenantSettingsController],
  providers: [AdminSetupService, TenantSettingsService],
  exports: [TenantSettingsService],
})
export class AdminModule {}
