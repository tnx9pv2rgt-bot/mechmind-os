import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as crypto from 'crypto';
import * as path from 'path';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/guards/roles.guard';
import { CurrentTenant } from '../auth/decorators/current-user.decorator';
import { TenantSettingsService } from './tenant-settings.service';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
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

  @Get('onboarding/status')
  @ApiOperation({ summary: 'Get onboarding status' })
  @ApiResponse({ status: 200, description: 'Onboarding status retrieved' })
  @Roles(UserRole.ADMIN)
  async getOnboardingStatus(@CurrentTenant() tenantId: string) {
    const status = await this.settingsService.getOnboardingStatus(tenantId);
    return { success: true, data: status };
  }

  @Post('onboarding/complete')
  @ApiOperation({ summary: 'Complete tenant onboarding' })
  @ApiResponse({ status: 201, description: 'Onboarding completed' })
  @Roles(UserRole.ADMIN)
  async completeOnboarding(@CurrentTenant() tenantId: string, @Body() dto: CompleteOnboardingDto) {
    const settings = await this.settingsService.completeOnboarding(tenantId, dto);
    return { success: true, data: settings };
  }

  @Post('logo')
  @ApiOperation({ summary: 'Upload tenant logo' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Logo uploaded' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
      fileFilter: (
        _req: unknown,
        file: Express.Multer.File,
        cb: (error: Error | null, acceptFile: boolean) => void,
      ) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
        cb(null, allowed.includes(file.mimetype));
      },
    }),
  )
  async uploadLogo(@CurrentTenant() tenantId: string, @UploadedFile() file: Express.Multer.File) {
    // Validate file extension
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];
    if (!allowedExtensions.includes(ext)) {
      throw new BadRequestException('File type not allowed');
    }

    // Generate safe filename to prevent path traversal
    const safeName = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    const key = `logos/${tenantId}/${safeName}`;
    const result = await this.s3Service.uploadBuffer(file.buffer, key, file.mimetype, tenantId);
    const settings = await this.settingsService.updateLogo(tenantId, result.Location);
    return { success: true, data: settings };
  }
}
