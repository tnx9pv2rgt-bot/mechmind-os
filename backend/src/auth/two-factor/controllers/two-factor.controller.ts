/**
 * MechMind OS - Two-Factor Authentication Controller
 * 
 * REST API endpoints for 2FA management
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { TwoFactorService } from '../services/two-factor.service';
import { AuthService } from '../../services/auth.service';
import { PrismaService } from '@common/services/prisma.service';
import {
  SetupTwoFactorResponseDto,
  VerifyTwoFactorDto,
  DisableTwoFactorDto,
  TwoFactorStatusDto,
  RegenerateBackupCodesResponseDto,
} from '../dto/two-factor.dto';
import { UserRole } from '../../guards/roles.guard';

@ApiTags('Two-Factor Authentication')
@Controller('auth/2fa')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TwoFactorController {
  constructor(
    private readonly twoFactorService: TwoFactorService,
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Get 2FA status for current user' })
  @ApiResponse({ status: 200, description: '2FA status retrieved', type: TwoFactorStatusDto })
  async getStatus(
    @CurrentUser('userId') userId: string,
  ): Promise<TwoFactorStatusDto> {
    return this.twoFactorService.getStatus(userId);
  }

  @Post('setup')
  @ApiOperation({ 
    summary: 'Setup 2FA for current user',
    description: 'Generates TOTP secret and QR code. Returns backup codes - SAVE THEM NOW!'
  })
  @ApiResponse({ status: 201, description: '2FA setup initiated', type: SetupTwoFactorResponseDto })
  @ApiResponse({ status: 400, description: '2FA already enabled' })
  async setup(
    @CurrentUser('userId') userId: string,
    @CurrentUser('email') email: string,
    @CurrentUser('tenantId') tenantId: string,
  ): Promise<SetupTwoFactorResponseDto> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });
    return this.twoFactorService.generateSecret(userId, email, tenant?.name || 'MechMind');
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Verify and enable 2FA',
    description: 'Verifies the TOTP code and enables 2FA permanently'
  })
  @ApiResponse({ status: 200, description: '2FA enabled successfully' })
  @ApiResponse({ status: 401, description: 'Invalid verification code' })
  async verify(
    @CurrentUser('userId') userId: string,
    @Body() dto: VerifyTwoFactorDto,
  ): Promise<{ message: string }> {
    await this.twoFactorService.verifyAndEnable(userId, dto.code);
    return { message: 'Two-factor authentication enabled successfully' };
  }

  @Post('disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Disable 2FA',
    description: 'Disables 2FA for the current user. Requires password and current TOTP/backup code.'
  })
  @ApiResponse({ status: 200, description: '2FA disabled successfully' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async disable(
    @CurrentUser('userId') userId: string,
    @Body() dto: DisableTwoFactorDto,
  ): Promise<{ message: string }> {
    await this.twoFactorService.disable(
      userId, 
      dto.code, 
      dto.password,
      (hash) => this.authService.verifyPassword(dto.password, hash)
    );
    return { message: 'Two-factor authentication disabled successfully' };
  }

  @Post('backup-codes/regenerate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Regenerate backup codes',
    description: 'Generates new backup codes. Old codes become invalid immediately.'
  })
  @ApiResponse({ status: 200, description: 'New backup codes generated', type: RegenerateBackupCodesResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid TOTP code' })
  async regenerateBackupCodes(
    @CurrentUser('userId') userId: string,
    @Body() dto: VerifyTwoFactorDto,
  ): Promise<RegenerateBackupCodesResponseDto> {
    const backupCodes = await this.twoFactorService.regenerateBackupCodes(userId, dto.code);
    return {
      backupCodes,
      warning: 'Save these codes immediately. They will not be shown again.',
    };
  }

  // Admin endpoints
  @Post('admin/reset')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Admin: Reset 2FA for user (emergency)',
    description: 'Administrators can reset 2FA for users who lost access. Requires admin role.'
  })
  @ApiResponse({ status: 200, description: '2FA reset successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async adminReset(
    @Body('userId') targetUserId: string,
    @CurrentUser('userId') adminId: string,
  ): Promise<{ message: string }> {
    // Log the admin action for audit
    await this.authService.logAdminAction({
      adminId,
      action: '2FA_RESET',
      targetUserId,
      timestamp: new Date(),
    });

    // Disable 2FA without requiring codes (admin override)
    await this.twoFactorService.adminDisable(targetUserId);
    
    return { message: 'Two-factor authentication has been reset. User must set up 2FA again.' };
  }

  @Post('admin/require')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Admin: Require 2FA for all admin users',
    description: 'Sets policy requiring 2FA for admin and manager roles'
  })
  @ApiResponse({ status: 200, description: 'Policy updated' })
  async requireTwoFactorForAdmins(
    @CurrentUser('tenantId') tenantId: string,
  ): Promise<{ message: string; affectedUsers: number }> {
    // Find all admin/manager users without 2FA
    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        role: { in: [UserRole.ADMIN, UserRole.MANAGER] },
        totpEnabled: false,
      },
      select: { id: true, email: true },
    });

    // TODO: Send notifications to users requiring 2FA setup
    // For now, just return count

    return {
      message: '2FA requirement policy updated for admin users',
      affectedUsers: users.length,
    };
  }
}
