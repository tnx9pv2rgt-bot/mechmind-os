import { Test, TestingModule } from '@nestjs/testing';
import { CustomerController } from './customer.controller';
import { CustomerService } from '../services/customer.service';
import { VehicleService } from '../services/vehicle.service';
import { CsvImportExportService } from '../services/csv-import-export.service';

describe('CustomerController', () => {
  let controller: CustomerController;
  let customerService: jest.Mocked<CustomerService>;
  let vehicleService: jest.Mocked<VehicleService>;

  const TENANT_ID = 'tenant-001';

  const mockCustomer = {
    id: 'cust-001',
    tenantId: TENANT_ID,
    firstName: 'Mario',
    lastName: 'Rossi',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockVehicle = {
    id: 'veh-001',
    tenantId: TENANT_ID,
    customerId: 'cust-001',
    make: 'Fiat',
    model: '500',
    year: 2023,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerController],
      providers: [
        {
          provide: CustomerService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            search: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: VehicleService,
          useValue: {
            create: jest.fn(),
            findByCustomer: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: CsvImportExportService,
          useValue: {
            exportCustomers: jest.fn(),
            exportVehicles: jest.fn(),
            importCustomers: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CustomerController>(CustomerController);
    customerService = module.get(CustomerService) as jest.Mocked<CustomerService>;
    vehicleService = module.get(VehicleService) as jest.Mocked<VehicleService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ==================== CUSTOMER ENDPOINTS ====================

  describe('createCustomer', () => {
    it('should delegate to service with tenantId and dto', async () => {
      customerService.create.mockResolvedValue(mockCustomer as never);
      const dto = { firstName: 'Mario', lastName: 'Rossi', email: 'mario@test.com' };

      const result = await controller.createCustomer(TENANT_ID, dto as never);

      expect(customerService.create).toHaveBeenCalledWith(TENANT_ID, dto);
      expect(result).toEqual({ success: true, data: mockCustomer });
    });
  });

  describe('getCustomers', () => {
    it('should delegate to service with parsed pagination', async () => {
      const expected = { customers: [mockCustomer], total: 1 };
      customerService.findAll.mockResolvedValue(expected as never);

      const result = await controller.getCustomers(TENANT_ID, '10', '0');

      expect(customerService.findAll).toHaveBeenCalledWith(TENANT_ID, {
        limit: 10,
        offset: 0,
      });
      expect(result).toEqual({
        success: true,
        data: expected.customers,
        meta: { total: 1, limit: 10, offset: 0 },
      });
    });

    it('should use default pagination when not provided', async () => {
      customerService.findAll.mockResolvedValue({ customers: [], total: 0 } as never);

      const result = await controller.getCustomers(TENANT_ID);

      expect(customerService.findAll).toHaveBeenCalledWith(TENANT_ID, {
        limit: undefined,
        offset: undefined,
      });
      expect(result.meta).toEqual({ total: 0, limit: 50, offset: 0 });
    });
  });

  describe('searchCustomers', () => {
    it('should delegate to service with search query', async () => {
      const expected = { customers: [mockCustomer], total: 1 };
      customerService.search.mockResolvedValue(expected as never);
      const query = { name: 'Mario', email: undefined, limit: 10, offset: 0 };

      const result = await controller.searchCustomers(TENANT_ID, query as never);

      expect(customerService.search).toHaveBeenCalledWith(TENANT_ID, {
        name: 'Mario',
        email: undefined,
        limit: 10,
        offset: 0,
      });
      expect(result).toEqual({
        success: true,
        data: expected.customers,
        meta: { total: 1 },
      });
    });
  });

  describe('getCustomer', () => {
    it('should delegate to service with tenantId and customerId', async () => {
      customerService.findById.mockResolvedValue(mockCustomer as never);

      const result = await controller.getCustomer(TENANT_ID, 'cust-001');

      expect(customerService.findById).toHaveBeenCalledWith(TENANT_ID, 'cust-001');
      expect(result).toEqual({ success: true, data: mockCustomer });
    });
  });

  describe('updateCustomer', () => {
    it('should delegate to service with tenantId, id, and dto', async () => {
      const updated = { ...mockCustomer, firstName: 'Luigi' };
      customerService.update.mockResolvedValue(updated as never);
      const dto = { firstName: 'Luigi' };

      const result = await controller.updateCustomer(TENANT_ID, 'cust-001', dto as never);

      expect(customerService.update).toHaveBeenCalledWith(TENANT_ID, 'cust-001', dto);
      expect(result).toEqual({ success: true, data: updated });
    });
  });

  // ==================== VEHICLE ENDPOINTS ====================

  describe('addVehicle', () => {
    it('should delegate to vehicleService with tenantId, customerId, and dto', async () => {
      vehicleService.create.mockResolvedValue(mockVehicle as never);
      const dto = { make: 'Fiat', model: '500', year: 2023 };

      const result = await controller.addVehicle(TENANT_ID, 'cust-001', dto as never);

      expect(vehicleService.create).toHaveBeenCalledWith(TENANT_ID, 'cust-001', dto);
      expect(result).toEqual({ success: true, data: mockVehicle });
    });
  });

  describe('getCustomerVehicles', () => {
    it('should delegate to vehicleService with tenantId and customerId', async () => {
      vehicleService.findByCustomer.mockResolvedValue([mockVehicle] as never);

      const result = await controller.getCustomerVehicles(TENANT_ID, 'cust-001');

      expect(vehicleService.findByCustomer).toHaveBeenCalledWith(TENANT_ID, 'cust-001');
      expect(result).toEqual({ success: true, data: [mockVehicle] });
    });
  });

  describe('getVehicle', () => {
    it('should delegate to vehicleService with tenantId and vehicleId', async () => {
      vehicleService.findById.mockResolvedValue(mockVehicle as never);

      const result = await controller.getVehicle(TENANT_ID, 'veh-001');

      expect(vehicleService.findById).toHaveBeenCalledWith(TENANT_ID, 'veh-001');
      expect(result).toEqual({ success: true, data: mockVehicle });
    });
  });

  describe('updateVehicle', () => {
    it('should delegate to vehicleService with tenantId, vehicleId, and dto', async () => {
      const updated = { ...mockVehicle, model: 'Panda' };
      vehicleService.update.mockResolvedValue(updated as never);
      const dto = { model: 'Panda' };

      const result = await controller.updateVehicle(TENANT_ID, 'veh-001', dto as never);

      expect(vehicleService.update).toHaveBeenCalledWith(TENANT_ID, 'veh-001', dto);
      expect(result).toEqual({ success: true, data: updated });
    });
  });

  describe('deleteVehicle', () => {
    it('should delegate to vehicleService and return success message', async () => {
      vehicleService.delete.mockResolvedValue(undefined as never);

      const result = await controller.deleteVehicle(TENANT_ID, 'veh-001');

      expect(vehicleService.delete).toHaveBeenCalledWith(TENANT_ID, 'veh-001');
      expect(result).toEqual({ success: true, message: 'Vehicle deleted successfully' });
    });
  });
});
