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
exports.InspectionService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../common/services/prisma.service");
const s3_service_1 = require("../../common/services/s3.service");
const notifications_service_1 = require("../../notifications/services/notifications.service");
const client_1 = require("@prisma/client");
let InspectionService = class InspectionService {
    constructor(prisma, config, s3, notifications) {
        this.prisma = prisma;
        this.config = config;
        this.s3 = s3;
        this.notifications = notifications;
        this.photoBucket = this.config.get('S3_INSPECTION_PHOTOS_BUCKET', 'mechmind-inspection-photos');
    }
    async create(tenantId, dto) {
        const template = await this.prisma.inspectionTemplate.findFirst({
            where: { id: dto.templateId, tenantId, isActive: true },
            include: { items: { orderBy: { position: 'asc' } } },
        });
        if (!template) {
            throw new common_1.NotFoundException('Inspection template not found');
        }
        const inspection = await this.prisma.inspection.create({
            data: {
                tenantId,
                templateId: dto.templateId,
                vehicleId: dto.vehicleId,
                customerId: dto.customerId,
                mechanicId: dto.mechanicId,
                mileage: dto.mileage,
                fuelLevel: dto.fuelLevel,
                status: client_1.InspectionStatus.IN_PROGRESS,
                items: {
                    create: template.items.map(item => ({
                        templateItemId: item.id,
                        status: client_1.InspectionItemStatus.PENDING,
                    })),
                },
            },
            include: {
                vehicle: true,
                customer: true,
                mechanic: { select: { id: true, name: true } },
                items: { include: { templateItem: true, photos: true } },
                findings: true,
                photos: true,
            },
        });
        return this.mapToResponseDto(inspection);
    }
    async findById(tenantId, id) {
        const inspection = await this.prisma.inspection.findFirst({
            where: { id, tenantId },
            include: {
                vehicle: true,
                customer: true,
                mechanic: { select: { id: true, name: true } },
                items: { include: { templateItem: true, photos: true } },
                findings: true,
                photos: true,
            },
        });
        if (!inspection) {
            throw new common_1.NotFoundException('Inspection not found');
        }
        return this.mapToResponseDto(inspection);
    }
    async findAll(tenantId, filters) {
        const inspections = await this.prisma.inspection.findMany({
            where: {
                tenantId,
                ...(filters.vehicleId && { vehicleId: filters.vehicleId }),
                ...(filters.customerId && { customerId: filters.customerId }),
                ...(filters.status && { status: filters.status }),
                ...(filters.mechanicId && { mechanicId: filters.mechanicId }),
            },
            include: {
                vehicle: true,
                customer: true,
                mechanic: { select: { name: true } },
                findings: { select: { severity: true } },
            },
            orderBy: { startedAt: 'desc' },
        });
        return inspections.map(i => ({
            id: i.id,
            status: i.status,
            startedAt: i.startedAt,
            vehicleInfo: `${i.vehicle.make} ${i.vehicle.model} (${i.vehicle.licensePlate})`,
            customerName: i.customer.encryptedFirstName || 'Unknown',
            mechanicName: i.mechanic.name,
            issuesFound: i.findings.length,
            criticalIssues: i.findings.filter((f) => f.severity === 'CRITICAL').length,
        }));
    }
    async update(tenantId, id, dto, mechanicId) {
        const inspection = await this.prisma.inspection.findFirst({
            where: { id, tenantId, mechanicId },
        });
        if (!inspection) {
            throw new common_1.NotFoundException('Inspection not found');
        }
        if (dto.items) {
            for (const item of dto.items) {
                await this.prisma.inspectionItem.updateMany({
                    where: {
                        inspectionId: id,
                        templateItemId: item.templateItemId,
                    },
                    data: {
                        status: item.status,
                        notes: item.notes,
                        severity: item.severity,
                    },
                });
            }
        }
        const updated = await this.prisma.inspection.update({
            where: { id },
            data: {
                status: dto.status,
                mileage: dto.mileage,
                ...(dto.status === client_1.InspectionStatus.READY_FOR_CUSTOMER && {
                    completedAt: new Date(),
                }),
            },
            include: {
                vehicle: true,
                customer: true,
                mechanic: { select: { id: true, name: true } },
                items: { include: { templateItem: true, photos: true } },
                findings: true,
                photos: true,
            },
        });
        if (dto.status === client_1.InspectionStatus.READY_FOR_CUSTOMER) {
            await this.notifyCustomer(updated);
        }
        return this.mapToResponseDto(updated);
    }
    async addFinding(tenantId, inspectionId, dto) {
        const inspection = await this.prisma.inspection.findFirst({
            where: { id: inspectionId, tenantId },
        });
        if (!inspection) {
            throw new common_1.NotFoundException('Inspection not found');
        }
        await this.prisma.inspectionFinding.create({
            data: {
                inspectionId,
                category: dto.category,
                title: dto.title,
                description: dto.description,
                severity: dto.severity,
                recommendation: dto.recommendation,
                estimatedCost: dto.estimatedCost,
                status: client_1.FindingStatus.REPORTED,
            },
        });
    }
    async updateFinding(tenantId, findingId, dto) {
        const finding = await this.prisma.inspectionFinding.findFirst({
            where: { id: findingId, inspection: { tenantId } },
        });
        if (!finding) {
            throw new common_1.NotFoundException('Finding not found');
        }
        await this.prisma.inspectionFinding.update({
            where: { id: findingId },
            data: {
                status: dto.status,
                ...(dto.approvedByCustomer && {
                    approvedByCustomer: true,
                    approvedAt: new Date(),
                }),
            },
        });
    }
    async uploadPhoto(tenantId, inspectionId, file, mimeType, uploadedBy, itemId, category, description) {
        const inspection = await this.prisma.inspection.findFirst({
            where: { id: inspectionId, tenantId },
        });
        if (!inspection) {
            throw new common_1.NotFoundException('Inspection not found');
        }
        const timestamp = Date.now();
        const key = `inspections/${tenantId}/${inspectionId}/${timestamp}.jpg`;
        await this.s3.upload(this.photoBucket, key, file, mimeType);
        const url = await this.s3.getSignedUrl(this.photoBucket, key, 3600 * 24 * 7);
        const photo = await this.prisma.inspectionPhoto.create({
            data: {
                inspectionId,
                itemId,
                s3Key: key,
                s3Bucket: this.photoBucket,
                url,
                category,
                description,
                takenBy: uploadedBy,
            },
        });
        return { id: photo.id, url };
    }
    async submitCustomerApproval(tenantId, inspectionId, dto) {
        const inspection = await this.prisma.inspection.findFirst({
            where: { id: inspectionId, tenantId },
            include: { customer: true },
        });
        if (!inspection) {
            throw new common_1.NotFoundException('Inspection not found');
        }
        if (dto.approvedFindingIds.length > 0) {
            await this.prisma.inspectionFinding.updateMany({
                where: { id: { in: dto.approvedFindingIds } },
                data: {
                    status: client_1.FindingStatus.APPROVED,
                    approvedByCustomer: true,
                    approvedAt: new Date(),
                },
            });
        }
        if (dto.declinedFindingIds.length > 0) {
            await this.prisma.inspectionFinding.updateMany({
                where: { id: { in: dto.declinedFindingIds } },
                data: { status: client_1.FindingStatus.DECLINED },
            });
        }
        await this.prisma.inspection.update({
            where: { id: inspectionId },
            data: {
                status: client_1.InspectionStatus.APPROVED,
                approvedAt: new Date(),
                approvedBy: dto.email,
            },
        });
        await this.notifications.sendNotification({
            tenantId,
            userId: inspection.mechanicId,
            type: 'inspection_completed',
            title: 'Inspection Approved',
            message: `Customer has approved the inspection findings`,
            data: { inspectionId, type: 'INSPECTION_APPROVED' },
        });
    }
    async generateReport(tenantId, inspectionId) {
        const inspection = await this.findById(tenantId, inspectionId);
        throw new Error('PDF generation not yet implemented');
    }
    async notifyCustomer(inspection) {
        await this.notifications.sendNotification({
            tenantId: inspection.tenantId,
            userId: inspection.mechanicId,
            type: 'inspection_completed',
            title: 'Your Vehicle Inspection is Ready',
            message: 'Your vehicle inspection has been completed and is ready for review.',
            data: {
                customerName: inspection.customer.encryptedFirstName,
                vehicleInfo: `${inspection.vehicle.make} ${inspection.vehicle.model}`,
                inspectionUrl: `${this.config.get('FRONTEND_URL')}/inspections/${inspection.id}`,
                findingsCount: inspection.findings.length,
            },
            email: {
                to: inspection.customer.encryptedEmail,
                subject: 'Your Vehicle Inspection is Ready',
                template: 'inspection-ready',
                variables: {
                    customerName: inspection.customer.encryptedFirstName,
                    vehicleInfo: `${inspection.vehicle.make} ${inspection.vehicle.model}`,
                    inspectionUrl: `${this.config.get('FRONTEND_URL')}/inspections/${inspection.id}`,
                    findingsCount: inspection.findings.length,
                },
            },
        });
        await this.prisma.inspection.update({
            where: { id: inspection.id },
            data: { customerNotified: true },
        });
    }
    mapToResponseDto(inspection) {
        return {
            id: inspection.id,
            status: inspection.status,
            startedAt: inspection.startedAt,
            completedAt: inspection.completedAt ?? undefined,
            mileage: inspection.mileage ?? undefined,
            fuelLevel: inspection.fuelLevel ?? undefined,
            vehicle: {
                id: inspection.vehicle.id,
                make: inspection.vehicle.make,
                model: inspection.vehicle.model,
                licensePlate: inspection.vehicle.licensePlate,
            },
            customer: {
                id: inspection.customer.id,
                name: inspection.customer.encryptedName || '',
            },
            mechanic: {
                id: inspection.mechanic.id,
                name: inspection.mechanic.name,
            },
            items: inspection.items.map((item) => ({
                id: item.id,
                category: item.templateItem.category,
                name: item.templateItem.name,
                status: item.status,
                notes: item.notes ?? undefined,
                severity: item.severity ?? undefined,
                photos: item.photos.map((p) => ({
                    id: p.id,
                    url: p.url,
                    thumbnailUrl: p.thumbnailUrl ?? undefined,
                    category: p.category ?? undefined,
                    description: p.description ?? undefined,
                    takenAt: p.takenAt,
                })),
            })),
            findings: inspection.findings.map((f) => ({
                id: f.id,
                category: f.category,
                title: f.title,
                description: f.description,
                severity: f.severity,
                recommendation: f.recommendation ?? undefined,
                estimatedCost: f.estimatedCost ? Number(f.estimatedCost) : undefined,
                status: f.status,
                approvedByCustomer: f.approvedByCustomer,
            })),
            photos: inspection.photos.map((p) => ({
                id: p.id,
                url: p.url,
                thumbnailUrl: p.thumbnailUrl ?? undefined,
                category: p.category ?? undefined,
                description: p.description ?? undefined,
                takenAt: p.takenAt,
            })),
            customerNotified: inspection.customerNotified,
            customerViewed: inspection.customerViewed,
            approvedAt: inspection.approvedAt ?? undefined,
        };
    }
};
exports.InspectionService = InspectionService;
exports.InspectionService = InspectionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        s3_service_1.S3Service,
        notifications_service_1.NotificationsService])
], InspectionService);
