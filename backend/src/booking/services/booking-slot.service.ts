import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { BookingSlot, Prisma, SlotStatus } from '@prisma/client';
import { PrismaService } from '@common/services/prisma.service';
import { LoggerService } from '@common/services/logger.service';
import { CreateSlotDto } from '../dto/booking-slot.dto';

type SlotWithBooking = Prisma.BookingSlotGetPayload<{
  include: { booking: { include: { customer: true; vehicle: true } } };
}>;

interface DayAvailability {
  date: string;
  totalSlots: number;
  availableSlots: number;
  bookedSlots: number;
  blockedSlots: number;
}

@Injectable()
export class BookingSlotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Find available slots for a date range
   */
  async findAvailableSlots(
    tenantId: string,
    date: string,
    duration?: number,
  ): Promise<BookingSlot[]> {
    return this.prisma.withTenant(tenantId, async prisma => {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const slots = await prisma.bookingSlot.findMany({
        where: {
          tenantId,
          status: SlotStatus.AVAILABLE,
          startTime: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        orderBy: {
          startTime: 'asc',
        },
      });

      // Filter by duration if specified
      if (duration) {
        return slots.filter(slot => {
          const slotDuration = (slot.endTime.getTime() - slot.startTime.getTime()) / 60000;
          return slotDuration >= duration;
        });
      }

      return slots;
    });
  }

  /**
   * Create a new booking slot
   */
  async createSlot(tenantId: string, dto: CreateSlotDto): Promise<BookingSlot> {
    return this.prisma.withTenant(tenantId, async prisma => {
      const startTime = new Date(dto.startTime);
      const endTime = new Date(dto.endTime);

      // Validate times
      if (startTime >= endTime) {
        throw new BadRequestException('End time must be after start time');
      }

      // Check for overlapping slots
      const overlapping = await prisma.bookingSlot.findFirst({
        where: {
          tenantId,
          OR: [
            {
              // New slot starts during existing slot
              startTime: { lte: startTime },
              endTime: { gt: startTime },
            },
            {
              // New slot ends during existing slot
              startTime: { lt: endTime },
              endTime: { gte: endTime },
            },
            {
              // New slot completely contains existing slot
              startTime: { gte: startTime },
              endTime: { lte: endTime },
            },
          ],
        },
      });

      if (overlapping) {
        throw new BadRequestException(
          `Slot overlaps with existing slot (${overlapping.startTime.toISOString()} - ${overlapping.endTime.toISOString()})`,
        );
      }

      const slot = await prisma.bookingSlot.create({
        data: {
          startTime,
          endTime,
          status: SlotStatus.AVAILABLE,
          tenant: { connect: { id: tenantId } },
        },
      });

      this.logger.log(`Created slot ${slot.id} for tenant ${tenantId}`);

      return slot;
    });
  }

  /**
   * Create multiple slots for a date range
   */
  async createSlotsForDateRange(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    slotDurationMinutes: number = 60,
    workingHours: { start: number; end: number } = { start: 9, end: 18 },
  ): Promise<number> {
    return this.prisma.withTenant(tenantId, async prisma => {
      const slots: Prisma.BookingSlotCreateManyInput[] = [];

      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        // Skip weekends
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }

        // Create slots for working hours
        for (let hour = workingHours.start; hour < workingHours.end; hour++) {
          const slotStart = new Date(currentDate);
          slotStart.setHours(hour, 0, 0, 0);

          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotStart.getMinutes() + slotDurationMinutes);

          slots.push({
            startTime: slotStart,
            endTime: slotEnd,
            status: SlotStatus.AVAILABLE,
            tenantId,
          });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Bulk create slots
      const result = await prisma.bookingSlot.createMany({
        data: slots,
        skipDuplicates: true,
      });

      this.logger.log(
        `Created ${result.count} slots for tenant ${tenantId} from ${startDate.toISOString()} to ${endDate.toISOString()}`,
      );

      return result.count;
    });
  }

  /**
   * Get slot by ID
   */
  async findById(tenantId: string, slotId: string): Promise<SlotWithBooking> {
    return this.prisma.withTenant(tenantId, async prisma => {
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
        throw new NotFoundException(`Slot ${slotId} not found`);
      }

      return slot;
    });
  }

  /**
   * Update slot status
   */
  async updateSlotStatus(
    tenantId: string,
    slotId: string,
    status: SlotStatus,
  ): Promise<BookingSlot> {
    return this.prisma.withTenant(tenantId, async prisma => {
      const slot = await prisma.bookingSlot.findFirst({
        where: { id: slotId, tenantId },
      });

      if (!slot) {
        throw new NotFoundException(`Slot ${slotId} not found`);
      }

      const updated = await prisma.bookingSlot.update({
        where: { id: slotId },
        data: { status },
      });

      this.logger.log(`Updated slot ${slotId} status to ${status}`);

      return updated;
    });
  }

  /**
   * Block a slot (e.g., for lunch break, maintenance)
   */
  async blockSlot(tenantId: string, slotId: string, reason?: string): Promise<BookingSlot> {
    return this.prisma.withTenant(tenantId, async prisma => {
      const slot = await prisma.bookingSlot.findFirst({
        where: { id: slotId, tenantId },
      });

      if (!slot) {
        throw new NotFoundException(`Slot ${slotId} not found`);
      }

      if (slot.status === SlotStatus.BOOKED) {
        throw new BadRequestException('Cannot block a booked slot');
      }

      const updated = await prisma.bookingSlot.update({
        where: { id: slotId },
        data: { status: SlotStatus.BLOCKED },
      });

      this.logger.log(`Blocked slot ${slotId}. Reason: ${reason || 'Not specified'}`);

      return updated;
    });
  }

  /**
   * Delete a slot
   */
  async deleteSlot(tenantId: string, slotId: string): Promise<void> {
    return this.prisma.withTenant(tenantId, async prisma => {
      const slot = await prisma.bookingSlot.findFirst({
        where: { id: slotId, tenantId },
      });

      if (!slot) {
        throw new NotFoundException(`Slot ${slotId} not found`);
      }

      if (slot.status === SlotStatus.BOOKED) {
        throw new BadRequestException('Cannot delete a booked slot');
      }

      await prisma.bookingSlot.delete({
        where: { id: slotId },
      });

      this.logger.log(`Deleted slot ${slotId}`);
    });
  }

  /**
   * Get slot availability for a date range
   */
  async getAvailabilityForRange(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DayAvailability[]> {
    return this.prisma.withTenant(tenantId, async prisma => {
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

      // Group by date
      const grouped = slots.reduce(
        (acc, slot) => {
          const date = slot.startTime.toISOString().split('T')[0];
          // eslint-disable-next-line security/detect-object-injection
          if (!acc[date]) {
            // eslint-disable-next-line security/detect-object-injection
            acc[date] = {
              date,
              totalSlots: 0,
              availableSlots: 0,
              bookedSlots: 0,
              blockedSlots: 0,
            };
          }

          // eslint-disable-next-line security/detect-object-injection
          acc[date].totalSlots++;
          if (slot.status === SlotStatus.AVAILABLE) {
            // eslint-disable-next-line security/detect-object-injection
            acc[date].availableSlots++;
          } else if (slot.status === SlotStatus.BOOKED) {
            // eslint-disable-next-line security/detect-object-injection
            acc[date].bookedSlots++;
          } else if (slot.status === SlotStatus.BLOCKED) {
            // eslint-disable-next-line security/detect-object-injection
            acc[date].blockedSlots++;
          }

          return acc;
        },
        {} as Record<string, DayAvailability>,
      );

      return Object.values(grouped);
    });
  }
}
