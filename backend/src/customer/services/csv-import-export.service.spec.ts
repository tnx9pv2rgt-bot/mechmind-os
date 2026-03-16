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

      mockPrisma.customer.findMany.mockResolvedValue(mockCustomers);

      const result = await service.exportCustomers('t1');

      expect(result).toBeInstanceOf(Buffer);
      const csv = result.toString('utf-8');
      expect(csv).toContain('firstName');
      expect(csv).toContain('lastName');
      expect(csv).toContain('email');
      expect(csv).toContain('phone');
      expect(csv).toContain('customerType');
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
          status: 'active',
          createdAt: new Date('2024-06-15T10:00:00Z'),
        },
      ];

      mockPrisma.vehicle.findMany.mockResolvedValue(mockVehicles);

      const result = await service.exportVehicles('t1');

      expect(result).toBeInstanceOf(Buffer);
      const csv = result.toString('utf-8');
      expect(csv).toContain('licensePlate');
      expect(csv).toContain('make');
      expect(csv).toContain('model');
      expect(csv).toContain('year');
      expect(csv).toContain('vin');
      expect(csv).toContain('fuelType');
      expect(csv).toContain('mileage');
      expect(csv).toContain('status');
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
  });
});
