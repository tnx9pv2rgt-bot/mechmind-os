import { Test, TestingModule } from '@nestjs/testing';
import { CustomerController } from '../controllers/customer.controller';
import { CustomerService } from '../services/customer.service';
// Legacy GdprService removed - use src/gdpr/ module instead
import { VehicleService } from '../services/vehicle.service';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerSearchDto,
} from '../dto/customer.dto';
import { CreateVehicleDto, UpdateVehicleDto } from '../dto/vehicle.dto';

describe('CustomerController', () => {
  let controller: CustomerController;
  let customerService: CustomerService;
  // Legacy gdprService removed
  let vehicleService: VehicleService;

  const mockTenantId = 'tenant-123';
  const mockCustomerId = 'customer-456';
  const mockVehicleId = 'vehicle-789';

  const mockCustomerService = {
    create: jest.fn(),
    findAll: jest.fn(),
    search: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockVehicleService = {
    create: jest.fn(),
    findByCustomer: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerController],
      providers: [
        {
          provide: CustomerService,
          useValue: mockCustomerService,
        },
        {
          provide: VehicleService,
          useValue: mockVehicleService,
        },
      ],
    }).compile();

    controller = module.get<CustomerController>(CustomerController);
    customerService = module.get<CustomerService>(CustomerService);
    vehicleService = module.get<VehicleService>(VehicleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  // ==================== CUSTOMER ENDPOINTS ====================

  describe('createCustomer', () => {
    const createDto: CreateCustomerDto = {
      phone: '+390123456789',
      email: 'test@example.com',
      firstName: 'Mario',
      lastName: 'Rossi',
      gdprConsent: true,
      marketingConsent: false,
      notes: 'Test customer',
    };

    it('should create a customer and return success response', async () => {
      const mockCustomer = {
        id: mockCustomerId,
        phone: createDto.phone,
        email: createDto.email,
        firstName: createDto.firstName,
        lastName: createDto.lastName,
        gdprConsent: true,
        gdprConsentAt: new Date(),
        marketingConsent: false,
        notes: createDto.notes,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCustomerService.create.mockResolvedValueOnce(mockCustomer);

      const result = await controller.createCustomer(mockTenantId, createDto);

      expect(mockCustomerService.create).toHaveBeenCalledWith(mockTenantId, createDto);

      expect(result).toEqual({
        success: true,
        data: mockCustomer,
      });
    });
  });

  describe('getCustomers', () => {
    it('should return all customers with pagination', async () => {
      const mockCustomers = [
        {
          id: 'customer-1',
          phone: '+390000000001',
          email: 'customer1@example.com',
          firstName: 'Mario',
          lastName: 'Rossi',
          gdprConsent: true,
          gdprConsentAt: new Date(),
          marketingConsent: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'customer-2',
          phone: '+390000000002',
          email: null,
          firstName: null,
          lastName: null,
          gdprConsent: false,
          gdprConsentAt: null,
          marketingConsent: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockCustomerService.findAll.mockResolvedValueOnce({
        customers: mockCustomers,
        total: 2,
      });

      const result = await controller.getCustomers(mockTenantId, '10', '0');

      expect(mockCustomerService.findAll).toHaveBeenCalledWith(mockTenantId, {
        limit: 10,
        offset: 0,
      });

      expect(result).toEqual({
        success: true,
        data: mockCustomers,
        meta: {
          total: 2,
          limit: 10,
          offset: 0,
        },
      });
    });

    it('should use default pagination when query params not provided', async () => {
      mockCustomerService.findAll.mockResolvedValueOnce({
        customers: [],
        total: 0,
      });

      const result = await controller.getCustomers(mockTenantId);

      expect(mockCustomerService.findAll).toHaveBeenCalledWith(mockTenantId, {
        limit: undefined,
        offset: undefined,
      });

      expect(result.meta).toEqual({
        total: 0,
        limit: 50,
        offset: 0,
      });
    });

    it('should parse string query params to integers', async () => {
      mockCustomerService.findAll.mockResolvedValueOnce({
        customers: [],
        total: 0,
      });

      await controller.getCustomers(mockTenantId, '25', '50');

      expect(mockCustomerService.findAll).toHaveBeenCalledWith(mockTenantId, {
        limit: 25,
        offset: 50,
      });
    });
  });

  describe('searchCustomers', () => {
    const searchQuery: CustomerSearchDto = {
      name: 'Mario',
      email: 'test@example.com',
      phone: '+390123456789',
      limit: 20,
      offset: 10,
    };

    it('should search customers with filters', async () => {
      const mockCustomers = [
        {
          id: mockCustomerId,
          phone: '+390123456789',
          email: 'test@example.com',
          firstName: 'Mario',
          lastName: 'Rossi',
          gdprConsent: true,
          gdprConsentAt: new Date(),
          marketingConsent: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockCustomerService.search.mockResolvedValueOnce({
        customers: mockCustomers,
        total: 1,
      });

      const result = await controller.searchCustomers(mockTenantId, searchQuery);

      expect(mockCustomerService.search).toHaveBeenCalledWith(mockTenantId, {
        name: searchQuery.name,
        email: searchQuery.email,
        limit: searchQuery.limit,
        offset: searchQuery.offset,
      });

      expect(result).toEqual({
        success: true,
        data: mockCustomers,
        meta: {
          total: 1,
        },
      });
    });

    it('should search with empty query', async () => {
      const emptyQuery: CustomerSearchDto = {};

      mockCustomerService.search.mockResolvedValueOnce({
        customers: [],
        total: 0,
      });

      const result = await controller.searchCustomers(mockTenantId, emptyQuery);

      expect(mockCustomerService.search).toHaveBeenCalledWith(mockTenantId, {
        name: undefined,
        email: undefined,
        limit: undefined,
        offset: undefined,
      });

      expect(result).toEqual({
        success: true,
        data: [],
        meta: {
          total: 0,
        },
      });
    });
  });

  describe('getCustomer', () => {
    it('should return customer by ID', async () => {
      const mockCustomer = {
        id: mockCustomerId,
        phone: '+390123456789',
        email: 'test@example.com',
        firstName: 'Mario',
        lastName: 'Rossi',
        gdprConsent: true,
        gdprConsentAt: new Date(),
        marketingConsent: false,
        notes: 'Test notes',
        createdAt: new Date(),
        updatedAt: new Date(),
        vehicles: [],
        bookings: [],
      };

      mockCustomerService.findById.mockResolvedValueOnce(mockCustomer);

      const result = await controller.getCustomer(mockTenantId, mockCustomerId);

      expect(mockCustomerService.findById).toHaveBeenCalledWith(mockTenantId, mockCustomerId);

      expect(result).toEqual({
        success: true,
        data: mockCustomer,
      });
    });
  });

  describe('updateCustomer', () => {
    const updateDto: UpdateCustomerDto = {
      phone: '+390987654321',
      email: 'updated@example.com',
      firstName: 'Updated',
      lastName: 'Name',
      notes: 'Updated notes',
    };

    it('should update customer and return updated data', async () => {
      const mockUpdatedCustomer = {
        id: mockCustomerId,
        phone: updateDto.phone,
        email: updateDto.email,
        firstName: updateDto.firstName,
        lastName: updateDto.lastName,
        gdprConsent: true,
        gdprConsentAt: new Date(),
        marketingConsent: false,
        notes: updateDto.notes,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCustomerService.update.mockResolvedValueOnce(mockUpdatedCustomer);

      const result = await controller.updateCustomer(mockTenantId, mockCustomerId, updateDto);

      expect(mockCustomerService.update).toHaveBeenCalledWith(mockTenantId, mockCustomerId, updateDto);

      expect(result).toEqual({
        success: true,
        data: mockUpdatedCustomer,
      });
    });
  });

  // ==================== VEHICLE ENDPOINTS ====================

  describe('addVehicle', () => {
    const createVehicleDto: CreateVehicleDto = {
      licensePlate: 'AB123CD',
      make: 'Fiat',
      model: 'Panda',
      year: 2020,
      vin: 'ZFA3120000J123456',
      notes: 'Vehicle notes',
    };

    it('should add vehicle to customer', async () => {
      const mockVehicle = {
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

      mockVehicleService.create.mockResolvedValueOnce(mockVehicle);

      const result = await controller.addVehicle(mockTenantId, mockCustomerId, createVehicleDto);

      expect(mockVehicleService.create).toHaveBeenCalledWith(
        mockTenantId,
        mockCustomerId,
        createVehicleDto,
      );

      expect(result).toEqual({
        success: true,
        data: mockVehicle,
      });
    });
  });

  describe('getCustomerVehicles', () => {
    it('should return all vehicles for a customer', async () => {
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

      mockVehicleService.findByCustomer.mockResolvedValueOnce(mockVehicles);

      const result = await controller.getCustomerVehicles(mockTenantId, mockCustomerId);

      expect(mockVehicleService.findByCustomer).toHaveBeenCalledWith(mockTenantId, mockCustomerId);

      expect(result).toEqual({
        success: true,
        data: mockVehicles,
      });
    });

    it('should return empty array if customer has no vehicles', async () => {
      mockVehicleService.findByCustomer.mockResolvedValueOnce([]);

      const result = await controller.getCustomerVehicles(mockTenantId, mockCustomerId);

      expect(result).toEqual({
        success: true,
        data: [],
      });
    });
  });

  describe('getVehicle', () => {
    it('should return vehicle by ID', async () => {
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
        bookings: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockVehicleService.findById.mockResolvedValueOnce(mockVehicle);

      const result = await controller.getVehicle(mockTenantId, mockVehicleId);

      expect(mockVehicleService.findById).toHaveBeenCalledWith(mockTenantId, mockVehicleId);

      expect(result).toEqual({
        success: true,
        data: mockVehicle,
      });
    });
  });

  describe('updateVehicle', () => {
    const updateVehicleDto: UpdateVehicleDto = {
      licensePlate: 'XY999ZY',
      make: 'Toyota',
      model: 'Corolla',
      year: 2022,
      notes: 'Updated notes',
    };

    it('should update vehicle and return updated data', async () => {
      const mockUpdatedVehicle = {
        id: mockVehicleId,
        licensePlate: 'XY999ZY',
        make: 'Toyota',
        model: 'Corolla',
        year: 2022,
        vin: 'ZFA3120000J123456',
        notes: 'Updated notes',
        customerId: mockCustomerId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockVehicleService.update.mockResolvedValueOnce(mockUpdatedVehicle);

      const result = await controller.updateVehicle(mockTenantId, mockVehicleId, updateVehicleDto);

      expect(mockVehicleService.update).toHaveBeenCalledWith(
        mockTenantId,
        mockVehicleId,
        updateVehicleDto,
      );

      expect(result).toEqual({
        success: true,
        data: mockUpdatedVehicle,
      });
    });

    it('should update vehicle with partial data', async () => {
      const partialUpdate: UpdateVehicleDto = {
        notes: 'Only updating notes',
      };

      const mockUpdatedVehicle = {
        id: mockVehicleId,
        licensePlate: 'AB123CD',
        make: 'Fiat',
        model: 'Panda',
        year: 2020,
        notes: 'Only updating notes',
        customerId: mockCustomerId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockVehicleService.update.mockResolvedValueOnce(mockUpdatedVehicle);

      const result = await controller.updateVehicle(mockTenantId, mockVehicleId, partialUpdate);

      expect(result.data.notes).toBe('Only updating notes');
    });
  });

  describe('deleteVehicle', () => {
    it('should delete vehicle and return success message', async () => {
      mockVehicleService.delete.mockResolvedValueOnce(undefined);

      const result = await controller.deleteVehicle(mockTenantId, mockVehicleId);

      expect(mockVehicleService.delete).toHaveBeenCalledWith(mockTenantId, mockVehicleId);

      expect(result).toEqual({
        success: true,
        message: 'Vehicle deleted successfully',
      });
    });
  });
});
