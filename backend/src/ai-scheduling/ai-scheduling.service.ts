/**
 * MechMind OS - AI Smart Scheduling Service
 *
 * Suggests optimal appointment slots, optimizes daily schedules,
 * and forecasts capacity utilization. Logs all AI decisions
 * for EU AI Act compliance.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/services/prisma.service';
import { Prisma } from '@prisma/client';
import { SuggestSlotsDto, SuggestedSlot } from './dto/suggest-slots.dto';
import { OptimizeDayResult, ScheduleEntry, CapacityDay } from './dto/optimize-day.dto';

@Injectable()
export class AiSchedulingService {
  private readonly logger = new Logger(AiSchedulingService.name);
  private readonly aiProvider: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.aiProvider = this.config.get<string>('AI_PROVIDER', 'mock');
  }

  /**
   * Suggest top 3 optimal slots considering technician skills,
   * bay availability, and workload balance.
   */
  async suggestOptimalSlots(tenantId: string, dto: SuggestSlotsDto): Promise<SuggestedSlot[]> {
    const startTime = Date.now();

    // Gather scheduling data
    const targetDate = dto.preferredDate ? new Date(dto.preferredDate) : new Date();

    const dateFrom = new Date(targetDate);
    dateFrom.setHours(0, 0, 0, 0);
    const dateTo = new Date(targetDate);
    dateTo.setDate(dateTo.getDate() + 7);
    dateTo.setHours(23, 59, 59, 999);

    // Fetch available data in parallel
    const [technicians, bays, existingBookings] = await Promise.all([
      this.prisma.technician.findMany({
        where: {
          tenantId,
          isActive: true,
          ...(dto.requiredSkills && dto.requiredSkills.length > 0
            ? { skills: { hasSome: dto.requiredSkills } }
            : {}),
        },
      }),
      this.prisma.serviceBay.findMany({
        where: {
          shopFloor: { tenantId },
          status: 'AVAILABLE',
        },
      }),
      this.prisma.booking.findMany({
        where: {
          tenantId,
          scheduledDate: { gte: dateFrom, lte: dateTo },
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
          deletedAt: null,
        },
        include: { slot: true },
      }),
    ]);

    // Build slots using heuristic scoring
    const slots = this.computeOptimalSlots(technicians, bays, existingBookings, dto, dateFrom);

    // Log to AiDecisionLog for EU AI Act compliance
    await this.prisma.aiDecisionLog.create({
      data: {
        tenantId,
        featureName: 'SMART_SCHEDULING',
        modelUsed: this.aiProvider === 'mock' ? 'heuristic-scheduler-v1' : 'ai-scheduler',
        inputSummary: `Service: ${dto.serviceType} | Duration: ${dto.estimatedDuration}min | Skills: ${(dto.requiredSkills ?? []).join(', ')} | Preferred: ${dto.preferredDate ?? 'any'}`,
        outputSummary: `Suggested ${slots.length} slots | Top score: ${slots[0]?.score ?? 0}`,
        confidence:
          slots.length > 0 ? new Prisma.Decimal(slots[0].score / 100) : new Prisma.Decimal(0),
        entityType: 'scheduling',
        processingTimeMs: Date.now() - startTime,
      },
    });

    return slots;
  }

  /**
   * Optimize a day's schedule for maximum efficiency.
   */
  async optimizeDaySchedule(tenantId: string, date: string): Promise<OptimizeDayResult> {
    const startTime = Date.now();

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const bookings = await this.prisma.booking.findMany({
      where: {
        tenantId,
        scheduledDate: { gte: dayStart, lte: dayEnd },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        deletedAt: null,
      },
      include: {
        slot: true,
        services: { include: { service: true } },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    const technicians = await this.prisma.technician.findMany({
      where: { tenantId, isActive: true },
    });

    const techMap = new Map(technicians.map(t => [t.id, t.name]));

    // Build current order
    const currentOrder: ScheduleEntry[] = bookings.map(b => ({
      bookingId: b.id,
      startTime: b.slot.startTime.toISOString(),
      endTime: b.slot.endTime.toISOString(),
      serviceType: b.services[0]?.service?.name ?? 'Servizio generico',
      technicianId: b.technicianId ?? '',
      technicianName: b.technicianId ? (techMap.get(b.technicianId) ?? 'N/A') : 'Non assegnato',
      bayId: b.liftPosition ?? '',
    }));

    // Optimize: group by technician, minimize gaps, sort by duration (shorter first in AM)
    const optimizedOrder = this.optimizeEntries(currentOrder);

    const timeSaved = this.calculateTimeSaved(currentOrder, optimizedOrder);

    // Log to AiDecisionLog
    await this.prisma.aiDecisionLog.create({
      data: {
        tenantId,
        featureName: 'SMART_SCHEDULING',
        modelUsed: 'heuristic-optimizer-v1',
        inputSummary: `Optimize day: ${date} | Bookings: ${bookings.length}`,
        outputSummary: `Optimized ${bookings.length} bookings | Time saved: ${timeSaved}min`,
        confidence: new Prisma.Decimal(0.75),
        entityType: 'scheduling',
        processingTimeMs: Date.now() - startTime,
      },
    });

    return {
      currentOrder,
      optimizedOrder,
      estimatedTimeSavedMinutes: timeSaved,
    };
  }

  /**
   * Forecast capacity utilization per day for a date range.
   */
  async getCapacityForecast(
    tenantId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<CapacityDay[]> {
    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);

    // Get all bookings in range
    const bookings = await this.prisma.booking.findMany({
      where: {
        tenantId,
        scheduledDate: { gte: from, lte: to },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        deletedAt: null,
      },
    });

    // Get total capacity
    const [technicians, bays] = await Promise.all([
      this.prisma.technician.count({
        where: { tenantId, isActive: true },
      }),
      this.prisma.serviceBay.count({
        where: {
          shopFloor: { tenantId },
          status: 'AVAILABLE',
        },
      }),
    ]);

    // Assume 8 working hours per day, 1-hour slots
    const slotsPerDay = Math.min(technicians, bays) * 8;

    // Group bookings by date (using local date to avoid timezone issues)
    const bookingsByDate = new Map<string, number>();
    for (const booking of bookings) {
      const dateKey = this.formatLocalDate(booking.scheduledDate);
      bookingsByDate.set(dateKey, (bookingsByDate.get(dateKey) ?? 0) + 1);
    }

    // Generate forecast for each day
    const forecast: CapacityDay[] = [];
    const current = new Date(from);

    while (current <= to) {
      // Skip weekends (Sunday = 0, Saturday = 6)
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const dateKey = this.formatLocalDate(current);
        const bookedSlots = bookingsByDate.get(dateKey) ?? 0;
        const totalSlots = slotsPerDay > 0 ? slotsPerDay : 8;
        const utilization =
          totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 10000) / 100 : 0;

        forecast.push({
          date: dateKey,
          totalSlots,
          bookedSlots,
          utilizationPercent: Math.min(utilization, 100),
          availableTechnicians: technicians,
          availableBays: bays,
        });
      }

      current.setDate(current.getDate() + 1);
    }

    return forecast;
  }

  /**
   * Compute optimal slots with scoring.
   */
  // eslint-disable-next-line sonarjs/cognitive-complexity
  private computeOptimalSlots(
    technicians: Array<{ id: string; name: string; skills: string[] }>,
    bays: Array<{ id: string; name: string }>,
    existingBookings: Array<{
      technicianId: string | null;
      scheduledDate: Date;
      durationMinutes: number;
      slot: { startTime: Date; endTime: Date };
    }>,
    dto: SuggestSlotsDto,
    dateFrom: Date,
  ): SuggestedSlot[] {
    if (technicians.length === 0 || bays.length === 0) {
      return [];
    }

    const slots: SuggestedSlot[] = [];
    const workHoursStart = 8; // 08:00
    const workHoursEnd = 18; // 18:00
    const slotDuration = dto.estimatedDuration;

    // Count bookings per technician for workload balance
    const techWorkload = new Map<string, number>();
    for (const booking of existingBookings) {
      if (booking.technicianId) {
        techWorkload.set(booking.technicianId, (techWorkload.get(booking.technicianId) ?? 0) + 1);
      }
    }

    // Generate candidate slots for next 5 working days
    for (let dayOffset = 0; dayOffset < 7 && slots.length < 10; dayOffset++) {
      const candidateDate = new Date(dateFrom);
      candidateDate.setDate(candidateDate.getDate() + dayOffset);

      // Skip weekends
      const dayOfWeek = candidateDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const dateStr = this.formatLocalDate(candidateDate);

      for (const tech of technicians) {
        for (
          let hour = workHoursStart;
          hour + Math.ceil(slotDuration / 60) <= workHoursEnd;
          hour++
        ) {
          // Check if slot conflicts with existing bookings
          const slotStart = new Date(candidateDate);
          slotStart.setHours(hour, 0, 0, 0);
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

          const hasConflict = existingBookings.some(
            b =>
              b.technicianId === tech.id &&
              b.slot.startTime < slotEnd &&
              b.slot.endTime > slotStart,
          );

          if (hasConflict) continue;

          // Score calculation
          let score = 50; // Base score

          // Preferred date bonus
          if (dto.preferredDate && dateStr === dto.preferredDate) {
            score += 30;
          }

          // Skill match bonus
          if (dto.requiredSkills && dto.requiredSkills.length > 0) {
            const matchedSkills = dto.requiredSkills.filter(s => tech.skills.includes(s)).length;
            score += (matchedSkills / dto.requiredSkills.length) * 20;
          }

          // Workload balance: lower workload = higher score
          const workload = techWorkload.get(tech.id) ?? 0;
          score -= workload * 2;

          // Morning preference for shorter jobs
          if (slotDuration <= 60 && hour < 12) {
            score += 5;
          }

          const bay = bays[slots.length % bays.length];

          slots.push({
            date: dateStr,
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            bayId: bay.id,
            technicianId: tech.id,
            technicianName: tech.name,
            score: Math.max(0, Math.min(100, Math.round(score))),
            reasoning: this.buildReasoning(score, workload, dto),
          });
        }
      }
    }

    // Sort by score descending and return top 3
    // eslint-disable-next-line sonarjs/no-misleading-array-reverse
    return slots.sort((a, b) => b.score - a.score).slice(0, 3);
  }

  private buildReasoning(score: number, workload: number, dto: SuggestSlotsDto): string {
    const reasons: string[] = [];

    if (score >= 70) {
      reasons.push('Slot ottimale');
    } else if (score >= 50) {
      reasons.push('Buon compromesso');
    } else {
      reasons.push('Slot disponibile');
    }

    if (workload === 0) {
      reasons.push('tecnico libero');
    } else if (workload <= 3) {
      reasons.push('carico di lavoro bilanciato');
    } else {
      reasons.push('tecnico con carico elevato');
    }

    if (dto.requiredSkills && dto.requiredSkills.length > 0) {
      reasons.push('competenze compatibili');
    }

    return reasons.join(', ');
  }

  /**
   * Optimize schedule entries by minimizing gaps and grouping by technician.
   */
  private optimizeEntries(entries: ScheduleEntry[]): ScheduleEntry[] {
    if (entries.length <= 1) return [...entries];

    // Group by technician
    const byTech = new Map<string, ScheduleEntry[]>();
    for (const entry of entries) {
      const key = entry.technicianId || 'unassigned';
      const list = byTech.get(key) ?? [];
      list.push(entry);
      byTech.set(key, list);
    }

    // Sort each technician's entries by start time
    const optimized: ScheduleEntry[] = [];
    for (const [, techEntries] of byTech) {
      techEntries.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      optimized.push(...techEntries);
    }

    return optimized;
  }

  /**
   * Calculate estimated time saved by comparing schedules.
   */
  private calculateTimeSaved(current: ScheduleEntry[], optimized: ScheduleEntry[]): number {
    if (current.length <= 1) return 0;

    const calculateGaps = (entries: ScheduleEntry[]): number => {
      let totalGap = 0;
      for (let i = 1; i < entries.length; i++) {
        const prevEnd = new Date(entries[i - 1].endTime).getTime();
        // eslint-disable-next-line security/detect-object-injection
        const currStart = new Date(entries[i].startTime).getTime();
        const gap = currStart - prevEnd;
        if (gap > 0) {
          totalGap += gap;
        }
      }
      return totalGap / 60000; // Convert to minutes
    };

    const currentGaps = calculateGaps(current);
    const optimizedGaps = calculateGaps(optimized);

    return Math.max(0, Math.round(currentGaps - optimizedGaps));
  }

  /**
   * Format a Date as YYYY-MM-DD in local time (timezone-safe).
   */
  private formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
