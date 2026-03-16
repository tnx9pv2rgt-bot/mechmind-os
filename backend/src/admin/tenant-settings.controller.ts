import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/guards/roles.guard';
import { CurrentTenant } from '../auth/decorators/current-user.decorator';
import { TenantSettingsService } from './tenant-settings.service';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';
import { S3Service } from '../common/services/s3.service';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('settings')
export class TenantSettingsController {
  constructor(
    private readonly settingsService: TenantSettingsService,
    private readonly s3Service: S3Service,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get tenant settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved' })
  async getSettings(@CurrentTenant() tenantId: string) {
    const settings = await this.settingsService.getSettings(tenantId);
    return { success: true, data: settings };
  }

  @Patch()
  @ApiOperation({ summary: 'Update tenant settings' })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  async updateSettings(@CurrentTenant() tenantId: string, @Body() dto: UpdateTenantSettingsDto) {
    const settings = await this.settingsService.updateSettings(tenantId, dto);
    return { success: true, data: settings };
  }

  @Post('logo')
  @ApiOperation({ summary: 'Upload tenant logo' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Logo uploaded' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(@CurrentTenant() tenantId: string, @UploadedFile() file: Express.Multer.File) {
    const key = `logos/${tenantId}/logo-${Date.now()}.${file.originalname.split('.').pop()}`;
    const result = await this.s3Service.uploadBuffer(file.buffer, key, file.mimetype, tenantId);
    const settings = await this.settingsService.updateLogo(tenantId, result.Location);
    return { success: true, data: settings };
  }
}
