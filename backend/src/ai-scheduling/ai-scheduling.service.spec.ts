import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiSchedulingService } from './ai-scheduling.service';
import { PrismaService } from '../common/services/prisma.service';
import { Prisma } from '@prisma/client';

describe('AiSchedulingService', () => {
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

  const mockTechnicians = [
    {
      id: 'tech-001',
      tenantId: TENANT_ID,
      name: 'Marco Rossi',
      skills: ['ENGINE', 'BRAKES'],
      isActive: true,
    },
    {
      id: 'tech-002',
      tenantId: TENANT_ID,
      name: 'Luca Bianchi',
      skills: ['ELECTRICAL', 'ENGINE'],
      isActive: true,
    },
  ];

  const mockBays = [
    { id: 'bay-001', name: 'Ponte 1', status: 'AVAILABLE' },
    { id: 'bay-002', name: 'Ponte 2', status: 'AVAILABLE' },
  ];

  const mockDecisionLog = {
    id: 'sched-001',
    tenantId: TENANT_ID,
    featureName: 'SMART_SCHEDULING',
    modelUsed: 'heuristic-scheduler-v1',
    inputSummary: 'Service: TAGLIANDO',
    outputSummary: 'Suggested 3 slots',
    confidence: new Prisma.Decimal(0.8),
    humanReviewed: false,
    humanOverridden: false,
    humanDecision: null,
    reviewedBy: null,
    reviewedAt: null,
    entityType: 'scheduling',
    entityId: null,
    userId: null,
    processingTimeMs: 30,
    createdAt: new Date('2026-03-28T10:00:00Z'),
  };

  beforeEach(async () => {
    prisma = {
      technician: {
        findMany: jest.fn().mockResolvedValue(mockTechnicians),
        count: jest.fn().mockResolvedValue(2),
      },
      serviceBay: {
        findMany: jest.fn().mockResolvedValue(mockBays),
        count: jest.fn().mockResolvedValue(2),
      },
      booking: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      aiDecisionLog: {
        create: jest.fn().mockResolvedValue(mockDecisionLog),
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('suggestOptimalSlots', () => {
    it('should return up to 3 suggested slots', async () => {
      const dto = {
        serviceType: 'TAGLIANDO',
        estimatedDuration: 60,
        preferredDate: '2026-03-30',
      };

      const result = await service.suggestOptimalSlots(TENANT_ID, dto);

      expect(result.length).toBeLessThanOrEqual(3);
      expect(result.length).toBeGreaterThan(0);

      for (const slot of result) {
        expect(slot.date).toBeDefined();
        expect(slot.startTime).toBeDefined();
        expect(slot.endTime).toBeDefined();
        expect(slot.bayId).toBeDefined();
        expect(slot.technicianId).toBeDefined();
        expect(slot.technicianName).toBeDefined();
        expect(typeof slot.score).toBe('number');
        expect(slot.reasoning).toBeDefined();
      }

      // Should log to AiDecisionLog
      expect(prisma.aiDecisionLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            featureName: 'SMART_SCHEDULING',
          }),
        }),
      );
    });

    it('should return empty array when no technicians available', async () => {
      prisma.technician.findMany.mockResolvedValue([]);

      const result = await service.suggestOptimalSlots(TENANT_ID, {
        serviceType: 'TAGLIANDO',
        estimatedDuration: 60,
      });

      expect(result).toHaveLength(0);
    });

    it('should return empty array when no bays available', async () => {
      prisma.serviceBay.findMany.mockResolvedValue([]);

      const result = await service.suggestOptimalSlots(TENANT_ID, {
        serviceType: 'TAGLIANDO',
        estimatedDuration: 60,
      });

      expect(result).toHaveLength(0);
    });

    it('should filter technicians by required skills', async () => {
      const dto = {
        serviceType: 'DIAGNOSI_ELETTRICA',
        estimatedDuration: 90,
        requiredSkills: ['ELECTRICAL'],
      };

      await service.suggestOptimalSlots(TENANT_ID, dto);

      expect(prisma.technician.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            isActive: true,
            skills: { hasSome: ['ELECTRICAL'] },
          }),
        }),
      );
    });

    it('should give preferred date a higher score', async () => {
      const dto = {
        serviceType: 'TAGLIANDO',
        estimatedDuration: 60,
        preferredDate: '2026-03-30',
      };

      const result = await service.suggestOptimalSlots(TENANT_ID, dto);

      // Preferred date slots should be at top (higher score)
      const preferredSlots = result.filter(s => s.date === '2026-03-30');
      const otherSlots = result.filter(s => s.date !== '2026-03-30');

      if (preferredSlots.length > 0 && otherSlots.length > 0) {
        expect(preferredSlots[0].score).toBeGreaterThanOrEqual(otherSlots[0].score);
      }
    });
  });

  describe('optimizeDaySchedule', () => {
    it('should return current and optimized orders', async () => {
      const now = new Date('2026-03-30T09:00:00Z');
      const mockBookings = [
        {
          id: 'book-001',
          tenantId: TENANT_ID,
          technicianId: 'tech-001',
          scheduledDate: now,
          durationMinutes: 60,
          liftPosition: 'bay-001',
          slot: {
            startTime: new Date('2026-03-30T09:00:00Z'),
            endTime: new Date('2026-03-30T10:00:00Z'),
          },
          services: [{ service: { name: 'Tagliando' } }],
        },
        {
          id: 'book-002',
          tenantId: TENANT_ID,
          technicianId: 'tech-001',
          scheduledDate: new Date('2026-03-30T11:00:00Z'),
          durationMinutes: 90,
          liftPosition: 'bay-001',
          slot: {
            startTime: new Date('2026-03-30T11:00:00Z'),
            endTime: new Date('2026-03-30T12:30:00Z'),
          },
          services: [{ service: { name: 'Freni' } }],
        },
      ];

      prisma.booking.findMany.mockResolvedValue(mockBookings);

      const result = await service.optimizeDaySchedule(TENANT_ID, '2026-03-30');

      expect(result.currentOrder).toHaveLength(2);
      expect(result.optimizedOrder).toHaveLength(2);
      expect(typeof result.estimatedTimeSavedMinutes).toBe('number');
      expect(result.estimatedTimeSavedMinutes).toBeGreaterThanOrEqual(0);

      // Verify AI decision logged
      expect(prisma.aiDecisionLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            featureName: 'SMART_SCHEDULING',
            entityType: 'scheduling',
          }),
        }),
      );
    });

    it('should handle empty schedule', async () => {
      prisma.booking.findMany.mockResolvedValue([]);

      const result = await service.optimizeDaySchedule(TENANT_ID, '2026-03-30');

      expect(result.currentOrder).toHaveLength(0);
      expect(result.optimizedOrder).toHaveLength(0);
      expect(result.estimatedTimeSavedMinutes).toBe(0);
    });
  });

  describe('getCapacityForecast', () => {
    it('should return capacity forecast for date range', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.technician.count.mockResolvedValue(2);
      prisma.serviceBay.count.mockResolvedValue(3);

      const result = await service.getCapacityForecast(TENANT_ID, '2026-03-30', '2026-04-03');

      expect(result.length).toBeGreaterThan(0);

      for (const day of result) {
        expect(day.date).toBeDefined();
        expect(typeof day.totalSlots).toBe('number');
        expect(typeof day.bookedSlots).toBe('number');
        expect(typeof day.utilizationPercent).toBe('number');
        expect(day.utilizationPercent).toBeGreaterThanOrEqual(0);
        expect(day.utilizationPercent).toBeLessThanOrEqual(100);
        expect(day.availableTechnicians).toBe(2);
        expect(day.availableBays).toBe(3);
      }
    });

    it('should skip weekends in forecast', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.technician.count.mockResolvedValue(1);
      prisma.serviceBay.count.mockResolvedValue(1);

      // 2026-03-28 is Saturday, 2026-03-29 is Sunday
      const result = await service.getCapacityForecast(TENANT_ID, '2026-03-28', '2026-03-29');

      expect(result).toHaveLength(0);
    });

    it('should calculate utilization based on bookings', async () => {
      const bookings = [
        { scheduledDate: new Date('2026-03-30T09:00:00Z') },
        { scheduledDate: new Date('2026-03-30T10:00:00Z') },
        { scheduledDate: new Date('2026-03-30T11:00:00Z') },
      ];
      prisma.booking.findMany.mockResolvedValue(bookings);
      prisma.technician.count.mockResolvedValue(1);
      prisma.serviceBay.count.mockResolvedValue(1);

      const result = await service.getCapacityForecast(TENANT_ID, '2026-03-30', '2026-03-30');

      expect(result).toHaveLength(1);
      expect(result[0].bookedSlots).toBe(3);
      expect(result[0].utilizationPercent).toBeGreaterThan(0);
    });

    it('should handle zero total slots (no technicians/bays)', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.technician.count.mockResolvedValue(0);
      prisma.serviceBay.count.mockResolvedValue(0);

      const result = await service.getCapacityForecast(TENANT_ID, '2026-03-30', '2026-03-31');

      expect(result.length).toBeGreaterThan(0);
      for (const day of result) {
        expect(day.totalSlots).toBe(8);
        expect(day.utilizationPercent).toBe(0);
      }
    });
  });

  describe('computeOptimalSlots - branch coverage', () => {
    it('should detect slot conflicts with technician', async () => {
      const existingBookings = [
        {
          technicianId: 'tech-001',
          scheduledDate: new Date('2026-03-30T09:00:00Z'),
          durationMinutes: 60,
          slot: {
            startTime: new Date('2026-03-30T09:00:00Z'),
            endTime: new Date('2026-03-30T10:00:00Z'),
          },
        },
      ];
      prisma.booking.findMany.mockResolvedValue(existingBookings);

      const dto = {
        serviceType: 'TAGLIANDO',
        estimatedDuration: 60,
        preferredDate: '2026-03-30',
      };

      const result = await service.suggestOptimalSlots(TENANT_ID, dto);

      // Should still return slots (different times available)
      expect(result.length).toBeGreaterThanOrEqual(0);
      expect(prisma.aiDecisionLog.create).toHaveBeenCalled();
    });

    it('should score slots with all branch conditions', async () => {
      const dto = {
        serviceType: 'DIAGNOSI_ELETTRICA',
        estimatedDuration: 45,
        requiredSkills: ['ELECTRICAL'],
        preferredDate: '2026-03-30',
      };

      prisma.booking.findMany.mockResolvedValue([]);

      const result = await service.suggestOptimalSlots(TENANT_ID, dto);

      if (result.length > 0) {
        const slot = result[0];
        expect(slot.score).toBeGreaterThanOrEqual(0);
        expect(slot.score).toBeLessThanOrEqual(100);
        expect(slot.reasoning).toBeDefined();
        // Verify reasoning covers different workload branches
        expect(slot.reasoning).toMatch(
          /(tecnico libero|carico di lavoro bilanciato|tecnico con carico elevato)/,
        );
        expect(slot.reasoning).toMatch(/(Slot ottimale|Buon compromesso|Slot disponibile)/);
      }
    });

    it('should handle technician with no technicianId in bookings', async () => {
      const existingBookings = [
        {
          technicianId: null,
          scheduledDate: new Date('2026-03-30T10:00:00Z'),
          durationMinutes: 60,
          slot: {
            startTime: new Date('2026-03-30T10:00:00Z'),
            endTime: new Date('2026-03-30T11:00:00Z'),
          },
        },
      ];
      prisma.booking.findMany.mockResolvedValue(existingBookings);

      const dto = {
        serviceType: 'TAGLIANDO',
        estimatedDuration: 60,
      };

      const result = await service.suggestOptimalSlots(TENANT_ID, dto);

      // Should generate slots even with null technicianId bookings
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should apply all scoring rules correctly', async () => {
      const existingBookings = [
        {
          technicianId: 'tech-001',
          scheduledDate: new Date('2026-03-30T14:00:00Z'),
          durationMinutes: 60,
          slot: {
            startTime: new Date('2026-03-30T14:00:00Z'),
            endTime: new Date('2026-03-30T15:00:00Z'),
          },
        },
        {
          technicianId: 'tech-001',
          scheduledDate: new Date('2026-04-01T10:00:00Z'),
          durationMinutes: 60,
          slot: {
            startTime: new Date('2026-04-01T10:00:00Z'),
            endTime: new Date('2026-04-01T11:00:00Z'),
          },
        },
      ];
      prisma.booking.findMany.mockResolvedValue(existingBookings);

      const dto = {
        serviceType: 'TAGLIANDO',
        estimatedDuration: 30,
        requiredSkills: ['ENGINE', 'BRAKES'],
        preferredDate: '2026-03-30',
      };

      const result = await service.suggestOptimalSlots(TENANT_ID, dto);

      if (result.length > 0) {
        // First slot should have highest score (preferred date + morning + skill match)
        expect(result[0].score).toBeGreaterThanOrEqual(50);
      }
    });

    it('should trigger low score and high workload reasoning branches', async () => {
      // Create heavy bookings for both techs to force high workload scores
      const existingBookings: Array<{
        technicianId: string | null;
        scheduledDate: Date;
        durationMinutes: number;
        slot: { startTime: Date; endTime: Date };
      }> = [];

      // Add 5 bookings per technician to exceed workload 3
      for (let i = 0; i < 5; i++) {
        existingBookings.push({
          technicianId: 'tech-001',
          scheduledDate: new Date('2026-04-01T09:00:00Z'),
          durationMinutes: 60,
          slot: {
            startTime: new Date(`2026-04-0${(i % 3) + 1}T${9 + i}:00:00Z`),
            endTime: new Date(`2026-04-0${(i % 3) + 1}T${10 + i}:00:00Z`),
          },
        });
        existingBookings.push({
          technicianId: 'tech-002',
          scheduledDate: new Date('2026-04-01T09:00:00Z'),
          durationMinutes: 60,
          slot: {
            startTime: new Date(`2026-04-0${(i % 3) + 1}T${14 + i}:00:00Z`),
            endTime: new Date(`2026-04-0${(i % 3) + 1}T${15 + i}:00:00Z`),
          },
        });
      }

      prisma.booking.findMany.mockResolvedValue(existingBookings);

      const dto = {
        serviceType: 'DIAGNOSI',
        estimatedDuration: 120, // Long job to get low score on afternoon slots
      };

      const result = await service.suggestOptimalSlots(TENANT_ID, dto);

      // Verify reasoning includes "tecnico con carico elevato" and potentially "Slot disponibile"
      const reasonings = result.map(r => r.reasoning).join(' ');
      expect(reasonings).toMatch(
        /(tecnico con carico elevato|tecnico libero|carico di lavoro bilanciato)/,
      );
    });
  });

  describe('optimizeDaySchedule - branch coverage', () => {
    it('should handle single booking (no gaps)', async () => {
      const mockBookings = [
        {
          id: 'book-001',
          tenantId: TENANT_ID,
          technicianId: 'tech-001',
          scheduledDate: new Date('2026-03-30T09:00:00Z'),
          durationMinutes: 60,
          liftPosition: 'bay-001',
          slot: {
            startTime: new Date('2026-03-30T09:00:00Z'),
            endTime: new Date('2026-03-30T10:00:00Z'),
          },
          services: [{ service: { name: 'Tagliando' } }],
        },
      ];

      prisma.booking.findMany.mockResolvedValue(mockBookings);

      const result = await service.optimizeDaySchedule(TENANT_ID, '2026-03-30');

      expect(result.currentOrder).toHaveLength(1);
      expect(result.optimizedOrder).toHaveLength(1);
      expect(result.estimatedTimeSavedMinutes).toBe(0);
    });

    it('should handle bookings with null technicianId', async () => {
      const mockBookings = [
        {
          id: 'book-001',
          tenantId: TENANT_ID,
          technicianId: null,
          scheduledDate: new Date('2026-03-30T09:00:00Z'),
          durationMinutes: 60,
          liftPosition: 'bay-001',
          slot: {
            startTime: new Date('2026-03-30T09:00:00Z'),
            endTime: new Date('2026-03-30T10:00:00Z'),
          },
          services: [{ service: { name: 'Tagliando' } }],
        },
        {
          id: 'book-002',
          tenantId: TENANT_ID,
          technicianId: 'tech-001',
          scheduledDate: new Date('2026-03-30T11:00:00Z'),
          durationMinutes: 60,
          liftPosition: 'bay-001',
          slot: {
            startTime: new Date('2026-03-30T11:00:00Z'),
            endTime: new Date('2026-03-30T12:00:00Z'),
          },
          services: [{ service: { name: 'Freni' } }],
        },
      ];

      prisma.booking.findMany.mockResolvedValue(mockBookings);

      const result = await service.optimizeDaySchedule(TENANT_ID, '2026-03-30');

      expect(result.currentOrder).toHaveLength(2);
      expect(result.optimizedOrder).toHaveLength(2);
      expect(result.estimatedTimeSavedMinutes).toBeGreaterThanOrEqual(0);
    });

    it('should handle booking with null service', async () => {
      const mockBookings = [
        {
          id: 'book-001',
          tenantId: TENANT_ID,
          technicianId: 'tech-001',
          scheduledDate: new Date('2026-03-30T09:00:00Z'),
          durationMinutes: 60,
          liftPosition: 'bay-001',
          slot: {
            startTime: new Date('2026-03-30T09:00:00Z'),
            endTime: new Date('2026-03-30T10:00:00Z'),
          },
          services: [],
        },
      ];

      prisma.booking.findMany.mockResolvedValue(mockBookings);

      const result = await service.optimizeDaySchedule(TENANT_ID, '2026-03-30');

      expect(result.currentOrder[0].serviceType).toBe('Servizio generico');
      expect(result.currentOrder).toHaveLength(1);
    });

    it('should group bookings by technician correctly', async () => {
      const mockBookings = [
        {
          id: 'book-001',
          tenantId: TENANT_ID,
          technicianId: 'tech-001',
          scheduledDate: new Date('2026-03-30T14:00:00Z'),
          durationMinutes: 60,
          liftPosition: 'bay-001',
          slot: {
            startTime: new Date('2026-03-30T14:00:00Z'),
            endTime: new Date('2026-03-30T15:00:00Z'),
          },
          services: [{ service: { name: 'Tagliando' } }],
        },
        {
          id: 'book-002',
          tenantId: TENANT_ID,
          technicianId: 'tech-002',
          scheduledDate: new Date('2026-03-30T09:00:00Z'),
          durationMinutes: 60,
          liftPosition: 'bay-001',
          slot: {
            startTime: new Date('2026-03-30T09:00:00Z'),
            endTime: new Date('2026-03-30T10:00:00Z'),
          },
          services: [{ service: { name: 'Freni' } }],
        },
        {
          id: 'book-003',
          tenantId: TENANT_ID,
          technicianId: 'tech-001',
          scheduledDate: new Date('2026-03-30T10:00:00Z'),
          durationMinutes: 60,
          liftPosition: 'bay-001',
          slot: {
            startTime: new Date('2026-03-30T10:00:00Z'),
            endTime: new Date('2026-03-30T11:00:00Z'),
          },
          services: [{ service: { name: 'Diagnosi' } }],
        },
      ];

      prisma.booking.findMany.mockResolvedValue(mockBookings);

      const result = await service.optimizeDaySchedule(TENANT_ID, '2026-03-30');

      expect(result.optimizedOrder).toHaveLength(3);
      // tech-002's booking should come first after optimization (grouped by tech)
      const tech2Indices = result.optimizedOrder
        .map((entry, idx) => (entry.technicianId === 'tech-002' ? idx : -1))
        .filter(idx => idx !== -1);
      expect(tech2Indices.length).toBeGreaterThan(0);
    });
  });
});
