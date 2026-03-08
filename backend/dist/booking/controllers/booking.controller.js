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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const booking_service_1 = require("../services/booking.service");
const booking_slot_service_1 = require("../services/booking-slot.service");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../auth/guards/roles.guard");
const roles_decorator_1 = require("../../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../../auth/decorators/current-user.decorator");
const create_booking_dto_1 = require("../dto/create-booking.dto");
const booking_slot_dto_1 = require("../dto/booking-slot.dto");
let BookingController = class BookingController {
    constructor(bookingService, slotService) {
        this.bookingService = bookingService;
        this.slotService = slotService;
    }
    async reserveSlot(tenantId, dto) {
        const result = await this.bookingService.reserveSlot(tenantId, dto);
        if (!result.success && result.conflict) {
            throw new common_1.ConflictException({
                message: result.message,
                retryInfo: {
                    retryAfter: result.retryAfter,
                    queuePosition: result.queuePosition,
                },
            });
        }
        return {
            success: true,
            data: result.booking,
        };
    }
    async createBooking(tenantId, dto) {
        const booking = await this.bookingService.createBooking(tenantId, dto);
        return {
            success: true,
            data: booking,
        };
    }
    async getBookings(tenantId, status, customerId, fromDate, toDate, limit, offset) {
        const result = await this.bookingService.findAll(tenantId, {
            status: status,
            customerId,
            fromDate: fromDate ? new Date(fromDate) : undefined,
            toDate: toDate ? new Date(toDate) : undefined,
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined,
        });
        return {
            success: true,
            data: result.bookings,
            meta: {
                total: result.total,
                limit: limit ? parseInt(limit) : 50,
                offset: offset ? parseInt(offset) : 0,
            },
        };
    }
    async getBooking(tenantId, bookingId) {
        const booking = await this.bookingService.findById(tenantId, bookingId);
        return {
            success: true,
            data: booking,
        };
    }
    async updateBooking(tenantId, bookingId, dto) {
        const booking = await this.bookingService.updateBooking(tenantId, bookingId, dto);
        return {
            success: true,
            data: booking,
        };
    }
    async cancelBooking(tenantId, bookingId, reason) {
        const booking = await this.bookingService.cancelBooking(tenantId, bookingId, reason);
        return {
            success: true,
            data: booking,
            message: 'Booking cancelled successfully',
        };
    }
    async getStats(tenantId, fromDate, toDate) {
        const stats = await this.bookingService.getStats(tenantId, fromDate ? new Date(fromDate) : undefined, toDate ? new Date(toDate) : undefined);
        return {
            success: true,
            data: stats,
        };
    }
    async getAvailableSlots(tenantId, query) {
        const slots = await this.slotService.findAvailableSlots(tenantId, query.date, query.duration);
        return {
            success: true,
            data: slots,
            meta: {
                date: query.date,
                availableCount: slots.length,
            },
        };
    }
    async createSlot(tenantId, dto) {
        const slot = await this.slotService.createSlot(tenantId, dto);
        return {
            success: true,
            data: slot,
        };
    }
    async getSlot(tenantId, slotId) {
        const slot = await this.slotService.findById(tenantId, slotId);
        return {
            success: true,
            data: slot,
        };
    }
    async blockSlot(tenantId, slotId, reason) {
        const slot = await this.slotService.blockSlot(tenantId, slotId, reason);
        return {
            success: true,
            data: slot,
            message: 'Slot blocked successfully',
        };
    }
    async deleteSlot(tenantId, slotId) {
        await this.slotService.deleteSlot(tenantId, slotId);
        return {
            success: true,
            message: 'Slot deleted successfully',
        };
    }
};
exports.BookingController = BookingController;
__decorate([
    (0, common_1.Post)('reserve'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.RECEPTIONIST, roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Reserve a booking slot',
        description: 'Creates a booking with advisory lock for race condition prevention',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Booking created successfully',
        type: create_booking_dto_1.BookingResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 409,
        description: 'Slot conflict - queued for retry',
        type: create_booking_dto_1.ConflictResponseDto,
    }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_booking_dto_1.ReserveSlotDto]),
    __metadata("design:returntype", Promise)
], BookingController.prototype, "reserveSlot", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.RECEPTIONIST, roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new booking' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Booking created successfully',
        type: create_booking_dto_1.BookingResponseDto,
    }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_booking_dto_1.CreateBookingDto]),
    __metadata("design:returntype", Promise)
], BookingController.prototype, "createBooking", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.MECHANIC, roles_guard_1.UserRole.RECEPTIONIST, roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get all bookings' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, enum: ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] }),
    (0, swagger_1.ApiQuery)({ name: 'customerId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'fromDate', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'toDate', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'offset', required: false, type: Number }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('customerId')),
    __param(3, (0, common_1.Query)('fromDate')),
    __param(4, (0, common_1.Query)('toDate')),
    __param(5, (0, common_1.Query)('limit')),
    __param(6, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], BookingController.prototype, "getBookings", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.MECHANIC, roles_guard_1.UserRole.RECEPTIONIST, roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get booking by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Booking ID' }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], BookingController.prototype, "getBooking", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.RECEPTIONIST, roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Update booking' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Booking ID' }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, create_booking_dto_1.UpdateBookingDto]),
    __metadata("design:returntype", Promise)
], BookingController.prototype, "updateBooking", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel booking' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Booking ID' }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)('reason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], BookingController.prototype, "cancelBooking", null);
__decorate([
    (0, common_1.Get)('stats/overview'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get booking statistics' }),
    (0, swagger_1.ApiQuery)({ name: 'fromDate', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'toDate', required: false }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)('fromDate')),
    __param(2, (0, common_1.Query)('toDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], BookingController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('slots/available'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.RECEPTIONIST, roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get available slots for a date' }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, booking_slot_dto_1.FindAvailableSlotsDto]),
    __metadata("design:returntype", Promise)
], BookingController.prototype, "getAvailableSlots", null);
__decorate([
    (0, common_1.Post)('slots'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new booking slot' }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, booking_slot_dto_1.CreateSlotDto]),
    __metadata("design:returntype", Promise)
], BookingController.prototype, "createSlot", null);
__decorate([
    (0, common_1.Get)('slots/:id'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.RECEPTIONIST, roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get slot by ID' }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], BookingController.prototype, "getSlot", null);
__decorate([
    (0, common_1.Patch)('slots/:id/block'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.MANAGER, roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Block a slot' }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)('reason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], BookingController.prototype, "blockSlot", null);
__decorate([
    (0, common_1.Delete)('slots/:id'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a slot' }),
    __param(0, (0, current_user_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], BookingController.prototype, "deleteSlot", null);
exports.BookingController = BookingController = __decorate([
    (0, swagger_1.ApiTags)('Bookings'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('v1/bookings'),
    __metadata("design:paramtypes", [booking_service_1.BookingService,
        booking_slot_service_1.BookingSlotService])
], BookingController);
