import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Customer, Prisma } from '@prisma/client';
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
  // Fiscal data (codiceFiscale & pecEmail decrypted from encrypted storage)
  customerType?: string;
  codiceFiscale?: string;
  partitaIva?: string;
  sdiCode?: string;
  pecEmail?: string;
  // Address
  address?: string;
  city?: string;
  postalCode?: string;
  province?: string;
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
    'codiceFiscale', // Fiscal PII - encrypted in DB column
    'pecEmail', // Fiscal PII - encrypted in DB column
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Build searchName from plain-text name parts (lowercase, normalized).
   * Stored unencrypted for O(log n) DB-level search.
   */
  private buildSearchName(firstName?: string | null, lastName?: string | null): string | null {
    const parts = [firstName, lastName]
      .filter(Boolean)
      .map(s => (s as string).toLowerCase().trim());
    return parts.length > 0 ? parts.join(' ') : null;
  }

  /**
   * Create a new customer with encrypted PII
   */
  async create(tenantId: string, dto: CreateCustomerDto): Promise<CustomerWithDecryptedData> {
    return this.prisma.withTenant(tenantId, async prisma => {
      // Check if customer with this phone already exists
      const existing = await this.findByPhone(tenantId, dto.phone);
      if (existing) {
        throw new ConflictException('Customer with this phone number already exists');
      }

      // Encrypt PII fields
      const encryptedPhone = this.encryption.encrypt(dto.phone);
      const encryptedEmail = dto.email ? this.encryption.encrypt(dto.email) : null;
      const encryptedFirstName = dto.firstName ? this.encryption.encrypt(dto.firstName) : null;
      const encryptedLastName = dto.lastName ? this.encryption.encrypt(dto.lastName) : null;

      // Create hash for phone lookup
      const phoneHash = this.encryption.hash(dto.phone);

      // Encrypt fiscal PII fields (P027 fix)
      const encryptedCodiceFiscale = dto.codiceFiscale
        ? this.encryption.encrypt(dto.codiceFiscale)
        : null;
      const encryptedPecEmail = dto.pecEmail ? this.encryption.encrypt(dto.pecEmail) : null;

      const customer = await prisma.customer.create({
        data: {
          encryptedPhone,
          encryptedEmail,
          encryptedFirstName,
          encryptedLastName,
          phoneHash,
          searchName: this.buildSearchName(dto.firstName, dto.lastName),
          gdprConsent: dto.gdprConsent || false,
          gdprConsentAt: dto.gdprConsent
            ? dto.gdprConsentAt
              ? new Date(dto.gdprConsentAt)
              : new Date()
            : null,
          gdprPrivacyVersion: dto.gdprPrivacyVersion ?? '2.0',
          gdprConsentMethod: dto.gdprConsentMethod ?? 'form-checkbox',
          marketingConsent: dto.marketingConsent || false,
          marketingConsentAt: dto.marketingConsent
            ? dto.marketingConsentAt
              ? new Date(dto.marketingConsentAt)
              : new Date()
            : null,
          notes: dto.notes || null,
          // Fiscal data (codiceFiscale & pecEmail encrypted as PII)
          customerType: dto.customerType,
          codiceFiscale: encryptedCodiceFiscale,
          partitaIva: dto.partitaIva || null,
          sdiCode: dto.sdiCode || null,
          pecEmail: encryptedPecEmail,
          // Address
          address: dto.address || null,
          city: dto.city || null,
          postalCode: dto.postalCode || null,
          province: dto.province || null,
          // Preferences
          preferredChannel: dto.preferredChannel,
          source: dto.source,
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
    _extractedData?: { licensePlate?: string; serviceType?: string },
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
  async findById(tenantId: string, customerId: string): Promise<CustomerWithDecryptedData> {
    return this.prisma.withTenant(tenantId, async prisma => {
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
  async findByPhone(tenantId: string, phone: string): Promise<CustomerWithDecryptedData | null> {
    return this.prisma.withTenant(tenantId, async prisma => {
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
    return this.prisma.withTenant(tenantId, async prisma => {
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
      const decryptedCustomers = customers.map(c => this.decryptCustomer(c));

      let filtered = decryptedCustomers;

      if (query.name) {
        const nameLower = query.name.toLowerCase();
        filtered = filtered.filter(
          c =>
            c.firstName?.toLowerCase().includes(nameLower) ||
            c.lastName?.toLowerCase().includes(nameLower),
        );
      }

      if (query.email) {
        const emailLower = query.email.toLowerCase();
        filtered = filtered.filter(c => c.email?.toLowerCase().includes(emailLower));
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
    return this.prisma.withTenant(tenantId, async prisma => {
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
        updateData.encryptedEmail = dto.email ? this.encryption.encrypt(dto.email) : null;
      }

      if (dto.firstName !== undefined) {
        updateData.encryptedFirstName = dto.firstName
          ? this.encryption.encrypt(dto.firstName)
          : null;
      }

      if (dto.lastName !== undefined) {
        updateData.encryptedLastName = dto.lastName ? this.encryption.encrypt(dto.lastName) : null;
      }

      // Update searchName when name changes
      if (dto.firstName !== undefined || dto.lastName !== undefined) {
        const newFirst =
          dto.firstName !== undefined
            ? dto.firstName
            : this.safeDecrypt(existing.encryptedFirstName);
        const newLast =
          dto.lastName !== undefined ? dto.lastName : this.safeDecrypt(existing.encryptedLastName);
        updateData.searchName = this.buildSearchName(newFirst, newLast);
      }

      if (dto.notes !== undefined) {
        updateData.notes = dto.notes;
      }

      // Fiscal PII fields (P027 fix - encrypt codiceFiscale & pecEmail)
      if (dto.codiceFiscale !== undefined) {
        updateData.codiceFiscale = dto.codiceFiscale
          ? this.encryption.encrypt(dto.codiceFiscale)
          : null;
      }

      if (dto.pecEmail !== undefined) {
        updateData.pecEmail = dto.pecEmail ? this.encryption.encrypt(dto.pecEmail) : null;
      }

      // Non-PII fiscal fields (stored as plain text)
      if (dto.partitaIva !== undefined) {
        updateData.partitaIva = dto.partitaIva || null;
      }

      if (dto.sdiCode !== undefined) {
        updateData.sdiCode = dto.sdiCode || null;
      }

      if (dto.customerType !== undefined) {
        updateData.customerType = dto.customerType;
      }

      // Address fields
      if (dto.address !== undefined) {
        updateData.address = dto.address || null;
      }

      if (dto.city !== undefined) {
        updateData.city = dto.city || null;
      }

      if (dto.postalCode !== undefined) {
        updateData.postalCode = dto.postalCode || null;
      }

      if (dto.province !== undefined) {
        updateData.province = dto.province || null;
      }

      // Preferences
      if (dto.preferredChannel !== undefined) {
        updateData.preferredChannel = dto.preferredChannel;
      }

      if (dto.source !== undefined) {
        updateData.source = dto.source;
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
    return this.prisma.withTenant(tenantId, async prisma => {
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, tenantId },
      });

      if (!customer) {
        throw new NotFoundException(`Customer ${customerId} not found`);
      }

      // Check for active work orders or unpaid invoices
      const [activeWO, unpaidInvoices] = await Promise.all([
        prisma.workOrder.count({
          where: {
            customerId,
            tenantId,
            status: { notIn: ['COMPLETED', 'INVOICED'] },
          },
        }),
        prisma.invoice.count({
          where: {
            customerId,
            tenantId,
            status: { notIn: ['PAID', 'CANCELLED'] },
          },
        }),
      ]);

      if (activeWO > 0 || unpaidInvoices > 0) {
        throw new ConflictException(
          'Impossibile eliminare: ci sono ordini di lavoro attivi o fatture non pagate.',
        );
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
          // Clear encrypted fiscal PII
          codiceFiscale: null,
          pecEmail: null,
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
    options?: { limit?: number; offset?: number; search?: string },
  ): Promise<{ customers: CustomerWithDecryptedData[]; total: number }> {
    return this.prisma.withTenant(tenantId, async prisma => {
      const where: Prisma.CustomerWhereInput = { tenantId };

      // Server-side search: searchName (DB-level), phoneHash/emailHash (exact), partitaIva (plain)
      if (options?.search) {
        const q = options.search.trim();
        const qLower = q.toLowerCase();
        where.OR = [
          { searchName: { contains: qLower } },
          { partitaIva: { contains: q } },
          { phoneHash: this.encryption.hash(q) },
          { emailHash: this.encryption.hash(q) },
        ];
      }

      const [customers, total] = await Promise.all([
        prisma.customer.findMany({
          where,
          take: options?.limit || 50,
          skip: options?.offset || 0,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.customer.count({ where }),
      ]);

      const decrypted = customers.map(c => this.decryptCustomer(c));

      return {
        customers: decrypted,
        total,
      };
    });
  }

  /**
   * Safely decrypt a single field, returning fallback on failure
   */
  private safeDecrypt(value: string | null, fallback?: string): string | undefined {
    if (!value) return undefined;
    try {
      return this.encryption.decrypt(value);
    } catch {
      this.logger.warn(
        `Failed to decrypt field value (length=${value.length}), returning fallback`,
      );
      return fallback ?? '[encrypted]';
    }
  }

  /**
   * Decrypt customer PII fields
   */
  private decryptCustomer(
    customer: Customer & { vehicles?: unknown[]; bookings?: unknown[] },
  ): CustomerWithDecryptedData {
    return {
      id: customer.id,
      phone: this.safeDecrypt(customer.encryptedPhone, '') ?? '',
      email: this.safeDecrypt(customer.encryptedEmail),
      firstName: this.safeDecrypt(customer.encryptedFirstName),
      lastName: this.safeDecrypt(customer.encryptedLastName),
      gdprConsent: customer.gdprConsent,
      gdprConsentAt: customer.gdprConsentAt ?? undefined,
      marketingConsent: customer.marketingConsent,
      notes: customer.notes ?? undefined,
      customerType: customer.customerType ?? undefined,
      codiceFiscale: this.safeDecrypt(customer.codiceFiscale),
      partitaIva: customer.partitaIva ?? undefined,
      sdiCode: customer.sdiCode ?? undefined,
      pecEmail: this.safeDecrypt(customer.pecEmail),
      address: customer.address ?? undefined,
      city: customer.city ?? undefined,
      postalCode: customer.postalCode ?? undefined,
      province: customer.province ?? undefined,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      ...(customer.vehicles && { vehicles: customer.vehicles }),
      ...(customer.bookings && { bookings: customer.bookings }),
    };
  }
}
