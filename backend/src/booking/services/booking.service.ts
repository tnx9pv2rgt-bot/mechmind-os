import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@common/services/prisma.service';
import { QueueService } from '@common/services/queue.service';
import { LoggerService } from '@common/services/logger.service';
import { CreateBookingDto, ReserveSlotDto, UpdateBookingDto } from '../dto/create-booking.dto';

const bookingInclude = {
  customer: true,
  vehicle: true,
  services: { include: { service: true } },
  slot: true,
} as const;

type BookingWithRelations = Prisma.BookingGetPayload<{
  include: typeof bookingInclude;
}>;

type BookingWithRelationsAndEvents = Prisma.BookingGetPayload<{
  include: {
    customer: true;
    vehicle: true;
    services: { include: { service: true } };
    slot: true;
    events: true;
  };
}>;

type BookingWithSlot = Prisma.BookingGetPayload<{
  include: { customer: true; vehicle: true; slot: true };
}>;

export interface BookingReservationResult {
  success: boolean;
  booking?: BookingWithRelations;
  conflict?: boolean;
  retryAfter?: number;
  queuePosition?: number;
  message?: string;
}

export class BookingCreatedEvent {
  constructor(
    public readonly bookingId: string,
    public readonly tenantId: string,
    public readonly customerId: string,
    public readonly scheduledDate: Date,
    public readonly source: string,
  ) {}
}

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly queueService: QueueService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Reserve a booking slot with advisory lock and serializable transaction
   * Implements race condition prevention as per spec
   */
  async reserveSlot(tenantId: string, dto: ReserveSlotDto): Promise<BookingReservationResult> {
    const { slotId, customerId, vehicleId, serviceIds, notes } = dto;

    this.logger.log(`Attempting to reserve slot ${slotId} for tenant ${tenantId}`);

    // Step 1: Try to acquire advisory lock
    const lockAcquired = await this.prisma.acquireAdvisoryLock(tenantId, slotId);

    if (!lockAcquired) {
      this.logger.warn(`Could not acquire lock for slot ${slotId}`);

      // Queue for retry
      await this.queueService.addBookingJob(
        'reserve-slot-retry',
        {
          type: 'reserve-slot-retry',
          payload: dto,
          tenantId,
        },
        { delay: 5000 },
      );

      return {
        success: false,
        conflict: true,
        retryAfter: 5000,
        queuePosition: 1, // Would calculate from queue in production
        message: 'Slot is currently being reserved by another request. Queued for retry.',
      };
    }

    try {
      // Step 2-9: Execute booking creation in SERIALIZABLE transaction
      const result = await this.prisma.withSerializableTransaction(
        async tx => {
          // Step 4: Validate slot is available
          const slot = await tx.bookingSlot.findFirst({
            where: {
              id: slotId,
              tenantId,
            },
          });

          if (!slot) {
            throw new NotFoundException(`Slot ${slotId} not found`);
          }

          if (slot.status !== 'AVAILABLE') {
            throw new ConflictException(`Slot is not available (status: ${slot.status})`);
          }

          // Validate customer exists
          const customer = await tx.customer.findFirst({
            where: {
              id: customerId,
              tenantId,
            },
          });

          if (!customer) {
            throw new NotFoundException(`Customer ${customerId} not found`);
          }

          // Step 5: Insert booking event
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
                  id: 'temp', // Will be updated after booking creation
                },
              },
            },
          });

          // Step 6: Update slot status
          await tx.bookingSlot.update({
            where: { id: slotId },
            data: { status: 'BOOKED' },
          });

          // Step 7: Create booking
          const booking = await tx.booking.create({
            data: {
              status: BookingStatus.CONFIRMED,
              scheduledDate: slot.startTime,
              durationMinutes: Math.round(
                (slot.endTime.getTime() - slot.startTime.getTime()) / 60000,
              ),
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
                    price: 0, // Will be updated from service
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

          // Update booking event with correct booking ID
          await tx.bookingEvent.update({
            where: { id: bookingEvent.id },
            data: {
              booking: { connect: { id: booking.id } },
            },
          });

          return booking;
        },
        { maxRetries: 3, retryDelay: 100 },
      );

      // Step 8: Publish event
      this.eventEmitter.emit(
        'booking.created',
        new BookingCreatedEvent(
          result.id,
          tenantId,
          customerId,
          result.scheduledDate,
          result.source,
        ),
      );

      this.logger.log(`Successfully created booking ${result.id}`);

      return {
        success: true,
        booking: result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create booking: ${errorMessage}`);

      if (error instanceof ConflictException || error instanceof NotFoundException) {
        throw error;
      }

      // Handle Prisma errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2034') {
          throw new ConflictException('Booking conflict detected. Please try again.');
        }
      }

      throw new BadRequestException(`Failed to create booking: ${errorMessage}`);
    } finally {
      // Step 10: Always release advisory lock
      await this.prisma.releaseAdvisoryLock(tenantId, slotId);
      this.logger.debug(`Released lock for slot ${slotId}`);
    }
  }

  /**
   * Create a new booking (without advisory lock - for internal use)
   */
  async createBooking(tenantId: string, dto: CreateBookingDto): Promise<BookingWithRelations> {
    const {
      customerId,
      vehicleId,
      slotId,
      scheduledDate,
      durationMinutes,
      notes,
      source,
      vapiCallId,
      technicianId,
      liftPosition,
    } = dto;

    return this.prisma.withTenant(tenantId, async prisma => {
      // Validate slot
      const slot = await prisma.bookingSlot.findUnique({
        where: { id: slotId },
      });

      if (!slot) {
        throw new NotFoundException(`Slot ${slotId} not found`);
      }

      // Create booking
      const booking = await prisma.booking.create({
        data: {
          status: BookingStatus.PENDING,
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

      // Update slot status
      await prisma.bookingSlot.update({
        where: { id: slotId },
        data: { status: 'BOOKED' },
      });

      // Create booking event
      await prisma.bookingEvent.create({
        data: {
          eventType: 'booking_created',
          payload: { ...dto } as unknown as Prisma.InputJsonValue,
          booking: { connect: { id: booking.id } },
        },
      });

      // Emit event
      this.eventEmitter.emit(
        'booking.created',
        new BookingCreatedEvent(
          booking.id,
          tenantId,
          customerId,
          booking.scheduledDate,
          booking.source,
        ),
      );

      return booking;
    });
  }

  /**
   * Find booking by ID
   */
  async findById(tenantId: string, bookingId: string): Promise<BookingWithRelationsAndEvents> {
    return this.prisma.withTenant(tenantId, async prisma => {
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
        throw new NotFoundException(`Booking ${bookingId} not found`);
      }

      return booking;
    });
  }

  /**
   * Find all bookings for tenant with filters
   */
  async findAll(
    tenantId: string,
    filters?: {
      status?: BookingStatus;
      customerId?: string;
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ bookings: BookingWithRelations[]; total: number }> {
    return this.prisma.withTenant(tenantId, async prisma => {
      const where: Prisma.BookingWhereInput = {
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

  /**
   * Update booking
   */
  async updateBooking(
    tenantId: string,
    bookingId: string,
    dto: UpdateBookingDto,
  ): Promise<BookingWithRelations> {
    return this.prisma.withTenant(tenantId, async prisma => {
      const existing = await prisma.booking.findFirst({
        where: { id: bookingId, tenantId },
      });

      if (!existing) {
        throw new NotFoundException(`Booking ${bookingId} not found`);
      }

      const booking = await prisma.booking.update({
        where: { id: bookingId },
        data: {
          ...(dto.status && { status: dto.status as BookingStatus }),
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

      // Create update event
      await prisma.bookingEvent.create({
        data: {
          eventType: 'booking_updated',
          payload: { ...dto } as unknown as Prisma.InputJsonValue,
          booking: { connect: { id: booking.id } },
        },
      });

      // Emit event
      this.eventEmitter.emit('booking.updated', {
        bookingId: booking.id,
        tenantId,
        changes: dto,
      });

      return booking;
    });
  }

  /**
   * Cancel booking
   */
  async cancelBooking(
    tenantId: string,
    bookingId: string,
    reason?: string,
  ): Promise<BookingWithSlot> {
    return this.prisma.withTenant(tenantId, async prisma => {
      const booking = await prisma.booking.findFirst({
        where: { id: bookingId, tenantId },
        include: { slot: true },
      });

      if (!booking) {
        throw new NotFoundException(`Booking ${bookingId} not found`);
      }

      // Update booking status
      const updated = await prisma.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CANCELLED },
        include: {
          customer: true,
          vehicle: true,
          slot: true,
        },
      });

      // Free up the slot
      if (booking.slot) {
        await prisma.bookingSlot.update({
          where: { id: booking.slot.id },
          data: { status: 'AVAILABLE' },
        });
      }

      // Create cancel event
      await prisma.bookingEvent.create({
        data: {
          eventType: 'booking_cancelled',
          payload: { reason },
          booking: { connect: { id: bookingId } },
        },
      });

      // Emit event
      this.eventEmitter.emit('booking.cancelled', {
        bookingId,
        tenantId,
        reason,
      });

      return updated;
    });
  }

  /**
   * Get booking statistics
   */
  async getStats(
    tenantId: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<{
    total: number;
    byStatus: Record<string, number>;
    bySource: Record<string, number>;
  }> {
    return this.prisma.withTenant(tenantId, async prisma => {
      const dateFilter =
        fromDate && toDate
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
        byStatus: statusCounts.reduce(
          (acc, curr) => ({
            ...acc,
            [curr.status]: curr._count.status,
          }),
          {},
        ),
        bySource: sourceCounts.reduce(
          (acc, curr) => ({
            ...acc,
            [curr.source]: curr._count.source,
          }),
          {},
        ),
      };
    });
  }
}
