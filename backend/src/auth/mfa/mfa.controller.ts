/**
 * MechMind OS - MFA Controller
 * 
 * REST API endpoints for MFA management with TOTP
 */

import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { MfaService } from './mfa.service';
import { AuthService } from '../services/auth.service';
import { PrismaService } from '../../../common/services/prisma.service';
import {
  EnrollMfaDto,
  VerifyMfaDto,
  DisableMfaDto,
  MfaStatusResponseDto,
  EnrollMfaResponseDto,
  BackupCodesResponseDto,
  VerifyLoginMfaDto,
} from './dto/mfa.dto';
import { UserRole } from '../guards/roles.guard';
import { Request } from 'express';

@ApiTags('MFA')
@Controller('auth/mfa')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MfaController {
  constructor(
    private readonly mfaService: MfaService,
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Get MFA status for current user' })
  @ApiResponse({ status: 200, description: 'MFA status retrieved', type: MfaStatusResponseDto })
  async getStatus(
    @CurrentUser('userId') userId: string,
  ): Promise<MfaStatusResponseDto> {
    return this.mfaService.getStatus(userId);
  }

  @Post('enroll')
  @ApiOperation({ 
    summary: 'Enroll in MFA',
    description: 'Generates TOTP secret and QR code. Returns backup codes - SAVE THEM NOW!'
  })
  @ApiResponse({ status: 201, description: 'MFA enrollment initiated', type: EnrollMfaResponseDto })
  @ApiResponse({ status: 400, description: 'MFA already enabled' })
  async enroll(
    @CurrentUser('userId') userId: string,
    @CurrentUser('email') email: string,
  ): Promise<EnrollMfaResponseDto> {
    const result = await this.mfaService.enroll(userId, email);
    
    return {
      secret: result.secret,
      qrCode: result.qrCode,
      manualEntryKey: result.manualEntryKey,
      backupCodes: result.backupCodes,
      warning: 'Save these backup codes immediately. They will not be shown again.',
    };
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Verify and enable MFA',
    description: 'Verifies the TOTP code and enables MFA permanently'
  })
  @ApiResponse({ status: 200, description: 'MFA enabled successfully' })
  @ApiResponse({ status: 401, description: 'Invalid verification code' })
  async verify(
    @CurrentUser('userId') userId: string,
    @Body() dto: VerifyMfaDto,
  ): Promise<{ message: string }> {
    await this.mfaService.verifyAndEnable(userId, dto.token);
    return { message: 'Two-factor authentication enabled successfully' };
  }

  @Post('verify-login')
  @HttpCode(HttpStatus.OK)
  @UseGuards() // No JWT required - uses temp token
  @ApiOperation({ 
    summary: 'Verify MFA during login',
    description: 'Completes login with MFA code after receiving tempToken from login'
  })
  @ApiResponse({ status: 200, description: 'MFA verified, tokens issued' })
  @ApiResponse({ status: 401, description: 'Invalid temp token or MFA code' })
  async verifyLogin(
    @Body() dto: VerifyLoginMfaDto,
    @Req() req: Request,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    // Verify temp token
    const userId = await this.authService.verifyTwoFactorTempToken(dto.tempToken);
    
    // Verify MFA code
    const result = await this.mfaService.verify(userId, dto.token);
    if (!result.valid) {
      throw new UnauthorizedException(
        `Invalid code. ${result.remainingAttempts} attempts remaining.`
      );
    }

    // Get user and generate tokens
    const user = await this.authService.getUserWithTwoFactorStatus(userId);
    
    // Update last login
    await this.authService.updateLastLogin(userId, req.ip);

    return this.authService.generateTokens(user);
  }

  @Delete('disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Disable MFA',
    description: 'Disables MFA for the current user. Requires password and current MFA code.'
  })
  @ApiResponse({ status: 200, description: 'MFA disabled successfully' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async disable(
    @CurrentUser('userId') userId: string,
    @Body() dto: DisableMfaDto,
  ): Promise<{ message: string }> {
    await this.mfaService.disable(userId, dto.token, dto.password);
    return { message: 'Two-factor authentication disabled successfully' };
  }

  @Post('backup-codes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Generate new backup codes',
    description: 'Generates new backup codes. Old codes become invalid immediately.'
  })
  @ApiResponse({ status: 200, description: 'New backup codes generated', type: BackupCodesResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid MFA code' })
  async generateBackupCodes(
    @CurrentUser('userId') userId: string,
    @Body() dto: VerifyMfaDto,
  ): Promise<BackupCodesResponseDto> {
    const backupCodes = await this.mfaService.generateBackupCodes(userId, dto.token);
    return {
      backupCodes,
      warning: 'Save these codes immediately. They will not be shown again.',
    };
  }

  // ============== ADMIN ENDPOINTS ==============

  @Post('admin/reset')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Admin: Reset MFA for user (emergency)',
    description: 'Administrators can reset MFA for users who lost access. Requires admin role.'
  })
  @ApiResponse({ status: 200, description: 'MFA reset successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async adminReset(
    @Body('userId') targetUserId: string,
    @CurrentUser('userId') adminId: string,
  ): Promise<{ message: string }> {
    // Log the admin action for audit
    await this.authService.logAdminAction({
      adminId,
      action: 'MFA_RESET',
      targetUserId,
      timestamp: new Date(),
    });

    // Reset MFA
    await this.mfaService.adminReset(targetUserId);
    
    return { message: 'Two-factor authentication has been reset. User must set up MFA again.' };
  }

  @Get('admin/required-users')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Admin: List users requiring MFA',
    description: 'Lists all admin/manager users without MFA enabled'
  })
  @ApiResponse({ status: 200, description: 'List retrieved' })
  async getUsersWithoutMFA(
    @CurrentUser('tenantId') tenantId: string,
  ): Promise<{ users: Array<{ id: string; email: string; role: string }> }> {
    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        role: { in: [UserRole.ADMIN, UserRole.MANAGER] },
        mfa: { enabled: false },
      },
      select: { id: true, email: true, role: true },
    });

    return { users };
  }
}
