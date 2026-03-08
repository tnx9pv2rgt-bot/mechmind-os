/**
 * MechMind OS - IoT Module
 * 
 * Aggregates all IoT-related services:
 * - OBD Streaming
 * - Vehicle Twin
 * - Shop Floor Tracking
 * - License Plate Recognition
 */

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ObdStreamingService } from './obd/services/obd-streaming.service';
import { ObdStreamingController } from './obd/controllers/obd-streaming.controller';
import { ObdStreamingGateway } from './obd/gateways/obd-streaming.gateway';
import { VehicleTwinService } from './vehicle-twin/services/vehicle-twin.service';
import { VehicleTwinController } from './vehicle-twin/controllers/vehicle-twin.controller';
import { ShopFloorService } from './shop-floor/services/shop-floor.service';
import { ShopFloorController } from './shop-floor/controllers/shop-floor.controller';
import { ShopFloorGateway } from './shop-floor/gateways/shop-floor.gateway';
import { LicensePlateService } from './license-plate/services/license-plate.service';
import { LicensePlateController } from './license-plate/controllers/license-plate.controller';
import { CommonModule } from '../common/common.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    CommonModule,
    AuthModule,
    NotificationsModule,
    BullModule.registerQueue(
      { name: 'obd' },
      { name: 'shop-floor' },
    ),
  ],
  controllers: [
    ObdStreamingController,
    VehicleTwinController,
    ShopFloorController,
    LicensePlateController,
  ],
  providers: [
    ObdStreamingService,
    ObdStreamingGateway,
    VehicleTwinService,
    ShopFloorService,
    ShopFloorGateway,
    LicensePlateService,
  ],
  exports: [
    ObdStreamingService,
    VehicleTwinService,
    ShopFloorService,
    LicensePlateService,
  ],
})
export class IotModule {}
