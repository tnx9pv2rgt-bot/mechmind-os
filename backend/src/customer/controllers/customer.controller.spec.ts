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

    it('should handle search with email filter', async () => {
      const expected = { customers: [mockCustomer], total: 1 };
      customerService.search.mockResolvedValue(expected as never);
      const query = { name: undefined, email: 'mario@test.com', limit: 10, offset: 0 };

      const result = await controller.searchCustomers(TENANT_ID, query as never);

      expect(customerService.search).toHaveBeenCalledWith(TENANT_ID, {
        name: undefined,
        email: 'mario@test.com',
        limit: 10,
        offset: 0,
      });
      expect(result.data).toEqual(expected.customers);
    });

    it('should handle search with no results', async () => {
      const expected = { customers: [], total: 0 };
      customerService.search.mockResolvedValue(expected as never);
      const query = { name: 'Nonexistent', email: undefined, limit: 10, offset: 0 };

      const result = await controller.searchCustomers(TENANT_ID, query as never);

      expect(result.meta.total).toBe(0);
      expect(result.data).toEqual([]);
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

  // ==================== CSV EXPORT / IMPORT ====================

  describe('exportCustomers', () => {
    it('should export customers as CSV with correct headers', async () => {
      const csvService = controller['csvService'] as jest.Mocked<CsvImportExportService>;
      const mockCsv = Buffer.from('firstName,lastName\nMario,Rossi\n');
      csvService.exportCustomers.mockResolvedValue(mockCsv as never);

      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      await controller.exportCustomers(TENANT_ID, mockRes as never);

      expect(csvService.exportCustomers).toHaveBeenCalledWith(TENANT_ID);
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="customers.csv"',
      );
      expect(mockRes.send).toHaveBeenCalledWith(mockCsv);
    });

    it('should handle export errors', async () => {
      const csvService = controller['csvService'] as jest.Mocked<CsvImportExportService>;
      csvService.exportCustomers.mockRejectedValue(new Error('Export failed'));

      const mockRes = { setHeader: jest.fn(), send: jest.fn() };

      await expect(controller.exportCustomers(TENANT_ID, mockRes as never)).rejects.toThrow(
        'Export failed',
      );
    });
  });

  describe('importCustomers', () => {
    it('should import customers from CSV', async () => {
      const csvService = controller['csvService'] as jest.Mocked<CsvImportExportService>;
      const importResult = { imported: 2, errors: [] };
      csvService.importCustomers.mockResolvedValue(importResult as never);

      const csv = 'firstName,lastName\nMario,Rossi\nLuigi,Bianchi\n';
      const result = await controller.importCustomers(TENANT_ID, csv);

      expect(csvService.importCustomers).toHaveBeenCalledWith(TENANT_ID, csv);
      expect(result).toEqual({ success: true, data: importResult });
    });

    it('should return errors from CSV import', async () => {
      const csvService = controller['csvService'] as jest.Mocked<CsvImportExportService>;
      const importResult = {
        imported: 1,
        errors: [{ row: 2, error: 'Missing lastName' }],
      };
      csvService.importCustomers.mockResolvedValue(importResult as never);

      const csv = 'firstName,lastName\nMario,Rossi\nLuigi,\n';
      const result = await controller.importCustomers(TENANT_ID, csv);

      expect(result.data.errors).toHaveLength(1);
    });
  });

  describe('exportVehicles', () => {
    it('should export vehicles as CSV with correct headers', async () => {
      const csvService = controller['csvService'] as jest.Mocked<CsvImportExportService>;
      const mockCsv = Buffer.from('make,model,year\nFiat,500,2023\n');
      csvService.exportVehicles.mockResolvedValue(mockCsv as never);

      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      await controller.exportVehicles(TENANT_ID, mockRes as never);

      expect(csvService.exportVehicles).toHaveBeenCalledWith(TENANT_ID);
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="vehicles.csv"',
      );
      expect(mockRes.send).toHaveBeenCalledWith(mockCsv);
    });

    it('should handle vehicle export errors', async () => {
      const csvService = controller['csvService'] as jest.Mocked<CsvImportExportService>;
      csvService.exportVehicles.mockRejectedValue(new Error('Export failed'));

      const mockRes = { setHeader: jest.fn(), send: jest.fn() };

      await expect(controller.exportVehicles(TENANT_ID, mockRes as never)).rejects.toThrow(
        'Export failed',
      );
    });
  });

  describe('createCustomer - validation edge cases', () => {
    it('should handle customer creation with minimal data', async () => {
      const minimalDto = { firstName: 'Mario', lastName: 'Rossi' };
      customerService.create.mockResolvedValue(mockCustomer as never);

      const result = await controller.createCustomer(TENANT_ID, minimalDto as never);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should pass empty tenantId to service (service validates)', async () => {
      const dto = { firstName: 'Mario', lastName: 'Rossi' };
      customerService.create.mockResolvedValue(mockCustomer as never);

      await controller.createCustomer('', dto as never);

      // Controller doesn't validate tenantId; service does
      expect(customerService.create).toHaveBeenCalledWith('', dto);
    });

    it('should validate tenantId is passed to service', async () => {
      const dto = { firstName: 'Mario', lastName: 'Rossi' };
      customerService.create.mockResolvedValue(mockCustomer as never);

      await controller.createCustomer('tenant-xyz', dto as never);

      expect(customerService.create).toHaveBeenCalledWith('tenant-xyz', expect.any(Object));
    });
  });

  describe('getCustomers - pagination edge cases', () => {
    it('should handle string limit and offset conversion', async () => {
      customerService.findAll.mockResolvedValue({ customers: [], total: 0 } as never);

      await controller.getCustomers(TENANT_ID, '25', '50');

      expect(customerService.findAll).toHaveBeenCalledWith(TENANT_ID, {
        limit: 25,
        offset: 50,
      });
    });

    it('should return correct pagination metadata', async () => {
      const mockResult = { customers: [mockCustomer], total: 100 };
      customerService.findAll.mockResolvedValue(mockResult as never);

      const result = await controller.getCustomers(TENANT_ID, '10', '20');

      expect(result.meta.total).toBe(100);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.offset).toBe(20);
    });
  });

  describe('searchCustomers - filter combinations', () => {
    it('should search with both name and email filters', async () => {
      const expected = { customers: [mockCustomer], total: 1 };
      customerService.search.mockResolvedValue(expected as never);
      const query = { name: 'Mario', email: 'mario@test.com', limit: 10, offset: 0 };

      await controller.searchCustomers(TENANT_ID, query as never);

      expect(customerService.search).toHaveBeenCalledWith(TENANT_ID, query);
    });

    it('should handle search with only email', async () => {
      const expected = { customers: [], total: 0 };
      customerService.search.mockResolvedValue(expected as never);
      const query = { name: undefined, email: 'test@test.com', limit: 10, offset: 0 };

      const result = await controller.searchCustomers(TENANT_ID, query as never);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle empty search results', async () => {
      const expected = { customers: [], total: 0 };
      customerService.search.mockResolvedValue(expected as never);

      const result = await controller.searchCustomers(TENANT_ID, {} as never);

      expect(result.meta.total).toBe(0);
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('Vehicle operations - tenantId isolation', () => {
    it('should pass tenantId to vehicleService for all operations', async () => {
      vehicleService.findByCustomer.mockResolvedValue([mockVehicle] as never);

      await controller.getCustomerVehicles('tenant-xyz', 'cust-001');

      expect(vehicleService.findByCustomer).toHaveBeenCalledWith('tenant-xyz', 'cust-001');
    });

    it('should validate tenantId in vehicle creation', async () => {
      vehicleService.create.mockResolvedValue(mockVehicle as never);
      const dto = { make: 'Fiat', model: '500', year: 2023 };

      await controller.addVehicle('tenant-abc', 'cust-001', dto as never);

      expect(vehicleService.create).toHaveBeenCalledWith('tenant-abc', 'cust-001', dto);
    });

    it('should return empty array when no vehicles found', async () => {
      vehicleService.findByCustomer.mockResolvedValue([] as never);

      const result = await controller.getCustomerVehicles(TENANT_ID, 'cust-001');

      expect(result.data).toEqual([]);
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('CSV operations - error handling', () => {
    it('should handle large CSV imports', async () => {
      const csvService = controller['csvService'] as jest.Mocked<CsvImportExportService>;
      csvService.importCustomers.mockResolvedValue({ imported: 10000, errors: [] } as never);

      const largeCSV = 'firstName,lastName\n' + Array(10000).fill('Mario,Rossi\n').join('');
      const result = await controller.importCustomers(TENANT_ID, largeCSV);

      expect(result.data.imported).toBe(10000);
    });

    it('should report partial import success with errors', async () => {
      const csvService = controller['csvService'] as jest.Mocked<CsvImportExportService>;
      csvService.importCustomers.mockResolvedValue({
        imported: 50,
        errors: [
          { row: 2, error: 'Invalid email' },
          { row: 5, error: 'Missing firstName' },
        ],
      } as never);

      const result = await controller.importCustomers(TENANT_ID, 'data');

      expect(result.data.imported).toBe(50);
      expect(result.data.errors.length).toBe(2);
    });

    it('should handle CSV with no errors', async () => {
      const csvService = controller['csvService'] as jest.Mocked<CsvImportExportService>;
      csvService.importCustomers.mockResolvedValue({ imported: 25, errors: [] } as never);

      const result = await controller.importCustomers(TENANT_ID, 'valid-csv');

      expect(result.data.errors).toEqual([]);
      expect(result.success).toBe(true);
    });
  });

  describe('Response format consistency', () => {
    it('should always return success: true for successful operations', async () => {
      customerService.create.mockResolvedValue(mockCustomer as never);

      const result = await controller.createCustomer(TENANT_ID, {} as never);

      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
    });

    it('should include data property in all success responses', async () => {
      vehicleService.findById.mockResolvedValue(mockVehicle as never);

      const result = await controller.getVehicle(TENANT_ID, 'veh-001');

      expect(result).toHaveProperty('data');
      expect(result.data).toEqual(mockVehicle);
    });

    it('should format delete response with message', async () => {
      vehicleService.delete.mockResolvedValue(undefined as never);

      const result = await controller.deleteVehicle(TENANT_ID, 'veh-001');

      expect(result.success).toBe(true);
      expect(result).toHaveProperty('message');
      expect(result.message).toBe('Vehicle deleted successfully');
    });
  });
});
