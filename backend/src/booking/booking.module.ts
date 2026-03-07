import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BookingController } from './controllers/booking.controller';
import { BookingService } from './services/booking.service';
import { BookingSlotService } from './services/booking-slot.service';
import { BookingEventListener } from './listeners/booking-event.listener';
import { CommonModule } from '@common/common.module';
import { CustomerModule } from '@customer/customer.module';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot(),
    CommonModule,
    CustomerModule,
  ],
  controllers: [BookingController],
  providers: [
    BookingService,
    BookingSlotService,
    BookingEventListener,
  ],
  exports: [BookingService, BookingSlotService],
})
export class BookingModule {}
