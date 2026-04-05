import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminSetupService } from './admin-setup.service';
import { TenantSettingsController } from './tenant-settings.controller';
import { TenantSettingsService } from './tenant-settings.service';
import { UsersController } from './users.controller';
import { RolesController } from './roles.controller';
import { AuditLogsController } from './audit-logs.controller';
import { AdminTenantsController } from './admin-tenants.controller';
import { WebhookConfigController } from './webhook-config.controller';

@Module({
  controllers: [
    AdminController,
    TenantSettingsController,
    UsersController,
    RolesController,
    AuditLogsController,
    AdminTenantsController,
    WebhookConfigController,
  ],
  providers: [AdminSetupService, TenantSettingsService],
  exports: [TenantSettingsService],
})
export class AdminModule {}
