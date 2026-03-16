import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VehicleService } from './vehicle.service';
import { PrismaService } from '@common/services/prisma.service';
import { LoggerService } from '@common/services/logger.service';
import { CreateVehicleDto, UpdateVehicleDto } from '../dto/vehicle.dto';

describe('VehicleService', () => {
  let service: VehicleService;
  let prisma: Record<string, jest.Mock | Record<string, jest.Mock>>;
  let logger: {
    log: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
    debug: jest.Mock;
  };

  const TENANT_ID = 'tenant-001';
  const CUSTOMER_ID = 'cust-001';
  const VEHICLE_ID = 'vehicle-001';
  const NOW = new Date('2024-06-15T10:00:00Z');

  const mockCustomer = {
    id: CUSTOMER_ID,
    tenantId: TENANT_ID,
    createdAt: NOW,
    updatedAt: NOW,
  };

  const mockVehicle = {
    id: VEHICLE_ID,
    tenantId: TENANT_ID,
    customerId: CUSTOMER_ID,
    licensePlate: 'AB123CD',
    make: 'Fiat',
    model: 'Panda',
    year: 2020,
    vin: 'ZFA3120000J123456',
    notes: 'Test notes',
    createdAt: NOW,
    updatedAt: NOW,
  };

  const mockVehicleWithRelations = {
    ...mockVehicle,
    customer: mockCustomer,
    bookings: [],
  };

  beforeEach(async () => {
    logger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    prisma = {
      withTenant: jest.fn((_tenantId: string, cb: (p: typeof prisma) => Promise<unknown>) =>
        cb(prisma),
      ),
      customer: {
        findFirst: jest.fn(),
      },
      vehicle: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleService,
        { provide: PrismaService, useValue: prisma },
        { provide: LoggerService, useValue: logger },
      ],
    }).compile();

    service = module.get<VehicleService>(VehicleService);
  });

  // ---------------------------------------------------------------------------
  // CREATE
  // ---------------------------------------------------------------------------
  describe('create', () => {
    const createDto: CreateVehicleDto = {
      licensePlate: 'ab 123 cd',
      make: 'Fiat',
      model: 'Panda',
      year: 2020,
      vin: 'zfa3120000j123456',
      notes: 'Test notes',
    };

    it('should create a vehicle and normalize license plate to uppercase without spaces', async () => {
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(mockCustomer);
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValue(null);
      (prisma.vehicle as Record<string, jest.Mock>).create.mockResolvedValue(mockVehicle);

      const result = await service.create(TENANT_ID, CUSTOMER_ID, createDto);

      expect(prisma.withTenant).toHaveBeenCalledWith(TENANT_ID, expect.any(Function));
      expect((prisma.customer as Record<string, jest.Mock>).findFirst).toHaveBeenCalledWith({
        where: { id: CUSTOMER_ID, tenantId: TENANT_ID },
      });
      expect((prisma.vehicle as Record<string, jest.Mock>).findFirst).toHaveBeenCalledWith({
        where: { licensePlate: 'AB123CD', customerId: CUSTOMER_ID },
      });
      expect((prisma.vehicle as Record<string, jest.Mock>).create).toHaveBeenCalledWith({
        data: {
          licensePlate: 'AB123CD',
          make: 'Fiat',
          model: 'Panda',
          year: 2020,
          vin: 'ZFA3120000J123456',
          notes: 'Test notes',
          status: 'active',
          mileage: undefined,
          customer: { connect: { id: CUSTOMER_ID } },
        },
      });
      expect(result).toEqual(mockVehicle);
      expect(logger.log).toHaveBeenCalledWith(
        `Created vehicle ${VEHICLE_ID} for customer ${CUSTOMER_ID}`,
      );
    });

    it('should create a vehicle without optional fields', async () => {
      const minimalDto: CreateVehicleDto = {
        licensePlate: 'XY999ZZ',
        make: 'Toyota',
        model: 'Yaris',
      };

      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(mockCustomer);
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValue(null);
      (prisma.vehicle as Record<string, jest.Mock>).create.mockResolvedValue({
        ...mockVehicle,
        vin: undefined,
        notes: undefined,
      });

      await service.create(TENANT_ID, CUSTOMER_ID, minimalDto);

      expect((prisma.vehicle as Record<string, jest.Mock>).create).toHaveBeenCalledWith({
        data: {
          licensePlate: 'XY999ZZ',
          make: 'Toyota',
          model: 'Yaris',
          year: undefined,
          vin: undefined,
          notes: undefined,
          status: 'active',
          mileage: undefined,
          customer: { connect: { id: CUSTOMER_ID } },
        },
      });
    });

    it('should throw NotFoundException when customer does not exist', async () => {
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(null);

      await expect(service.create(TENANT_ID, CUSTOMER_ID, createDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(TENANT_ID, CUSTOMER_ID, createDto)).rejects.toThrow(
        `Customer ${CUSTOMER_ID} not found`,
      );
      expect((prisma.vehicle as Record<string, jest.Mock>).create).not.toHaveBeenCalled();
    });

    it('should throw when duplicate license plate exists for the same customer', async () => {
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(mockCustomer);
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValue(mockVehicle);

      await expect(service.create(TENANT_ID, CUSTOMER_ID, createDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(TENANT_ID, CUSTOMER_ID, createDto)).rejects.toThrow(
        /already exists for this customer/,
      );
      expect((prisma.vehicle as Record<string, jest.Mock>).create).not.toHaveBeenCalled();
    });

    it('should normalize license plate with mixed spaces and case', async () => {
      const spacedDto: CreateVehicleDto = {
        licensePlate: '  Ab  123  cD  ',
        make: 'BMW',
        model: 'X3',
      };

      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(mockCustomer);
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValue(null);
      (prisma.vehicle as Record<string, jest.Mock>).create.mockResolvedValue(mockVehicle);

      await service.create(TENANT_ID, CUSTOMER_ID, spacedDto);

      expect((prisma.vehicle as Record<string, jest.Mock>).findFirst).toHaveBeenCalledWith({
        where: { licensePlate: 'AB123CD', customerId: CUSTOMER_ID },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // FIND BY ID
  // ---------------------------------------------------------------------------
  describe('findById', () => {
    it('should return vehicle with customer and bookings', async () => {
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValue(
        mockVehicleWithRelations,
      );

      const result = await service.findById(TENANT_ID, VEHICLE_ID);

      expect(prisma.withTenant).toHaveBeenCalledWith(TENANT_ID, expect.any(Function));
      expect((prisma.vehicle as Record<string, jest.Mock>).findFirst).toHaveBeenCalledWith({
        where: { id: VEHICLE_ID },
        include: {
          customer: true,
          bookings: {
            orderBy: { scheduledDate: 'desc' },
            take: 5,
          },
        },
      });
      expect(result).toEqual(mockVehicleWithRelations);
    });

    it('should throw NotFoundException when vehicle does not exist', async () => {
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValue(null);

      await expect(service.findById(TENANT_ID, 'nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findById(TENANT_ID, 'nonexistent-id')).rejects.toThrow(
        'Vehicle nonexistent-id not found',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // FIND BY CUSTOMER
  // ---------------------------------------------------------------------------
  describe('findByCustomer', () => {
    it('should return all vehicles for a customer ordered by createdAt desc', async () => {
      const vehicles = [
        mockVehicle,
        { ...mockVehicle, id: 'vehicle-002', licensePlate: 'ZZ999AA' },
      ];

      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(mockCustomer);
      (prisma.vehicle as Record<string, jest.Mock>).findMany.mockResolvedValue(vehicles);

      const result = await service.findByCustomer(TENANT_ID, CUSTOMER_ID);

      expect(prisma.withTenant).toHaveBeenCalledWith(TENANT_ID, expect.any(Function));
      expect((prisma.customer as Record<string, jest.Mock>).findFirst).toHaveBeenCalledWith({
        where: { id: CUSTOMER_ID, tenantId: TENANT_ID },
      });
      expect((prisma.vehicle as Record<string, jest.Mock>).findMany).toHaveBeenCalledWith({
        where: { customerId: CUSTOMER_ID },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(vehicles);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when customer has no vehicles', async () => {
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(mockCustomer);
      (prisma.vehicle as Record<string, jest.Mock>).findMany.mockResolvedValue([]);

      const result = await service.findByCustomer(TENANT_ID, CUSTOMER_ID);

      expect(result).toEqual([]);
    });

    it('should throw NotFoundException when customer does not exist', async () => {
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(null);

      await expect(service.findByCustomer(TENANT_ID, 'nonexistent-cust')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findByCustomer(TENANT_ID, 'nonexistent-cust')).rejects.toThrow(
        'Customer nonexistent-cust not found',
      );
      expect((prisma.vehicle as Record<string, jest.Mock>).findMany).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // FIND BY LICENSE PLATE
  // ---------------------------------------------------------------------------
  describe('findByLicensePlate', () => {
    it('should return vehicle with customer when found', async () => {
      const vehicleWithCustomer = { ...mockVehicle, customer: mockCustomer };
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValue(
        vehicleWithCustomer,
      );

      const result = await service.findByLicensePlate(TENANT_ID, 'ab 123 cd');

      expect(prisma.withTenant).toHaveBeenCalledWith(TENANT_ID, expect.any(Function));
      expect((prisma.vehicle as Record<string, jest.Mock>).findFirst).toHaveBeenCalledWith({
        where: { licensePlate: 'AB123CD' },
        include: { customer: true },
      });
      expect(result).toEqual(vehicleWithCustomer);
    });

    it('should return null when no vehicle matches the license plate', async () => {
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValue(null);

      const result = await service.findByLicensePlate(TENANT_ID, 'NOTEXIST');

      expect(result).toBeNull();
    });

    it('should normalize license plate before searching', async () => {
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValue(null);

      await service.findByLicensePlate(TENANT_ID, '  ab  123  cd  ');

      expect((prisma.vehicle as Record<string, jest.Mock>).findFirst).toHaveBeenCalledWith({
        where: { licensePlate: 'AB123CD' },
        include: { customer: true },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // UPDATE
  // ---------------------------------------------------------------------------
  describe('update', () => {
    it('should update all provided fields', async () => {
      const updateDto: UpdateVehicleDto = {
        licensePlate: 'zz 999 aa',
        make: 'Toyota',
        model: 'Yaris',
        year: 2022,
        vin: 'jtdkn3du5a0123456',
        notes: 'Updated notes',
      };
      const updatedVehicle = {
        ...mockVehicle,
        licensePlate: 'ZZ999AA',
        make: 'Toyota',
        model: 'Yaris',
        year: 2022,
        vin: 'JTDKN3DU5A0123456',
        notes: 'Updated notes',
      };

      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValue(mockVehicle);
      (prisma.vehicle as Record<string, jest.Mock>).update.mockResolvedValue(updatedVehicle);

      const result = await service.update(TENANT_ID, VEHICLE_ID, updateDto);

      expect(prisma.withTenant).toHaveBeenCalledWith(TENANT_ID, expect.any(Function));
      expect((prisma.vehicle as Record<string, jest.Mock>).findFirst).toHaveBeenCalledWith({
        where: { id: VEHICLE_ID },
      });
      expect((prisma.vehicle as Record<string, jest.Mock>).update).toHaveBeenCalledWith({
        where: { id: VEHICLE_ID },
        data: {
          licensePlate: 'ZZ999AA',
          make: 'Toyota',
          model: 'Yaris',
          year: 2022,
          vin: 'JTDKN3DU5A0123456',
          notes: 'Updated notes',
        },
      });
      expect(result).toEqual(updatedVehicle);
      expect(logger.log).toHaveBeenCalledWith(`Updated vehicle ${VEHICLE_ID}`);
    });

    it('should update only the provided fields (partial update)', async () => {
      const partialDto: UpdateVehicleDto = {
        make: 'Audi',
      };
      const updatedVehicle = { ...mockVehicle, make: 'Audi' };

      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValue(mockVehicle);
      (prisma.vehicle as Record<string, jest.Mock>).update.mockResolvedValue(updatedVehicle);

      await service.update(TENANT_ID, VEHICLE_ID, partialDto);

      expect((prisma.vehicle as Record<string, jest.Mock>).update).toHaveBeenCalledWith({
        where: { id: VEHICLE_ID },
        data: { make: 'Audi' },
      });
    });

    it('should handle year set to 0 (falsy but defined)', async () => {
      const dtoWithZeroYear: UpdateVehicleDto = { year: 0 };

      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValue(mockVehicle);
      (prisma.vehicle as Record<string, jest.Mock>).update.mockResolvedValue({
        ...mockVehicle,
        year: 0,
      });

      await service.update(TENANT_ID, VEHICLE_ID, dtoWithZeroYear);

      // year: 0 is falsy but !== undefined, so it should be included
      expect((prisma.vehicle as Record<string, jest.Mock>).update).toHaveBeenCalledWith({
        where: { id: VEHICLE_ID },
        data: { year: 0 },
      });
    });

    it('should handle notes set to empty string (falsy but defined)', async () => {
      const dtoWithEmptyNotes: UpdateVehicleDto = { notes: '' };

      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValue(mockVehicle);
      (prisma.vehicle as Record<string, jest.Mock>).update.mockResolvedValue({
        ...mockVehicle,
        notes: '',
      });

      await service.update(TENANT_ID, VEHICLE_ID, dtoWithEmptyNotes);

      // notes: '' is falsy but !== undefined, so it should be included
      expect((prisma.vehicle as Record<string, jest.Mock>).update).toHaveBeenCalledWith({
        where: { id: VEHICLE_ID },
        data: { notes: '' },
      });
    });

    it('should update with empty dto (no fields changed)', async () => {
      const emptyDto: UpdateVehicleDto = {};

      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValue(mockVehicle);
      (prisma.vehicle as Record<string, jest.Mock>).update.mockResolvedValue(mockVehicle);

      await service.update(TENANT_ID, VEHICLE_ID, emptyDto);

      expect((prisma.vehicle as Record<string, jest.Mock>).update).toHaveBeenCalledWith({
        where: { id: VEHICLE_ID },
        data: {},
      });
    });

    it('should throw NotFoundException when vehicle does not exist', async () => {
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValue(null);

      await expect(service.update(TENANT_ID, 'nonexistent-id', { make: 'BMW' })).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update(TENANT_ID, 'nonexistent-id', { make: 'BMW' })).rejects.toThrow(
        'Vehicle nonexistent-id not found',
      );
      expect((prisma.vehicle as Record<string, jest.Mock>).update).not.toHaveBeenCalled();
    });

    it('should normalize license plate in update', async () => {
      const dto: UpdateVehicleDto = { licensePlate: '  zz  999  aa  ' };

      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValue(mockVehicle);
      (prisma.vehicle as Record<string, jest.Mock>).update.mockResolvedValue(mockVehicle);

      await service.update(TENANT_ID, VEHICLE_ID, dto);

      expect((prisma.vehicle as Record<string, jest.Mock>).update).toHaveBeenCalledWith({
        where: { id: VEHICLE_ID },
        data: { licensePlate: 'ZZ999AA' },
      });
    });

    it('should uppercase VIN in update', async () => {
      const dto: UpdateVehicleDto = { vin: 'abc1234567890abcd' };

      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValue(mockVehicle);
      (prisma.vehicle as Record<string, jest.Mock>).update.mockResolvedValue(mockVehicle);

      await service.update(TENANT_ID, VEHICLE_ID, dto);

      expect((prisma.vehicle as Record<string, jest.Mock>).update).toHaveBeenCalledWith({
        where: { id: VEHICLE_ID },
        data: { vin: 'ABC1234567890ABCD' },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // DELETE
  // ---------------------------------------------------------------------------
  describe('delete', () => {
    it('should delete an existing vehicle', async () => {
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValue(mockVehicle);
      (prisma.vehicle as Record<string, jest.Mock>).delete.mockResolvedValue(mockVehicle);

      await service.delete(TENANT_ID, VEHICLE_ID);

      expect(prisma.withTenant).toHaveBeenCalledWith(TENANT_ID, expect.any(Function));
      expect((prisma.vehicle as Record<string, jest.Mock>).findFirst).toHaveBeenCalledWith({
        where: { id: VEHICLE_ID },
      });
      expect((prisma.vehicle as Record<string, jest.Mock>).delete).toHaveBeenCalledWith({
        where: { id: VEHICLE_ID },
      });
      expect(logger.log).toHaveBeenCalledWith(`Deleted vehicle ${VEHICLE_ID}`);
    });

    it('should throw NotFoundException when vehicle does not exist', async () => {
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValue(null);

      await expect(service.delete(TENANT_ID, 'nonexistent-id')).rejects.toThrow(NotFoundException);
      await expect(service.delete(TENANT_ID, 'nonexistent-id')).rejects.toThrow(
        'Vehicle nonexistent-id not found',
      );
      expect((prisma.vehicle as Record<string, jest.Mock>).delete).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // TENANT ISOLATION
  // ---------------------------------------------------------------------------
  describe('tenant isolation', () => {
    it('should call withTenant for every public method', async () => {
      // Setup mocks for all methods to succeed
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(mockCustomer);
      (prisma.vehicle as Record<string, jest.Mock>).findFirst
        .mockResolvedValueOnce(null) // create: duplicate check
        .mockResolvedValueOnce(mockVehicleWithRelations) // findById
        .mockResolvedValueOnce({ ...mockVehicle, customer: mockCustomer }) // findByLicensePlate
        .mockResolvedValueOnce(mockVehicle) // update: existence check
        .mockResolvedValueOnce(mockVehicle); // delete: existence check
      (prisma.vehicle as Record<string, jest.Mock>).findMany.mockResolvedValue([]);
      (prisma.vehicle as Record<string, jest.Mock>).create.mockResolvedValue(mockVehicle);
      (prisma.vehicle as Record<string, jest.Mock>).update.mockResolvedValue(mockVehicle);
      (prisma.vehicle as Record<string, jest.Mock>).delete.mockResolvedValue(mockVehicle);

      const createDto: CreateVehicleDto = {
        licensePlate: 'AB123CD',
        make: 'Fiat',
        model: 'Panda',
      };

      await service.create(TENANT_ID, CUSTOMER_ID, createDto); // 1
      await service.findById(TENANT_ID, VEHICLE_ID); // 2
      await service.findByCustomer(TENANT_ID, CUSTOMER_ID); // 3
      await service.findByLicensePlate(TENANT_ID, 'AB123CD'); // 4
      await service.update(TENANT_ID, VEHICLE_ID, { make: 'BMW' }); // 5
      await service.delete(TENANT_ID, VEHICLE_ID); // 6

      expect(prisma.withTenant).toHaveBeenCalledTimes(6);

      for (const call of (prisma.withTenant as jest.Mock).mock.calls) {
        expect(call[0]).toBe(TENANT_ID);
      }
    });

    it('should scope queries to the correct tenant', async () => {
      const differentTenant = 'tenant-other';
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValue(
        mockVehicleWithRelations,
      );

      await service.findById(differentTenant, VEHICLE_ID);

      expect(prisma.withTenant).toHaveBeenCalledWith(differentTenant, expect.any(Function));
    });
  });
});
