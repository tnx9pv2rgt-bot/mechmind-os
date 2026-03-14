"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GdprExportService = void 0;
const crypto = __importStar(require("crypto"));
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/services/prisma.service");
const encryption_service_1 = require("../../common/services/encryption.service");
const logger_service_1 = require("../../common/services/logger.service");
let GdprExportService = class GdprExportService {
    constructor(prisma, encryption, loggerService) {
        this.prisma = prisma;
        this.encryption = encryption;
        this.loggerService = loggerService;
        this.EXPORT_EXPIRY_DAYS = 7;
    }
    async exportCustomerData(customerId, tenantId, format = 'JSON', requestId) {
        this.loggerService.log(`Starting data export for customer ${customerId} in ${format} format`, 'GdprExportService');
        const customer = (await this.prisma.withTenant(tenantId, async (prisma) => {
            return prisma.customerEncrypted.findFirst({
                where: { id: customerId, tenantId },
                include: {
                    vehicles: true,
                    bookings: {
                        include: {
                            Invoice: true,
                        },
                        orderBy: { createdAt: 'desc' },
                    },
                },
            });
        }));
        if (!customer) {
            throw new common_1.NotFoundException(`Customer ${customerId} not found`);
        }
        const consentHistory = await this.prisma.withTenant(tenantId, async (prisma) => {
            return prisma.consentAuditLog.findMany({
                where: { customerId, tenantId },
                orderBy: { timestamp: 'desc' },
            });
        });
        const callRecordings = await this.prisma.withTenant(tenantId, async (prisma) => {
            return prisma.callRecording.findMany({
                where: { customerId, tenantId },
                orderBy: { recordedAt: 'desc' },
            });
        });
        const decryptedPhone = customer.phoneEncrypted
            ? this.encryption.decrypt(customer.phoneEncrypted.toString())
            : undefined;
        const decryptedEmail = customer.emailEncrypted
            ? this.encryption.decrypt(customer.emailEncrypted.toString())
            : undefined;
        const decryptedName = customer.nameEncrypted
            ? this.encryption.decrypt(customer.nameEncrypted.toString())
            : undefined;
        const exportId = `export-${Date.now()}-${customerId.substring(0, 8)}`;
        const exportDate = new Date();
        const expiresAt = new Date(exportDate.getTime() + this.EXPORT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
        const exportData = {
            exportId,
            exportDate,
            format,
            customerId,
            tenantId,
            personalData: {
                id: customer.id,
                createdAt: customer.createdAt,
                gdprConsent: customer.gdprConsent,
                gdprConsentDate: customer.gdprConsentDate || undefined,
                marketingConsent: customer.marketingConsent,
                phone: decryptedPhone,
                email: decryptedEmail,
                name: decryptedName,
            },
            vehicles: customer.vehicles.map((v) => ({
                id: v.id,
                licensePlate: v.licensePlate,
                make: v.make || undefined,
                model: v.model || undefined,
                year: v.year || undefined,
                lastServiceDate: v.lastServiceDate || undefined,
                nextServiceDueKm: v.nextServiceDueKm || undefined,
            })),
            bookings: customer.bookings.map((b) => ({
                id: b.id,
                createdAt: b.createdAt,
                scheduledDate: b.scheduledDate || undefined,
                status: b.status,
                estimatedDurationMinutes: b.estimatedDurationMinutes,
                totalCostCents: b.totalCostCents || undefined,
                paymentStatus: b.paymentStatus,
            })),
            invoices: customer.bookings.flatMap((b) => (b.Invoice || []).map((i) => ({
                id: i.id,
                createdAt: i.createdAt,
                totalCents: i.totalCents,
                taxCents: i.taxCents || undefined,
                status: i.status,
                paymentDate: i.paymentDate || undefined,
            }))),
            consentHistory: consentHistory.map((c) => ({
                type: c.consentType,
                granted: c.granted,
                timestamp: c.timestamp,
                ipSource: c.ipSource || undefined,
                method: c.collectionMethod || undefined,
            })),
            callRecordings: callRecordings.map((r) => ({
                id: r.id,
                recordedAt: r.recordedAt,
                durationSeconds: r.durationSeconds,
                direction: r.direction,
            })),
            metadata: {
                totalRecords: 1 +
                    customer.vehicles.length +
                    customer.bookings.length +
                    consentHistory.length +
                    callRecordings.length,
                generatedBy: 'MechMind OS GDPR Export Service',
                expiresAt,
                checksum: this.generateChecksum(customerId + exportDate.toISOString()),
            },
        };
        await this.prisma.withTenant(tenantId, async (prisma) => {
            await prisma.auditLog.create({
                data: {
                    tenantId,
                    action: 'DATA_EXPORT_CREATED',
                    tableName: 'customers_encrypted',
                    recordId: customerId,
                    newValues: JSON.stringify({
                        exportId,
                        format,
                        requestId,
                        recordCount: exportData.metadata.totalRecords,
                    }),
                    createdAt: exportDate,
                },
            });
        });
        if (requestId) {
            await this.prisma.withTenant(tenantId, async (prisma) => {
                await prisma.dataSubjectRequest.update({
                    where: { id: requestId },
                    data: {
                        exportFormat: format,
                        status: 'COMPLETED',
                        completedAt: exportDate,
                    },
                });
            });
        }
        this.loggerService.log(`Data export ${exportId} completed for customer ${customerId}`, 'GdprExportService');
        return exportData;
    }
    async exportPortableData(customerId, tenantId) {
        const customer = (await this.prisma.withTenant(tenantId, async (prisma) => {
            return prisma.customerEncrypted.findFirst({
                where: { id: customerId, tenantId },
                include: {
                    vehicles: true,
                    bookings: true,
                },
            });
        }));
        if (!customer) {
            throw new common_1.NotFoundException(`Customer ${customerId} not found`);
        }
        const decryptedPhone = customer.phoneEncrypted
            ? this.encryption.decrypt(customer.phoneEncrypted.toString())
            : undefined;
        const decryptedEmail = customer.emailEncrypted
            ? this.encryption.decrypt(customer.emailEncrypted.toString())
            : undefined;
        const decryptedName = customer.nameEncrypted
            ? this.encryption.decrypt(customer.nameEncrypted.toString())
            : undefined;
        return {
            schemaVersion: '1.0',
            exportDate: new Date().toISOString(),
            dataController: {
                name: 'MechMind Technologies S.r.l.',
                contact: 'dpo@mechmind.io',
            },
            customer: {
                id: customer.id,
                personalData: {
                    phone: decryptedPhone,
                    email: decryptedEmail,
                    name: decryptedName,
                    gdprConsent: customer.gdprConsent,
                    gdprConsentDate: customer.gdprConsentDate,
                    marketingConsent: customer.marketingConsent,
                    createdAt: customer.createdAt,
                },
                vehicles: customer.vehicles.map((v) => ({
                    licensePlate: v.licensePlate,
                    make: v.make,
                    model: v.model,
                    year: v.year,
                })),
                bookings: customer.bookings.map((b) => ({
                    scheduledDate: b.scheduledDate,
                    status: b.status,
                    estimatedDurationMinutes: b.estimatedDurationMinutes,
                    totalCostCents: b.totalCostCents?.toString(),
                    paymentStatus: b.paymentStatus,
                })),
                services: [],
            },
        };
    }
    async generateExport(customerId, tenantId, format) {
        const exportId = `export-${Date.now()}-${customerId.substring(0, 8)}`;
        const expiresAt = new Date(Date.now() + this.EXPORT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
        try {
            const data = await this.exportCustomerData(customerId, tenantId, format);
            let serialized;
            switch (format) {
                case 'JSON':
                    serialized = JSON.stringify(data, null, 2);
                    break;
                case 'CSV':
                    serialized = this.convertToCSV(data);
                    break;
                case 'PDF':
                    throw new Error('PDF export not yet implemented');
                default:
                    throw new Error(`Unsupported format: ${format}`);
            }
            const checksum = this.generateChecksum(serialized);
            const downloadUrl = `https://api.mechmind.io/v1/gdpr/exports/${exportId}/download`;
            return {
                exportId,
                status: 'COMPLETED',
                format,
                downloadUrl,
                expiresAt,
                fileSize: Buffer.byteLength(serialized, 'utf8'),
                checksum,
            };
        }
        catch (error) {
            return {
                exportId,
                status: 'FAILED',
                format,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    async getExportStatus(_exportId) {
        return null;
    }
    convertToCSV(data) {
        const rows = [];
        rows.push('Section,Field,Value');
        rows.push(`Personal,ID,${data.personalData.id}`);
        rows.push(`Personal,Created At,${data.personalData.createdAt}`);
        rows.push(`Personal,Phone,${data.personalData.phone || ''}`);
        rows.push(`Personal,Email,${data.personalData.email || ''}`);
        rows.push(`Personal,Name,${data.personalData.name || ''}`);
        rows.push(`Personal,GDPR Consent,${data.personalData.gdprConsent}`);
        rows.push(`Personal,Marketing Consent,${data.personalData.marketingConsent}`);
        for (const vehicle of data.vehicles) {
            rows.push(`Vehicle,ID,${vehicle.id}`);
            rows.push(`Vehicle,License Plate,${vehicle.licensePlate}`);
            rows.push(`Vehicle,Make,${vehicle.make || ''}`);
            rows.push(`Vehicle,Model,${vehicle.model || ''}`);
        }
        for (const booking of data.bookings) {
            rows.push(`Booking,ID,${booking.id}`);
            rows.push(`Booking,Status,${booking.status}`);
            rows.push(`Booking,Total Cost,${booking.totalCostCents || ''}`);
        }
        return rows.join('\n');
    }
    generateChecksum(data) {
        return crypto.createHash('sha256').update(data).digest('hex');
    }
};
exports.GdprExportService = GdprExportService;
exports.GdprExportService = GdprExportService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        encryption_service_1.EncryptionService,
        logger_service_1.LoggerService])
], GdprExportService);
