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
import { AuthService, AuthTokens } from '../services/auth.service';
import { TwoFactorService } from '../two-factor/services/two-factor.service';
import { TwoFactorRequiredResponseDto } from '../two-factor/dto/two-factor.dto';

class LoginDto {
  email: string;
  password: string;
  tenantSlug: string;
  totpCode?: string;
}

class RefreshTokenDto {
  refreshToken: string;
}

class Verify2FADto {
  tempToken: string;
  totpCode: string;
}

@ApiTags('Authentication')
@Controller('v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { ttl: 60000, limit: 5 } }) // 5 attempts per minute
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
  ): Promise<AuthTokens | TwoFactorRequiredResponseDto> {
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

    // Check if 2FA is enabled
    const twoFactorStatus = await this.twoFactorService.getStatus(user.id);
    
    if (twoFactorStatus.enabled) {
      // If TOTP code provided, verify it
      if (dto.totpCode) {
        const verified = await this.twoFactorService.verifyLogin(user.id, dto.totpCode);
        if (!verified) {
          await this.authService.recordFailedLogin(user.id);
          throw new UnauthorizedException('Invalid 2FA code');
        }
      } else {
        // Return temp token for 2FA verification
        const tempToken = await this.authService.generateTwoFactorTempToken(user.id);
        return {
          tempToken,
          requiresTwoFactor: true,
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
  @Throttle({ auth: { ttl: 60000, limit: 10 } }) // 10 attempts per minute
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
    
    // Verify 2FA code
    const verified = await this.twoFactorService.verifyLogin(userId, dto.totpCode);
    if (!verified) {
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
