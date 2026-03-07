import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/services/prisma.service';
import { EncryptionService } from '@common/services/encryption.service';
import { LoggerService } from '@common/services/logger.service';
import { CreateCustomerDto, UpdateCustomerDto } from '../dto/customer.dto';

export interface CustomerWithDecryptedData {
  id: string;
  phone: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  gdprConsent: boolean;
  gdprConsentAt?: Date;
  marketingConsent: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CustomerService {
  // Fields that should be encrypted for PII protection
  private readonly encryptedFields = [
    'encryptedPhone',
    'encryptedEmail',
    'encryptedFirstName',
    'encryptedLastName',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Create a new customer with encrypted PII
   */
  async create(
    tenantId: string,
    dto: CreateCustomerDto,
  ): Promise<CustomerWithDecryptedData> {
    return this.prisma.withTenant(tenantId, async (prisma) => {
      // Check if customer with this phone already exists
      const existing = await this.findByPhone(tenantId, dto.phone);
      if (existing) {
        throw new ConflictException(
          `Customer with phone ${dto.phone} already exists`,
        );
      }

      // Encrypt PII fields
      const encryptedPhone = this.encryption.encrypt(dto.phone);
      const encryptedEmail = dto.email ? this.encryption.encrypt(dto.email) : null;
      const encryptedFirstName = dto.firstName
        ? this.encryption.encrypt(dto.firstName)
        : null;
      const encryptedLastName = dto.lastName
        ? this.encryption.encrypt(dto.lastName)
        : null;

      // Create hash for phone lookup
      const phoneHash = this.encryption.hash(dto.phone);

      const customer = await prisma.customer.create({
        data: {
          encryptedPhone,
          encryptedEmail,
          encryptedFirstName,
          encryptedLastName,
          phoneHash,
          gdprConsent: dto.gdprConsent || false,
          gdprConsentAt: dto.gdprConsent ? new Date() : null,
          marketingConsent: dto.marketingConsent || false,
          notes: dto.notes || null,
          tenant: { connect: { id: tenantId } },
        },
      });

      this.logger.log(`Created customer ${customer.id} for tenant ${tenantId}`);

      return this.decryptCustomer(customer);
    });
  }

  /**
   * Create customer from voice call (simplified)
   */
  async createFromVoiceCall(
    tenantId: string,
    phone: string,
    extractedData?: { licensePlate?: string; serviceType?: string },
  ): Promise<CustomerWithDecryptedData> {
    return this.create(tenantId, {
      phone,
      gdprConsent: false, // Will need to be collected separately
      marketingConsent: false,
    });
  }

  /**
   * Find customer by ID with decrypted data
   */
  async findById(
    tenantId: string,
    customerId: string,
  ): Promise<CustomerWithDecryptedData> {
    return this.prisma.withTenant(tenantId, async (prisma) => {
      const customer = await prisma.customer.findFirst({
        where: {
          id: customerId,
          tenantId,
        },
        include: {
          vehicles: true,
          bookings: {
            orderBy: { scheduledDate: 'desc' },
            take: 5,
          },
        },
      });

      if (!customer) {
        throw new NotFoundException(`Customer ${customerId} not found`);
      }

      return this.decryptCustomer(customer);
    });
  }

  /**
   * Find customer by phone number (using hash for lookup)
   */
  async findByPhone(
    tenantId: string,
    phone: string,
  ): Promise<CustomerWithDecryptedData | null> {
    return this.prisma.withTenant(tenantId, async (prisma) => {
      const phoneHash = this.encryption.hash(phone);

      const customer = await prisma.customer.findFirst({
        where: {
          phoneHash,
          tenantId,
        },
        include: {
          vehicles: true,
        },
      });

      if (!customer) {
        return null;
      }

      return this.decryptCustomer(customer);
    });
  }

  /**
   * Search customers by name or email
   */
  async search(
    tenantId: string,
    query: {
      name?: string;
      email?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ customers: CustomerWithDecryptedData[]; total: number }> {
    return this.prisma.withTenant(tenantId, async (prisma) => {
      // Note: Searching encrypted fields requires decrypting all records
      // For production, consider using searchable encrypted fields or
      // maintaining separate search indexes

      const customers = await prisma.customer.findMany({
        where: {
          tenantId,
        },
        take: query.limit || 50,
        skip: query.offset || 0,
        orderBy: { createdAt: 'desc' },
      });

      const total = await prisma.customer.count({
        where: { tenantId },
      });

      // Decrypt and filter in memory
      const decryptedCustomers = customers.map((c) => this.decryptCustomer(c));

      let filtered = decryptedCustomers;

      if (query.name) {
        const nameLower = query.name.toLowerCase();
        filtered = filtered.filter(
          (c) =>
            c.firstName?.toLowerCase().includes(nameLower) ||
            c.lastName?.toLowerCase().includes(nameLower),
        );
      }

      if (query.email) {
        const emailLower = query.email.toLowerCase();
        filtered = filtered.filter((c) =>
          c.email?.toLowerCase().includes(emailLower),
        );
      }

      return { customers: filtered, total };
    });
  }

  /**
   * Update customer
   */
  async update(
    tenantId: string,
    customerId: string,
    dto: UpdateCustomerDto,
  ): Promise<CustomerWithDecryptedData> {
    return this.prisma.withTenant(tenantId, async (prisma) => {
      const existing = await prisma.customer.findFirst({
        where: { id: customerId, tenantId },
      });

      if (!existing) {
        throw new NotFoundException(`Customer ${customerId} not found`);
      }

      const updateData: Prisma.CustomerUpdateInput = {};

      if (dto.phone) {
        updateData.encryptedPhone = this.encryption.encrypt(dto.phone);
        updateData.phoneHash = this.encryption.hash(dto.phone);
      }

      if (dto.email !== undefined) {
        updateData.encryptedEmail = dto.email
          ? this.encryption.encrypt(dto.email)
          : null;
      }

      if (dto.firstName !== undefined) {
        updateData.encryptedFirstName = dto.firstName
          ? this.encryption.encrypt(dto.firstName)
          : null;
      }

      if (dto.lastName !== undefined) {
        updateData.encryptedLastName = dto.lastName
          ? this.encryption.encrypt(dto.lastName)
          : null;
      }

      if (dto.notes !== undefined) {
        updateData.notes = dto.notes;
      }

      const customer = await prisma.customer.update({
        where: { id: customerId },
        data: updateData,
      });

      this.logger.log(`Updated customer ${customerId}`);

      return this.decryptCustomer(customer);
    });
  }

  /**
   * Delete customer (GDPR right to erasure)
   */
  async delete(tenantId: string, customerId: string): Promise<void> {
    return this.prisma.withTenant(tenantId, async (prisma) => {
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, tenantId },
      });

      if (!customer) {
        throw new NotFoundException(`Customer ${customerId} not found`);
      }

      // Soft delete or anonymize instead of hard delete
      // to maintain referential integrity
      await prisma.customer.update({
        where: { id: customerId },
        data: {
          encryptedPhone: this.encryption.encrypt('DELETED'),
          encryptedEmail: null,
          encryptedFirstName: null,
          encryptedLastName: null,
          phoneHash: 'DELETED',
          notes: 'Customer data deleted per GDPR request',
        },
      });

      this.logger.log(`Deleted customer ${customerId}`);
    });
  }

  /**
   * Get all customers for tenant
   */
  async findAll(
    tenantId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{ customers: CustomerWithDecryptedData[]; total: number }> {
    return this.prisma.withTenant(tenantId, async (prisma) => {
      const [customers, total] = await Promise.all([
        prisma.customer.findMany({
          where: { tenantId },
          take: options?.limit || 50,
          skip: options?.offset || 0,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.customer.count({ where: { tenantId } }),
      ]);

      return {
        customers: customers.map((c) => this.decryptCustomer(c)),
        total,
      };
    });
  }

  /**
   * Decrypt customer PII fields
   */
  private decryptCustomer(customer: any): CustomerWithDecryptedData {
    return {
      id: customer.id,
      phone: customer.encryptedPhone
        ? this.encryption.decrypt(customer.encryptedPhone)
        : '',
      email: customer.encryptedEmail
        ? this.encryption.decrypt(customer.encryptedEmail)
        : undefined,
      firstName: customer.encryptedFirstName
        ? this.encryption.decrypt(customer.encryptedFirstName)
        : undefined,
      lastName: customer.encryptedLastName
        ? this.encryption.decrypt(customer.encryptedLastName)
        : undefined,
      gdprConsent: customer.gdprConsent,
      gdprConsentAt: customer.gdprConsentAt,
      marketingConsent: customer.marketingConsent,
      notes: customer.notes,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      // Include relations if present
      ...(customer.vehicles && { vehicles: customer.vehicles }),
      ...(customer.bookings && { bookings: customer.bookings }),
    };
  }
}
