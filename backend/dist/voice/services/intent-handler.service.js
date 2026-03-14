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
var IntentHandlerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntentHandlerService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/services/prisma.service");
const queue_service_1 = require("../../common/services/queue.service");
const logger_service_1 = require("../../common/services/logger.service");
const customer_service_1 = require("../../customer/services/customer.service");
const booking_service_1 = require("../../booking/services/booking.service");
let IntentHandlerService = IntentHandlerService_1 = class IntentHandlerService {
    constructor(prisma, queueService, loggerService, customerService, bookingService) {
        this.prisma = prisma;
        this.queueService = queueService;
        this.loggerService = loggerService;
        this.customerService = customerService;
        this.bookingService = bookingService;
        this.logger = new common_1.Logger(IntentHandlerService_1.name);
    }
    async handleBookingIntent(tenantId, customerPhone, extractedData, vapiCallId) {
        this.logger.log(`Handling booking intent for ${customerPhone.slice(0, 4)}***`, 'IntentHandlerService');
        try {
            let customer = await this.customerService.findByPhone(tenantId, customerPhone);
            if (!customer) {
                this.logger.log(`Creating new customer for ${customerPhone.slice(0, 4)}***`);
                customer = await this.customerService.createFromVoiceCall(tenantId, customerPhone, extractedData);
            }
            const preferredDate = new Date(extractedData.preferredDate);
            const [hours, minutes] = extractedData.preferredTime.split(':').map(Number);
            preferredDate.setHours(hours, minutes, 0, 0);
            const slot = await this.findNearestAvailableSlot(tenantId, preferredDate, extractedData.serviceType);
            if (!slot) {
                await this.queueService.addBookingJob('schedule-callback', {
                    type: 'schedule-callback',
                    payload: {
                        customerId: customer.id,
                        preferredDate: extractedData.preferredDate,
                        preferredTime: extractedData.preferredTime,
                        serviceType: extractedData.serviceType,
                    },
                    tenantId,
                });
                return {
                    success: false,
                    message: 'No slots available, queued for callback',
                };
            }
            let vehicleId;
            if (extractedData.licensePlate) {
                const vehicle = await this.prisma.vehicle.findFirst({
                    where: {
                        licensePlate: extractedData.licensePlate.toUpperCase(),
                        customerId: customer.id,
                    },
                });
                vehicleId = vehicle?.id;
            }
            let serviceIds;
            if (extractedData.serviceType) {
                const service = await this.prisma.service.findFirst({
                    where: {
                        tenantId,
                        name: {
                            contains: extractedData.serviceType,
                            mode: 'insensitive',
                        },
                    },
                });
                if (service) {
                    serviceIds = [service.id];
                }
            }
            const booking = await this.bookingService.createBooking(tenantId, {
                customerId: customer.id,
                vehicleId,
                slotId: slot.id,
                scheduledDate: slot.startTime.toISOString(),
                serviceIds,
                notes: extractedData.issueDescription,
                source: 'VOICE',
                vapiCallId,
            });
            await this.queueService.addNotificationJob('send-sms-confirmation', {
                type: 'sms-confirmation',
                payload: {
                    customerId: customer.id,
                    bookingId: booking.id,
                    scheduledDate: slot.startTime,
                },
                tenantId,
            });
            this.logger.log(`Created booking ${booking.id} for customer ${customer.id}`);
            return {
                success: true,
                bookingId: booking.id,
                message: 'Booking created successfully',
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to handle booking intent: ${errorMessage}`);
            return {
                success: false,
                error: errorMessage,
            };
        }
    }
    async handleStatusCheckIntent(tenantId, customerPhone, _extractedData) {
        this.logger.log(`Handling status check for ${customerPhone.slice(0, 4)}***`, 'IntentHandlerService');
        const customer = await this.customerService.findByPhone(tenantId, customerPhone);
        if (!customer) {
            this.logger.warn(`Customer not found for ${customerPhone.slice(0, 4)}***`);
            return;
        }
        const bookings = await this.prisma.booking.findMany({
            where: {
                customerId: customer.id,
                tenantId,
            },
            orderBy: { scheduledDate: 'desc' },
            take: 3,
            include: {
                services: {
                    include: {
                        service: true,
                    },
                },
                slot: true,
            },
        });
        await this.queueService.addNotificationJob('send-status-update', {
            type: 'status-update',
            payload: {
                customerId: customer.id,
                bookings: bookings.map(b => ({
                    id: b.id,
                    status: b.status,
                    scheduledDate: b.scheduledDate,
                    services: b.services.map(s => s.service.name),
                })),
            },
            tenantId,
        });
    }
    async handleComplaintIntent(tenantId, customerPhone, transcript, extractedData) {
        this.logger.log(`Handling complaint from ${customerPhone.slice(0, 4)}***`, 'IntentHandlerService');
        const customer = await this.customerService.findByPhone(tenantId, customerPhone);
        await this.queueService.addVoiceJob('complaint-review', {
            type: 'complaint-review',
            payload: {
                customerId: customer?.id,
                customerPhone,
                transcript,
                issueDescription: extractedData.issueDescription,
                licensePlate: extractedData.licensePlate,
            },
            tenantId,
        });
        if (customer) {
            await this.queueService.addNotificationJob('send-complaint-acknowledgment', {
                type: 'complaint-acknowledgment',
                payload: {
                    customerId: customer.id,
                },
                tenantId,
            });
        }
    }
    async findNearestAvailableSlot(tenantId, preferredDate, _serviceType) {
        const startDate = new Date(preferredDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(preferredDate);
        endDate.setDate(endDate.getDate() + 3);
        endDate.setHours(23, 59, 59, 999);
        const slots = await this.prisma.bookingSlot.findMany({
            where: {
                tenantId,
                status: 'AVAILABLE',
                startTime: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            orderBy: {
                startTime: 'asc',
            },
            take: 10,
        });
        if (slots.length === 0) {
            return null;
        }
        const preferredTime = preferredDate.getTime();
        let nearestSlot = slots[0];
        let minDiff = Math.abs(nearestSlot.startTime.getTime() - preferredTime);
        for (const slot of slots) {
            const diff = Math.abs(slot.startTime.getTime() - preferredTime);
            if (diff < minDiff) {
                minDiff = diff;
                nearestSlot = slot;
            }
        }
        return nearestSlot;
    }
    extractIntentFromTranscript(transcript) {
        const lowerTranscript = transcript.toLowerCase();
        const intents = [
            {
                keywords: ['book', 'appointment', 'schedule', 'service', 'repair', 'fix'],
                intent: 'booking',
            },
            {
                keywords: ['status', 'when', 'ready', 'done', 'complete', 'progress'],
                intent: 'status_check',
            },
            {
                keywords: ['complaint', 'problem', 'issue', 'unhappy', 'bad', 'wrong', 'disappointed'],
                intent: 'complaint',
            },
        ];
        for (const { keywords, intent } of intents) {
            const matches = keywords.filter(k => lowerTranscript.includes(k));
            if (matches.length > 0) {
                const confidence = Math.min(matches.length / keywords.length + 0.3, 1);
                return { intent, confidence };
            }
        }
        return { intent: 'other', confidence: 0.5 };
    }
};
exports.IntentHandlerService = IntentHandlerService;
exports.IntentHandlerService = IntentHandlerService = IntentHandlerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        queue_service_1.QueueService,
        logger_service_1.LoggerService,
        customer_service_1.CustomerService,
        booking_service_1.BookingService])
], IntentHandlerService);
