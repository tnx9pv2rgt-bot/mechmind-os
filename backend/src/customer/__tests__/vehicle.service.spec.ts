import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VehicleService } from '../services/vehicle.service';
import { PrismaService } from '@common/services/prisma.service';
import { LoggerService } from '@common/services/logger.service';
import { CreateVehicleDto, UpdateVehicleDto } from '../dto/vehicle.dto';

describe('VehicleService', () => {
  let service: VehicleService;

  const mockTenantId = 'tenant-123';
  const mockCustomerId = 'customer-456';
  const mockVehicleId = 'vehicle-789';

  // Create fresh mock for each test
  let mockPrismaClient: any;
  let mockPrismaService: any;
  let mockLoggerService: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPrismaClient = {
      customer: {
        findFirst: jest.fn(),
      },
      vehicle: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    mockPrismaService = {
      withTenant: jest.fn((tenantId, callback) => callback(mockPrismaClient)),
    };

    mockLoggerService = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<VehicleService>(VehicleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('create', () => {
    const createDto: CreateVehicleDto = {
      licensePlate: 'AB 123 CD',
      make: 'Fiat',
      model: 'Panda',
      year: 2020,
      vin: 'ZFA3120000J123456',
      notes: 'Vehicle notes',
    };

    it('should create a vehicle with normalized license plate', async () => {
      const mockCustomer = {
        id: mockCustomerId,
        encryptedPhone: 'enc_phone',
      };

      mockPrismaClient.customer.findFirst.mockResolvedValueOnce(mockCustomer);
      mockPrismaClient.vehicle.findFirst.mockResolvedValueOnce(null);

      const mockCreatedVehicle = {
        id: mockVehicleId,
        licensePlate: 'AB123CD',
        make: 'Fiat',
        model: 'Panda',
        year: 2020,
        vin: 'ZFA3120000J123456',
        notes: 'Vehicle notes',
        customerId: mockCustomerId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.vehicle.create.mockResolvedValueOnce(mockCreatedVehicle);

      const result = await service.create(mockTenantId, mockCustomerId, createDto);

      // Verify customer exists check
      expect(mockPrismaClient.customer.findFirst).toHaveBeenCalledWith({
        where: { id: mockCustomerId, tenantId: mockTenantId },
      });

      // Verify duplicate check
      expect(mockPrismaClient.vehicle.findFirst).toHaveBeenCalledWith({
        where: {
          licensePlate: 'AB123CD',
          customerId: mockCustomerId,
        },
      });

      // Verify vehicle creation with normalized plate (spaces removed)
      expect(mockPrismaClient.vehicle.create).toHaveBeenCalledWith({
        data: {
          licensePlate: 'AB123CD',
          make: 'Fiat',
          model: 'Panda',
          year: 2020,
          vin: 'ZFA3120000J123456',
          notes: 'Vehicle notes',
          customer: { connect: { id: mockCustomerId } },
        },
      });

      expect(mockLoggerService.log).toHaveBeenCalledWith(
        `Created vehicle ${mockVehicleId} for customer ${mockCustomerId}`,
      );

      expect(result).toEqual(mockCreatedVehicle);
    });

    it('should create vehicle with minimal data', async () => {
      const minimalDto: CreateVehicleDto = {
        licensePlate: 'xy 999 zy',
        make: 'Toyota',
        model: 'Yaris',
      };

      const mockCustomer = {
        id: mockCustomerId,
        encryptedPhone: 'enc_phone',
      };

      mockPrismaClient.customer.findFirst.mockResolvedValueOnce(mockCustomer);
      mockPrismaClient.vehicle.findFirst.mockResolvedValueOnce(null);

      const mockCreatedVehicle = {
        id: mockVehicleId,
        licensePlate: 'XY999ZY',
        make: 'Toyota',
        model: 'Yaris',
        year: null,
        vin: null,
        notes: null,
        customerId: mockCustomerId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.vehicle.create.mockResolvedValueOnce(mockCreatedVehicle);

      const result = await service.create(mockTenantId, mockCustomerId, minimalDto);

      expect(mockPrismaClient.vehicle.create).toHaveBeenCalledWith({
        data: {
          licensePlate: 'XY999ZY',
          make: 'Toyota',
          model: 'Yaris',
          year: undefined,
          vin: undefined,
          notes: undefined,
          customer: { connect: { id: mockCustomerId } },
        },
      });

      expect(result.licensePlate).toBe('XY999ZY');
    });

    it('should normalize license plate by removing spaces and uppercasing', async () => {
      const dtoWithSpaces: CreateVehicleDto = {
        licensePlate: '  ab  123  cd  ',
        make: 'Fiat',
        model: 'Panda',
      };

      const mockCustomer = {
        id: mockCustomerId,
        encryptedPhone: 'enc_phone',
      };

      mockPrismaClient.customer.findFirst.mockResolvedValueOnce(mockCustomer);
      mockPrismaClient.vehicle.findFirst.mockResolvedValueOnce(null);

      const mockCreatedVehicle = {
        id: mockVehicleId,
        licensePlate: 'AB123CD',
        make: 'Fiat',
        model: 'Panda',
        customerId: mockCustomerId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.vehicle.create.mockResolvedValueOnce(mockCreatedVehicle);

      await service.create(mockTenantId, mockCustomerId, dtoWithSpaces);

      expect(mockPrismaClient.vehicle.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          licensePlate: 'AB123CD',
        }),
      });
    });

    it('should normalize VIN to uppercase', async () => {
      const dtoWithLowercaseVin: CreateVehicleDto = {
        licensePlate: 'AB123CD',
        make: 'Fiat',
        model: 'Panda',
        vin: 'zfa3120000j123456',
      };

      const mockCustomer = {
        id: mockCustomerId,
        encryptedPhone: 'enc_phone',
      };

      mockPrismaClient.customer.findFirst.mockResolvedValueOnce(mockCustomer);
      mockPrismaClient.vehicle.findFirst.mockResolvedValueOnce(null);

      const mockCreatedVehicle = {
        id: mockVehicleId,
        licensePlate: 'AB123CD',
        make: 'Fiat',
        model: 'Panda',
        vin: 'ZFA3120000J123456',
        customerId: mockCustomerId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.vehicle.create.mockResolvedValueOnce(mockCreatedVehicle);

      await service.create(mockTenantId, mockCustomerId, dtoWithLowercaseVin);

      expect(mockPrismaClient.vehicle.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          vin: 'ZFA3120000J123456',
        }),
      });
    });

    it('should throw NotFoundException if customer does not exist', async () => {
      mockPrismaClient.customer.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.create(mockTenantId, mockCustomerId, createDto),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaClient.vehicle.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if vehicle with same license plate exists', async () => {
      const mockCustomer = {
        id: mockCustomerId,
        encryptedPhone: 'enc_phone',
      };

      const existingVehicle = {
        id: 'existing-vehicle',
        licensePlate: 'AB123CD',
        make: 'Fiat',
        model: 'Panda',
        customerId: mockCustomerId,
      };

      mockPrismaClient.customer.findFirst.mockResolvedValueOnce(mockCustomer);
      mockPrismaClient.vehicle.findFirst.mockResolvedValueOnce(existingVehicle);

      await expect(
        service.create(mockTenantId, mockCustomerId, createDto),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaClient.vehicle.create).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should find vehicle by ID with relations', async () => {
      const mockVehicle = {
        id: mockVehicleId,
        licensePlate: 'AB123CD',
        make: 'Fiat',
        model: 'Panda',
        year: 2020,
        vin: 'ZFA3120000J123456',
        notes: null,
        customerId: mockCustomerId,
        createdAt: new Date(),
        updatedAt: new Date(),
        customer: {
          id: mockCustomerId,
          encryptedPhone: 'enc_phone',
        },
        bookings: [
          { id: 'booking-1', scheduledDate: new Date() },
          { id: 'booking-2', scheduledDate: new Date() },
        ],
      };

      mockPrismaClient.vehicle.findFirst.mockResolvedValueOnce(mockVehicle);

      const result = await service.findById(mockTenantId, mockVehicleId);

      expect(mockPrismaClient.vehicle.findFirst).toHaveBeenCalledWith({
        where: { id: mockVehicleId },
        include: {
          customer: true,
          bookings: {
            orderBy: { scheduledDate: 'desc' },
            take: 5,
          },
        },
      });

      expect(result).toEqual(mockVehicle);
    });

    it('should throw NotFoundException if vehicle not found', async () => {
      mockPrismaClient.vehicle.findFirst.mockResolvedValueOnce(null);

      await expect(service.findById(mockTenantId, mockVehicleId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByCustomer', () => {
    it('should find all vehicles for a customer', async () => {
      const mockCustomer = {
        id: mockCustomerId,
        encryptedPhone: 'enc_phone',
      };

      const mockVehicles = [
        {
          id: 'vehicle-1',
          licensePlate: 'AB123CD',
          make: 'Fiat',
          model: 'Panda',
          year: 2020,
          customerId: mockCustomerId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'vehicle-2',
          licensePlate: 'XY999ZY',
          make: 'Toyota',
          model: 'Yaris',
          year: 2018,
          customerId: mockCustomerId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaClient.customer.findFirst.mockResolvedValueOnce(mockCustomer);
      mockPrismaClient.vehicle.findMany.mockResolvedValueOnce(mockVehicles);

      const result = await service.findByCustomer(mockTenantId, mockCustomerId);

      expect(mockPrismaClient.customer.findFirst).toHaveBeenCalledWith({
        where: { id: mockCustomerId, tenantId: mockTenantId },
      });

      expect(mockPrismaClient.vehicle.findMany).toHaveBeenCalledWith({
        where: { customerId: mockCustomerId },
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toEqual(mockVehicles);
      expect(result).toHaveLength(2);
    });

    it('should return empty array if customer has no vehicles', async () => {
      const mockCustomer = {
        id: mockCustomerId,
        encryptedPhone: 'enc_phone',
      };

      mockPrismaClient.customer.findFirst.mockResolvedValueOnce(mockCustomer);
      mockPrismaClient.vehicle.findMany.mockResolvedValueOnce([]);

      const result = await service.findByCustomer(mockTenantId, mockCustomerId);

      expect(result).toEqual([]);
    });

    it('should throw NotFoundException if customer does not exist', async () => {
      mockPrismaClient.customer.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.findByCustomer(mockTenantId, mockCustomerId),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaClient.vehicle.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findByLicensePlate', () => {
    it('should find vehicle by license plate with normalized input', async () => {
      const licensePlate = 'ab 123 cd';

      const mockVehicle = {
        id: mockVehicleId,
        licensePlate: 'AB123CD',
        make: 'Fiat',
        model: 'Panda',
        year: 2020,
        vin: 'ZFA3120000J123456',
        customerId: mockCustomerId,
        customer: {
          id: mockCustomerId,
          encryptedPhone: 'enc_phone',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.vehicle.findFirst.mockResolvedValueOnce(mockVehicle);

      const result = await service.findByLicensePlate(mockTenantId, licensePlate);

      expect(mockPrismaClient.vehicle.findFirst).toHaveBeenCalledWith({
        where: { licensePlate: 'AB123CD' },
        include: {
          customer: true,
        },
      });

      expect(result).toEqual(mockVehicle);
    });

    it('should return null if vehicle not found by license plate', async () => {
      const licensePlate = 'ZZ999ZZ';

      mockPrismaClient.vehicle.findFirst.mockResolvedValueOnce(null);

      const result = await service.findByLicensePlate(mockTenantId, licensePlate);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const updateDto: UpdateVehicleDto = {
      licensePlate: 'XY 999 ZY',
      make: 'Toyota',
      model: 'Corolla',
      year: 2022,
      vin: 'JTDBU4EE3B9123456',
      notes: 'Updated notes',
    };

    it('should update vehicle with normalized data', async () => {
      const existingVehicle = {
        id: mockVehicleId,
        licensePlate: 'AB123CD',
        make: 'Fiat',
        model: 'Panda',
        year: 2020,
        vin: 'ZFA3120000J123456',
        notes: 'Old notes',
        customerId: mockCustomerId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedVehicle = {
        ...existingVehicle,
        licensePlate: 'XY999ZY',
        make: 'Toyota',
        model: 'Corolla',
        year: 2022,
        vin: 'JTDBU4EE3B9123456',
        notes: 'Updated notes',
      };

      mockPrismaClient.vehicle.findFirst.mockResolvedValueOnce(existingVehicle);
      mockPrismaClient.vehicle.update.mockResolvedValueOnce(updatedVehicle);

      const result = await service.update(mockTenantId, mockVehicleId, updateDto);

      expect(mockPrismaClient.vehicle.findFirst).toHaveBeenCalledWith({
        where: { id: mockVehicleId },
      });

      expect(mockPrismaClient.vehicle.update).toHaveBeenCalledWith({
        where: { id: mockVehicleId },
        data: {
          licensePlate: 'XY999ZY',
          make: 'Toyota',
          model: 'Corolla',
          year: 2022,
          vin: 'JTDBU4EE3B9123456',
          notes: 'Updated notes',
        },
      });

      expect(mockLoggerService.log).toHaveBeenCalledWith(`Updated vehicle ${mockVehicleId}`);

      expect(result).toEqual(updatedVehicle);
    });

    it('should update vehicle with partial data', async () => {
      const partialUpdate: UpdateVehicleDto = {
        notes: 'Only updating notes',
      };

      const existingVehicle = {
        id: mockVehicleId,
        licensePlate: 'AB123CD',
        make: 'Fiat',
        model: 'Panda',
        year: 2020,
        vin: 'ZFA3120000J123456',
        notes: 'Old notes',
        customerId: mockCustomerId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedVehicle = {
        ...existingVehicle,
        notes: 'Only updating notes',
      };

      mockPrismaClient.vehicle.findFirst.mockResolvedValueOnce(existingVehicle);
      mockPrismaClient.vehicle.update.mockResolvedValueOnce(updatedVehicle);

      const result = await service.update(mockTenantId, mockVehicleId, partialUpdate);

      expect(mockPrismaClient.vehicle.update).toHaveBeenCalledWith({
        where: { id: mockVehicleId },
        data: {
          notes: 'Only updating notes',
        },
      });

      expect(result.notes).toBe('Only updating notes');
      expect(result.make).toBe('Fiat'); // unchanged
    });

    it('should update only license plate', async () => {
      const plateUpdate: UpdateVehicleDto = {
        licensePlate: '  new  plate  123  ',
      };

      const existingVehicle = {
        id: mockVehicleId,
        licensePlate: 'AB123CD',
        make: 'Fiat',
        model: 'Panda',
        customerId: mockCustomerId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedVehicle = {
        ...existingVehicle,
        licensePlate: 'NEWPLATE123',
      };

      mockPrismaClient.vehicle.findFirst.mockResolvedValueOnce(existingVehicle);
      mockPrismaClient.vehicle.update.mockResolvedValueOnce(updatedVehicle);

      const result = await service.update(mockTenantId, mockVehicleId, plateUpdate);

      expect(mockPrismaClient.vehicle.update).toHaveBeenCalledWith({
        where: { id: mockVehicleId },
        data: {
          licensePlate: 'NEWPLATE123',
        },
      });
      
      expect(result.licensePlate).toBe('NEWPLATE123');
    });

    it('should handle year set to 0', async () => {
      const yearUpdate: UpdateVehicleDto = {
        year: 0,
      };

      const existingVehicle = {
        id: mockVehicleId,
        licensePlate: 'AB123CD',
        make: 'Fiat',
        model: 'Panda',
        year: 2020,
        customerId: mockCustomerId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedVehicle = {
        ...existingVehicle,
        year: 0,
      };

      mockPrismaClient.vehicle.findFirst.mockResolvedValueOnce(existingVehicle);
      mockPrismaClient.vehicle.update.mockResolvedValueOnce(updatedVehicle);

      const result = await service.update(mockTenantId, mockVehicleId, yearUpdate);

      expect(mockPrismaClient.vehicle.update).toHaveBeenCalledWith({
        where: { id: mockVehicleId },
        data: {
          year: 0,
        },
      });

      expect(result.year).toBe(0);
    });

    it('should throw NotFoundException if vehicle not found', async () => {
      mockPrismaClient.vehicle.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.update(mockTenantId, mockVehicleId, updateDto),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaClient.vehicle.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete vehicle', async () => {
      const existingVehicle = {
        id: mockVehicleId,
        licensePlate: 'AB123CD',
        make: 'Fiat',
        model: 'Panda',
        customerId: mockCustomerId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.vehicle.findFirst.mockResolvedValueOnce(existingVehicle);
      mockPrismaClient.vehicle.delete.mockResolvedValueOnce(existingVehicle);

      await service.delete(mockTenantId, mockVehicleId);

      expect(mockPrismaClient.vehicle.findFirst).toHaveBeenCalledWith({
        where: { id: mockVehicleId },
      });

      expect(mockPrismaClient.vehicle.delete).toHaveBeenCalledWith({
        where: { id: mockVehicleId },
      });

      expect(mockLoggerService.log).toHaveBeenCalledWith(`Deleted vehicle ${mockVehicleId}`);
    });

    it('should throw NotFoundException if vehicle not found', async () => {
      mockPrismaClient.vehicle.findFirst.mockResolvedValueOnce(null);

      await expect(service.delete(mockTenantId, mockVehicleId)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockPrismaClient.vehicle.delete).not.toHaveBeenCalled();
    });
  });
});
