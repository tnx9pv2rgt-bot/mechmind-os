"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const event_emitter_1 = require("@nestjs/event-emitter");
const booking_controller_1 = require("./controllers/booking.controller");
const booking_service_1 = require("./services/booking.service");
const booking_slot_service_1 = require("./services/booking-slot.service");
const booking_event_listener_1 = require("./listeners/booking-event.listener");
const common_module_1 = require("../common/common.module");
const customer_module_1 = require("../customer/customer.module");
let BookingModule = class BookingModule {
};
exports.BookingModule = BookingModule;
exports.BookingModule = BookingModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule, event_emitter_1.EventEmitterModule.forRoot(), common_module_1.CommonModule, customer_module_1.CustomerModule],
        controllers: [booking_controller_1.BookingController],
        providers: [booking_service_1.BookingService, booking_slot_service_1.BookingSlotService, booking_event_listener_1.BookingEventListener],
        exports: [booking_service_1.BookingService, booking_slot_service_1.BookingSlotService],
    })
], BookingModule);
