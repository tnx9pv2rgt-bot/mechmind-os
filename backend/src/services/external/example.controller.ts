/**
 * Example Controller - External Services Integration
 * Esempio di utilizzo dei servizi esterni
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ViesApiService, GooglePlacesService, ZeroBounceService, TwilioService } from './index';
import { ApplyRateLimit, RedisRateLimiterMiddleware } from '../../middleware';

@ApiTags('External Services')
@Controller('external')
export class ExternalServicesExampleController {
  constructor(
    private readonly viesService: ViesApiService,
    private readonly placesService: GooglePlacesService,
    private readonly emailService: ZeroBounceService,
    private readonly phoneService: TwilioService,
  ) {}

  // ==================== VIES - VAT Verification ====================

  @Post('vat/verify')
  @HttpCode(HttpStatus.OK)
  @ApplyRateLimit(RedisRateLimiterMiddleware.VAT_VERIFICATION_LIMIT)
  @ApiOperation({ summary: 'Verify VAT number via VIES' })
  @ApiResponse({ status: 200, description: 'VAT verification result' })
  async verifyVat(@Body('vatNumber') vatNumber: string) {
    const result = await this.viesService.verifyVatNumber(vatNumber);
    return {
      success: true,
      data: result,
    };
  }

  @Post('vat/verify-bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify multiple VAT numbers' })
  async verifyVatBulk(@Body('vatNumbers') vatNumbers: string[]) {
    const results = await this.viesService.verifyMultipleVatNumbers(vatNumbers);
    return {
      success: true,
      data: Object.fromEntries(results),
    };
  }

  // ==================== Google Places - Address ====================

  @Get('address/autocomplete')
  @ApiOperation({ summary: 'Autocomplete address search' })
  async autocompleteAddress(@Query('q') query: string) {
    const results = await this.placesService.autocompleteAddress(query);
    return {
      success: true,
      data: results,
    };
  }

  @Get('address/details')
  @ApiOperation({ summary: 'Get place details by Place ID' })
  async getPlaceDetails(@Query('placeId') placeId: string) {
    const details = await this.placesService.getPlaceDetails(placeId);
    return {
      success: true,
      data: details,
    };
  }

  @Get('address/geocode')
  @ApiOperation({ summary: 'Geocode address to coordinates' })
  async geocodeAddress(@Query('address') address: string) {
    const results = await this.placesService.geocodeAddress(address);
    return {
      success: true,
      data: results,
    };
  }

  @Get('address/reverse-geocode')
  @ApiOperation({ summary: 'Reverse geocode coordinates to address' })
  async reverseGeocode(@Query('lat') latitude: string, @Query('lng') longitude: string) {
    const results = await this.placesService.reverseGeocode(
      parseFloat(latitude),
      parseFloat(longitude),
    );
    return {
      success: true,
      data: results,
    };
  }

  @Get('address/validate-postal-code')
  @ApiOperation({ summary: 'Validate postal code and get city/province' })
  async validatePostalCode(@Query('code') postalCode: string) {
    const result = await this.placesService.validatePostalCode(postalCode);
    return {
      success: true,
      data: result,
    };
  }

  // ==================== ZeroBounce - Email Verification ====================

  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  @ApplyRateLimit(RedisRateLimiterMiddleware.EMAIL_CHECK_LIMIT)
  @ApiOperation({ summary: 'Verify email address' })
  async verifyEmail(@Body('email') email: string) {
    const result = await this.emailService.verifyEmail(email);
    return {
      success: true,
      data: result,
    };
  }

  @Post('email/verify-syntax')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate email syntax only (no API call)' })
  validateEmailSyntax(@Body('email') email: string) {
    const result = this.emailService.validateSyntax(email);
    return {
      success: true,
      data: result,
    };
  }

  // ==================== Twilio - Phone Verification ====================

  @Post('phone/validate')
  @HttpCode(HttpStatus.OK)
  @ApplyRateLimit(RedisRateLimiterMiddleware.PHONE_CHECK_LIMIT)
  @ApiOperation({ summary: 'Validate phone number' })
  async validatePhone(@Body('phone') phone: string) {
    const result = await this.phoneService.validatePhoneNumber(phone);
    return {
      success: true,
      data: result,
    };
  }

  @Post('phone/format-e164')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Format phone to E.164' })
  formatPhoneE164(@Body('phone') phone: string, @Body('country') country?: string) {
    const formatted = this.phoneService.formatE164(phone, country || 'IT');
    return {
      success: true,
      data: { formatted },
    };
  }

  @Post('phone/send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP via SMS' })
  async sendOtp(@Body('phone') phone: string) {
    const result = await this.phoneService.sendOtp(phone);
    return {
      success: result.success,
      data: result,
    };
  }

  @Post('phone/verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP code' })
  async verifyOtp(@Body('phone') phone: string, @Body('code') code: string) {
    const result = await this.phoneService.verifyOtp(phone, code);
    return {
      success: result.success,
      valid: result.valid,
      data: result,
    };
  }

  @Post('phone/resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend OTP' })
  async resendOtp(@Body('phone') phone: string) {
    const result = await this.phoneService.resendOtp(phone);
    return {
      success: result.success,
      data: result,
    };
  }
}
