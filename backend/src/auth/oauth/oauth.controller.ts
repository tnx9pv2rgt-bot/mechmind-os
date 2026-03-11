import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Ip,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { OAuthService } from './oauth.service';
import { GoogleOAuthDto } from './dto/oauth.dto';
import { AuthTokens } from '../services/auth.service';

@ApiTags('Authentication')
@Controller('auth/oauth')
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { ttl: 60000, limit: 10 } })
  @ApiOperation({
    summary: 'Login with Google',
    description: 'Authenticate using a Google ID token from Google Identity Services',
  })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid token or user not found' })
  async loginWithGoogle(
    @Body() dto: GoogleOAuthDto,
    @Ip() ip: string,
  ): Promise<AuthTokens> {
    return this.oauthService.loginWithGoogle(dto.credential, dto.tenantSlug, ip);
  }
}
