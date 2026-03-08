"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingEventListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const logger_service_1 = require("../../common/services/logger.service");
const queue_service_1 = require("../../common/services/queue.service");
const booking_service_1 = require("../services/booking.service");
let BookingEventListener = class BookingEventListener {
    constructor(logger, queueService) {
        this.logger = logger;
        this.queueService = queueService;
    }
    async handleBookingCreated(event) {
        this.logger.log(`Booking created: ${event.bookingId} for tenant ${event.tenantId}`, 'BookingEventListener');
        await this.queueService.addNotificationJob('send-booking-confirmation', {
            type: 'booking-confirmation',
            payload: {
                bookingId: event.bookingId,
                customerId: event.customerId,
                scheduledDate: event.scheduledDate,
            },
            tenantId: event.tenantId,
        });
        await this.queueService.addNotificationJob('sync-calendar', {
            type: 'calendar-sync',
            payload: {
                bookingId: event.bookingId,
                action: 'create',
            },
            tenantId: event.tenantId,
        });
    }
    async handleBookingUpdated(event) {
        this.logger.log(`Booking updated: ${event.bookingId} for tenant ${event.tenantId}`, 'BookingEventListener');
        await this.queueService.addNotificationJob('send-booking-update', {
            type: 'booking-update',
            payload: {
                bookingId: event.bookingId,
                changes: event.changes,
            },
            tenantId: event.tenantId,
        });
    }
    async handleBookingCancelled(event) {
        this.logger.log(`Booking cancelled: ${event.bookingId} for tenant ${event.tenantId}`, 'BookingEventListener');
        await this.queueService.addNotificationJob('send-cancellation-notice', {
            type: 'booking-cancellation',
            payload: {
                bookingId: event.bookingId,
                reason: event.reason,
            },
            tenantId: event.tenantId,
        });
        await this.queueService.addNotificationJob('sync-calendar', {
            type: 'calendar-sync',
            payload: {
                bookingId: event.bookingId,
                action: 'delete',
            },
            tenantId: event.tenantId,
        });
    }
};
exports.BookingEventListener = BookingEventListener;
__decorate([
    (0, event_emitter_1.OnEvent)('booking.created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [booking_service_1.BookingCreatedEvent]),
    __metadata("design:returntype", Promise)
], BookingEventListener.prototype, "handleBookingCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('booking.updated'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BookingEventListener.prototype, "handleBookingUpdated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('booking.cancelled'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BookingEventListener.prototype, "handleBookingCancelled", null);
exports.BookingEventListener = BookingEventListener = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [logger_service_1.LoggerService,
        queue_service_1.QueueService])
], BookingEventListener);
