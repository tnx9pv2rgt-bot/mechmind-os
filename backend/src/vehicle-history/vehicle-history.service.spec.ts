import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VehicleHistorySource, Prisma } from '@prisma/client';
import { VehicleHistoryService } from './vehicle-history.service';
import { PrismaService } from '../common/services/prisma.service';
import { VehicleHistorySourceDto } from './dto/import-history.dto';

describe('VehicleHistoryService', () => {
  let service: VehicleHistoryService;
  let prisma: {
    vehicle: { findFirst: jest.Mock };
    vehicleHistoryRecord: {
      findMany: jest.Mock;
      create: jest.Mock;
      createMany: jest.Mock;
    };
    workOrder: { findMany: jest.Mock };
  };

  const TENANT_ID = 'tenant-001';
  const VEHICLE_ID = 'vehicle-001';

  const mockVehicle = { id: VEHICLE_ID };

  const mockHistoryRecord = {
    id: 'hist-001',
    tenantId: TENANT_ID,
    vehicleId: VEHICLE_ID,
    vin: 'WVWZZZ3CZWE123456',
    source: VehicleHistorySource.MOTORNET,
    eventType: 'SERVICE',
    eventDate: new Date('2025-12-01T10:00:00Z'),
    description: 'Tagliando completo',
    mileage: 50000,
    shopName: 'Officina Rossi',
    costCents: new Prisma.Decimal(15000),
    metadata: null,
    importedAt: new Date('2026-01-01T10:00:00Z'),
    createdAt: new Date('2026-01-01T10:00:00Z'),
  };

  const mockWorkOrder = {
    id: 'wo-001',
    woNumber: 'WO-2026-001',
    diagnosis: 'Sostituzione freni anteriori',
    customerRequest: null,
    totalCost: new Prisma.Decimal(35000),
    mileageIn: 55000,
    actualCompletionTime: new Date('2026-02-15T16:00:00Z'),
    actualStartTime: new Date('2026-02-15T09:00:00Z'),
    createdAt: new Date('2026-02-14T10:00:00Z'),
  };

  beforeEach(async () => {
    prisma = {
      vehicle: { findFirst: jest.fn() },
      vehicleHistoryRecord: {
        findMany: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
      },
      workOrder: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [VehicleHistoryService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<VehicleHistoryService>(VehicleHistoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFullHistory', () => {
    it('should merge local and external records sorted by date descending', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.workOrder.findMany.mockResolvedValue([mockWorkOrder]);
      prisma.vehicleHistoryRecord.findMany.mockResolvedValue([mockHistoryRecord]);

      const result = await service.getFullHistory(TENANT_ID, VEHICLE_ID);

      expect(result).toHaveLength(2);
      // Most recent first (Feb 2026 work order, then Dec 2025 external)
      expect(result[0].eventDate.getTime()).toBeGreaterThanOrEqual(result[1].eventDate.getTime());
    });

    it('should throw NotFoundException when vehicle not found', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.getFullHistory(TENANT_ID, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('importExternalHistory', () => {
    it('should import external records with correct source', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicleHistoryRecord.createMany.mockResolvedValue({ count: 2 });

      const dto = {
        source: VehicleHistorySourceDto.MOTORNET,
        records: [
          {
            eventType: 'SERVICE',
            eventDate: '2025-06-15T10:00:00Z',
            description: 'Tagliando',
            mileage: 45000,
          },
          {
            eventType: 'REPAIR',
            eventDate: '2025-08-20T14:00:00Z',
            description: 'Sostituzione batteria',
          },
        ],
      };

      const result = await service.importExternalHistory(TENANT_ID, VEHICLE_ID, dto);

      expect(result.imported).toBe(2);
      expect(prisma.vehicleHistoryRecord.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            tenantId: TENANT_ID,
            vehicleId: VEHICLE_ID,
            source: 'MOTORNET',
            eventType: 'SERVICE',
          }),
        ]),
      });
    });

    it('should throw NotFoundException when vehicle not found', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(
        service.importExternalHistory(TENANT_ID, 'nonexistent', {
          source: VehicleHistorySourceDto.MOTORNET,
          records: [],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addManualRecord', () => {
    it('should create a manual record with MANUAL source', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      const createdRecord = {
        ...mockHistoryRecord,
        source: VehicleHistorySource.MANUAL,
      };
      prisma.vehicleHistoryRecord.create.mockResolvedValue(createdRecord);

      const dto = {
        eventType: 'SERVICE',
        eventDate: '2026-03-01T10:00:00Z',
        description: 'Cambio olio manuale',
        mileage: 60000,
        shopName: 'Fai da te',
      };

      const result = await service.addManualRecord(TENANT_ID, VEHICLE_ID, dto);

      expect(result.source).toBe(VehicleHistorySource.MANUAL);
      expect(prisma.vehicleHistoryRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          vehicleId: VEHICLE_ID,
          source: VehicleHistorySource.MANUAL,
          eventType: 'SERVICE',
          description: 'Cambio olio manuale',
        }),
      });
    });
  });

  describe('getLocalHistory', () => {
    it('should build history from completed work orders', async () => {
      prisma.workOrder.findMany.mockResolvedValue([mockWorkOrder]);

      const result = await service.getLocalHistory(TENANT_ID, VEHICLE_ID);

      expect(result).toHaveLength(1);
      expect(result[0].source).toBe(VehicleHistorySource.LOCAL);
      expect(result[0].eventType).toBe('SERVICE');
      expect(result[0].description).toContain('WO-2026-001');
      expect(result[0].mileage).toBe(55000);
    });

    it('should return empty array when no completed work orders', async () => {
      prisma.workOrder.findMany.mockResolvedValue([]);

      const result = await service.getLocalHistory(TENANT_ID, VEHICLE_ID);

      expect(result).toEqual([]);
    });
  });
});
