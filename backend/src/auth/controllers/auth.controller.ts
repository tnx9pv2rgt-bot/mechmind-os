import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Ip,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { IsEmail, IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { AuthService, AuthTokens } from '../services/auth.service';
import { MfaService } from '../mfa/mfa.service';
import { MfaRequiredResponseDto } from '../mfa/dto/mfa.dto';

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

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mfaService: MfaService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { ttl: 60000, limit: 5 } }) // 5 attempts per minute
  @ApiOperation({ 
    summary: 'User login',
    description: 'Login with email/password. If 2FA is enabled, returns tempToken for verification.'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'password123' },
        tenantSlug: { type: 'string', example: 'garage-roma' },
        totpCode: { type: 'string', example: '123456', description: 'Optional: TOTP code if 2FA enabled' },
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
  ): Promise<AuthTokens | MfaRequiredResponseDto> {
    // Validate credentials
    const user = await this.authService.validateUser(
      dto.email,
      dto.password,
      dto.tenantSlug,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    const lockStatus = await this.authService.isAccountLocked(user.id);
    if (lockStatus.locked) {
      throw new UnauthorizedException(
        `Account locked until ${lockStatus.until?.toISOString()}`
      );
    }

    // Check if MFA is enabled
    const mfaStatus = await this.mfaService.getStatus(user.id);

    if (mfaStatus.enabled) {
      // If TOTP code provided, verify it
      if (dto.totpCode) {
        const result = await this.mfaService.verify(user.id, dto.totpCode);
        if (!result.valid) {
          await this.authService.recordFailedLogin(user.id);
          throw new UnauthorizedException('Invalid 2FA code');
        }
      } else {
        // Return temp token for MFA verification
        const tempToken = await this.authService.generateTwoFactorTempToken(user.id);
        return {
          tempToken,
          requiresMfa: true,
          methods: ['totp', 'backup'],
        };
      }
    }

    // Update last login info
    await this.authService.updateLastLogin(user.id, ip);

    return this.authService.generateTokens(user);
  }

  @Post('verify-2fa')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { ttl: 60000, limit: 10 } }) // 10 attempts per minute
  @ApiOperation({ 
    summary: 'Verify 2FA code',
    description: 'Complete login with TOTP code or backup code after receiving tempToken'
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
  ): Promise<AuthTokens> {
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

    return this.authService.generateTokens(user);
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
}
