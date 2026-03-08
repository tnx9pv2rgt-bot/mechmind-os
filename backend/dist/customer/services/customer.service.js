"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/services/prisma.service");
const encryption_service_1 = require("../../common/services/encryption.service");
const logger_service_1 = require("../../common/services/logger.service");
let CustomerService = class CustomerService {
    constructor(prisma, encryption, logger) {
        this.prisma = prisma;
        this.encryption = encryption;
        this.logger = logger;
        this.encryptedFields = [
            'encryptedPhone',
            'encryptedEmail',
            'encryptedFirstName',
            'encryptedLastName',
        ];
    }
    async create(tenantId, dto) {
        return this.prisma.withTenant(tenantId, async (prisma) => {
            const existing = await this.findByPhone(tenantId, dto.phone);
            if (existing) {
                throw new common_1.ConflictException(`Customer with phone ${dto.phone} already exists`);
            }
            const encryptedPhone = this.encryption.encrypt(dto.phone);
            const encryptedEmail = dto.email ? this.encryption.encrypt(dto.email) : null;
            const encryptedFirstName = dto.firstName
                ? this.encryption.encrypt(dto.firstName)
                : null;
            const encryptedLastName = dto.lastName
                ? this.encryption.encrypt(dto.lastName)
                : null;
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
    async createFromVoiceCall(tenantId, phone, extractedData) {
        return this.create(tenantId, {
            phone,
            gdprConsent: false,
            marketingConsent: false,
        });
    }
    async findById(tenantId, customerId) {
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
                throw new common_1.NotFoundException(`Customer ${customerId} not found`);
            }
            return this.decryptCustomer(customer);
        });
    }
    async findByPhone(tenantId, phone) {
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
    async search(tenantId, query) {
        return this.prisma.withTenant(tenantId, async (prisma) => {
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
            const decryptedCustomers = customers.map((c) => this.decryptCustomer(c));
            let filtered = decryptedCustomers;
            if (query.name) {
                const nameLower = query.name.toLowerCase();
                filtered = filtered.filter((c) => c.firstName?.toLowerCase().includes(nameLower) ||
                    c.lastName?.toLowerCase().includes(nameLower));
            }
            if (query.email) {
                const emailLower = query.email.toLowerCase();
                filtered = filtered.filter((c) => c.email?.toLowerCase().includes(emailLower));
            }
            return { customers: filtered, total };
        });
    }
    async update(tenantId, customerId, dto) {
        return this.prisma.withTenant(tenantId, async (prisma) => {
            const existing = await prisma.customer.findFirst({
                where: { id: customerId, tenantId },
            });
            if (!existing) {
                throw new common_1.NotFoundException(`Customer ${customerId} not found`);
            }
            const updateData = {};
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
    async delete(tenantId, customerId) {
        return this.prisma.withTenant(tenantId, async (prisma) => {
            const customer = await prisma.customer.findFirst({
                where: { id: customerId, tenantId },
            });
            if (!customer) {
                throw new common_1.NotFoundException(`Customer ${customerId} not found`);
            }
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
    async findAll(tenantId, options) {
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
    decryptCustomer(customer) {
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
            ...(customer.vehicles && { vehicles: customer.vehicles }),
            ...(customer.bookings && { bookings: customer.bookings }),
        };
    }
};
exports.CustomerService = CustomerService;
exports.CustomerService = CustomerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        encryption_service_1.EncryptionService,
        logger_service_1.LoggerService])
], CustomerService);
