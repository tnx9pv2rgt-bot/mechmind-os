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
exports.BookingService = exports.BookingCreatedEvent = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../common/services/prisma.service");
const queue_service_1 = require("../../common/services/queue.service");
const logger_service_1 = require("../../common/services/logger.service");
const bookingInclude = {
    customer: true,
    vehicle: true,
    services: { include: { service: true } },
    slot: true,
};
class BookingCreatedEvent {
    constructor(bookingId, tenantId, customerId, scheduledDate, source) {
        this.bookingId = bookingId;
        this.tenantId = tenantId;
        this.customerId = customerId;
        this.scheduledDate = scheduledDate;
        this.source = source;
    }
}
exports.BookingCreatedEvent = BookingCreatedEvent;
let BookingService = class BookingService {
    constructor(prisma, eventEmitter, queueService, logger) {
        this.prisma = prisma;
        this.eventEmitter = eventEmitter;
        this.queueService = queueService;
        this.logger = logger;
    }
    async reserveSlot(tenantId, dto) {
        const { slotId, customerId, vehicleId, serviceIds, notes } = dto;
        this.logger.log(`Attempting to reserve slot ${slotId} for tenant ${tenantId}`);
        const lockAcquired = await this.prisma.acquireAdvisoryLock(tenantId, slotId);
        if (!lockAcquired) {
            this.logger.warn(`Could not acquire lock for slot ${slotId}`);
            await this.queueService.addBookingJob('reserve-slot-retry', {
                type: 'reserve-slot-retry',
                payload: dto,
                tenantId,
            }, { delay: 5000 });
            return {
                success: false,
                conflict: true,
                retryAfter: 5000,
                queuePosition: 1,
                message: 'Slot is currently being reserved by another request. Queued for retry.',
            };
        }
        try {
            const result = await this.prisma.withSerializableTransaction(async (tx) => {
                const slot = await tx.bookingSlot.findFirst({
                    where: {
                        id: slotId,
                        tenantId,
                    },
                });
                if (!slot) {
                    throw new common_1.NotFoundException(`Slot ${slotId} not found`);
                }
                if (slot.status !== 'AVAILABLE') {
                    throw new common_1.ConflictException(`Slot is not available (status: ${slot.status})`);
                }
                const customer = await tx.customer.findFirst({
                    where: {
                        id: customerId,
                        tenantId,
                    },
                });
                if (!customer) {
                    throw new common_1.NotFoundException(`Customer ${customerId} not found`);
                }
                const bookingEvent = await tx.bookingEvent.create({
                    data: {
                        eventType: 'booking_created',
                        payload: {
                            customerId,
                            slotId,
                            vehicleId,
                            serviceIds,
                            notes,
                        },
                        booking: {
                            connect: {
                                id: 'temp',
                            },
                        },
                    },
                });
                await tx.bookingSlot.update({
                    where: { id: slotId },
                    data: { status: 'BOOKED' },
                });
                const booking = await tx.booking.create({
                    data: {
                        status: client_1.BookingStatus.CONFIRMED,
                        scheduledDate: slot.startTime,
                        durationMinutes: Math.round((slot.endTime.getTime() - slot.startTime.getTime()) / 60000),
                        notes: notes || null,
                        source: 'WEB',
                        tenant: { connect: { id: tenantId } },
                        customer: { connect: { id: customerId } },
                        slot: { connect: { id: slotId } },
                        ...(vehicleId && {
                            vehicle: { connect: { id: vehicleId } },
                        }),
                        ...(serviceIds?.length && {
                            services: {
                                create: serviceIds.map(serviceId => ({
                                    service: { connect: { id: serviceId } },
                                    price: 0,
                                })),
                            },
                        }),
                    },
                    include: {
                        customer: true,
                        vehicle: true,
                        services: {
                            include: {
                                service: true,
                            },
                        },
                        slot: true,
                    },
                });
                await tx.bookingEvent.update({
                    where: { id: bookingEvent.id },
                    data: {
                        booking: { connect: { id: booking.id } },
                    },
                });
                return booking;
            }, { maxRetries: 3, retryDelay: 100 });
            this.eventEmitter.emit('booking.created', new BookingCreatedEvent(result.id, tenantId, customerId, result.scheduledDate, result.source));
            this.logger.log(`Successfully created booking ${result.id}`);
            return {
                success: true,
                booking: result,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to create booking: ${errorMessage}`);
            if (error instanceof common_1.ConflictException || error instanceof common_1.NotFoundException) {
                throw error;
            }
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2034') {
                    throw new common_1.ConflictException('Booking conflict detected. Please try again.');
                }
            }
            throw new common_1.BadRequestException(`Failed to create booking: ${errorMessage}`);
        }
        finally {
            await this.prisma.releaseAdvisoryLock(tenantId, slotId);
            this.logger.debug(`Released lock for slot ${slotId}`);
        }
    }
    async createBooking(tenantId, dto) {
        const { customerId, vehicleId, slotId, scheduledDate, durationMinutes, notes, source, vapiCallId, technicianId, liftPosition, } = dto;
        return this.prisma.withTenant(tenantId, async (prisma) => {
            const slot = await prisma.bookingSlot.findUnique({
                where: { id: slotId },
            });
            if (!slot) {
                throw new common_1.NotFoundException(`Slot ${slotId} not found`);
            }
            const booking = await prisma.booking.create({
                data: {
                    status: client_1.BookingStatus.PENDING,
                    scheduledDate: new Date(scheduledDate),
                    durationMinutes: durationMinutes || 60,
                    notes: notes || null,
                    source: source || 'WEB',
                    vapiCallId: vapiCallId || null,
                    technicianId: technicianId || null,
                    liftPosition: liftPosition || null,
                    tenant: { connect: { id: tenantId } },
                    customer: { connect: { id: customerId } },
                    slot: { connect: { id: slotId } },
                    ...(vehicleId && {
                        vehicle: { connect: { id: vehicleId } },
                    }),
                },
                include: {
                    customer: true,
                    vehicle: true,
                    services: {
                        include: {
                            service: true,
                        },
                    },
                    slot: true,
                },
            });
            await prisma.bookingSlot.update({
                where: { id: slotId },
                data: { status: 'BOOKED' },
            });
            await prisma.bookingEvent.create({
                data: {
                    eventType: 'booking_created',
                    payload: { ...dto },
                    booking: { connect: { id: booking.id } },
                },
            });
            this.eventEmitter.emit('booking.created', new BookingCreatedEvent(booking.id, tenantId, customerId, booking.scheduledDate, booking.source));
            return booking;
        });
    }
    async findById(tenantId, bookingId) {
        return this.prisma.withTenant(tenantId, async (prisma) => {
            const booking = await prisma.booking.findFirst({
                where: {
                    id: bookingId,
                    tenantId,
                },
                include: {
                    customer: true,
                    vehicle: true,
                    services: {
                        include: {
                            service: true,
                        },
                    },
                    slot: true,
                    events: {
                        orderBy: { createdAt: 'desc' },
                    },
                },
            });
            if (!booking) {
                throw new common_1.NotFoundException(`Booking ${bookingId} not found`);
            }
            return booking;
        });
    }
    async findAll(tenantId, filters) {
        return this.prisma.withTenant(tenantId, async (prisma) => {
            const where = {
                tenantId,
                ...(filters?.status && { status: filters.status }),
                ...(filters?.customerId && { customerId: filters.customerId }),
                ...(filters?.fromDate &&
                    filters?.toDate && {
                    scheduledDate: {
                        gte: filters.fromDate,
                        lte: filters.toDate,
                    },
                }),
            };
            const [bookings, total] = await Promise.all([
                prisma.booking.findMany({
                    where,
                    include: {
                        customer: true,
                        vehicle: true,
                        services: {
                            include: {
                                service: true,
                            },
                        },
                        slot: true,
                    },
                    orderBy: { scheduledDate: 'asc' },
                    take: filters?.limit || 50,
                    skip: filters?.offset || 0,
                }),
                prisma.booking.count({ where }),
            ]);
            return { bookings, total };
        });
    }
    async updateBooking(tenantId, bookingId, dto) {
        return this.prisma.withTenant(tenantId, async (prisma) => {
            const existing = await prisma.booking.findFirst({
                where: { id: bookingId, tenantId },
            });
            if (!existing) {
                throw new common_1.NotFoundException(`Booking ${bookingId} not found`);
            }
            const booking = await prisma.booking.update({
                where: { id: bookingId },
                data: {
                    ...(dto.status && { status: dto.status }),
                    ...(dto.scheduledDate && { scheduledDate: new Date(dto.scheduledDate) }),
                    ...(dto.notes && { notes: dto.notes }),
                },
                include: {
                    customer: true,
                    vehicle: true,
                    services: {
                        include: {
                            service: true,
                        },
                    },
                    slot: true,
                },
            });
            await prisma.bookingEvent.create({
                data: {
                    eventType: 'booking_updated',
                    payload: { ...dto },
                    booking: { connect: { id: booking.id } },
                },
            });
            this.eventEmitter.emit('booking.updated', {
                bookingId: booking.id,
                tenantId,
                changes: dto,
            });
            return booking;
        });
    }
    async cancelBooking(tenantId, bookingId, reason) {
        return this.prisma.withTenant(tenantId, async (prisma) => {
            const booking = await prisma.booking.findFirst({
                where: { id: bookingId, tenantId },
                include: { slot: true },
            });
            if (!booking) {
                throw new common_1.NotFoundException(`Booking ${bookingId} not found`);
            }
            const updated = await prisma.booking.update({
                where: { id: bookingId },
                data: { status: client_1.BookingStatus.CANCELLED },
                include: {
                    customer: true,
                    vehicle: true,
                    slot: true,
                },
            });
            if (booking.slot) {
                await prisma.bookingSlot.update({
                    where: { id: booking.slot.id },
                    data: { status: 'AVAILABLE' },
                });
            }
            await prisma.bookingEvent.create({
                data: {
                    eventType: 'booking_cancelled',
                    payload: { reason },
                    booking: { connect: { id: bookingId } },
                },
            });
            this.eventEmitter.emit('booking.cancelled', {
                bookingId,
                tenantId,
                reason,
            });
            return updated;
        });
    }
    async getStats(tenantId, fromDate, toDate) {
        return this.prisma.withTenant(tenantId, async (prisma) => {
            const dateFilter = fromDate && toDate
                ? {
                    scheduledDate: {
                        gte: fromDate,
                        lte: toDate,
                    },
                }
                : {};
            const [totalBookings, statusCounts, sourceCounts] = await Promise.all([
                prisma.booking.count({
                    where: { tenantId, ...dateFilter },
                }),
                prisma.booking.groupBy({
                    by: ['status'],
                    where: { tenantId, ...dateFilter },
                    _count: { status: true },
                }),
                prisma.booking.groupBy({
                    by: ['source'],
                    where: { tenantId, ...dateFilter },
                    _count: { source: true },
                }),
            ]);
            return {
                total: totalBookings,
                byStatus: statusCounts.reduce((acc, curr) => ({
                    ...acc,
                    [curr.status]: curr._count.status,
                }), {}),
                bySource: sourceCounts.reduce((acc, curr) => ({
                    ...acc,
                    [curr.source]: curr._count.source,
                }), {}),
            };
        });
    }
};
exports.BookingService = BookingService;
exports.BookingService = BookingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2,
        queue_service_1.QueueService,
        logger_service_1.LoggerService])
], BookingService);
