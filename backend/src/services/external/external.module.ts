/**
 * External Services Module
 * NestJS module for external service integrations
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ViesApiService } from './viesApi';
import { GooglePlacesService } from './googlePlaces';
import { ZeroBounceService } from './zerobounce';
import { TwilioService } from './twilio';
import { ValidationController } from './validation.controller';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [ValidationController],
  providers: [
    ViesApiService,
    GooglePlacesService,
    ZeroBounceService,
    TwilioService,
  ],
  exports: [
    ViesApiService,
    GooglePlacesService,
    ZeroBounceService,
    TwilioService,
  ],
})
export class ExternalServicesModule {}
