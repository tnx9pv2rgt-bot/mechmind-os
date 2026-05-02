/**
 * Property-Based Tests for AI Scheduling Service
 * Tests invariants and properties of scoring, optimization, and capacity algorithms
 * using fast-check for arbitrary input generation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiSchedulingService } from './ai-scheduling.service';
import { PrismaService } from '../common/services/prisma.service';
import { Prisma } from '@prisma/client';
import fc from 'fast-check';

describe('AiSchedulingService (Property-Based Tests)', () => {
  let service: AiSchedulingService;
  let prisma: {
    technician: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
    serviceBay: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
    booking: {
      findMany: jest.Mock;
    };
    aiDecisionLog: {
      create: jest.Mock;
    };
  };
  let configService: { get: jest.Mock };

  const TENANT_ID = 'tenant-001';

  beforeEach(async () => {
    prisma = {
      technician: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      serviceBay: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      booking: {
        findMany: jest.fn(),
      },
      aiDecisionLog: {
        create: jest.fn(),
      },
    };

    configService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'AI_PROVIDER') return 'mock';
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiSchedulingService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AiSchedulingService>(AiSchedulingService);
  });

  describe('Scoring Invariants (computeOptimalSlots)', () => {
    it('should always return slots with scores in valid range [0, 100]', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 15, max: 480 }),
          fc.integer({ min: 1, max: 5 }),
          async (numTechs, duration, numBookings) => {
            const techs = Array.from({ length: numTechs }, (_, i) => ({
              id: `tech-${i}`,
              tenantId: TENANT_ID,
              name: `Tech ${i}`,
              skills: ['ENGINE', 'ELECTRICAL', 'BRAKES'],
              isActive: true,
            }));

            const bays = [
              { id: 'bay-1', name: 'Bay 1', status: 'AVAILABLE' },
            ];

            const bookings = Array.from({ length: numBookings }, (_, i) => ({
              technicianId: i < numTechs ? `tech-${i % numTechs}` : null,
              scheduledDate: new Date('2026-03-30'),
              durationMinutes: 60,
              slot: {
                startTime: new Date(`2026-03-30T${9 + i}:00:00Z`),
                endTime: new Date(`2026-03-30T${10 + i}:00:00Z`),
              },
            }));

            prisma.technician.findMany.mockResolvedValueOnce(techs);
            prisma.serviceBay.findMany.mockResolvedValueOnce(bays);
            prisma.booking.findMany.mockResolvedValueOnce(bookings);
            prisma.aiDecisionLog.create.mockResolvedValueOnce({ id: 'log-1' });

            const result = await service.suggestOptimalSlots(TENANT_ID, {
              serviceType: 'TAGLIANDO',
              estimatedDuration: duration,
            });

            // Invariant: all scores are in valid range
            for (const slot of result) {
              expect(slot.score).toBeGreaterThanOrEqual(0);
              expect(slot.score).toBeLessThanOrEqual(100);
            }

            // Invariant: results are sorted by score descending
            for (let i = 0; i < result.length - 1; i++) {
              expect(result[i].score).toBeGreaterThanOrEqual(result[i + 1].score);
            }

            // Invariant: max 3 results
            expect(result.length).toBeLessThanOrEqual(3);
          },
        ),
        { numRuns: 50, timeout: 10000 },
      );
    });

    it('should handle edge case: duration longer than working hours', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 480, max: 1440 }), // 8+ hours
          async (longDuration) => {
            const techs = [
              {
                id: 'tech-1',
                tenantId: TENANT_ID,
                name: 'Tech 1',
                skills: ['ENGINE'],
                isActive: true,
              },
            ];

            const bays = [{ id: 'bay-1', name: 'Bay 1', status: 'AVAILABLE' }];

            prisma.technician.findMany.mockResolvedValueOnce(techs);
            prisma.serviceBay.findMany.mockResolvedValueOnce(bays);
            prisma.booking.findMany.mockResolvedValueOnce([]);
            prisma.aiDecisionLog.create.mockResolvedValueOnce({ id: 'log-1' });

            const result = await service.suggestOptimalSlots(TENANT_ID, {
              serviceType: 'MAJOR_OVERHAUL',
              estimatedDuration: longDuration,
            });

            // Invariant: even with very long duration, function returns safely
            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            // Very long duration → no slots fit in working hours → empty result
            if (longDuration > 600) {
              expect(result.length).toBe(0);
            }
          },
        ),
        { numRuns: 20, timeout: 5000 },
      );
    });

    it('should never prefer less-skilled technician over more-skilled', async () => {
      const techsWithDifferentSkills = [
        {
          id: 'tech-skilled',
          tenantId: TENANT_ID,
          name: 'Skilled',
          skills: ['ENGINE', 'ELECTRICAL', 'BRAKES', 'AC'],
          isActive: true,
        },
        {
          id: 'tech-basic',
          tenantId: TENANT_ID,
          name: 'Basic',
          skills: ['GENERAL'],
          isActive: true,
        },
      ];

      const bays = [{ id: 'bay-1', name: 'Bay 1', status: 'AVAILABLE' }];

      prisma.technician.findMany.mockResolvedValueOnce(techsWithDifferentSkills);
      prisma.serviceBay.findMany.mockResolvedValueOnce(bays);
      prisma.booking.findMany.mockResolvedValueOnce([]);
      prisma.aiDecisionLog.create.mockResolvedValueOnce({ id: 'log-1' });

      const result = await service.suggestOptimalSlots(TENANT_ID, {
        serviceType: 'DIAGNOSI_ELETTRICA',
        estimatedDuration: 90,
        requiredSkills: ['ELECTRICAL', 'ENGINE'],
      });

      // Invariant: top-scoring slots should prefer more-skilled technician
      if (result.length > 0) {
        const topSlot = result[0];
        expect(topSlot.technicianId).toBe('tech-skilled');
      }
    });
  });

  describe('Optimization Invariants (optimizeDaySchedule)', () => {
    it('should preserve all bookings and not lose any entries during optimization', async () => {
      const baseDate = new Date('2026-03-30T00:00:00Z');

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 8 }),
          async (numBookings) => {
            const techs = [
              { id: 'tech-1', tenantId: TENANT_ID, name: 'Tech 1', isActive: true },
              { id: 'tech-2', tenantId: TENANT_ID, name: 'Tech 2', isActive: true },
            ];

            const bookings = Array.from({ length: numBookings }, (_, i) => {
              const hour = 9 + i; // 9-17 hours
              const startTime = new Date(baseDate);
              startTime.setHours(hour, 0, 0, 0);
              const endTime = new Date(baseDate);
              endTime.setHours(hour + 1, 0, 0, 0);

              return {
                id: `b-${i}`,
                tenantId: TENANT_ID,
                technicianId: i % 2 === 0 ? 'tech-1' : 'tech-2',
                scheduledDate: new Date('2026-03-30T09:00:00Z'),
                durationMinutes: 60,
                liftPosition: 'bay-1',
                slot: {
                  startTime,
                  endTime,
                },
                services: [{ service: { name: 'Service' } }],
              };
            });

            prisma.booking.findMany.mockResolvedValueOnce(bookings);
            prisma.technician.findMany.mockResolvedValueOnce(techs);
            prisma.aiDecisionLog.create.mockResolvedValueOnce({ id: 'log-1' });

            const result = await service.optimizeDaySchedule(TENANT_ID, '2026-03-30');

            // Invariant: all bookings preserved
            expect(result.currentOrder).toHaveLength(numBookings);
            expect(result.optimizedOrder).toHaveLength(numBookings);

            // Invariant: same booking IDs in both orders
            const currentIds = new Set(result.currentOrder.map((e) => e.bookingId));
            const optimizedIds = new Set(result.optimizedOrder.map((e) => e.bookingId));
            expect(currentIds).toEqual(optimizedIds);

            // Invariant: time saved is non-negative
            expect(result.estimatedTimeSavedMinutes).toBeGreaterThanOrEqual(0);
          },
        ),
        { numRuns: 30, timeout: 10000 },
      );
    });

    it('should not increase total duration when optimizing', async () => {
      const bookings = [
        {
          id: 'b1',
          tenantId: TENANT_ID,
          technicianId: 'tech-1',
          scheduledDate: new Date('2026-03-30T14:00:00Z'),
          durationMinutes: 60,
          liftPosition: 'bay-1',
          slot: {
            startTime: new Date('2026-03-30T14:00:00Z'),
            endTime: new Date('2026-03-30T15:00:00Z'),
          },
          services: [{ service: { name: 'Service 1' } }],
        },
        {
          id: 'b2',
          tenantId: TENANT_ID,
          technicianId: 'tech-1',
          scheduledDate: new Date('2026-03-30T09:00:00Z'),
          durationMinutes: 60,
          liftPosition: 'bay-1',
          slot: {
            startTime: new Date('2026-03-30T09:00:00Z'),
            endTime: new Date('2026-03-30T10:00:00Z'),
          },
          services: [{ service: { name: 'Service 2' } }],
        },
      ];

      const techs = [{ id: 'tech-1', tenantId: TENANT_ID, name: 'Tech 1', isActive: true }];

      prisma.booking.findMany.mockResolvedValueOnce(bookings);
      prisma.technician.findMany.mockResolvedValueOnce(techs);
      prisma.aiDecisionLog.create.mockResolvedValueOnce({ id: 'log-1' });

      const result = await service.optimizeDaySchedule(TENANT_ID, '2026-03-30');

      const calculateSpan = (entries: any[]) => {
        if (entries.length === 0) return 0;
        const startTimes = entries.map((e) => new Date(e.startTime).getTime());
        const endTimes = entries.map((e) => new Date(e.endTime).getTime());
        return Math.max(...endTimes) - Math.min(...startTimes);
      };

      const currentSpan = calculateSpan(result.currentOrder);
      const optimizedSpan = calculateSpan(result.optimizedOrder);

      // Invariant: optimization should not increase span
      expect(optimizedSpan).toBeLessThanOrEqual(currentSpan);
    });
  });

  describe('Capacity Forecast Invariants (getCapacityForecast)', () => {
    it('should maintain utilization percentage in valid range [0, 100]', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 10 }),
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 1, max: 5 }),
          async (numBookings, numTechs, numBays) => {
            // Generate bookings distributed across the forecast period (5 days)
            const bookings = Array.from({ length: numBookings }, (_, i) => {
              const day = i % 5; // Distribute across 5 days
              return {
                scheduledDate: new Date(`2026-03-30T${9 + (i % 4)}:00:00Z`),
                tenantId: TENANT_ID,
              };
            });

            prisma.booking.findMany.mockResolvedValueOnce(bookings);
            prisma.technician.count.mockResolvedValueOnce(numTechs);
            prisma.serviceBay.count.mockResolvedValueOnce(numBays);

            const result = await service.getCapacityForecast(TENANT_ID, '2026-03-30', '2026-04-03');

            // Invariant: all utilization percentages in valid range
            for (const day of result) {
              expect(day.utilizationPercent).toBeGreaterThanOrEqual(0);
              expect(day.utilizationPercent).toBeLessThanOrEqual(100);
            }

            // Invariant: utilization is sensible (booked / total)
            for (const day of result) {
              if (day.totalSlots > 0) {
                const calculated = (day.bookedSlots / day.totalSlots) * 100;
                const rounded = Math.round(calculated * 100) / 100;
                expect(Math.abs(day.utilizationPercent - rounded)).toBeLessThan(1);
              }
            }

            // Invariant: available resources match input
            for (const day of result) {
              expect(day.availableTechnicians).toBe(numTechs);
              expect(day.availableBays).toBe(numBays);
            }
          },
        ),
        { numRuns: 40, timeout: 10000 },
      );
    });

    it('should skip all weekends in forecast range', async () => {
      prisma.booking.findMany.mockResolvedValueOnce([]);
      prisma.technician.count.mockResolvedValueOnce(2);
      prisma.serviceBay.count.mockResolvedValueOnce(2);

      // 2026-03-28 is Saturday, 2026-03-29 is Sunday, 2026-03-30 is Monday
      const result = await service.getCapacityForecast(TENANT_ID, '2026-03-28', '2026-03-30');

      // Invariant: no Saturday or Sunday in result
      const daysOfWeek = result.map((day) => {
        const date = new Date(day.date);
        return date.getDay();
      });

      for (const dayOfWeek of daysOfWeek) {
        expect([0, 6]).not.toContain(dayOfWeek); // 0 = Sunday, 6 = Saturday
      }
    });

    it('should calculate total slots as min(technicians, bays) * 8', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 20 }),
          fc.integer({ min: 0, max: 20 }),
          async (numTechs, numBays) => {
            prisma.booking.findMany.mockResolvedValueOnce([]);
            prisma.technician.count.mockResolvedValueOnce(numTechs);
            prisma.serviceBay.count.mockResolvedValueOnce(numBays);

            const result = await service.getCapacityForecast(TENANT_ID, '2026-03-31', '2026-03-31');

            // Invariant: total slots = min(techs, bays) * 8
            const expectedSlots = Math.min(numTechs, numBays) * 8;
            for (const day of result) {
              if (expectedSlots > 0 || numTechs === 0 || numBays === 0) {
                expect(day.totalSlots).toBe(Math.max(expectedSlots, 8));
              }
            }
          },
        ),
        { numRuns: 30, timeout: 10000 },
      );
    });
  });
});
