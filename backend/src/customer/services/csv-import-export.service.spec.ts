import { Test, TestingModule } from '@nestjs/testing';
import { CsvImportExportService } from './csv-import-export.service';
import { PrismaService } from '../../common/services/prisma.service';
import { EncryptionService } from '../../common/services/encryption.service';

const mockPrisma = {
  customer: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  vehicle: {
    findMany: jest.fn(),
  },
};

const mockEncryption = {
  encrypt: jest.fn((data: string) => `enc_${data}`),
  decrypt: jest.fn((data: string) => data.replace(/^enc_/, '')),
  hash: jest.fn((data: string) => `hash_${data}`),
};

describe('CsvImportExportService', () => {
  let service: CsvImportExportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CsvImportExportService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EncryptionService, useValue: mockEncryption },
      ],
    }).compile();

    service = module.get<CsvImportExportService>(CsvImportExportService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('exportCustomers', () => {
    it('should return CSV with headers', async () => {
      const mockCustomers = [
        {
          id: 'c1',
          tenantId: 't1',
          encryptedPhone: 'enc_+39012345',
          encryptedEmail: 'enc_test@example.com',
          encryptedFirstName: 'enc_Mario',
          encryptedLastName: 'enc_Rossi',
          customerType: 'PERSONA',
          codiceFiscale: 'ABC123',
          partitaIva: null,
          address: 'Via Roma 1',
          city: 'Milano',
          postalCode: '20100',
          province: 'MI',
          createdAt: new Date('2024-06-15T10:00:00Z'),
        },
      ];

      mockPrisma.customer.findMany.mockResolvedValueOnce(mockCustomers).mockResolvedValueOnce([]);

      const result = await service.exportCustomers('t1');

      expect(result).toBeInstanceOf(Buffer);
      const csv = result.toString('utf-8');
      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain(';');
      expect(csv).toContain('Nome');
      expect(csv).toContain('Cognome');
      expect(csv).toContain('Email');
      expect(csv).toContain('Telefono');
      expect(csv).toContain('Tipo Cliente');
      expect(csv).toContain('Mario');
      expect(csv).toContain('Rossi');
      expect(csv).toContain('+39012345');
      expect(csv).toContain('test@example.com');
      expect(mockEncryption.decrypt).toHaveBeenCalledWith('enc_Mario');
      expect(mockEncryption.decrypt).toHaveBeenCalledWith('enc_Rossi');
    });
  });

  describe('exportVehicles', () => {
    it('should return CSV with headers', async () => {
      const mockVehicles = [
        {
          id: 'v1',
          licensePlate: 'AB123CD',
          make: 'Fiat',
          model: 'Punto',
          year: 2020,
          vin: 'VIN123456',
          fuelType: 'GASOLINE',
          mileage: 50000,
          status: 'ACTIVE',
          createdAt: new Date('2024-06-15T10:00:00Z'),
        },
      ];

      mockPrisma.vehicle.findMany.mockResolvedValueOnce(mockVehicles).mockResolvedValueOnce([]);

      const result = await service.exportVehicles('t1');

      expect(result).toBeInstanceOf(Buffer);
      const csv = result.toString('utf-8');
      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain(';');
      expect(csv).toContain('Targa');
      expect(csv).toContain('Marca');
      expect(csv).toContain('Modello');
      expect(csv).toContain('Anno');
      expect(csv).toContain('Telaio (VIN)');
      expect(csv).toContain('Alimentazione');
      expect(csv).toContain('Chilometraggio');
      expect(csv).toContain('Stato');
      expect(csv).toContain('AB123CD');
      expect(csv).toContain('Fiat');
      expect(csv).toContain('Punto');
    });
  });

  describe('importCustomers', () => {
    it('should import valid rows', async () => {
      mockPrisma.customer.create.mockResolvedValue({ id: 'new-1' });

      const csvContent = [
        'firstName,lastName,email,phone,customerType',
        'Mario,Rossi,mario@test.com,+39012345,PERSONA',
        'Luigi,Verdi,luigi@test.com,+39067890,AZIENDA',
      ].join('\n');

      const result = await service.importCustomers('t1', csvContent);

      expect(result.imported).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(mockPrisma.customer.create).toHaveBeenCalledTimes(2);
      expect(mockEncryption.encrypt).toHaveBeenCalledWith('+39012345');
      expect(mockEncryption.encrypt).toHaveBeenCalledWith('Mario');
      expect(mockEncryption.hash).toHaveBeenCalledWith('+39012345');
    });

    it('should report errors for invalid rows', async () => {
      mockPrisma.customer.create
        .mockResolvedValueOnce({ id: 'new-1' })
        .mockRejectedValueOnce(new Error('Unique constraint violated'));

      const csvContent = [
        'firstName,lastName,email,phone,customerType',
        'Mario,Rossi,mario@test.com,+39012345,PERSONA',
        'Luigi,Verdi,luigi@test.com,+39067890,AZIENDA',
        'Anna,Bianchi,anna@test.com,,PERSONA',
      ].join('\n');

      const result = await service.importCustomers('t1', csvContent);

      expect(result.imported).toBe(1);
      expect(result.errors).toHaveLength(2);
      // Row 3 (index 2+1=3): DB error
      expect(result.errors[0]).toEqual({
        row: 3,
        error: 'Unique constraint violated',
      });
      // Row 4 (index 3+1=4): missing phone
      expect(result.errors[1]).toEqual({
        row: 4,
        error: 'Missing required field: phone',
      });
    });

    it('should return empty result for CSV with only headers', async () => {
      const csvContent = 'firstName,lastName,email,phone,customerType';

      const result = await service.importCustomers('t1', csvContent);

      expect(result.imported).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockPrisma.customer.create).not.toHaveBeenCalled();
    });

    it('should return empty result for single-line CSV', async () => {
      const csvContent = 'phone';

      const result = await service.importCustomers('t1', csvContent);

      expect(result.imported).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should import with minimal fields (phone only)', async () => {
      mockPrisma.customer.create.mockResolvedValue({ id: 'new-1' });

      const csvContent = ['phone', '+39012345'].join('\n');

      const result = await service.importCustomers('t1', csvContent);

      expect(result.imported).toBe(1);
      expect(mockEncryption.encrypt).toHaveBeenCalledWith('+39012345');
      expect(mockPrisma.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          encryptedFirstName: null,
          encryptedLastName: null,
          encryptedEmail: null,
          customerType: 'PERSONA',
        }),
      });
    });

    it('should default customerType to PERSONA when column missing', async () => {
      mockPrisma.customer.create.mockResolvedValue({ id: 'new-1' });

      const csvContent = ['phone', '+39012345'].join('\n');

      const result = await service.importCustomers('t1', csvContent);

      expect(result.imported).toBe(1);
      expect(mockPrisma.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          customerType: 'PERSONA',
        }),
      });
    });

    it('should handle all optional fields (codiceFiscale, partitaIva, address, city, postalCode, province)', async () => {
      mockPrisma.customer.create.mockResolvedValue({ id: 'new-1' });

      const csvContent = [
        'phone,firstName,lastName,email,customerType,codiceFiscale,partitaIva,address,city,postalCode,province',
        '+39012345,Mario,Rossi,m@t.com,AZIENDA,ABCDEF12G34H567I,12345678901,Via Roma 1,Milano,20100,MI',
      ].join('\n');

      const result = await service.importCustomers('t1', csvContent);

      expect(result.imported).toBe(1);
      expect(mockPrisma.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          codiceFiscale: 'ABCDEF12G34H567I',
          partitaIva: '12345678901',
          address: 'Via Roma 1',
          city: 'Milano',
          postalCode: '20100',
          province: 'MI',
        }),
      });
    });

    it('should handle non-Error thrown by prisma.create', async () => {
      mockPrisma.customer.create.mockRejectedValue('string error');

      const csvContent = ['phone', '+39012345'].join('\n');

      const result = await service.importCustomers('t1', csvContent);

      expect(result.imported).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Unknown error');
    });
  });

  describe('exportCustomers — additional branches', () => {
    it('should handle customer with null optional fields', async () => {
      const mockCustomer = {
        id: 'c1',
        tenantId: 't1',
        encryptedPhone: 'enc_+39012345',
        encryptedEmail: null,
        encryptedFirstName: null,
        encryptedLastName: null,
        customerType: null,
        codiceFiscale: null,
        partitaIva: null,
        address: null,
        city: null,
        postalCode: null,
        province: null,
      };

      mockPrisma.customer.findMany.mockResolvedValueOnce([mockCustomer]).mockResolvedValueOnce([]);

      const result = await service.exportCustomers('t1');
      const csv = result.toString('utf-8');

      expect(csv).toContain('+39012345');
    });

    it('should paginate through multiple batches', async () => {
      const batch1 = Array.from({ length: 500 }, (_, i) => ({
        id: `c${i}`,
        tenantId: 't1',
        encryptedPhone: `enc_phone${i}`,
        encryptedEmail: null,
        encryptedFirstName: null,
        encryptedLastName: null,
        customerType: 'PERSONA',
        codiceFiscale: null,
        partitaIva: null,
        address: null,
        city: null,
        postalCode: null,
        province: null,
      }));

      mockPrisma.customer.findMany.mockResolvedValueOnce(batch1).mockResolvedValueOnce([]);

      const result = await service.exportCustomers('t1');

      expect(result).toBeInstanceOf(Buffer);
      // Two findMany calls: batch1 (500 items) + empty batch
      expect(mockPrisma.customer.findMany).toHaveBeenCalledTimes(2);
    });
  });

  describe('exportVehicles — additional branches', () => {
    it('should handle vehicle with null optional fields', async () => {
      const mockVehicle = {
        id: 'v1',
        licensePlate: 'AB123CD',
        make: 'Fiat',
        model: 'Panda',
        year: null,
        vin: null,
        fuelType: null,
        mileage: null,
        status: 'ACTIVE',
      };

      mockPrisma.vehicle.findMany.mockResolvedValueOnce([mockVehicle]).mockResolvedValueOnce([]);

      const result = await service.exportVehicles('t1');
      const csv = result.toString('utf-8');

      expect(csv).toContain('AB123CD');
      expect(csv).toContain('Fiat');
    });
  });
});
