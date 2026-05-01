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

    it('should use createdAt when actualCompletionTime is null', async () => {
      const woWithoutCompletionTime = {
        ...mockWorkOrder,
        actualCompletionTime: null,
      };
      prisma.workOrder.findMany.mockResolvedValue([woWithoutCompletionTime]);

      const result = await service.getLocalHistory(TENANT_ID, VEHICLE_ID);

      expect(result).toHaveLength(1);
      expect(result[0].eventDate).toEqual(woWithoutCompletionTime.createdAt);
    });

    it('should use customerRequest as fallback when diagnosis is null', async () => {
      const woWithCustomerRequest = {
        ...mockWorkOrder,
        diagnosis: null,
        customerRequest: 'Verificare consumi olio',
      };
      prisma.workOrder.findMany.mockResolvedValue([woWithCustomerRequest]);

      const result = await service.getLocalHistory(TENANT_ID, VEHICLE_ID);

      expect(result).toHaveLength(1);
      expect(result[0].description).toContain('Verificare consumi olio');
    });

    it('should use generic message when both diagnosis and customerRequest are null', async () => {
      const woWithoutBoth = {
        ...mockWorkOrder,
        diagnosis: null,
        customerRequest: null,
      };
      prisma.workOrder.findMany.mockResolvedValue([woWithoutBoth]);

      const result = await service.getLocalHistory(TENANT_ID, VEHICLE_ID);

      expect(result).toHaveLength(1);
      expect(result[0].description).toContain('Intervento completato');
    });

    it('should correctly use fields from work order', async () => {
      prisma.workOrder.findMany.mockResolvedValue([mockWorkOrder]);

      const result = await service.getLocalHistory(TENANT_ID, VEHICLE_ID);

      expect(result[0]).toMatchObject({
        id: `local-${mockWorkOrder.id}`,
        source: VehicleHistorySource.LOCAL,
        eventType: 'SERVICE',
        eventDate: mockWorkOrder.actualCompletionTime,
        description: `[${mockWorkOrder.woNumber}] ${mockWorkOrder.diagnosis}`,
        mileage: mockWorkOrder.mileageIn,
        shopName: null,
        costCents: mockWorkOrder.totalCost,
        metadata: null,
        importedAt: null,
        createdAt: mockWorkOrder.createdAt,
      });
    });
  });

  describe('importExternalHistory - optional fields', () => {
    it('should handle records with all optional fields null', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicleHistoryRecord.createMany.mockResolvedValue({ count: 1 });

      const dto = {
        source: VehicleHistorySourceDto.MOTORNET,
        records: [
          {
            eventType: 'SERVICE',
            eventDate: '2025-06-15T10:00:00Z',
            description: 'Tagliando',
            // All optional fields omitted
          },
        ],
      };

      const result = await service.importExternalHistory(TENANT_ID, VEHICLE_ID, dto);

      expect(result.imported).toBe(1);
      expect(prisma.vehicleHistoryRecord.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            vin: null,
            mileage: null,
            shopName: null,
            costCents: null,
            metadata: expect.any(Object),
          }),
        ]),
      });
    });

    it('should preserve mileage when provided', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicleHistoryRecord.createMany.mockResolvedValue({ count: 1 });

      const dto = {
        source: VehicleHistorySourceDto.CARFAX,
        records: [
          {
            eventType: 'SERVICE',
            eventDate: '2025-06-15T10:00:00Z',
            description: 'Tagliando',
            mileage: 45000,
          },
        ],
      };

      const result = await service.importExternalHistory(TENANT_ID, VEHICLE_ID, dto);

      expect(result.imported).toBe(1);
      expect(prisma.vehicleHistoryRecord.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            mileage: 45000,
          }),
        ]),
      });
    });

    it('should preserve shopName when provided', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicleHistoryRecord.createMany.mockResolvedValue({ count: 1 });

      const dto = {
        source: VehicleHistorySourceDto.MOTORNET,
        records: [
          {
            eventType: 'REPAIR',
            eventDate: '2025-06-15T10:00:00Z',
            description: 'Riparazione',
            shopName: 'Officina Bianchi',
          },
        ],
      };

      const result = await service.importExternalHistory(TENANT_ID, VEHICLE_ID, dto);

      expect(result.imported).toBe(1);
      expect(prisma.vehicleHistoryRecord.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            shopName: 'Officina Bianchi',
          }),
        ]),
      });
    });

    it('should preserve costCents when provided', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicleHistoryRecord.createMany.mockResolvedValue({ count: 1 });

      const dto = {
        source: VehicleHistorySourceDto.MOTORNET,
        records: [
          {
            eventType: 'SERVICE',
            eventDate: '2025-06-15T10:00:00Z',
            description: 'Tagliando con filtri',
            costCents: 25000,
          },
        ],
      };

      const result = await service.importExternalHistory(TENANT_ID, VEHICLE_ID, dto);

      expect(result.imported).toBe(1);
      expect(prisma.vehicleHistoryRecord.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            costCents: expect.any(Prisma.Decimal),
          }),
        ]),
      });
    });

    it('should preserve vin when provided', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicleHistoryRecord.createMany.mockResolvedValue({ count: 1 });

      const dto = {
        source: VehicleHistorySourceDto.CARFAX,
        records: [
          {
            eventType: 'SERVICE',
            eventDate: '2025-06-15T10:00:00Z',
            description: 'Tagliando',
            vin: 'WVWZZZ3CZWE654321',
          },
        ],
      };

      const result = await service.importExternalHistory(TENANT_ID, VEHICLE_ID, dto);

      expect(result.imported).toBe(1);
      expect(prisma.vehicleHistoryRecord.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            vin: 'WVWZZZ3CZWE654321',
          }),
        ]),
      });
    });

    it('should preserve metadata when provided', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicleHistoryRecord.createMany.mockResolvedValue({ count: 1 });

      const dto = {
        source: VehicleHistorySourceDto.MOTORNET,
        records: [
          {
            eventType: 'SERVICE',
            eventDate: '2025-06-15T10:00:00Z',
            description: 'Tagliando',
            metadata: { source_id: 'ext-123', certified: true },
          },
        ],
      };

      const result = await service.importExternalHistory(TENANT_ID, VEHICLE_ID, dto);

      expect(result.imported).toBe(1);
      expect(prisma.vehicleHistoryRecord.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            metadata: expect.objectContaining({ source_id: 'ext-123', certified: true }),
          }),
        ]),
      });
    });

    it('should handle metadata as null when not provided', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicleHistoryRecord.createMany.mockResolvedValue({ count: 1 });

      const dto = {
        source: VehicleHistorySourceDto.MOTORNET,
        records: [
          {
            eventType: 'SERVICE',
            eventDate: '2025-06-15T10:00:00Z',
            description: 'Tagliando',
          },
        ],
      };

      await service.importExternalHistory(TENANT_ID, VEHICLE_ID, dto);

      expect(prisma.vehicleHistoryRecord.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            metadata: expect.any(Object),
          }),
        ]),
      });
    });

    it('should import multiple records from different sources', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicleHistoryRecord.createMany.mockResolvedValue({ count: 3 });

      const dto = {
        source: VehicleHistorySourceDto.MOTORNET,
        records: [
          {
            eventType: 'SERVICE',
            eventDate: '2025-01-15T10:00:00Z',
            description: 'Tagliando invernale',
            mileage: 40000,
          },
          {
            eventType: 'REPAIR',
            eventDate: '2025-03-20T14:00:00Z',
            description: 'Sostituzione pastiglie',
            costCents: 15000,
          },
          {
            eventType: 'INSPECTION',
            eventDate: '2025-05-10T09:00:00Z',
            description: 'Revisione annuale',
            shopName: 'Officina Rossi',
          },
        ],
      };

      const result = await service.importExternalHistory(TENANT_ID, VEHICLE_ID, dto);

      expect(result.imported).toBe(3);
      expect(prisma.vehicleHistoryRecord.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            eventType: 'SERVICE',
            mileage: 40000,
          }),
          expect.objectContaining({
            eventType: 'REPAIR',
            costCents: expect.any(Prisma.Decimal),
          }),
          expect.objectContaining({
            eventType: 'INSPECTION',
            shopName: 'Officina Rossi',
          }),
        ]),
      });
    });
  });

  describe('addManualRecord - optional fields', () => {
    it('should throw NotFoundException when vehicle not found', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(
        service.addManualRecord(TENANT_ID, 'nonexistent', {
          eventType: 'SERVICE',
          eventDate: '2026-03-01T10:00:00Z',
          description: 'Test',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create record with optional fields null', async () => {
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
      };

      const result = await service.addManualRecord(TENANT_ID, VEHICLE_ID, dto);

      expect(result).toBeDefined();
      expect(prisma.vehicleHistoryRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          vehicleId: VEHICLE_ID,
          source: VehicleHistorySource.MANUAL,
        }),
      });
    });

    it('should create record with optional mileage provided', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      const createdRecord = {
        ...mockHistoryRecord,
        source: VehicleHistorySource.MANUAL,
        mileage: 65000,
      };
      prisma.vehicleHistoryRecord.create.mockResolvedValue(createdRecord);

      const dto = {
        eventType: 'SERVICE',
        eventDate: '2026-03-01T10:00:00Z',
        description: 'Cambio olio manuale',
        mileage: 65000,
      };

      const result = await service.addManualRecord(TENANT_ID, VEHICLE_ID, dto);

      expect(result.mileage).toBe(65000);
      expect(prisma.vehicleHistoryRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          mileage: 65000,
        }),
      });
    });

    it('should create record with optional costCents provided', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      const createdRecord = {
        ...mockHistoryRecord,
        source: VehicleHistorySource.MANUAL,
        costCents: new Prisma.Decimal(20000),
      };
      prisma.vehicleHistoryRecord.create.mockResolvedValue(createdRecord);

      const dto = {
        eventType: 'SERVICE',
        eventDate: '2026-03-01T10:00:00Z',
        description: 'Cambio olio manuale',
        costCents: 20000,
      };

      const result = await service.addManualRecord(TENANT_ID, VEHICLE_ID, dto);

      expect(prisma.vehicleHistoryRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          costCents: expect.any(Prisma.Decimal),
        }),
      });
    });

    it('should create record with optional shopName provided', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      const createdRecord = {
        ...mockHistoryRecord,
        source: VehicleHistorySource.MANUAL,
        shopName: 'Officina Privata',
      };
      prisma.vehicleHistoryRecord.create.mockResolvedValue(createdRecord);

      const dto = {
        eventType: 'SERVICE',
        eventDate: '2026-03-01T10:00:00Z',
        description: 'Cambio olio manuale',
        shopName: 'Officina Privata',
      };

      const result = await service.addManualRecord(TENANT_ID, VEHICLE_ID, dto);

      expect(result.shopName).toBe('Officina Privata');
    });

    it('should create record with optional vin provided', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      const createdRecord = {
        ...mockHistoryRecord,
        source: VehicleHistorySource.MANUAL,
        vin: 'WVWZZZ3CZWE999888',
      };
      prisma.vehicleHistoryRecord.create.mockResolvedValue(createdRecord);

      const dto = {
        eventType: 'SERVICE',
        eventDate: '2026-03-01T10:00:00Z',
        description: 'Cambio olio manuale',
        vin: 'WVWZZZ3CZWE999888',
      };

      const result = await service.addManualRecord(TENANT_ID, VEHICLE_ID, dto);

      expect(result.vin).toBe('WVWZZZ3CZWE999888');
    });

    it('should create record with optional metadata provided', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      const createdRecord = {
        ...mockHistoryRecord,
        source: VehicleHistorySource.MANUAL,
        metadata: { manual_entry: true, user_id: 'user-123' },
      };
      prisma.vehicleHistoryRecord.create.mockResolvedValue(createdRecord);

      const dto = {
        eventType: 'SERVICE',
        eventDate: '2026-03-01T10:00:00Z',
        description: 'Cambio olio manuale',
        metadata: { manual_entry: true, user_id: 'user-123' },
      };

      const result = await service.addManualRecord(TENANT_ID, VEHICLE_ID, dto);

      expect(result.metadata).toEqual({ manual_entry: true, user_id: 'user-123' });
    });
  });

  describe('getFullHistory - filtering and sorting', () => {
    it('should filter external records by non-LOCAL source', async () => {
      const externalRecord1 = {
        ...mockHistoryRecord,
        source: VehicleHistorySource.MOTORNET,
        eventDate: new Date('2025-06-01T10:00:00Z'),
      };
      const externalRecord2 = {
        ...mockHistoryRecord,
        id: 'hist-002',
        source: VehicleHistorySource.CARFAX,
        eventDate: new Date('2025-08-01T10:00:00Z'),
      };

      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.workOrder.findMany.mockResolvedValue([]);
      prisma.vehicleHistoryRecord.findMany.mockResolvedValue([externalRecord2, externalRecord1]);

      const result = await service.getFullHistory(TENANT_ID, VEHICLE_ID);

      expect(prisma.vehicleHistoryRecord.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          vehicleId: VEHICLE_ID,
          source: { not: VehicleHistorySource.LOCAL },
        },
        orderBy: { eventDate: 'desc' },
      });
      expect(result).toHaveLength(2);
    });

    it('should sort all records by date descending', async () => {
      const workOrderDate = new Date('2026-03-01T10:00:00Z');
      const externalDate1 = new Date('2025-01-01T10:00:00Z');
      const externalDate2 = new Date('2025-06-01T10:00:00Z');

      const localRecord = {
        ...mockWorkOrder,
        actualCompletionTime: workOrderDate,
      };
      const externalRecord1 = {
        ...mockHistoryRecord,
        eventDate: externalDate2,
      };
      const externalRecord2 = {
        ...mockHistoryRecord,
        id: 'hist-002',
        eventDate: externalDate1,
      };

      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.workOrder.findMany.mockResolvedValue([localRecord]);
      prisma.vehicleHistoryRecord.findMany.mockResolvedValue([externalRecord1, externalRecord2]);

      const result = await service.getFullHistory(TENANT_ID, VEHICLE_ID);

      expect(result).toHaveLength(3);
      expect(result[0].eventDate).toEqual(workOrderDate); // Most recent
      expect(result[1].eventDate).toEqual(externalDate2);
      expect(result[2].eventDate).toEqual(externalDate1); // Oldest
    });

    it('should return only external records when no local records exist', async () => {
      const externalRecord = {
        ...mockHistoryRecord,
        source: VehicleHistorySource.MOTORNET,
      };

      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.workOrder.findMany.mockResolvedValue([]);
      prisma.vehicleHistoryRecord.findMany.mockResolvedValue([externalRecord]);

      const result = await service.getFullHistory(TENANT_ID, VEHICLE_ID);

      expect(result).toHaveLength(1);
      expect(result[0].source).toBe(VehicleHistorySource.MOTORNET);
    });

    it('should return only local records when no external records exist', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.workOrder.findMany.mockResolvedValue([mockWorkOrder]);
      prisma.vehicleHistoryRecord.findMany.mockResolvedValue([]);

      const result = await service.getFullHistory(TENANT_ID, VEHICLE_ID);

      expect(result).toHaveLength(1);
      expect(result[0].source).toBe(VehicleHistorySource.LOCAL);
    });

    it('should return empty array when no records exist', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.workOrder.findMany.mockResolvedValue([]);
      prisma.vehicleHistoryRecord.findMany.mockResolvedValue([]);

      const result = await service.getFullHistory(TENANT_ID, VEHICLE_ID);

      expect(result).toEqual([]);
    });

    it('should correctly spread arrays when merging local and external records', async () => {
      const localRecord = {
        ...mockWorkOrder,
        actualCompletionTime: new Date('2026-03-01T10:00:00Z'),
      };
      const externalRecord1 = {
        ...mockHistoryRecord,
        id: 'hist-ext-1',
        eventDate: new Date('2025-06-01T10:00:00Z'),
      };
      const externalRecord2 = {
        ...mockHistoryRecord,
        id: 'hist-ext-2',
        eventDate: new Date('2025-09-01T10:00:00Z'),
      };

      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.workOrder.findMany.mockResolvedValue([localRecord]);
      prisma.vehicleHistoryRecord.findMany.mockResolvedValue([externalRecord1, externalRecord2]);

      const result = await service.getFullHistory(TENANT_ID, VEHICLE_ID);

      expect(result).toHaveLength(3);
      expect(result).toContainEqual(expect.objectContaining({ id: 'hist-ext-1' }));
      expect(result).toContainEqual(expect.objectContaining({ id: 'hist-ext-2' }));
      expect(result).toContainEqual(
        expect.objectContaining({ source: VehicleHistorySource.LOCAL }),
      );
    });

    it('should handle concurrent Promise.all resolution correctly', async () => {
      const localRecord = { ...mockWorkOrder };
      const externalRecord = { ...mockHistoryRecord };

      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.workOrder.findMany.mockResolvedValue([localRecord]);
      prisma.vehicleHistoryRecord.findMany.mockResolvedValue([externalRecord]);

      const result = await service.getFullHistory(TENANT_ID, VEHICLE_ID);

      expect(prisma.workOrder.findMany).toHaveBeenCalled();
      expect(prisma.vehicleHistoryRecord.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });
  });

  describe('vehicle existence validation', () => {
    it('should validate vehicle exists before getting local history via getFullHistory', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.workOrder.findMany.mockResolvedValue([mockWorkOrder]);
      prisma.vehicleHistoryRecord.findMany.mockResolvedValue([]);

      await service.getFullHistory(TENANT_ID, VEHICLE_ID);

      expect(prisma.vehicle.findFirst).toHaveBeenCalledWith({
        where: { id: VEHICLE_ID, tenantId: TENANT_ID, deletedAt: null },
        select: { id: true },
      });
    });

    it('should validate vehicle exists before importing external history', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicleHistoryRecord.createMany.mockResolvedValue({ count: 1 });

      const dto = {
        source: VehicleHistorySourceDto.MOTORNET,
        records: [
          {
            eventType: 'SERVICE',
            eventDate: '2025-06-15T10:00:00Z',
            description: 'Tagliando',
          },
        ],
      };

      await service.importExternalHistory(TENANT_ID, VEHICLE_ID, dto);

      expect(prisma.vehicle.findFirst).toHaveBeenCalledWith({
        where: { id: VEHICLE_ID, tenantId: TENANT_ID, deletedAt: null },
        select: { id: true },
      });
    });

    it('should validate vehicle exists before adding manual record', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      const createdRecord = { ...mockHistoryRecord, source: VehicleHistorySource.MANUAL };
      prisma.vehicleHistoryRecord.create.mockResolvedValue(createdRecord);

      const dto = {
        eventType: 'SERVICE',
        eventDate: '2026-03-01T10:00:00Z',
        description: 'Cambio olio',
      };

      await service.addManualRecord(TENANT_ID, VEHICLE_ID, dto);

      expect(prisma.vehicle.findFirst).toHaveBeenCalledWith({
        where: { id: VEHICLE_ID, tenantId: TENANT_ID, deletedAt: null },
        select: { id: true },
      });
    });

    it('should filter soft-deleted vehicles', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.getFullHistory(TENANT_ID, VEHICLE_ID)).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.vehicle.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({ deletedAt: null }),
        select: { id: true },
      });
    });
  });

  describe('Prisma Decimal handling', () => {
    it('should correctly create Decimal instances for costCents in import', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicleHistoryRecord.createMany.mockResolvedValue({ count: 1 });

      const dto = {
        source: VehicleHistorySourceDto.MOTORNET,
        records: [
          {
            eventType: 'SERVICE',
            eventDate: '2025-06-15T10:00:00Z',
            description: 'Tagliando',
            costCents: 123456,
          },
        ],
      };

      await service.importExternalHistory(TENANT_ID, VEHICLE_ID, dto);

      expect(prisma.vehicleHistoryRecord.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            costCents: expect.any(Prisma.Decimal),
          }),
        ]),
      });
    });

    it('should handle null costCents without Decimal conversion', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicleHistoryRecord.createMany.mockResolvedValue({ count: 1 });

      const dto = {
        source: VehicleHistorySourceDto.MOTORNET,
        records: [
          {
            eventType: 'SERVICE',
            eventDate: '2025-06-15T10:00:00Z',
            description: 'Tagliando',
          },
        ],
      };

      await service.importExternalHistory(TENANT_ID, VEHICLE_ID, dto);

      expect(prisma.vehicleHistoryRecord.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            costCents: null,
          }),
        ]),
      });
    });
  });

  describe('tenantId isolation checks', () => {
    it('getFullHistory includes tenantId in vehicle query', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.workOrder.findMany.mockResolvedValue([]);
      prisma.vehicleHistoryRecord.findMany.mockResolvedValue([]);

      await service.getFullHistory(TENANT_ID, VEHICLE_ID);

      expect(prisma.vehicle.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({ tenantId: TENANT_ID }),
        select: { id: true },
      });
    });

    it('getLocalHistory includes tenantId in workOrder query', async () => {
      prisma.workOrder.findMany.mockResolvedValue([]);

      await service.getLocalHistory(TENANT_ID, VEHICLE_ID);

      expect(prisma.workOrder.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ tenantId: TENANT_ID }),
        orderBy: { actualCompletionTime: 'desc' },
        select: expect.any(Object),
      });
    });

    it('importExternalHistory includes tenantId in all created records', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicleHistoryRecord.createMany.mockResolvedValue({ count: 2 });

      const dto = {
        source: VehicleHistorySourceDto.MOTORNET,
        records: [
          {
            eventType: 'SERVICE',
            eventDate: '2025-06-15T10:00:00Z',
            description: 'Service 1',
          },
          {
            eventType: 'REPAIR',
            eventDate: '2025-07-15T10:00:00Z',
            description: 'Service 2',
          },
        ],
      };

      await service.importExternalHistory(TENANT_ID, VEHICLE_ID, dto);

      expect(prisma.vehicleHistoryRecord.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ tenantId: TENANT_ID }),
          expect.objectContaining({ tenantId: TENANT_ID }),
        ]),
      });
    });

    it('addManualRecord includes tenantId in created record', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      const createdRecord = {
        ...mockHistoryRecord,
        source: VehicleHistorySource.MANUAL,
      };
      prisma.vehicleHistoryRecord.create.mockResolvedValue(createdRecord);

      const dto = {
        eventType: 'SERVICE',
        eventDate: '2026-03-01T10:00:00Z',
        description: 'Manual entry',
      };

      await service.addManualRecord(TENANT_ID, VEHICLE_ID, dto);

      expect(prisma.vehicleHistoryRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ tenantId: TENANT_ID }),
      });
    });
  });

  describe('workOrder status filtering', () => {
    it('should only include COMPLETED work orders', async () => {
      const completedWo = { ...mockWorkOrder, status: 'COMPLETED' };
      prisma.workOrder.findMany.mockResolvedValue([completedWo]);

      await service.getLocalHistory(TENANT_ID, VEHICLE_ID);

      expect(prisma.workOrder.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: { in: ['COMPLETED', 'INVOICED'] },
        }),
        orderBy: { actualCompletionTime: 'desc' },
        select: expect.any(Object),
      });
    });

    it('should only include INVOICED work orders', async () => {
      const invoicedWo = { ...mockWorkOrder, status: 'INVOICED' };
      prisma.workOrder.findMany.mockResolvedValue([invoicedWo]);

      await service.getLocalHistory(TENANT_ID, VEHICLE_ID);

      expect(prisma.workOrder.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: { in: ['COMPLETED', 'INVOICED'] },
        }),
        orderBy: { actualCompletionTime: 'desc' },
        select: expect.any(Object),
      });
    });

    it('should exclude pending work orders', async () => {
      prisma.workOrder.findMany.mockResolvedValue([]);

      await service.getLocalHistory(TENANT_ID, VEHICLE_ID);

      expect(prisma.workOrder.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: { in: ['COMPLETED', 'INVOICED'] },
        }),
        orderBy: { actualCompletionTime: 'desc' },
        select: expect.any(Object),
      });
    });
  });

  describe('source type conversions', () => {
    it('should handle MOTORNET source type conversion', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicleHistoryRecord.createMany.mockResolvedValue({ count: 1 });

      const dto = {
        source: VehicleHistorySourceDto.MOTORNET,
        records: [
          {
            eventType: 'SERVICE',
            eventDate: '2025-06-15T10:00:00Z',
            description: 'From Motornet',
          },
        ],
      };

      await service.importExternalHistory(TENANT_ID, VEHICLE_ID, dto);

      expect(prisma.vehicleHistoryRecord.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            source: VehicleHistorySource.MOTORNET,
          }),
        ]),
      });
    });

    it('should handle CARFAX source type conversion', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicleHistoryRecord.createMany.mockResolvedValue({ count: 1 });

      const dto = {
        source: VehicleHistorySourceDto.CARFAX,
        records: [
          {
            eventType: 'SERVICE',
            eventDate: '2025-06-15T10:00:00Z',
            description: 'From Carfax',
          },
        ],
      };

      await service.importExternalHistory(TENANT_ID, VEHICLE_ID, dto);

      expect(prisma.vehicleHistoryRecord.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            source: VehicleHistorySource.CARFAX,
          }),
        ]),
      });
    });

    it('should set MANUAL source for manual records', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      const createdRecord = {
        ...mockHistoryRecord,
        source: VehicleHistorySource.MANUAL,
      };
      prisma.vehicleHistoryRecord.create.mockResolvedValue(createdRecord);

      const dto = {
        eventType: 'SERVICE',
        eventDate: '2026-03-01T10:00:00Z',
        description: 'Manual record',
      };

      const result = await service.addManualRecord(TENANT_ID, VEHICLE_ID, dto);

      expect(result.source).toBe(VehicleHistorySource.MANUAL);
      expect(prisma.vehicleHistoryRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          source: VehicleHistorySource.MANUAL,
        }),
      });
    });
  });

  describe('date handling', () => {
    it('should set importedAt timestamp when importing', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicleHistoryRecord.createMany.mockResolvedValue({ count: 1 });

      const beforeImport = new Date();
      const dto = {
        source: VehicleHistorySourceDto.MOTORNET,
        records: [
          {
            eventType: 'SERVICE',
            eventDate: '2025-06-15T10:00:00Z',
            description: 'Service',
          },
        ],
      };

      await service.importExternalHistory(TENANT_ID, VEHICLE_ID, dto);

      expect(prisma.vehicleHistoryRecord.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            importedAt: expect.any(Date),
          }),
        ]),
      });

      const call = prisma.vehicleHistoryRecord.createMany.mock.calls[0][0];
      const importedAt = (call.data as any)[0].importedAt;
      expect(importedAt.getTime()).toBeGreaterThanOrEqual(beforeImport.getTime());
    });

    it('should not set importedAt for manual records', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      const createdRecord = {
        ...mockHistoryRecord,
        source: VehicleHistorySource.MANUAL,
        importedAt: null,
      };
      prisma.vehicleHistoryRecord.create.mockResolvedValue(createdRecord);

      const dto = {
        eventType: 'SERVICE',
        eventDate: '2026-03-01T10:00:00Z',
        description: 'Manual',
      };

      const result = await service.addManualRecord(TENANT_ID, VEHICLE_ID, dto);

      expect(result.importedAt).toBeNull();
    });

    it('should parse eventDate strings to Date objects', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicleHistoryRecord.createMany.mockResolvedValue({ count: 1 });

      const dto = {
        source: VehicleHistorySourceDto.MOTORNET,
        records: [
          {
            eventType: 'SERVICE',
            eventDate: '2025-06-15T14:30:00Z',
            description: 'Service',
          },
        ],
      };

      await service.importExternalHistory(TENANT_ID, VEHICLE_ID, dto);

      expect(prisma.vehicleHistoryRecord.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            eventDate: expect.any(Date),
          }),
        ]),
      });
    });

    it('should handle costCents value of 0', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicleHistoryRecord.createMany.mockResolvedValue({ count: 1 });

      const dto = {
        source: VehicleHistorySourceDto.CARFAX,
        records: [
          {
            eventType: 'INSPECTION',
            eventDate: '2025-06-20T10:00:00Z',
            description: 'Free inspection',
            costCents: 0,
          },
        ],
      };

      await service.importExternalHistory(TENANT_ID, VEHICLE_ID, dto);

      expect(prisma.vehicleHistoryRecord.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            costCents: expect.any(Prisma.Decimal),
          }),
        ]),
      });
    });

    it('should preserve metadata when provided', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicleHistoryRecord.createMany.mockResolvedValue({ count: 1 });

      const testMetadata = { mileage: 150000, condition: 'good' };
      const dto = {
        source: VehicleHistorySourceDto.MOTORNET,
        records: [
          {
            eventType: 'SERVICE',
            eventDate: '2025-06-15T10:00:00Z',
            description: 'Service with metadata',
            metadata: testMetadata,
          },
        ],
      };

      await service.importExternalHistory(TENANT_ID, VEHICLE_ID, dto);

      expect(prisma.vehicleHistoryRecord.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            metadata: expect.objectContaining(testMetadata),
          }),
        ]),
      });
    });

    it('should handle all optional fields in a single record', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicleHistoryRecord.createMany.mockResolvedValue({ count: 1 });

      const fullMetadata = { notes: 'complete record', engineer: 'john' };
      const dto = {
        source: VehicleHistorySourceDto.CARFAX,
        records: [
          {
            eventType: 'ACCIDENT',
            eventDate: '2025-07-15T15:30:00Z',
            description: 'Full accident record',
            vin: 'WBADT43452G915156',
            mileage: 152000,
            shopName: 'Advanced Auto',
            costCents: 500000,
            metadata: fullMetadata,
          },
        ],
      };

      await service.importExternalHistory(TENANT_ID, VEHICLE_ID, dto);

      expect(prisma.vehicleHistoryRecord.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            vin: 'WBADT43452G915156',
            mileage: 152000,
            shopName: 'Advanced Auto',
            costCents: expect.any(Prisma.Decimal),
            metadata: expect.objectContaining(fullMetadata),
          }),
        ]),
      });
    });

    it('should handle source conversion for all external sources', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicleHistoryRecord.createMany.mockResolvedValue({ count: 3 });

      const dto = {
        source: VehicleHistorySourceDto.MOTORNET,
        records: [
          {
            eventType: 'SERVICE',
            eventDate: '2025-01-01T00:00:00Z',
            description: 'Motornet record',
          },
          {
            eventType: 'REPAIR',
            eventDate: '2025-02-01T00:00:00Z',
            description: 'Motornet repair',
          },
          {
            eventType: 'INSPECTION',
            eventDate: '2025-03-01T00:00:00Z',
            description: 'Motornet inspection',
          },
        ],
      };

      await service.importExternalHistory(TENANT_ID, VEHICLE_ID, dto);

      expect(prisma.vehicleHistoryRecord.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ eventType: 'SERVICE' }),
          expect.objectContaining({ eventType: 'REPAIR' }),
          expect.objectContaining({ eventType: 'INSPECTION' }),
        ]),
      });
    });

    it('should correctly handle same-day event dates in sorting', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      const sameDateLocal = {
        ...mockWorkOrder,
        actualCompletionTime: new Date('2025-06-15T10:00:00Z'),
      };
      const sameDateExternal = {
        ...mockHistoryRecord,
        eventDate: new Date('2025-06-15T10:00:00Z'),
      };

      prisma.workOrder.findMany.mockResolvedValue([sameDateLocal]);
      prisma.vehicleHistoryRecord.findMany.mockResolvedValue([sameDateExternal]);

      const result = await service.getFullHistory(TENANT_ID, VEHICLE_ID);

      // Both records should be present and properly sorted
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.some(r => r.source === VehicleHistorySource.LOCAL)).toBe(true);
      expect(result.some(r => r.source === VehicleHistorySource.MOTORNET)).toBe(true);
    });
  });
});
