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
exports.BookingSlotService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../common/services/prisma.service");
const logger_service_1 = require("../../common/services/logger.service");
let BookingSlotService = class BookingSlotService {
    constructor(prisma, logger) {
        this.prisma = prisma;
        this.logger = logger;
    }
    async findAvailableSlots(tenantId, date, duration) {
        return this.prisma.withTenant(tenantId, async (prisma) => {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            const slots = await prisma.bookingSlot.findMany({
                where: {
                    tenantId,
                    status: client_1.SlotStatus.AVAILABLE,
                    startTime: {
                        gte: startOfDay,
                        lte: endOfDay,
                    },
                },
                orderBy: {
                    startTime: 'asc',
                },
            });
            if (duration) {
                return slots.filter((slot) => {
                    const slotDuration = (slot.endTime.getTime() - slot.startTime.getTime()) / 60000;
                    return slotDuration >= duration;
                });
            }
            return slots;
        });
    }
    async createSlot(tenantId, dto) {
        return this.prisma.withTenant(tenantId, async (prisma) => {
            const startTime = new Date(dto.startTime);
            const endTime = new Date(dto.endTime);
            if (startTime >= endTime) {
                throw new common_1.BadRequestException('End time must be after start time');
            }
            const overlapping = await prisma.bookingSlot.findFirst({
                where: {
                    tenantId,
                    OR: [
                        {
                            startTime: { lte: startTime },
                            endTime: { gt: startTime },
                        },
                        {
                            startTime: { lt: endTime },
                            endTime: { gte: endTime },
                        },
                        {
                            startTime: { gte: startTime },
                            endTime: { lte: endTime },
                        },
                    ],
                },
            });
            if (overlapping) {
                throw new common_1.BadRequestException(`Slot overlaps with existing slot (${overlapping.startTime.toISOString()} - ${overlapping.endTime.toISOString()})`);
            }
            const slot = await prisma.bookingSlot.create({
                data: {
                    startTime,
                    endTime,
                    status: client_1.SlotStatus.AVAILABLE,
                    tenant: { connect: { id: tenantId } },
                },
            });
            this.logger.log(`Created slot ${slot.id} for tenant ${tenantId}`);
            return slot;
        });
    }
    async createSlotsForDateRange(tenantId, startDate, endDate, slotDurationMinutes = 60, workingHours = { start: 9, end: 18 }) {
        return this.prisma.withTenant(tenantId, async (prisma) => {
            const slots = [];
            const currentDate = new Date(startDate);
            while (currentDate <= endDate) {
                const dayOfWeek = currentDate.getDay();
                if (dayOfWeek === 0 || dayOfWeek === 6) {
                    currentDate.setDate(currentDate.getDate() + 1);
                    continue;
                }
                for (let hour = workingHours.start; hour < workingHours.end; hour++) {
                    const slotStart = new Date(currentDate);
                    slotStart.setHours(hour, 0, 0, 0);
                    const slotEnd = new Date(slotStart);
                    slotEnd.setMinutes(slotStart.getMinutes() + slotDurationMinutes);
                    slots.push({
                        startTime: slotStart,
                        endTime: slotEnd,
                        status: client_1.SlotStatus.AVAILABLE,
                        tenantId,
                    });
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
            const result = await prisma.bookingSlot.createMany({
                data: slots,
                skipDuplicates: true,
            });
            this.logger.log(`Created ${result.count} slots for tenant ${tenantId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);
            return result.count;
        });
    }
    async findById(tenantId, slotId) {
        return this.prisma.withTenant(tenantId, async (prisma) => {
            const slot = await prisma.bookingSlot.findFirst({
                where: {
                    id: slotId,
                    tenantId,
                },
                include: {
                    booking: {
                        include: {
                            customer: true,
                            vehicle: true,
                        },
                    },
                },
            });
            if (!slot) {
                throw new common_1.NotFoundException(`Slot ${slotId} not found`);
            }
            return slot;
        });
    }
    async updateSlotStatus(tenantId, slotId, status) {
        return this.prisma.withTenant(tenantId, async (prisma) => {
            const slot = await prisma.bookingSlot.findFirst({
                where: { id: slotId, tenantId },
            });
            if (!slot) {
                throw new common_1.NotFoundException(`Slot ${slotId} not found`);
            }
            const updated = await prisma.bookingSlot.update({
                where: { id: slotId },
                data: { status },
            });
            this.logger.log(`Updated slot ${slotId} status to ${status}`);
            return updated;
        });
    }
    async blockSlot(tenantId, slotId, reason) {
        return this.prisma.withTenant(tenantId, async (prisma) => {
            const slot = await prisma.bookingSlot.findFirst({
                where: { id: slotId, tenantId },
            });
            if (!slot) {
                throw new common_1.NotFoundException(`Slot ${slotId} not found`);
            }
            if (slot.status === client_1.SlotStatus.BOOKED) {
                throw new common_1.BadRequestException('Cannot block a booked slot');
            }
            const updated = await prisma.bookingSlot.update({
                where: { id: slotId },
                data: { status: client_1.SlotStatus.BLOCKED },
            });
            this.logger.log(`Blocked slot ${slotId}. Reason: ${reason || 'Not specified'}`);
            return updated;
        });
    }
    async deleteSlot(tenantId, slotId) {
        return this.prisma.withTenant(tenantId, async (prisma) => {
            const slot = await prisma.bookingSlot.findFirst({
                where: { id: slotId, tenantId },
            });
            if (!slot) {
                throw new common_1.NotFoundException(`Slot ${slotId} not found`);
            }
            if (slot.status === client_1.SlotStatus.BOOKED) {
                throw new common_1.BadRequestException('Cannot delete a booked slot');
            }
            await prisma.bookingSlot.delete({
                where: { id: slotId },
            });
            this.logger.log(`Deleted slot ${slotId}`);
        });
    }
    async getAvailabilityForRange(tenantId, startDate, endDate) {
        return this.prisma.withTenant(tenantId, async (prisma) => {
            const slots = await prisma.bookingSlot.findMany({
                where: {
                    tenantId,
                    startTime: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
                orderBy: {
                    startTime: 'asc',
                },
            });
            const grouped = slots.reduce((acc, slot) => {
                const date = slot.startTime.toISOString().split('T')[0];
                if (!acc[date]) {
                    acc[date] = {
                        date,
                        totalSlots: 0,
                        availableSlots: 0,
                        bookedSlots: 0,
                        blockedSlots: 0,
                    };
                }
                acc[date].totalSlots++;
                if (slot.status === client_1.SlotStatus.AVAILABLE) {
                    acc[date].availableSlots++;
                }
                else if (slot.status === client_1.SlotStatus.BOOKED) {
                    acc[date].bookedSlots++;
                }
                else if (slot.status === client_1.SlotStatus.BLOCKED) {
                    acc[date].blockedSlots++;
                }
                return acc;
            }, {});
            return Object.values(grouped);
        });
    }
};
exports.BookingSlotService = BookingSlotService;
exports.BookingSlotService = BookingSlotService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        logger_service_1.LoggerService])
], BookingSlotService);
