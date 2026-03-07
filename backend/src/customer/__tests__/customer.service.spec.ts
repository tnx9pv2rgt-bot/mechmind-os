import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CustomerService } from '../services/customer.service';
import { PrismaService } from '@common/services/prisma.service';
import { EncryptionService } from '@common/services/encryption.service';
import { LoggerService } from '@common/services/logger.service';
import { CreateCustomerDto, UpdateCustomerDto } from '../dto/customer.dto';

describe('CustomerService', () => {
  let service: CustomerService;

  const mockTenantId = 'tenant-123';
  const mockCustomerId = 'customer-456';

  let mockPrismaClient: any;
  let mockPrismaService: any;
  let mockEncryptionService: any;
  let mockLoggerService: any;

  // Helper function to generate encrypted values
  const encrypt = (data: string) => `encrypted_${data}`;
  const hash = (data: string) => `hashed_${data}`;
  const decrypt = (data: string) => {
    if (!data) return data;
    return data.replace('encrypted_', '');
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPrismaClient = {
      customer: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    mockPrismaService = {
      withTenant: jest.fn((tenantId, callback) => callback(mockPrismaClient)),
    };

    mockEncryptionService = {
      encrypt: jest.fn((data: string) => data ? encrypt(data) : data),
      decrypt: jest.fn((data: string) => decrypt(data)),
      hash: jest.fn((data: string) => data ? hash(data) : ''),
    };

    mockLoggerService = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EncryptionService,
          useValue: mockEncryptionService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
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
    const createDto: CreateCustomerDto = {
      phone: '+390123456789',
      email: 'test@example.com',
      firstName: 'Mario',
      lastName: 'Rossi',
      gdprConsent: true,
      marketingConsent: false,
      notes: 'Test notes',
    };

    it('should create a customer with encrypted PII', async () => {
      // Mock findByPhone to return null (no existing customer)
      mockPrismaClient.customer.findFirst.mockResolvedValueOnce(null);

      const mockCreatedCustomer = {
        id: mockCustomerId,
        encryptedPhone: encrypt(createDto.phone!),
        encryptedEmail: encrypt(createDto.email!),
        encryptedFirstName: encrypt(createDto.firstName!),
        encryptedLastName: encrypt(createDto.lastName!),
        phoneHash: hash(createDto.phone!),
        gdprConsent: true,
        gdprConsentAt: new Date(),
        marketingConsent: false,
        notes: 'Test notes',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.customer.create.mockResolvedValueOnce(mockCreatedCustomer);

      const result = await service.create(mockTenantId, createDto);

      // Verify encryption was called for PII fields
      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(createDto.phone);
      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(createDto.email);
      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(createDto.firstName);
      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(createDto.lastName);
      expect(mockEncryptionService.hash).toHaveBeenCalledWith(createDto.phone);

      // Verify customer was created
      expect(mockPrismaClient.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          encryptedPhone: encrypt(createDto.phone!),
          encryptedEmail: encrypt(createDto.email!),
          encryptedFirstName: encrypt(createDto.firstName!),
          encryptedLastName: encrypt(createDto.lastName!),
          phoneHash: hash(createDto.phone!),
          gdprConsent: true,
          gdprConsentAt: expect.any(Date),
          marketingConsent: false,
          notes: 'Test notes',
          tenant: { connect: { id: mockTenantId } },
        }),
      });

      // Verify logger was called
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        `Created customer ${mockCustomerId} for tenant ${mockTenantId}`,
      );

      // Verify result has decrypted data
      expect(result).toBeDefined();
      expect(result.phone).toBe(createDto.phone);
      expect(result.email).toBe(createDto.email);
      expect(result.firstName).toBe(createDto.firstName);
      expect(result.lastName).toBe(createDto.lastName);
    });

    it('should create customer with minimal data (phone only)', async () => {
      const minimalDto: CreateCustomerDto = {
        phone: '+390123456789',
        gdprConsent: false,
      };

      mockPrismaClient.customer.findFirst.mockResolvedValueOnce(null);

      const mockCreatedCustomer = {
        id: mockCustomerId,
        encryptedPhone: encrypt(minimalDto.phone),
        encryptedEmail: null,
        encryptedFirstName: null,
        encryptedLastName: null,
        phoneHash: hash(minimalDto.phone),
        gdprConsent: false,
        gdprConsentAt: null,
        marketingConsent: false,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.customer.create.mockResolvedValueOnce(mockCreatedCustomer);

      const result = await service.create(mockTenantId, minimalDto);

      expect(mockPrismaClient.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          encryptedPhone: encrypt(minimalDto.phone),
          encryptedEmail: null,
          encryptedFirstName: null,
          encryptedLastName: null,
          phoneHash: hash(minimalDto.phone),
          gdprConsent: false,
          gdprConsentAt: null,
          marketingConsent: false,
          notes: null,
        }),
      });

      expect(result).toBeDefined();
      expect(result.phone).toBe(minimalDto.phone);
    });

    it('should throw ConflictException if customer with phone already exists', async () => {
      const existingCustomer = {
        id: 'existing-id',
        encryptedPhone: encrypt(createDto.phone!),
        encryptedEmail: null,
        encryptedFirstName: null,
        encryptedLastName: null,
        phoneHash: hash(createDto.phone!),
        gdprConsent: false,
        gdprConsentAt: null,
        marketingConsent: false,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.customer.findFirst.mockResolvedValueOnce(existingCustomer);

      await expect(service.create(mockTenantId, createDto)).rejects.toThrow(
        ConflictException,
      );

      expect(mockPrismaClient.customer.create).not.toHaveBeenCalled();
    });
  });

  describe('createFromVoiceCall', () => {
    it('should create customer from voice call with minimal data', async () => {
      const phone = '+390123456789';
      const extractedData = { licensePlate: 'AB123CD', serviceType: 'oil_change' };

      mockPrismaClient.customer.findFirst.mockResolvedValueOnce(null);

      const mockCreatedCustomer = {
        id: mockCustomerId,
        encryptedPhone: encrypt(phone),
        encryptedEmail: null,
        encryptedFirstName: null,
        encryptedLastName: null,
        phoneHash: hash(phone),
        gdprConsent: false,
        gdprConsentAt: null,
        marketingConsent: false,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.customer.create.mockResolvedValueOnce(mockCreatedCustomer);

      const result = await service.createFromVoiceCall(mockTenantId, phone, extractedData);

      expect(mockPrismaClient.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          encryptedPhone: encrypt(phone),
          gdprConsent: false,
          marketingConsent: false,
        }),
      });

      expect(result).toBeDefined();
      expect(result.phone).toBe(phone);
    });

    it('should create customer from voice call without extracted data', async () => {
      const phone = '+390123456789';

      mockPrismaClient.customer.findFirst.mockResolvedValueOnce(null);

      const mockCreatedCustomer = {
        id: mockCustomerId,
        encryptedPhone: encrypt(phone),
        encryptedEmail: null,
        encryptedFirstName: null,
        encryptedLastName: null,
        phoneHash: hash(phone),
        gdprConsent: false,
        gdprConsentAt: null,
        marketingConsent: false,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.customer.create.mockResolvedValueOnce(mockCreatedCustomer);

      const result = await service.createFromVoiceCall(mockTenantId, phone);

      expect(result).toBeDefined();
      expect(result.phone).toBe(phone);
    });
  });

  describe('findById', () => {
    it('should find customer by ID with decrypted data', async () => {
      const phone = '+390123456789';
      const email = 'test@example.com';
      const firstName = 'Mario';
      const lastName = 'Rossi';

      const mockCustomer = {
        id: mockCustomerId,
        encryptedPhone: encrypt(phone),
        encryptedEmail: encrypt(email),
        encryptedFirstName: encrypt(firstName),
        encryptedLastName: encrypt(lastName),
        phoneHash: hash(phone),
        gdprConsent: true,
        gdprConsentAt: new Date(),
        marketingConsent: false,
        notes: 'Test notes',
        createdAt: new Date(),
        updatedAt: new Date(),
        vehicles: [],
        bookings: [],
      };

      mockPrismaClient.customer.findFirst.mockResolvedValueOnce(mockCustomer);

      const result = await service.findById(mockTenantId, mockCustomerId);

      expect(mockPrismaClient.customer.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockCustomerId,
          tenantId: mockTenantId,
        },
        include: {
          vehicles: true,
          bookings: {
            orderBy: { scheduledDate: 'desc' },
            take: 5,
          },
        },
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(mockCustomerId);
      expect(result.phone).toBe(phone);
      expect(result.email).toBe(email);
      expect(result.firstName).toBe(firstName);
      expect(result.lastName).toBe(lastName);
    });

    it('should throw NotFoundException if customer not found', async () => {
      mockPrismaClient.customer.findFirst.mockResolvedValueOnce(null);

      await expect(service.findById(mockTenantId, mockCustomerId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByPhone', () => {
    it('should find customer by phone using hash lookup', async () => {
      const phone = '+390123456789';

      const mockCustomer = {
        id: mockCustomerId,
        encryptedPhone: encrypt(phone),
        encryptedEmail: null,
        encryptedFirstName: null,
        encryptedLastName: null,
        phoneHash: hash(phone),
        gdprConsent: true,
        gdprConsentAt: new Date(),
        marketingConsent: false,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        vehicles: [],
      };

      mockPrismaClient.customer.findFirst.mockResolvedValueOnce(mockCustomer);

      const result = await service.findByPhone(mockTenantId, phone);

      expect(mockEncryptionService.hash).toHaveBeenCalledWith(phone);
      expect(mockPrismaClient.customer.findFirst).toHaveBeenCalledWith({
        where: {
          phoneHash: hash(phone),
          tenantId: mockTenantId,
        },
        include: {
          vehicles: true,
        },
      });

      expect(result).toBeDefined();
      expect(result!.phone).toBe(phone);
    });

    it('should return null if customer not found by phone', async () => {
      const phone = '+390123456789';

      mockPrismaClient.customer.findFirst.mockResolvedValueOnce(null);

      const result = await service.findByPhone(mockTenantId, phone);

      expect(result).toBeNull();
    });
  });

  describe('search', () => {
    it('should search customers by name', async () => {
      const mockCustomers = [
        {
          id: 'customer-1',
          encryptedPhone: encrypt('+390000000001'),
          encryptedEmail: encrypt('mario@example.com'),
          encryptedFirstName: encrypt('Mario'),
          encryptedLastName: encrypt('Rossi'),
          phoneHash: hash('+390000000001'),
          gdprConsent: true,
          gdprConsentAt: new Date(),
          marketingConsent: false,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'customer-2',
          encryptedPhone: encrypt('+390000000002'),
          encryptedEmail: encrypt('luigi@example.com'),
          encryptedFirstName: encrypt('Luigi'),
          encryptedLastName: encrypt('Bianchi'),
          phoneHash: hash('+390000000002'),
          gdprConsent: true,
          gdprConsentAt: new Date(),
          marketingConsent: false,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaClient.customer.findMany.mockResolvedValueOnce(mockCustomers);
      mockPrismaClient.customer.count.mockResolvedValueOnce(2);

      const result = await service.search(mockTenantId, { name: 'Mario' });

      expect(mockPrismaClient.customer.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        take: 50,
        skip: 0,
        orderBy: { createdAt: 'desc' },
      });

      expect(result.customers).toHaveLength(1);
      expect(result.customers[0].firstName).toBe('Mario');
      expect(result.total).toBe(2);
    });

    it('should search customers by email', async () => {
      const mockCustomers = [
        {
          id: 'customer-1',
          encryptedPhone: encrypt('+390000000001'),
          encryptedEmail: encrypt('test@example.com'),
          encryptedFirstName: encrypt('John'),
          encryptedLastName: encrypt('Doe'),
          phoneHash: hash('+390000000001'),
          gdprConsent: true,
          gdprConsentAt: new Date(),
          marketingConsent: false,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaClient.customer.findMany.mockResolvedValueOnce(mockCustomers);
      mockPrismaClient.customer.count.mockResolvedValueOnce(1);

      const result = await service.search(mockTenantId, { email: 'test@example.com' });

      expect(result.customers).toHaveLength(1);
      expect(result.customers[0].email).toBe('test@example.com');
    });

    it('should search with pagination', async () => {
      const mockCustomers = [];

      mockPrismaClient.customer.findMany.mockResolvedValueOnce(mockCustomers);
      mockPrismaClient.customer.count.mockResolvedValueOnce(0);

      const result = await service.search(mockTenantId, {
        name: 'Test',
        limit: 10,
        offset: 20,
      });

      expect(mockPrismaClient.customer.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        take: 10,
        skip: 20,
        orderBy: { createdAt: 'desc' },
      });

      expect(result.customers).toEqual([]);
    });

    it('should return all customers when no filters provided', async () => {
      const mockCustomers = [
        {
          id: 'customer-1',
          encryptedPhone: encrypt('+390000000001'),
          encryptedEmail: null,
          encryptedFirstName: null,
          encryptedLastName: null,
          phoneHash: hash('+390000000001'),
          gdprConsent: false,
          gdprConsentAt: null,
          marketingConsent: false,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaClient.customer.findMany.mockResolvedValueOnce(mockCustomers);
      mockPrismaClient.customer.count.mockResolvedValueOnce(1);

      const result = await service.search(mockTenantId, {});

      expect(result.customers).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('update', () => {
    const updateDto: UpdateCustomerDto = {
      phone: '+390987654321',
      email: 'updated@example.com',
      firstName: 'Updated',
      lastName: 'Name',
      notes: 'Updated notes',
    };

    it('should update customer with new encrypted PII', async () => {
      const existingCustomer = {
        id: mockCustomerId,
        encryptedPhone: encrypt('+390123456789'),
        encryptedEmail: encrypt('old@example.com'),
        encryptedFirstName: encrypt('Old'),
        encryptedLastName: encrypt('Name'),
        phoneHash: hash('+390123456789'),
        gdprConsent: true,
        gdprConsentAt: new Date(),
        marketingConsent: false,
        notes: 'Old notes',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.customer.findFirst.mockResolvedValueOnce(existingCustomer);

      const updatedCustomer = {
        ...existingCustomer,
        encryptedPhone: encrypt(updateDto.phone!),
        encryptedEmail: encrypt(updateDto.email!),
        encryptedFirstName: encrypt(updateDto.firstName!),
        encryptedLastName: encrypt(updateDto.lastName!),
        notes: updateDto.notes,
      };

      mockPrismaClient.customer.update.mockResolvedValueOnce(updatedCustomer);

      const result = await service.update(mockTenantId, mockCustomerId, updateDto);

      expect(mockPrismaClient.customer.findFirst).toHaveBeenCalledWith({
        where: { id: mockCustomerId, tenantId: mockTenantId },
      });

      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(updateDto.phone);
      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(updateDto.email);
      expect(mockEncryptionService.hash).toHaveBeenCalledWith(updateDto.phone);

      expect(mockPrismaClient.customer.update).toHaveBeenCalledWith({
        where: { id: mockCustomerId },
        data: expect.objectContaining({
          encryptedPhone: encrypt(updateDto.phone!),
          encryptedEmail: encrypt(updateDto.email!),
          encryptedFirstName: encrypt(updateDto.firstName!),
          encryptedLastName: encrypt(updateDto.lastName!),
          phoneHash: hash(updateDto.phone!),
          notes: updateDto.notes,
        }),
      });

      expect(mockLoggerService.log).toHaveBeenCalledWith(`Updated customer ${mockCustomerId}`);

      expect(result).toBeDefined();
    });

    it('should update customer with partial data', async () => {
      const partialUpdate: UpdateCustomerDto = {
        notes: 'Only updating notes',
      };

      const existingCustomer = {
        id: mockCustomerId,
        encryptedPhone: encrypt('+390123456789'),
        encryptedEmail: null,
        encryptedFirstName: null,
        encryptedLastName: null,
        phoneHash: hash('+390123456789'),
        gdprConsent: false,
        gdprConsentAt: null,
        marketingConsent: false,
        notes: 'Old notes',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.customer.findFirst.mockResolvedValueOnce(existingCustomer);

      const updatedCustomer = {
        ...existingCustomer,
        notes: partialUpdate.notes,
      };

      mockPrismaClient.customer.update.mockResolvedValueOnce(updatedCustomer);

      const result = await service.update(mockTenantId, mockCustomerId, partialUpdate);

      expect(mockPrismaClient.customer.update).toHaveBeenCalledWith({
        where: { id: mockCustomerId },
        data: expect.objectContaining({
          notes: partialUpdate.notes,
        }),
      });
    });

    it('should handle null values for optional fields', async () => {
      const updateWithNulls: UpdateCustomerDto = {
        email: undefined,
        firstName: undefined,
        lastName: undefined,
        notes: undefined,
      };

      const existingCustomer = {
        id: mockCustomerId,
        encryptedPhone: encrypt('+390123456789'),
        encryptedEmail: encrypt('old_email'),
        encryptedFirstName: encrypt('old_first'),
        encryptedLastName: encrypt('old_last'),
        phoneHash: hash('+390123456789'),
        gdprConsent: false,
        gdprConsentAt: null,
        marketingConsent: false,
        notes: 'Old notes',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.customer.findFirst.mockResolvedValueOnce(existingCustomer);

      const updatedCustomer = {
        ...existingCustomer,
      };

      mockPrismaClient.customer.update.mockResolvedValueOnce(updatedCustomer);

      await service.update(mockTenantId, mockCustomerId, updateWithNulls);

      // Should not include null updates when fields are undefined
      expect(mockPrismaClient.customer.update).toHaveBeenCalledWith({
        where: { id: mockCustomerId },
        data: {},
      });
    });

    it('should set email to null when empty string provided', async () => {
      const updateWithEmptyEmail: UpdateCustomerDto = {
        email: '',
      };

      const existingCustomer = {
        id: mockCustomerId,
        encryptedPhone: encrypt('+390123456789'),
        encryptedEmail: encrypt('old@example.com'),
        encryptedFirstName: null,
        encryptedLastName: null,
        phoneHash: hash('+390123456789'),
        gdprConsent: false,
        gdprConsentAt: null,
        marketingConsent: false,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.customer.findFirst.mockResolvedValueOnce(existingCustomer);

      const updatedCustomer = {
        ...existingCustomer,
        encryptedEmail: null,
      };

      mockPrismaClient.customer.update.mockResolvedValueOnce(updatedCustomer);

      await service.update(mockTenantId, mockCustomerId, updateWithEmptyEmail);

      // When email is empty string, it should be set to null
      expect(mockPrismaClient.customer.update).toHaveBeenCalledWith({
        where: { id: mockCustomerId },
        data: {
          encryptedEmail: null,
        },
      });
    });

    it('should set firstName to null when empty string provided', async () => {
      const updateWithEmptyFirstName: UpdateCustomerDto = {
        firstName: '',
      };

      const existingCustomer = {
        id: mockCustomerId,
        encryptedPhone: encrypt('+390123456789'),
        encryptedEmail: null,
        encryptedFirstName: encrypt('Old'),
        encryptedLastName: null,
        phoneHash: hash('+390123456789'),
        gdprConsent: false,
        gdprConsentAt: null,
        marketingConsent: false,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.customer.findFirst.mockResolvedValueOnce(existingCustomer);

      const updatedCustomer = {
        ...existingCustomer,
        encryptedFirstName: null,
      };

      mockPrismaClient.customer.update.mockResolvedValueOnce(updatedCustomer);

      await service.update(mockTenantId, mockCustomerId, updateWithEmptyFirstName);

      expect(mockPrismaClient.customer.update).toHaveBeenCalledWith({
        where: { id: mockCustomerId },
        data: {
          encryptedFirstName: null,
        },
      });
    });

    it('should set lastName to null when empty string provided', async () => {
      const updateWithEmptyLastName: UpdateCustomerDto = {
        lastName: '',
      };

      const existingCustomer = {
        id: mockCustomerId,
        encryptedPhone: encrypt('+390123456789'),
        encryptedEmail: null,
        encryptedFirstName: null,
        encryptedLastName: encrypt('Name'),
        phoneHash: hash('+390123456789'),
        gdprConsent: false,
        gdprConsentAt: null,
        marketingConsent: false,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.customer.findFirst.mockResolvedValueOnce(existingCustomer);

      const updatedCustomer = {
        ...existingCustomer,
        encryptedLastName: null,
      };

      mockPrismaClient.customer.update.mockResolvedValueOnce(updatedCustomer);

      await service.update(mockTenantId, mockCustomerId, updateWithEmptyLastName);

      expect(mockPrismaClient.customer.update).toHaveBeenCalledWith({
        where: { id: mockCustomerId },
        data: {
          encryptedLastName: null,
        },
      });
    });

    it('should throw NotFoundException if customer not found', async () => {
      mockPrismaClient.customer.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.update(mockTenantId, mockCustomerId, updateDto),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaClient.customer.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should anonymize customer data for GDPR deletion', async () => {
      const existingCustomer = {
        id: mockCustomerId,
        encryptedPhone: encrypt('+390123456789'),
        encryptedEmail: encrypt('test@example.com'),
        encryptedFirstName: encrypt('Mario'),
        encryptedLastName: encrypt('Rossi'),
        phoneHash: hash('+390123456789'),
        gdprConsent: true,
        gdprConsentAt: new Date(),
        marketingConsent: false,
        notes: 'Some notes',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.customer.findFirst.mockResolvedValueOnce(existingCustomer);
      mockPrismaClient.customer.update.mockResolvedValueOnce({
        ...existingCustomer,
        encryptedPhone: encrypt('DELETED'),
        encryptedEmail: null,
        encryptedFirstName: null,
        encryptedLastName: null,
        phoneHash: 'DELETED',
        notes: 'Customer data deleted per GDPR request',
      });

      await service.delete(mockTenantId, mockCustomerId);

      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith('DELETED');

      expect(mockPrismaClient.customer.update).toHaveBeenCalledWith({
        where: { id: mockCustomerId },
        data: expect.objectContaining({
          encryptedPhone: encrypt('DELETED'),
          encryptedEmail: null,
          encryptedFirstName: null,
          encryptedLastName: null,
          phoneHash: 'DELETED',
          notes: 'Customer data deleted per GDPR request',
        }),
      });

      expect(mockLoggerService.log).toHaveBeenCalledWith(`Deleted customer ${mockCustomerId}`);
    });

    it('should throw NotFoundException if customer not found', async () => {
      mockPrismaClient.customer.findFirst.mockResolvedValueOnce(null);

      await expect(service.delete(mockTenantId, mockCustomerId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all customers with pagination', async () => {
      const mockCustomers = [
        {
          id: 'customer-1',
          encryptedPhone: encrypt('+390000000001'),
          encryptedEmail: encrypt('customer1@example.com'),
          encryptedFirstName: encrypt('First1'),
          encryptedLastName: encrypt('Last1'),
          phoneHash: hash('+390000000001'),
          gdprConsent: true,
          gdprConsentAt: new Date(),
          marketingConsent: false,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'customer-2',
          encryptedPhone: encrypt('+390000000002'),
          encryptedEmail: null,
          encryptedFirstName: null,
          encryptedLastName: null,
          phoneHash: hash('+390000000002'),
          gdprConsent: false,
          gdprConsentAt: null,
          marketingConsent: false,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaClient.customer.findMany.mockResolvedValueOnce(mockCustomers);
      mockPrismaClient.customer.count.mockResolvedValueOnce(2);

      const result = await service.findAll(mockTenantId, { limit: 10, offset: 5 });

      expect(mockPrismaClient.customer.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        take: 10,
        skip: 5,
        orderBy: { createdAt: 'desc' },
      });

      expect(result.customers).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.customers[0].phone).toBe('+390000000001');
      expect(result.customers[1].phone).toBe('+390000000002');
    });

    it('should use default pagination when options not provided', async () => {
      mockPrismaClient.customer.findMany.mockResolvedValueOnce([]);
      mockPrismaClient.customer.count.mockResolvedValueOnce(0);

      await service.findAll(mockTenantId);

      expect(mockPrismaClient.customer.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        take: 50,
        skip: 0,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('decryptCustomer', () => {
    it('should handle customer with relations', async () => {
      const mockCustomers = [
        {
          id: mockCustomerId,
          encryptedPhone: encrypt('+390123456789'),
          encryptedEmail: null,
          encryptedFirstName: null,
          encryptedLastName: null,
          phoneHash: hash('+390123456789'),
          gdprConsent: false,
          gdprConsentAt: null,
          marketingConsent: false,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          vehicles: [{ id: 'vehicle-1' }],
          bookings: [{ id: 'booking-1' }],
        },
      ];

      mockPrismaClient.customer.findMany.mockResolvedValueOnce(mockCustomers);
      mockPrismaClient.customer.count.mockResolvedValueOnce(1);

      const result = await service.findAll(mockTenantId);

      expect(result.customers[0]).toHaveProperty('vehicles');
      expect(result.customers[0]).toHaveProperty('bookings');
      expect(result.customers[0].vehicles).toEqual([{ id: 'vehicle-1' }]);
      expect(result.customers[0].bookings).toEqual([{ id: 'booking-1' }]);
    });

    it('should handle empty encrypted fields', async () => {
      const mockCustomers = [
        {
          id: mockCustomerId,
          encryptedPhone: encrypt('+390123456789'),
          encryptedEmail: null,
          encryptedFirstName: null,
          encryptedLastName: null,
          phoneHash: hash('+390123456789'),
          gdprConsent: false,
          gdprConsentAt: null,
          marketingConsent: false,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaClient.customer.findMany.mockResolvedValueOnce(mockCustomers);
      mockPrismaClient.customer.count.mockResolvedValueOnce(1);

      const result = await service.findAll(mockTenantId);

      expect(result.customers[0].phone).toBe('+390123456789');
      expect(result.customers[0].email).toBeUndefined();
      expect(result.customers[0].firstName).toBeUndefined();
      expect(result.customers[0].lastName).toBeUndefined();
    });

    it('should handle null encryptedPhone (return empty string)', async () => {
      const mockCustomers = [
        {
          id: mockCustomerId,
          encryptedPhone: null,
          encryptedEmail: null,
          encryptedFirstName: null,
          encryptedLastName: null,
          phoneHash: hash('+390123456789'),
          gdprConsent: false,
          gdprConsentAt: null,
          marketingConsent: false,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaClient.customer.findMany.mockResolvedValueOnce(mockCustomers);
      mockPrismaClient.customer.count.mockResolvedValueOnce(1);

      const result = await service.findAll(mockTenantId);

      // When encryptedPhone is null, decryptCustomer returns empty string
      expect(result.customers[0].phone).toBe('');
    });
  });
});
