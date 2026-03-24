import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Logger,
  Ip,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  MinLength,
  Matches,
} from 'class-validator';
import { AuthService, AuthTokens, RegisterTenantResult } from '../services/auth.service';
import { MfaService } from '../mfa/mfa.service';
import { MfaRequiredResponseDto } from '../mfa/dto/mfa.dto';
import { SmsOtpService } from '../services/sms-otp.service';
import { LoginThrottleService } from '../services/login-throttle.service';
import { SessionService } from '../services/session.service';
import { RiskAssessmentService } from '../services/risk-assessment.service';
import { TrustedDeviceService } from '../services/trusted-device.service';
import { SecurityActivityService, SecurityEventType } from '../services/security-activity.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AuthenticatedUser } from '../strategies/jwt.strategy';
import { PrismaService } from '@common/services/prisma.service';
import { EncryptionService } from '@common/services/encryption.service';
import { TrustDeviceDto, DeviceListItem } from '../dto/device.dto';
import {
  SetRecoveryPhoneDto,
  VerifyPhoneDto,
  SendRecoveryOtpDto,
  VerifyRecoveryOtpDto,
  VerifySmsOtpDto,
} from '../dto/sms-otp.dto';

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  tenantSlug: string;

  @IsOptional()
  @IsString()
  totpCode?: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}

class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

class Verify2FADto {
  @IsString()
  @IsNotEmpty()
  tempToken: string;

  @IsString()
  @IsNotEmpty()
  totpCode: string;
}

class RegisterDto {
  @IsString()
  @IsNotEmpty()
  shopName: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Lo slug può contenere solo lettere minuscole, numeri e trattini',
  })
  slug: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'La password deve avere almeno 8 caratteri' })
  password: string;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly mfaService: MfaService,
    private readonly smsOtpService: SmsOtpService,
    private readonly loginThrottle: LoginThrottleService,
    private readonly sessionService: SessionService,
    private readonly riskAssessment: RiskAssessmentService,
    private readonly trustedDeviceService: TrustedDeviceService,
    private readonly securityActivity: SecurityActivityService,
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Profilo utente corrente' })
  @ApiResponse({ status: 200, description: 'Profilo utente' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        tenantId: true,
        createdAt: true,
        avatar: true,
        tenant: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!dbUser || dbUser.tenantId !== user.tenantId) {
      throw new NotFoundException('Utente non trovato');
    }

    return dbUser;
  }

  @Post('demo-session')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Crea sessione demo (no login richiesto)' })
  @ApiResponse({ status: 200, description: 'Token demo' })
  @ApiResponse({ status: 404, description: 'Tenant demo non configurato' })
  async createDemoSession() {
    const demoTenant = await this.prisma.tenant.findFirst({
      where: { slug: 'demo', isActive: true },
      include: { users: { where: { isActive: true }, take: 1 } },
    });

    if (!demoTenant || demoTenant.users.length === 0) {
      throw new NotFoundException('Tenant demo non configurato. Eseguire il seed.');
    }

    const demoUser = demoTenant.users[0];
    const tokens = await this.authService.generateTokens({
      id: demoUser.id,
      email: demoUser.email,
      name: demoUser.name,
      role: demoUser.role,
      isActive: true,
      tenantId: demoTenant.id,
      tenant: {
        id: demoTenant.id,
        name: demoTenant.name,
        slug: demoTenant.slug,
        isActive: true,
      },
    });

    return {
      ...tokens,
      user: {
        id: demoUser.id,
        email: demoUser.email,
        name: demoUser.name,
        role: demoUser.role,
      },
      tenant: {
        id: demoTenant.id,
        name: demoTenant.name,
        slug: demoTenant.slug,
      },
    };
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ strict: { ttl: 3600000, limit: 3 } }) // 3 registrazioni per ora per IP
  @ApiOperation({
    summary: 'Registra nuovo tenant',
    description: 'Crea un nuovo tenant con il primo utente admin. Restituisce JWT tokens.',
  })
  @ApiResponse({ status: 201, description: 'Tenant creato con successo' })
  @ApiResponse({ status: 400, description: 'Dati non validi' })
  @ApiResponse({ status: 409, description: 'Slug o email già in uso' })
  async register(@Body() dto: RegisterDto): Promise<RegisterTenantResult> {
    return this.authService.registerTenant({
      shopName: dto.shopName,
      slug: dto.slug,
      name: dto.name,
      email: dto.email,
      password: dto.password,
    });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { ttl: 60000, limit: 5 } }) // 5 attempts per minute
  @ApiOperation({
    summary: 'User login',
    description:
      'Login with email/password. If 2FA is enabled, returns tempToken for verification.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'password123' },
        tenantSlug: { type: 'string', example: 'garage-roma' },
        totpCode: {
          type: 'string',
          example: '123456',
          description: 'Optional: TOTP code if 2FA enabled',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful or 2FA required',
    schema: {
      oneOf: [
        {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            expiresIn: { type: 'number' },
          },
        },
        {
          type: 'object',
          properties: {
            tempToken: { type: 'string' },
            requiresTwoFactor: { type: 'boolean', example: true },
            methods: { type: 'array', items: { type: 'string' } },
          },
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 423, description: 'Account locked' })
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<AuthTokens | MfaRequiredResponseDto> {
    const ua = userAgent || '';

    // Progressive rate limiting — check delay before attempting
    const { delay } = await this.loginThrottle.getDelay(dto.email, ip);
    if (delay > 0) {
      // Enforce delay (sleep) — attacker must wait
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    let user;
    try {
      // Validate credentials
      user = await this.authService.validateUser(dto.email, dto.password, dto.tenantSlug);
    } catch (error) {
      // Record failure for progressive throttling
      await this.loginThrottle.recordFailure(dto.email, ip);
      throw error;
    }

    if (!user) {
      await this.loginThrottle.recordFailure(dto.email, ip);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    const lockStatus = await this.authService.isAccountLocked(user.id);
    if (lockStatus.locked) {
      throw new UnauthorizedException(`Account locked until ${lockStatus.until?.toISOString()}`);
    }

    // ── Adaptive risk assessment (Google/Microsoft 2024-2026 pattern) ──
    const risk = await this.riskAssessment.assessLoginRisk({
      userId: user.id,
      ipAddress: ip,
      userAgent: ua,
    });

    if (risk.blockLogin) {
      throw new UnauthorizedException(
        'Accesso bloccato per attività sospetta. Contatta il supporto.',
      );
    }

    // ── Trusted Device check — skip MFA if device is trusted ──
    const deviceFingerprint = this.trustedDeviceService.generateFingerprint(ua, ip);
    const deviceTrusted = await this.trustedDeviceService.isDeviceTrusted(
      user.id,
      deviceFingerprint,
    );

    // Check if MFA is enabled OR risk requires it (adaptive MFA)
    const mfaStatus = await this.mfaService.getStatus(user.id);
    const mfaRequired = (mfaStatus.enabled || risk.requiresMfa) && !deviceTrusted;

    if (mfaRequired && mfaStatus.enabled) {
      // If TOTP code provided, verify it
      if (dto.totpCode) {
        const result = await this.mfaService.verify(user.id, dto.totpCode);
        if (!result.valid) {
          await this.authService.recordFailedLogin(user.id);
          await this.loginThrottle.recordFailure(dto.email, ip);
          throw new UnauthorizedException('Invalid 2FA code');
        }
      } else {
        // Return temp token for MFA verification
        const tempToken = await this.authService.generateTwoFactorTempToken(user.id);

        // Check if SMS OTP is available as MFA method
        const dbUser = await this.prisma.user.findUnique({
          where: { id: user.id },
          select: { smsOtpEnabled: true, recoveryPhoneVerified: true },
        });
        const methods: ('totp' | 'backup' | 'sms')[] = ['totp', 'backup'];
        if (dbUser?.smsOtpEnabled && dbUser?.recoveryPhoneVerified) {
          methods.push('sms');
        }

        return {
          tempToken,
          requiresMfa: true,
          methods: methods as ('totp' | 'backup')[],
          riskLevel: risk.level,
        };
      }
    } else if (risk.requiresMfa && !mfaStatus.enabled) {
      // Risk is high but user has no MFA configured — log warning but allow
      // In production, this could force MFA setup before proceeding
      this.logger.warn(`High-risk login for user ${user.id} without MFA (risk=${risk.score})`);
    }

    // Success — reset throttle + update last login
    await this.loginThrottle.resetOnSuccess(dto.email, ip);
    await this.authService.updateLastLogin(user.id, ip);

    const tokens = await this.authService.generateTokens(user);

    // Create session record with device context
    try {
      await this.sessionService.createSession({
        userId: user.id,
        jwtToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        ipAddress: ip,
        userAgent: ua,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days (refresh token lifetime)
      });
    } catch {
      // Session tracking is non-blocking — login still succeeds
      this.logger.error(`Failed to create session for user ${user.id}`);
    }

    // Trust the device after successful login
    // rememberMe = 90 days (Google "Remember this device"), default = 30 days
    const trustDays = dto.rememberMe ? 90 : 30;
    if (risk.level === 'low' || risk.level === 'medium') {
      const fingerprint = this.generateFingerprint(ua, ip);
      await this.riskAssessment.trustDevice(user.id, fingerprint, trustDays).catch(() => {});
    }

    // Log security event (non-blocking)
    this.securityActivity
      .logEvent({
        tenantId: user.tenantId,
        userId: user.id,
        action: SecurityEventType.LOGIN_SUCCESS,
        status: 'success',
        ipAddress: ip,
        userAgent: ua,
      })
      .catch(() => {});

    return tokens;
  }

  @Post('verify-2fa')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { ttl: 60000, limit: 10 } }) // 10 attempts per minute
  @ApiOperation({
    summary: 'Verify 2FA code',
    description: 'Complete login with TOTP code or backup code after receiving tempToken',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tempToken: { type: 'string', description: 'Temporary token from login' },
        totpCode: { type: 'string', example: '123456', description: 'TOTP or backup code' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '2FA verified, login complete',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        expiresIn: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid temp token or 2FA code' })
  async verifyTwoFactor(
    @Body() dto: Verify2FADto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<AuthTokens> {
    const ua = userAgent || '';

    // Verify temp token and get userId
    const userId = await this.authService.verifyTwoFactorTempToken(dto.tempToken);

    // Verify MFA code
    const result = await this.mfaService.verify(userId, dto.totpCode);
    if (!result.valid) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    // Get full user and generate tokens
    const user = await this.authService.getUserWithTwoFactorStatus(userId);

    // Update last login
    await this.authService.updateLastLogin(userId, ip);

    const tokens = await this.authService.generateTokens(user);

    // Create session after successful 2FA
    try {
      await this.sessionService.createSession({
        userId,
        jwtToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        ipAddress: ip,
        userAgent: ua,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      // Trust device after successful MFA (Google pattern: "Remember this device for 30 days")
      const fingerprint = this.generateFingerprint(ua, ip);
      await this.riskAssessment.trustDevice(userId, fingerprint).catch(() => {});
    } catch {
      this.logger.error(`Failed to create session for user ${userId}`);
    }

    return tokens;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 20 } }) // 20 refresh attempts per minute
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: { type: 'string' },
      },
    },
  })
  async refreshToken(@Body() dto: RefreshTokenDto): Promise<AuthTokens> {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout — invalida il token corrente' })
  @ApiResponse({ status: 200, description: 'Logout effettuato' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async logout(
    @Headers('authorization') authHeader: string,
    @Body() body: { refreshToken?: string },
  ): Promise<{ success: boolean }> {
    const token = authHeader?.replace('Bearer ', '') ?? '';
    await this.authService.logout(token, body?.refreshToken);
    return { success: true };
  }

  // ==========================================================================
  // Session Management (Google Security Checkup style)
  // ==========================================================================

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Lista sessioni attive (dispositivi collegati)' })
  @ApiResponse({ status: 200, description: 'Lista sessioni' })
  async listSessions(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('authorization') authHeader: string,
  ) {
    const currentToken = authHeader?.replace('Bearer ', '') ?? '';
    return this.sessionService.listSessions(user.userId, currentToken);
  }

  @Post('sessions/:id/revoke')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Disconnetti un dispositivo specifico' })
  @ApiResponse({ status: 200, description: 'Sessione revocata' })
  @ApiResponse({ status: 404, description: 'Sessione non trovata' })
  async revokeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { sessionId: string },
  ): Promise<{ success: boolean }> {
    await this.sessionService.revokeSession(user.userId, body.sessionId);
    return { success: true };
  }

  @Post('sessions/revoke-others')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Disconnetti tutti gli altri dispositivi' })
  @ApiResponse({ status: 200, description: 'Sessioni revocate' })
  async revokeOtherSessions(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { currentSessionId: string },
  ): Promise<{ success: boolean; count: number }> {
    const count = await this.sessionService.revokeAllOtherSessions(
      user.userId,
      body.currentSessionId,
    );
    return { success: true, count };
  }

  // ==========================================================================
  // Trusted Devices Management
  // ==========================================================================

  @Get('devices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Lista dispositivi' })
  @ApiResponse({ status: 200, description: "Lista dispositivi dell'utente" })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async listDevices(@CurrentUser() user: AuthenticatedUser): Promise<DeviceListItem[]> {
    return this.trustedDeviceService.listDevices(user.userId);
  }

  @Post('devices/:id/trust')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Marca dispositivo come fidato' })
  @ApiResponse({ status: 200, description: 'Dispositivo marcato come fidato' })
  @ApiResponse({ status: 404, description: 'Dispositivo non trovato' })
  @ApiResponse({ status: 400, description: 'Dispositivo compromesso' })
  async trustDevice(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: TrustDeviceDto,
  ): Promise<{ id: string; trustedUntil: Date }> {
    const result = await this.trustedDeviceService.trustDevice(id, user.userId, dto.days);

    this.securityActivity
      .logEvent({
        tenantId: user.tenantId,
        userId: user.userId,
        action: SecurityEventType.DEVICE_TRUSTED,
        status: 'success',
        details: { deviceId: id, days: dto.days ?? 30 },
      })
      .catch(() => {});

    return result;
  }

  @Delete('devices/:id/trust')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Revoca fiducia dispositivo' })
  @ApiResponse({ status: 200, description: 'Fiducia revocata' })
  @ApiResponse({ status: 404, description: 'Dispositivo non trovato' })
  async untrustDevice(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    await this.trustedDeviceService.untrustDevice(id, user.userId);

    this.securityActivity
      .logEvent({
        tenantId: user.tenantId,
        userId: user.userId,
        action: SecurityEventType.DEVICE_UNTRUSTED,
        status: 'success',
        details: { deviceId: id },
      })
      .catch(() => {});

    return { success: true };
  }

  @Delete('devices/trust-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Revoca tutti i dispositivi fidati' })
  @ApiResponse({ status: 200, description: 'Tutti i dispositivi revocati' })
  async untrustAllDevices(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean; count: number }> {
    const count = await this.trustedDeviceService.untrustAllDevices(user.userId);

    this.securityActivity
      .logEvent({
        tenantId: user.tenantId,
        userId: user.userId,
        action: SecurityEventType.DEVICE_UNTRUSTED,
        status: 'success',
        details: { allDevices: true, count },
      })
      .catch(() => {});

    return { success: true, count };
  }

  @Post('devices/:id/compromised')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Segnala dispositivo compromesso' })
  @ApiResponse({ status: 200, description: 'Dispositivo segnalato come compromesso' })
  @ApiResponse({ status: 404, description: 'Dispositivo non trovato' })
  async markDeviceCompromised(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    await this.trustedDeviceService.markCompromised(id, user.userId);

    this.securityActivity
      .logEvent({
        tenantId: user.tenantId,
        userId: user.userId,
        action: SecurityEventType.DEVICE_COMPROMISED,
        status: 'success',
        details: { deviceId: id },
      })
      .catch(() => {});

    return { success: true };
  }

  // ==========================================================================
  // Security Activity Log
  // ==========================================================================

  @Get('security/activity')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Log attivita di sicurezza' })
  @ApiResponse({ status: 200, description: 'Lista eventi di sicurezza paginata' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async getSecurityActivity(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('types') types?: string,
  ): Promise<{
    events: unknown[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const eventTypes = types ? (types.split(',') as SecurityEventType[]) : undefined;

    return this.securityActivity.getActivity({
      tenantId: user.tenantId,
      userId: user.userId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      eventTypes,
    });
  }

  @Get('security/summary')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Riepilogo sicurezza account' })
  @ApiResponse({ status: 200, description: 'Riepilogo sicurezza ultimi 30 giorni' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async getSecuritySummary(@CurrentUser() user: AuthenticatedUser): Promise<{
    totalLogins: number;
    failedAttempts: number;
    devicesUsed: number;
    locationsUsed: string[];
    lastLogin: Date | null;
    suspiciousEvents: number;
  }> {
    return this.securityActivity.getActivitySummary(user.tenantId, user.userId);
  }

  // ==========================================================================
  // Recovery Phone Management
  // ==========================================================================

  @Post('recovery-phone/set')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Throttle({ strict: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Imposta telefono di recupero' })
  @ApiResponse({ status: 200, description: 'OTP di verifica inviato' })
  @ApiResponse({ status: 400, description: 'Numero non valido o rate limit' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async setRecoveryPhone(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetRecoveryPhoneDto,
  ): Promise<{ success: boolean; expiresIn: number }> {
    // Encrypt the phone number and store it (unverified)
    const encryptedPhone = this.encryption.encrypt(dto.phone);

    await this.prisma.user.update({
      where: { id: user.userId },
      data: {
        recoveryPhone: encryptedPhone,
        recoveryPhoneVerified: false,
      },
    });

    // Send verification OTP
    const result = await this.smsOtpService.sendOtp({
      userId: user.userId,
      tenantId: user.tenantId,
      phone: dto.phone,
      purpose: 'phone_verify',
    });

    return result;
  }

  @Post('recovery-phone/verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Throttle({ strict: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Verifica telefono di recupero con OTP' })
  @ApiResponse({ status: 200, description: 'Telefono verificato' })
  @ApiResponse({ status: 400, description: 'Codice non valido o scaduto' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async verifyRecoveryPhone(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: VerifyPhoneDto,
  ): Promise<{ success: boolean }> {
    const result = await this.smsOtpService.verifyOtp({
      userId: user.userId,
      code: dto.code,
      purpose: 'phone_verify',
    });

    if (!result.valid) {
      throw new BadRequestException(
        `Codice non valido. Tentativi rimasti: ${result.remainingAttempts ?? 0}`,
      );
    }

    // Mark phone as verified
    await this.prisma.user.update({
      where: { id: user.userId },
      data: { recoveryPhoneVerified: true },
    });

    return { success: true };
  }

  @Delete('recovery-phone')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Rimuovi telefono di recupero' })
  @ApiResponse({ status: 200, description: 'Telefono rimosso' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async removeRecoveryPhone(@CurrentUser() user: AuthenticatedUser): Promise<{ success: boolean }> {
    await this.prisma.user.update({
      where: { id: user.userId },
      data: {
        recoveryPhone: null,
        recoveryPhoneVerified: false,
      },
    });

    return { success: true };
  }

  // ==========================================================================
  // Account Recovery via SMS
  // ==========================================================================

  @Post('recovery/sms/send')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: 'Invia OTP di recupero al telefono verificato' })
  @ApiResponse({ status: 200, description: 'OTP inviato (se il telefono è verificato)' })
  @ApiResponse({ status: 400, description: 'Rate limit o telefono non configurato' })
  async sendRecoveryOtp(
    @Body() dto: SendRecoveryOtpDto,
  ): Promise<{ success: boolean; expiresIn: number }> {
    // Find user by email (don't reveal if user exists or not for security)
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase().trim() },
      select: {
        id: true,
        tenantId: true,
        recoveryPhone: true,
        recoveryPhoneVerified: true,
      },
    });

    // Always return success to prevent email enumeration
    if (!user || !user.recoveryPhone || !user.recoveryPhoneVerified) {
      return { success: true, expiresIn: 300 };
    }

    // Decrypt the phone number
    const phone = this.encryption.decrypt(user.recoveryPhone);

    const result = await this.smsOtpService.sendOtp({
      userId: user.id,
      tenantId: user.tenantId,
      phone,
      purpose: 'recovery',
    });

    return result;
  }

  @Post('recovery/sms/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Verifica OTP di recupero, restituisce token temporaneo' })
  @ApiResponse({ status: 200, description: 'OTP verificato, token temporaneo restituito' })
  @ApiResponse({ status: 400, description: 'Codice non valido o scaduto' })
  async verifyRecoveryOtp(@Body() dto: VerifyRecoveryOtpDto): Promise<{ tempToken: string }> {
    // Find user by email
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase().trim() },
      select: { id: true },
    });

    if (!user) {
      throw new BadRequestException('Codice non valido o scaduto.');
    }

    const result = await this.smsOtpService.verifyOtp({
      userId: user.id,
      code: dto.code,
      purpose: 'recovery',
    });

    if (!result.valid) {
      throw new BadRequestException(
        `Codice non valido. Tentativi rimasti: ${result.remainingAttempts ?? 0}`,
      );
    }

    // Generate a temporary token for password reset
    const tempToken = await this.authService.generateTwoFactorTempToken(user.id);

    return { tempToken };
  }

  // ==========================================================================
  // SMS OTP for MFA Login
  // ==========================================================================

  @Post('sms-otp/send')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Throttle({ strict: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Invia OTP SMS per MFA (alternativa a TOTP)' })
  @ApiResponse({ status: 200, description: 'OTP inviato' })
  @ApiResponse({
    status: 400,
    description: 'Telefono di recupero non configurato o non verificato',
  })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async sendLoginSmsOtp(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean; expiresIn: number }> {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        tenantId: true,
        recoveryPhone: true,
        recoveryPhoneVerified: true,
      },
    });

    if (!dbUser || !dbUser.recoveryPhone || !dbUser.recoveryPhoneVerified) {
      throw new BadRequestException(
        'Telefono di recupero non configurato o non verificato. Configura un telefono di recupero prima.',
      );
    }

    const phone = this.encryption.decrypt(dbUser.recoveryPhone);

    return this.smsOtpService.sendOtp({
      userId: user.userId,
      tenantId: user.tenantId,
      phone,
      purpose: 'login_mfa',
    });
  }

  @Post('sms-otp/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Verifica OTP SMS durante login MFA' })
  @ApiResponse({ status: 200, description: 'MFA verificato, login completato' })
  @ApiResponse({ status: 400, description: 'Codice non valido o scaduto' })
  @ApiResponse({ status: 401, description: 'Token temporaneo non valido' })
  async verifyLoginSmsOtp(
    @Body() dto: VerifySmsOtpDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<AuthTokens> {
    const ua = userAgent || '';

    // Verify temp token and get userId
    const userId = await this.authService.verifyTwoFactorTempToken(dto.tempToken);

    // Verify OTP
    const result = await this.smsOtpService.verifyOtp({
      userId,
      code: dto.code,
      purpose: 'login_mfa',
    });

    if (!result.valid) {
      throw new BadRequestException(
        `Codice non valido. Tentativi rimasti: ${result.remainingAttempts ?? 0}`,
      );
    }

    // Get user and generate tokens
    const user = await this.authService.getUserWithTwoFactorStatus(userId);
    await this.authService.updateLastLogin(userId, ip);

    const tokens = await this.authService.generateTokens(user);

    // Create session
    try {
      await this.sessionService.createSession({
        userId,
        jwtToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        ipAddress: ip,
        userAgent: ua,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const fingerprint = this.generateFingerprint(ua, ip);
      await this.riskAssessment.trustDevice(userId, fingerprint).catch(() => {});
    } catch {
      this.logger.error(`Creazione sessione fallita per utente ${userId}`);
    }

    return tokens;
  }

  // ── Private helpers ──

  private generateFingerprint(userAgent: string, ip: string): string {
    let browser = 'unknown';
    if (userAgent.includes('Edg/')) browser = 'Edge';
    else if (userAgent.includes('Chrome/')) browser = 'Chrome';
    else if (userAgent.includes('Safari/')) browser = 'Safari';
    else if (userAgent.includes('Firefox/')) browser = 'Firefox';

    let os = 'unknown';
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('Mac OS')) os = 'macOS';
    else if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Linux')) os = 'Linux';

    return createHash('sha256').update(`${browser}:${os}:${ip}`).digest('hex').substring(0, 32);
  }
}
