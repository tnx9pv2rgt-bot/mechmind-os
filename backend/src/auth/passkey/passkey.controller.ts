import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  Ip,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { PasskeyService } from './passkey.service';
import { RegisterVerifyDto, AuthenticateVerifyDto } from './dto/passkey.dto';
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/server';

@ApiTags('Passkeys')
@Controller('auth/passkey')
export class PasskeyController {
  constructor(private readonly passkeyService: PasskeyService) {}

  @Post('register-options')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate passkey registration options' })
  @ApiResponse({ status: 201, description: 'Registration options generated' })
  async registerOptions(
    @CurrentUser('userId') userId: string,
  ): Promise<{ options: Record<string, unknown>; sessionId: string }> {
    return this.passkeyService.generateRegistrationOptions(userId);
  }

  @Post('register-verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify and save passkey registration' })
  @ApiResponse({ status: 200, description: 'Passkey registered successfully' })
  async registerVerify(
    @CurrentUser('userId') userId: string,
    @Body() dto: RegisterVerifyDto,
    @Headers('user-agent') userAgent: string,
  ): Promise<{ id: string }> {
    return this.passkeyService.verifyRegistration(
      userId,
      dto.attestation as unknown as RegistrationResponseJSON,
      dto.sessionId,
      dto.deviceName,
      userAgent,
    );
  }

  @Post('authenticate-options')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate passkey authentication options' })
  @ApiResponse({ status: 200, description: 'Authentication options generated' })
  async authenticateOptions(): Promise<{ options: Record<string, unknown>; sessionId: string }> {
    return this.passkeyService.generateAuthenticationOptions();
  }

  @Post('authenticate-verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Verify passkey authentication and login' })
  @ApiResponse({ status: 200, description: 'Authentication successful, tokens returned' })
  @ApiResponse({ status: 400, description: 'Invalid assertion or challenge' })
  async authenticateVerify(
    @Body() dto: AuthenticateVerifyDto,
    @Ip() ip: string,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    return this.passkeyService.verifyAuthentication(
      dto.assertion as unknown as AuthenticationResponseJSON,
      dto.sessionId,
      ip,
    );
  }

  @Get('list')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List user passkeys' })
  @ApiResponse({ status: 200, description: 'Passkeys list returned' })
  async list(@CurrentUser('userId') userId: string): Promise<
    Array<{
      id: string;
      deviceName: string | null;
      deviceType: string;
      lastUsedAt: Date | null;
      registeredAt: Date;
    }>
  > {
    return this.passkeyService.listPasskeys(userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a passkey' })
  @ApiResponse({ status: 204, description: 'Passkey deleted' })
  @ApiResponse({ status: 404, description: 'Passkey not found' })
  async remove(
    @CurrentUser('userId') userId: string,
    @Param('id') passkeyId: string,
  ): Promise<void> {
    return this.passkeyService.deletePasskey(userId, passkeyId);
  }
}
