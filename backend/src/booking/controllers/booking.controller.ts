import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ConflictException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { BookingService } from '../services/booking.service';
import { BookingSlotService } from '../services/booking-slot.service';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard, UserRole } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';
import { CurrentTenant } from '@auth/decorators/current-user.decorator';
import {
  CreateBookingDto,
  ReserveSlotDto,
  UpdateBookingDto,
  BookingResponseDto,
  ConflictResponseDto,
  CalendarQueryDto,
} from '../dto/create-booking.dto';
import { RescheduleBookingDto } from '../dto/reschedule-booking.dto';
import { FindAvailableSlotsDto, CreateSlotDto } from '../dto/booking-slot.dto';
import { BookingStatus } from '@prisma/client';

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bookings')
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly slotService: BookingSlotService,
  ) {}

  // ==================== BOOKING ENDPOINTS ====================

  @Post('reserve')
  @Roles(UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Reserve a booking slot',
    description: 'Creates a booking with advisory lock for race condition prevention',
  })
  @ApiResponse({
    status: 201,
    description: 'Booking created successfully',
    type: BookingResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Slot conflict - queued for retry',
    type: ConflictResponseDto,
  })
  async reserveSlot(@CurrentTenant() tenantId: string, @Body() dto: ReserveSlotDto) {
    const result = await this.bookingService.reserveSlot(tenantId, dto);

    if (!result.success && result.conflict) {
      throw new ConflictException({
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

  @Post()
  @Roles(UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiResponse({
    status: 201,
    description: 'Booking created successfully',
    type: BookingResponseDto,
  })
  async createBooking(@CurrentTenant() tenantId: string, @Body() dto: CreateBookingDto) {
    const booking = await this.bookingService.createBooking(tenantId, dto);
    return {
      success: true,
      data: booking,
    };
  }

  @Get('calendar')
  @Roles(UserRole.MECHANIC, UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get bookings formatted for calendar view',
    description:
      'Returns bookings within a date range, formatted with title, color, and bay info for calendar rendering',
  })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO string)' })
  @ApiQuery({ name: 'bayId', required: false, description: 'Filter by lift/bay position' })
  @ApiResponse({
    status: 200,
    description: 'Calendar events returned successfully',
  })
  async getCalendarBookings(@CurrentTenant() tenantId: string, @Query() query: CalendarQueryDto) {
    const { from, to, bayId } = query;
    const statusColorMap: Record<string, string> = {
      PENDING: '#f59e0b',
      CONFIRMED: '#3b82f6',
      CHECKED_IN: '#8b5cf6',
      IN_PROGRESS: '#f97316',
      COMPLETED: '#22c55e',
      CANCELLED: '#ef4444',
      NO_SHOW: '#6b7280',
    };

    const result = await this.bookingService.findAll(tenantId, {
      fromDate: new Date(from),
      toDate: new Date(to),
      limit: 1000,
      offset: 0,
    });

    let bookings = result.bookings;

    if (bayId) {
      bookings = bookings.filter(b => b.liftPosition === bayId);
    }

    const events = bookings.map(booking => {
      const vehicleInfo = booking.vehicle
        ? `${booking.vehicle.make ?? ''} ${booking.vehicle.model ?? ''}`.trim()
        : '';
      const plateInfo = booking.vehicle?.licensePlate ?? '';
      const title = vehicleInfo
        ? plateInfo
          ? `${plateInfo} - ${vehicleInfo}`
          : vehicleInfo
        : plateInfo || `Booking #${booking.id.slice(0, 8)}`;

      const endDate = new Date(booking.scheduledDate);
      endDate.setMinutes(endDate.getMinutes() + booking.durationMinutes);

      return {
        id: booking.id,
        title,
        start: booking.scheduledDate,
        end: endDate,
        status: booking.status,
        color: statusColorMap[booking.status] || '#6b7280',
        bayId: booking.liftPosition || null,
        customerId: booking.customerId || null,
      };
    });

    return {
      success: true,
      data: events,
      meta: {
        total: events.length,
        from,
        to,
      },
    };
  }

  @Get()
  @Roles(UserRole.MECHANIC, UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all bookings' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
  })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getBookings(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;
    const result = await this.bookingService.findAll(tenantId, {
      status: status as BookingStatus | undefined,
      customerId,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      limit: Number.isNaN(parsedLimit) ? 50 : parsedLimit,
      offset: Number.isNaN(parsedOffset) ? 0 : parsedOffset,
    });

    return {
      success: true,
      data: result.bookings,
      meta: {
        total: result.total,
        limit: Number.isNaN(parsedLimit) ? 50 : parsedLimit,
        offset: Number.isNaN(parsedOffset) ? 0 : parsedOffset,
      },
    };
  }

  @Get(':id')
  @Roles(UserRole.MECHANIC, UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get booking by ID' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  async getBooking(@CurrentTenant() tenantId: string, @Param('id') bookingId: string) {
    const booking = await this.bookingService.findById(tenantId, bookingId);
    return {
      success: true,
      data: booking,
    };
  }

  @Patch(':id')
  @Roles(UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update booking' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  async updateBooking(
    @CurrentTenant() tenantId: string,
    @Param('id') bookingId: string,
    @Body() dto: UpdateBookingDto,
  ) {
    const booking = await this.bookingService.updateBooking(tenantId, bookingId, dto);
    return {
      success: true,
      data: booking,
    };
  }

  @Patch(':id/reschedule')
  @Roles(UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Reschedule a booking',
    description:
      'Updates the scheduled date and optionally moves to a new slot. Only PENDING and CONFIRMED bookings can be rescheduled.',
  })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({
    status: 200,
    description: 'Booking rescheduled successfully',
    type: BookingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Booking cannot be rescheduled (invalid status)',
  })
  @ApiResponse({
    status: 404,
    description: 'Booking or slot not found',
  })
  @ApiResponse({
    status: 409,
    description: 'New slot is not available',
  })
  async rescheduleBooking(
    @CurrentTenant() tenantId: string,
    @Param('id') bookingId: string,
    @Body() dto: RescheduleBookingDto,
  ) {
    const booking = await this.bookingService.rescheduleBooking(tenantId, bookingId, dto);
    return {
      success: true,
      data: booking,
      message: 'Booking rescheduled successfully',
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Cancel booking' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  async cancelBooking(
    @CurrentTenant() tenantId: string,
    @Param('id') bookingId: string,
    @Query('reason') reason?: string,
  ) {
    const booking = await this.bookingService.cancelBooking(tenantId, bookingId, reason);
    return {
      success: true,
      data: booking,
      message: 'Booking cancelled successfully',
    };
  }

  @Get('stats/overview')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get booking statistics' })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  async getStats(
    @CurrentTenant() tenantId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const stats = await this.bookingService.getStats(
      tenantId,
      fromDate ? new Date(fromDate) : undefined,
      toDate ? new Date(toDate) : undefined,
    );
    return {
      success: true,
      data: stats,
    };
  }

  // ==================== SLOT ENDPOINTS ====================

  @Get('slots/available')
  @Roles(UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get available slots for a date' })
  async getAvailableSlots(
    @CurrentTenant() tenantId: string,
    @Query() query: FindAvailableSlotsDto,
  ) {
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

  @Post('slots')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new booking slot' })
  async createSlot(@CurrentTenant() tenantId: string, @Body() dto: CreateSlotDto) {
    const slot = await this.slotService.createSlot(tenantId, dto);
    return {
      success: true,
      data: slot,
    };
  }

  @Get('slots/:id')
  @Roles(UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get slot by ID' })
  async getSlot(@CurrentTenant() tenantId: string, @Param('id') slotId: string) {
    const slot = await this.slotService.findById(tenantId, slotId);
    return {
      success: true,
      data: slot,
    };
  }

  @Patch('slots/:id/block')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Block a slot' })
  async blockSlot(
    @CurrentTenant() tenantId: string,
    @Param('id') slotId: string,
    @Query('reason') reason?: string,
  ) {
    const slot = await this.slotService.blockSlot(tenantId, slotId, reason);
    return {
      success: true,
      data: slot,
      message: 'Slot blocked successfully',
    };
  }

  @Delete('slots/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a slot' })
  async deleteSlot(@CurrentTenant() tenantId: string, @Param('id') slotId: string) {
    await this.slotService.deleteSlot(tenantId, slotId);
    return {
      success: true,
      message: 'Slot deleted successfully',
    };
  }
}
