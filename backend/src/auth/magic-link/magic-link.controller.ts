import {
  Controller,
  Post,
  Body,
  Ip,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { MagicLinkService, MagicLinkError } from './magic-link.service';
import { SendMagicLinkDto, VerifyMagicLinkDto } from './dto/magic-link.dto';

@ApiTags('Magic Link')
@Controller('auth/magic-link')
export class MagicLinkController {
  constructor(private readonly magicLinkService: MagicLinkService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { ttl: 60000, limit: 5 } })
  @ApiOperation({
    summary: 'Send magic link email',
    description: 'Sends a magic link to the user email for passwordless login',
  })
  @ApiResponse({ status: 200, description: 'Magic link sent (always returns success)' })
  async send(
    @Body() dto: SendMagicLinkDto,
    @Ip() ip: string,
    @Req() req: Request,
  ): Promise<{ sent: true }> {
    return this.magicLinkService.sendMagicLink(
      dto.email,
      dto.tenantSlug,
      ip,
      req.headers['user-agent'],
    );
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { ttl: 60000, limit: 5 } })
  @ApiOperation({
    summary: 'Verify magic link token',
    description: 'Verifies the magic link token and returns auth tokens',
  })
  @ApiResponse({ status: 200, description: 'Token verified, auth tokens returned' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verify(
    @Body() dto: VerifyMagicLinkDto,
    @Ip() ip: string,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    try {
      return await this.magicLinkService.verifyMagicLink(dto.token, ip);
    } catch (error) {
      if (error instanceof MagicLinkError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
