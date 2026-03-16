import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { PrismaService } from '@common/services/prisma.service';
import { EncryptionService } from '@common/services/encryption.service';
import { LoggerService } from '@common/services/logger.service';
import { CreateCustomerDto, UpdateCustomerDto } from '../dto/customer.dto';

describe('CustomerService', () => {
  let service: CustomerService;
  let prisma: Record<string, jest.Mock | Record<string, jest.Mock>>;
  let encryption: {
    encrypt: jest.Mock<string, [string]>;
    decrypt: jest.Mock<string, [string]>;
    hash: jest.Mock<string, [string]>;
  };
  let logger: {
    log: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
    debug: jest.Mock;
  };

  const TENANT_ID = 'tenant-001';
  const CUSTOMER_ID = 'cust-001';
  const NOW = new Date('2024-06-15T10:00:00Z');

  // Raw DB record with encrypted fields (as stored in database)
  const mockDbCustomer = {
    id: CUSTOMER_ID,
    tenantId: TENANT_ID,
    encryptedPhone: 'enc_+390123456789',
    encryptedEmail: 'enc_mario@rossi.it',
    encryptedFirstName: 'enc_Mario',
    encryptedLastName: 'enc_Rossi',
    phoneHash: 'hash_+390123456789',
    gdprConsent: true,
    gdprConsentAt: NOW,
    marketingConsent: false,
    notes: 'Preferred morning',
    createdAt: NOW,
    updatedAt: NOW,
  };

  beforeEach(async () => {
    // Encryption mock: encrypt prepends "enc_", decrypt strips "enc_", hash prepends "hash_"
    encryption = {
      encrypt: jest.fn((data: string) => `enc_${data}`),
      decrypt: jest.fn((data: string) => data.replace(/^enc_/, '')),
      hash: jest.fn((data: string) => `hash_${data}`),
    };

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
        create: jest.fn().mockResolvedValue(mockDbCustomer),
        findFirst: jest.fn().mockResolvedValue(mockDbCustomer),
        findMany: jest.fn().mockResolvedValue([mockDbCustomer]),
        update: jest.fn().mockResolvedValue(mockDbCustomer),
        count: jest.fn().mockResolvedValue(1),
      },
    } as unknown as Record<string, jest.Mock | Record<string, jest.Mock>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        { provide: PrismaService, useValue: prisma },
        { provide: EncryptionService, useValue: encryption },
        { provide: LoggerService, useValue: logger },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // CREATE
  // ---------------------------------------------------------------------------
  describe('create', () => {
    const createDto: CreateCustomerDto = {
      phone: '+390123456789',
      email: 'mario@rossi.it',
      firstName: 'Mario',
      lastName: 'Rossi',
      gdprConsent: true,
      marketingConsent: false,
      notes: 'Preferred morning',
    };

    it('should create a customer with encrypted PII and return decrypted data', async () => {
      // Arrange: no existing customer with same phone
      (prisma.customer as Record<string, jest.Mock>).findFirst
        .mockResolvedValueOnce(null) // findByPhone lookup returns null
        .mockResolvedValueOnce(mockDbCustomer); // not used in create path, but safe

      (prisma.customer as Record<string, jest.Mock>).create.mockResolvedValue(mockDbCustomer);

      // Act
      const result = await service.create(TENANT_ID, createDto);

      // Assert - withTenant called with correct tenantId
      expect(prisma.withTenant).toHaveBeenCalledWith(TENANT_ID, expect.any(Function));

      // Assert - PII encryption called for each field
      expect(encryption.encrypt).toHaveBeenCalledWith('+390123456789');
      expect(encryption.encrypt).toHaveBeenCalledWith('mario@rossi.it');
      expect(encryption.encrypt).toHaveBeenCalledWith('Mario');
      expect(encryption.encrypt).toHaveBeenCalledWith('Rossi');

      // Assert - phone hash created for lookup
      expect(encryption.hash).toHaveBeenCalledWith('+390123456789');

      // Assert - Prisma create called with encrypted data
      expect((prisma.customer as Record<string, jest.Mock>).create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          encryptedPhone: 'enc_+390123456789',
          encryptedEmail: 'enc_mario@rossi.it',
          encryptedFirstName: 'enc_Mario',
          encryptedLastName: 'enc_Rossi',
          phoneHash: 'hash_+390123456789',
          gdprConsent: true,
          marketingConsent: false,
          notes: 'Preferred morning',
          tenant: { connect: { id: TENANT_ID } },
        }),
      });

      // Assert - returns decrypted data
      expect(result.id).toBe(CUSTOMER_ID);
      expect(result.phone).toBe('+390123456789');
      expect(result.email).toBe('mario@rossi.it');
      expect(result.firstName).toBe('Mario');
      expect(result.lastName).toBe('Rossi');
    });

    it('should set gdprConsentAt when gdprConsent is true', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(null);

      // Act
      await service.create(TENANT_ID, createDto);

      // Assert
      const createCall = (prisma.customer as Record<string, jest.Mock>).create.mock.calls[0][0];
      expect(createCall.data.gdprConsentAt).toBeInstanceOf(Date);
    });

    it('should set gdprConsentAt to null when gdprConsent is false', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(null);
      const dtoNoConsent: CreateCustomerDto = {
        phone: '+390123456789',
        gdprConsent: false,
      };

      // Act
      await service.create(TENANT_ID, dtoNoConsent);

      // Assert
      const createCall = (prisma.customer as Record<string, jest.Mock>).create.mock.calls[0][0];
      expect(createCall.data.gdprConsentAt).toBeNull();
    });

    it('should throw ConflictException when phone already exists', async () => {
      // Arrange: findByPhone returns an existing customer
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(
        mockDbCustomer,
      );

      // Act & Assert
      await expect(service.create(TENANT_ID, createDto)).rejects.toThrow(ConflictException);
      await expect(service.create(TENANT_ID, createDto)).rejects.toThrow(
        'Customer with this phone number already exists',
      );
    });

    it('should handle optional fields as null when not provided', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(null);
      const minimalDto: CreateCustomerDto = {
        phone: '+390123456789',
      };

      const minimalDbCustomer = {
        ...mockDbCustomer,
        encryptedEmail: null,
        encryptedFirstName: null,
        encryptedLastName: null,
      };
      (prisma.customer as Record<string, jest.Mock>).create.mockResolvedValue(minimalDbCustomer);

      // Act
      await service.create(TENANT_ID, minimalDto);

      // Assert
      const createCall = (prisma.customer as Record<string, jest.Mock>).create.mock.calls[0][0];
      expect(createCall.data.encryptedEmail).toBeNull();
      expect(createCall.data.encryptedFirstName).toBeNull();
      expect(createCall.data.encryptedLastName).toBeNull();
    });

    it('should log customer creation', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(null);

      // Act
      await service.create(TENANT_ID, createDto);

      // Assert
      expect(logger.log).toHaveBeenCalledWith(
        `Created customer ${CUSTOMER_ID} for tenant ${TENANT_ID}`,
      );
    });

    it('should default gdprConsent and marketingConsent to false when undefined', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(null);
      const dtoNoConsent: CreateCustomerDto = { phone: '+390123456789' };

      // Act
      await service.create(TENANT_ID, dtoNoConsent);

      // Assert
      const createCall = (prisma.customer as Record<string, jest.Mock>).create.mock.calls[0][0];
      expect(createCall.data.gdprConsent).toBe(false);
      expect(createCall.data.marketingConsent).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // CREATE FROM VOICE CALL
  // ---------------------------------------------------------------------------
  describe('createFromVoiceCall', () => {
    it('should delegate to create with minimal data and no consents', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(null);
      const phone = '+390123456789';

      // Act
      const result = await service.createFromVoiceCall(TENANT_ID, phone, {
        licensePlate: 'AB123CD',
        serviceType: 'oil_change',
      });

      // Assert - create was called with phone + default consents
      expect((prisma.customer as Record<string, jest.Mock>).create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          gdprConsent: false,
          marketingConsent: false,
        }),
      });
      expect(result.phone).toBe('+390123456789');
    });

    it('should work without extractedData', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(null);

      // Act
      const result = await service.createFromVoiceCall(TENANT_ID, '+390123456789');

      // Assert
      expect(result).toBeDefined();
      expect(result.phone).toBe('+390123456789');
    });
  });

  // ---------------------------------------------------------------------------
  // FIND BY ID
  // ---------------------------------------------------------------------------
  describe('findById', () => {
    it('should return decrypted customer with vehicles and bookings', async () => {
      // Arrange
      const dbCustomerWithRelations = {
        ...mockDbCustomer,
        vehicles: [{ id: 'vehicle-001', licensePlate: 'AB123CD' }],
        bookings: [{ id: 'booking-001', scheduledDate: NOW }],
      };
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(
        dbCustomerWithRelations,
      );

      // Act
      const result = await service.findById(TENANT_ID, CUSTOMER_ID);

      // Assert
      expect(prisma.withTenant).toHaveBeenCalledWith(TENANT_ID, expect.any(Function));
      expect((prisma.customer as Record<string, jest.Mock>).findFirst).toHaveBeenCalledWith({
        where: { id: CUSTOMER_ID, tenantId: TENANT_ID },
        include: {
          vehicles: true,
          bookings: {
            orderBy: { scheduledDate: 'desc' },
            take: 5,
          },
        },
      });
      expect(result.id).toBe(CUSTOMER_ID);
      expect(result.phone).toBe('+390123456789');
      expect(result.email).toBe('mario@rossi.it');
      // Relations should be included
      expect((result as unknown as Record<string, unknown>).vehicles).toEqual([
        { id: 'vehicle-001', licensePlate: 'AB123CD' },
      ]);
      expect((result as unknown as Record<string, unknown>).bookings).toEqual([
        { id: 'booking-001', scheduledDate: NOW },
      ]);
    });

    it('should throw NotFoundException when customer does not exist', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById(TENANT_ID, 'nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findById(TENANT_ID, 'nonexistent-id')).rejects.toThrow(
        'Customer nonexistent-id not found',
      );
    });

    it('should always filter by tenantId for tenant isolation', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(mockDbCustomer);

      // Act
      await service.findById(TENANT_ID, CUSTOMER_ID);

      // Assert
      const findCall = (prisma.customer as Record<string, jest.Mock>).findFirst.mock.calls[0][0];
      expect(findCall.where.tenantId).toBe(TENANT_ID);
    });

    it('should decrypt all PII fields via EncryptionService', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(mockDbCustomer);

      // Act
      await service.findById(TENANT_ID, CUSTOMER_ID);

      // Assert
      expect(encryption.decrypt).toHaveBeenCalledWith('enc_+390123456789');
      expect(encryption.decrypt).toHaveBeenCalledWith('enc_mario@rossi.it');
      expect(encryption.decrypt).toHaveBeenCalledWith('enc_Mario');
      expect(encryption.decrypt).toHaveBeenCalledWith('enc_Rossi');
    });

    it('should handle customer with null optional encrypted fields', async () => {
      // Arrange
      const customerNoOptionals = {
        ...mockDbCustomer,
        encryptedEmail: null,
        encryptedFirstName: null,
        encryptedLastName: null,
      };
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(
        customerNoOptionals,
      );

      // Act
      const result = await service.findById(TENANT_ID, CUSTOMER_ID);

      // Assert
      expect(result.email).toBeUndefined();
      expect(result.firstName).toBeUndefined();
      expect(result.lastName).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // FIND BY PHONE (hash-based lookup)
  // ---------------------------------------------------------------------------
  describe('findByPhone', () => {
    it('should look up customer using phone hash, not raw phone', async () => {
      // Arrange
      const phone = '+390123456789';
      const dbWithVehicles = {
        ...mockDbCustomer,
        vehicles: [{ id: 'v-001' }],
      };
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(dbWithVehicles);

      // Act
      const result = await service.findByPhone(TENANT_ID, phone);

      // Assert - hash was computed from the plain phone
      expect(encryption.hash).toHaveBeenCalledWith(phone);

      // Assert - query uses phoneHash + tenantId
      expect((prisma.customer as Record<string, jest.Mock>).findFirst).toHaveBeenCalledWith({
        where: {
          phoneHash: 'hash_+390123456789',
          tenantId: TENANT_ID,
        },
        include: {
          vehicles: true,
        },
      });

      // Assert - returns decrypted
      expect(result).not.toBeNull();
      expect(result!.phone).toBe('+390123456789');
      expect((result as unknown as Record<string, unknown>).vehicles).toEqual([{ id: 'v-001' }]);
    });

    it('should return null when no customer matches the phone hash', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(null);

      // Act
      const result = await service.findByPhone(TENANT_ID, '+390000000000');

      // Assert
      expect(result).toBeNull();
    });

    it('should enforce tenant isolation in phone lookup', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(null);

      // Act
      await service.findByPhone(TENANT_ID, '+390123456789');

      // Assert
      const findCall = (prisma.customer as Record<string, jest.Mock>).findFirst.mock.calls[0][0];
      expect(findCall.where.tenantId).toBe(TENANT_ID);
    });
  });

  // ---------------------------------------------------------------------------
  // SEARCH
  // ---------------------------------------------------------------------------
  describe('search', () => {
    it('should return paginated customers filtered by name', async () => {
      // Arrange
      const dbCustomers = [
        mockDbCustomer,
        {
          ...mockDbCustomer,
          id: 'cust-002',
          encryptedFirstName: 'enc_Luigi',
          encryptedLastName: 'enc_Bianchi',
        },
      ];
      (prisma.customer as Record<string, jest.Mock>).findMany.mockResolvedValue(dbCustomers);
      (prisma.customer as Record<string, jest.Mock>).count.mockResolvedValue(2);

      // Act
      const result = await service.search(TENANT_ID, { name: 'Mario' });

      // Assert - only "Mario" matches
      expect(result.customers).toHaveLength(1);
      expect(result.customers[0].firstName).toBe('Mario');
      expect(result.total).toBe(2);
    });

    it('should return paginated customers filtered by email', async () => {
      // Arrange
      const dbCustomers = [
        mockDbCustomer,
        {
          ...mockDbCustomer,
          id: 'cust-002',
          encryptedEmail: 'enc_luigi@bianchi.it',
        },
      ];
      (prisma.customer as Record<string, jest.Mock>).findMany.mockResolvedValue(dbCustomers);
      (prisma.customer as Record<string, jest.Mock>).count.mockResolvedValue(2);

      // Act
      const result = await service.search(TENANT_ID, { email: 'mario' });

      // Assert
      expect(result.customers).toHaveLength(1);
      expect(result.customers[0].email).toBe('mario@rossi.it');
    });

    it('should apply limit and offset for pagination', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findMany.mockResolvedValue([mockDbCustomer]);
      (prisma.customer as Record<string, jest.Mock>).count.mockResolvedValue(100);

      // Act
      await service.search(TENANT_ID, { limit: 10, offset: 20 });

      // Assert
      expect((prisma.customer as Record<string, jest.Mock>).findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
        take: 10,
        skip: 20,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should default to limit 50 and offset 0', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findMany.mockResolvedValue([]);
      (prisma.customer as Record<string, jest.Mock>).count.mockResolvedValue(0);

      // Act
      await service.search(TENANT_ID, {});

      // Assert
      expect((prisma.customer as Record<string, jest.Mock>).findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 0,
        }),
      );
    });

    it('should return all customers when no filters are applied', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findMany.mockResolvedValue([mockDbCustomer]);
      (prisma.customer as Record<string, jest.Mock>).count.mockResolvedValue(1);

      // Act
      const result = await service.search(TENANT_ID, {});

      // Assert
      expect(result.customers).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should perform case-insensitive name filtering', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findMany.mockResolvedValue([mockDbCustomer]);
      (prisma.customer as Record<string, jest.Mock>).count.mockResolvedValue(1);

      // Act
      const result = await service.search(TENANT_ID, { name: 'mario' });

      // Assert - should match "Mario" with lowercase query "mario"
      expect(result.customers).toHaveLength(1);
      expect(result.customers[0].firstName).toBe('Mario');
    });

    it('should perform case-insensitive email filtering', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findMany.mockResolvedValue([mockDbCustomer]);
      (prisma.customer as Record<string, jest.Mock>).count.mockResolvedValue(1);

      // Act
      const result = await service.search(TENANT_ID, { email: 'MARIO@ROSSI' });

      // Assert
      expect(result.customers).toHaveLength(1);
    });

    it('should filter by both name and email simultaneously', async () => {
      // Arrange
      const dbCustomers = [
        mockDbCustomer,
        {
          ...mockDbCustomer,
          id: 'cust-002',
          encryptedFirstName: 'enc_Mario',
          encryptedEmail: 'enc_other@email.it',
        },
      ];
      (prisma.customer as Record<string, jest.Mock>).findMany.mockResolvedValue(dbCustomers);
      (prisma.customer as Record<string, jest.Mock>).count.mockResolvedValue(2);

      // Act
      const result = await service.search(TENANT_ID, {
        name: 'Mario',
        email: 'rossi',
      });

      // Assert - only first customer matches both name AND email
      expect(result.customers).toHaveLength(1);
      expect(result.customers[0].id).toBe(CUSTOMER_ID);
    });

    it('should match last name in name search', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findMany.mockResolvedValue([mockDbCustomer]);
      (prisma.customer as Record<string, jest.Mock>).count.mockResolvedValue(1);

      // Act
      const result = await service.search(TENANT_ID, { name: 'Rossi' });

      // Assert
      expect(result.customers).toHaveLength(1);
      expect(result.customers[0].lastName).toBe('Rossi');
    });

    it('should always scope queries to the given tenantId', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findMany.mockResolvedValue([]);
      (prisma.customer as Record<string, jest.Mock>).count.mockResolvedValue(0);

      // Act
      await service.search(TENANT_ID, {});

      // Assert
      expect((prisma.customer as Record<string, jest.Mock>).findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID },
        }),
      );
      expect((prisma.customer as Record<string, jest.Mock>).count).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // UPDATE
  // ---------------------------------------------------------------------------
  describe('update', () => {
    const updateDto: UpdateCustomerDto = {
      phone: '+390999888777',
      email: 'new@email.it',
      firstName: 'Luigi',
      lastName: 'Verdi',
      notes: 'Updated notes',
    };

    it('should encrypt updated PII fields and persist them', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(mockDbCustomer);
      (prisma.customer as Record<string, jest.Mock>).update.mockResolvedValue({
        ...mockDbCustomer,
        encryptedPhone: 'enc_+390999888777',
        encryptedEmail: 'enc_new@email.it',
        encryptedFirstName: 'enc_Luigi',
        encryptedLastName: 'enc_Verdi',
        phoneHash: 'hash_+390999888777',
        notes: 'Updated notes',
      });

      // Act
      const result = await service.update(TENANT_ID, CUSTOMER_ID, updateDto);

      // Assert - encryption called for each field
      expect(encryption.encrypt).toHaveBeenCalledWith('+390999888777');
      expect(encryption.encrypt).toHaveBeenCalledWith('new@email.it');
      expect(encryption.encrypt).toHaveBeenCalledWith('Luigi');
      expect(encryption.encrypt).toHaveBeenCalledWith('Verdi');

      // Assert - phone hash updated
      expect(encryption.hash).toHaveBeenCalledWith('+390999888777');

      // Assert - prisma update called
      expect((prisma.customer as Record<string, jest.Mock>).update).toHaveBeenCalledWith({
        where: { id: CUSTOMER_ID },
        data: {
          encryptedPhone: 'enc_+390999888777',
          phoneHash: 'hash_+390999888777',
          encryptedEmail: 'enc_new@email.it',
          encryptedFirstName: 'enc_Luigi',
          encryptedLastName: 'enc_Verdi',
          notes: 'Updated notes',
        },
      });

      // Assert - returns decrypted
      expect(result.phone).toBe('+390999888777');
      expect(result.email).toBe('new@email.it');
    });

    it('should throw NotFoundException when customer does not exist', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(TENANT_ID, 'nonexistent-id', updateDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update(TENANT_ID, 'nonexistent-id', updateDto)).rejects.toThrow(
        'Customer nonexistent-id not found',
      );
    });

    it('should only update provided fields (partial update)', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(mockDbCustomer);
      (prisma.customer as Record<string, jest.Mock>).update.mockResolvedValue(mockDbCustomer);
      const partialDto: UpdateCustomerDto = { notes: 'Just notes' };

      // Act
      await service.update(TENANT_ID, CUSTOMER_ID, partialDto);

      // Assert - only notes in update data, no encrypted fields
      const updateCall = (prisma.customer as Record<string, jest.Mock>).update.mock.calls[0][0];
      expect(updateCall.data).toEqual({ notes: 'Just notes' });
      expect(updateCall.data.encryptedPhone).toBeUndefined();
      expect(updateCall.data.encryptedEmail).toBeUndefined();
    });

    it('should set encryptedEmail to null when email is explicitly set to empty string', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(mockDbCustomer);
      (prisma.customer as Record<string, jest.Mock>).update.mockResolvedValue({
        ...mockDbCustomer,
        encryptedEmail: null,
      });
      const clearEmailDto: UpdateCustomerDto = { email: '' };

      // Act
      await service.update(TENANT_ID, CUSTOMER_ID, clearEmailDto);

      // Assert
      const updateCall = (prisma.customer as Record<string, jest.Mock>).update.mock.calls[0][0];
      expect(updateCall.data.encryptedEmail).toBeNull();
    });

    it('should set encryptedFirstName to null when firstName is explicitly empty', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(mockDbCustomer);
      (prisma.customer as Record<string, jest.Mock>).update.mockResolvedValue({
        ...mockDbCustomer,
        encryptedFirstName: null,
      });

      // Act
      await service.update(TENANT_ID, CUSTOMER_ID, { firstName: '' });

      // Assert
      const updateCall = (prisma.customer as Record<string, jest.Mock>).update.mock.calls[0][0];
      expect(updateCall.data.encryptedFirstName).toBeNull();
    });

    it('should set encryptedLastName to null when lastName is explicitly empty', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(mockDbCustomer);
      (prisma.customer as Record<string, jest.Mock>).update.mockResolvedValue({
        ...mockDbCustomer,
        encryptedLastName: null,
      });

      // Act
      await service.update(TENANT_ID, CUSTOMER_ID, { lastName: '' });

      // Assert
      const updateCall = (prisma.customer as Record<string, jest.Mock>).update.mock.calls[0][0];
      expect(updateCall.data.encryptedLastName).toBeNull();
    });

    it('should enforce tenant isolation when checking customer existence', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(mockDbCustomer);
      (prisma.customer as Record<string, jest.Mock>).update.mockResolvedValue(mockDbCustomer);

      // Act
      await service.update(TENANT_ID, CUSTOMER_ID, { notes: 'test' });

      // Assert
      const findCall = (prisma.customer as Record<string, jest.Mock>).findFirst.mock.calls[0][0];
      expect(findCall.where).toEqual({ id: CUSTOMER_ID, tenantId: TENANT_ID });
    });

    it('should log the update operation', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(mockDbCustomer);
      (prisma.customer as Record<string, jest.Mock>).update.mockResolvedValue(mockDbCustomer);

      // Act
      await service.update(TENANT_ID, CUSTOMER_ID, { notes: 'x' });

      // Assert
      expect(logger.log).toHaveBeenCalledWith(`Updated customer ${CUSTOMER_ID}`);
    });
  });

  // ---------------------------------------------------------------------------
  // DELETE (soft delete / GDPR anonymization)
  // ---------------------------------------------------------------------------
  describe('delete', () => {
    it('should anonymize PII instead of hard deleting', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(mockDbCustomer);
      (prisma.customer as Record<string, jest.Mock>).update.mockResolvedValue({
        ...mockDbCustomer,
        encryptedPhone: 'enc_DELETED',
        encryptedEmail: null,
        encryptedFirstName: null,
        encryptedLastName: null,
        phoneHash: 'DELETED',
        notes: 'Customer data deleted per GDPR request',
      });

      // Act
      await service.delete(TENANT_ID, CUSTOMER_ID);

      // Assert - uses update (soft delete), not prisma.customer.delete
      expect((prisma.customer as Record<string, jest.Mock>).update).toHaveBeenCalledWith({
        where: { id: CUSTOMER_ID },
        data: {
          encryptedPhone: 'enc_DELETED',
          encryptedEmail: null,
          encryptedFirstName: null,
          encryptedLastName: null,
          phoneHash: 'DELETED',
          notes: 'Customer data deleted per GDPR request',
        },
      });
    });

    it('should encrypt the "DELETED" placeholder for the phone field', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(mockDbCustomer);
      (prisma.customer as Record<string, jest.Mock>).update.mockResolvedValue(mockDbCustomer);

      // Act
      await service.delete(TENANT_ID, CUSTOMER_ID);

      // Assert
      expect(encryption.encrypt).toHaveBeenCalledWith('DELETED');
    });

    it('should throw NotFoundException when customer does not exist', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.delete(TENANT_ID, 'nonexistent-id')).rejects.toThrow(NotFoundException);
      await expect(service.delete(TENANT_ID, 'nonexistent-id')).rejects.toThrow(
        'Customer nonexistent-id not found',
      );
    });

    it('should enforce tenant isolation when looking up customer to delete', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(mockDbCustomer);
      (prisma.customer as Record<string, jest.Mock>).update.mockResolvedValue(mockDbCustomer);

      // Act
      await service.delete(TENANT_ID, CUSTOMER_ID);

      // Assert
      expect((prisma.customer as Record<string, jest.Mock>).findFirst).toHaveBeenCalledWith({
        where: { id: CUSTOMER_ID, tenantId: TENANT_ID },
      });
    });

    it('should log the deletion', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(mockDbCustomer);
      (prisma.customer as Record<string, jest.Mock>).update.mockResolvedValue(mockDbCustomer);

      // Act
      await service.delete(TENANT_ID, CUSTOMER_ID);

      // Assert
      expect(logger.log).toHaveBeenCalledWith(`Deleted customer ${CUSTOMER_ID}`);
    });

    it('should return void on successful deletion', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(mockDbCustomer);
      (prisma.customer as Record<string, jest.Mock>).update.mockResolvedValue(mockDbCustomer);

      // Act
      const result = await service.delete(TENANT_ID, CUSTOMER_ID);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // FIND ALL
  // ---------------------------------------------------------------------------
  describe('findAll', () => {
    it('should return paginated list of decrypted customers with total count', async () => {
      // Arrange
      const dbCustomers = [mockDbCustomer, { ...mockDbCustomer, id: 'cust-002' }];
      (prisma.customer as Record<string, jest.Mock>).findMany.mockResolvedValue(dbCustomers);
      (prisma.customer as Record<string, jest.Mock>).count.mockResolvedValue(2);

      // Act
      const result = await service.findAll(TENANT_ID);

      // Assert
      expect(result.customers).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.customers[0].phone).toBe('+390123456789');
      expect(result.customers[1].id).toBe('cust-002');
    });

    it('should apply limit and offset options', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findMany.mockResolvedValue([]);
      (prisma.customer as Record<string, jest.Mock>).count.mockResolvedValue(0);

      // Act
      await service.findAll(TENANT_ID, { limit: 25, offset: 50 });

      // Assert
      expect((prisma.customer as Record<string, jest.Mock>).findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
        take: 25,
        skip: 50,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should default to limit 50 and offset 0 when no options provided', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findMany.mockResolvedValue([]);
      (prisma.customer as Record<string, jest.Mock>).count.mockResolvedValue(0);

      // Act
      await service.findAll(TENANT_ID);

      // Assert
      expect((prisma.customer as Record<string, jest.Mock>).findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 0,
        }),
      );
    });

    it('should order results by createdAt descending', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findMany.mockResolvedValue([]);
      (prisma.customer as Record<string, jest.Mock>).count.mockResolvedValue(0);

      // Act
      await service.findAll(TENANT_ID);

      // Assert
      expect((prisma.customer as Record<string, jest.Mock>).findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should always filter by tenantId for tenant isolation', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findMany.mockResolvedValue([]);
      (prisma.customer as Record<string, jest.Mock>).count.mockResolvedValue(0);

      // Act
      await service.findAll(TENANT_ID);

      // Assert
      expect((prisma.customer as Record<string, jest.Mock>).findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID },
        }),
      );
      expect((prisma.customer as Record<string, jest.Mock>).count).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
      });
    });

    it('should execute findMany and count in parallel', async () => {
      // Arrange
      let findManyResolved = false;
      let countResolved = false;

      (prisma.customer as Record<string, jest.Mock>).findMany.mockImplementation(
        () =>
          new Promise(resolve => {
            findManyResolved = true;
            resolve([]);
          }),
      );
      (prisma.customer as Record<string, jest.Mock>).count.mockImplementation(
        () =>
          new Promise(resolve => {
            countResolved = true;
            resolve(0);
          }),
      );

      // Act
      await service.findAll(TENANT_ID);

      // Assert - both should have been called (Promise.all)
      expect(findManyResolved).toBe(true);
      expect(countResolved).toBe(true);
    });

    it('should return empty array when no customers exist', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findMany.mockResolvedValue([]);
      (prisma.customer as Record<string, jest.Mock>).count.mockResolvedValue(0);

      // Act
      const result = await service.findAll(TENANT_ID);

      // Assert
      expect(result.customers).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // DECRYPTION (private method tested through public methods)
  // ---------------------------------------------------------------------------
  describe('decryptCustomer (via public methods)', () => {
    it('should return empty string for phone when encryptedPhone is empty', async () => {
      // Arrange
      const customerNoPhone = {
        ...mockDbCustomer,
        encryptedPhone: '',
      };
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(customerNoPhone);

      // Act
      const result = await service.findById(TENANT_ID, CUSTOMER_ID);

      // Assert - empty string is falsy so decrypt is not called, returns ''
      expect(result.phone).toBe('');
    });

    it('should preserve non-encrypted fields as-is', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(mockDbCustomer);

      // Act
      const result = await service.findById(TENANT_ID, CUSTOMER_ID);

      // Assert
      expect(result.gdprConsent).toBe(true);
      expect(result.gdprConsentAt).toEqual(NOW);
      expect(result.marketingConsent).toBe(false);
      expect(result.notes).toBe('Preferred morning');
      expect(result.createdAt).toEqual(NOW);
      expect(result.updatedAt).toEqual(NOW);
    });

    it('should include vehicles relation when present on the DB record', async () => {
      // Arrange
      const withVehicles = {
        ...mockDbCustomer,
        vehicles: [{ id: 'v-1', licensePlate: 'AB123CD' }],
      };
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(withVehicles);

      // Act
      const result = await service.findById(TENANT_ID, CUSTOMER_ID);

      // Assert
      expect((result as unknown as Record<string, unknown>).vehicles).toEqual([
        { id: 'v-1', licensePlate: 'AB123CD' },
      ]);
    });

    it('should include bookings relation when present on the DB record', async () => {
      // Arrange
      const withBookings = {
        ...mockDbCustomer,
        bookings: [{ id: 'b-1', scheduledDate: NOW }],
      };
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(withBookings);

      // Act
      const result = await service.findById(TENANT_ID, CUSTOMER_ID);

      // Assert
      expect((result as unknown as Record<string, unknown>).bookings).toEqual([
        { id: 'b-1', scheduledDate: NOW },
      ]);
    });

    it('should not include relations keys when they are absent from DB record', async () => {
      // Arrange - mockDbCustomer has no vehicles/bookings keys
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(mockDbCustomer);

      // Act
      const result = await service.findById(TENANT_ID, CUSTOMER_ID);

      // Assert
      expect(result).not.toHaveProperty('vehicles');
      expect(result).not.toHaveProperty('bookings');
    });
  });

  // ---------------------------------------------------------------------------
  // TENANT ISOLATION (cross-cutting concern)
  // ---------------------------------------------------------------------------
  describe('tenant isolation', () => {
    it('should call withTenant for every public method', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findFirst
        .mockResolvedValueOnce(null) // findByPhone inside create (nested withTenant)
        .mockResolvedValueOnce(mockDbCustomer) // findById
        .mockResolvedValueOnce(mockDbCustomer) // findByPhone
        .mockResolvedValueOnce(mockDbCustomer) // update existence check
        .mockResolvedValueOnce(mockDbCustomer); // delete existence check
      (prisma.customer as Record<string, jest.Mock>).findMany.mockResolvedValue([]);
      (prisma.customer as Record<string, jest.Mock>).count.mockResolvedValue(0);
      (prisma.customer as Record<string, jest.Mock>).create.mockResolvedValue(mockDbCustomer);
      (prisma.customer as Record<string, jest.Mock>).update.mockResolvedValue(mockDbCustomer);

      // Act
      await service.create(TENANT_ID, { phone: '+390123456789' });
      // create calls withTenant once, and internally calls findByPhone which
      // also calls withTenant => 2 withTenant calls so far
      await service.findById(TENANT_ID, CUSTOMER_ID); // +1 = 3
      await service.findByPhone(TENANT_ID, '+390123456789'); // +1 = 4
      await service.search(TENANT_ID, {}); // +1 = 5
      await service.findAll(TENANT_ID); // +1 = 6
      await service.update(TENANT_ID, CUSTOMER_ID, { notes: 'x' }); // +1 = 7
      await service.delete(TENANT_ID, CUSTOMER_ID); // +1 = 8

      // Assert - withTenant called for every operation
      // create internally invokes findByPhone, which is itself a withTenant call,
      // so the total is 8 (7 public calls + 1 nested findByPhone inside create)
      expect(prisma.withTenant).toHaveBeenCalledTimes(8);

      // Assert - every call used the correct tenantId
      for (const call of (prisma.withTenant as jest.Mock).mock.calls) {
        expect(call[0]).toBe(TENANT_ID);
      }
    });

    it('should not allow cross-tenant access via query parameters', async () => {
      // Arrange
      const differentTenant = 'tenant-other';
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(mockDbCustomer);

      // Act
      await service.findById(differentTenant, CUSTOMER_ID);

      // Assert - withTenant scoped to the requesting tenant
      expect(prisma.withTenant).toHaveBeenCalledWith(differentTenant, expect.any(Function));

      // Assert - query includes the correct tenantId
      const findCall = (prisma.customer as Record<string, jest.Mock>).findFirst.mock.calls[0][0];
      expect(findCall.where.tenantId).toBe(differentTenant);
    });
  });

  // ---------------------------------------------------------------------------
  // PII ENCRYPTION (cross-cutting concern)
  // ---------------------------------------------------------------------------
  describe('PII encryption', () => {
    it('should never store plaintext phone, email, firstName, or lastName', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(null);
      (prisma.customer as Record<string, jest.Mock>).create.mockResolvedValue(mockDbCustomer);

      // Act
      await service.create(TENANT_ID, {
        phone: '+390123456789',
        email: 'test@test.it',
        firstName: 'Test',
        lastName: 'User',
      });

      // Assert - create data should only contain encrypted versions
      const createCall = (prisma.customer as Record<string, jest.Mock>).create.mock.calls[0][0];
      expect(createCall.data.phone).toBeUndefined();
      expect(createCall.data.email).toBeUndefined();
      expect(createCall.data.firstName).toBeUndefined();
      expect(createCall.data.lastName).toBeUndefined();
      expect(createCall.data.encryptedPhone).toBe('enc_+390123456789');
      expect(createCall.data.encryptedEmail).toBe('enc_test@test.it');
      expect(createCall.data.encryptedFirstName).toBe('enc_Test');
      expect(createCall.data.encryptedLastName).toBe('enc_User');
    });

    it('should use hash for phone lookups, not the encrypted value', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(null);

      // Act
      await service.findByPhone(TENANT_ID, '+390123456789');

      // Assert
      const findCall = (prisma.customer as Record<string, jest.Mock>).findFirst.mock.calls[0][0];
      expect(findCall.where.phoneHash).toBe('hash_+390123456789');
      expect(findCall.where.encryptedPhone).toBeUndefined();
      expect(findCall.where.phone).toBeUndefined();
    });

    it('should update phoneHash when phone is updated', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(mockDbCustomer);
      (prisma.customer as Record<string, jest.Mock>).update.mockResolvedValue(mockDbCustomer);

      // Act
      await service.update(TENANT_ID, CUSTOMER_ID, {
        phone: '+390111222333',
      });

      // Assert
      const updateCall = (prisma.customer as Record<string, jest.Mock>).update.mock.calls[0][0];
      expect(updateCall.data.phoneHash).toBe('hash_+390111222333');
      expect(updateCall.data.encryptedPhone).toBe('enc_+390111222333');
    });

    it('should call decrypt for each encrypted field when returning data', async () => {
      // Arrange
      (prisma.customer as Record<string, jest.Mock>).findFirst.mockResolvedValue(mockDbCustomer);

      // Act
      await service.findById(TENANT_ID, CUSTOMER_ID);

      // Assert - decrypt called exactly 4 times (phone, email, firstName, lastName)
      expect(encryption.decrypt).toHaveBeenCalledTimes(4);
    });
  });
});
