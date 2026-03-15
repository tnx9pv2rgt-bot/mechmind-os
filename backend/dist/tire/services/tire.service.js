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
exports.TireService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/services/prisma.service");
let TireService = class TireService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(tenantId, dto) {
        return this.prisma.tireSet.create({
            data: {
                tenantId,
                vehicleId: dto.vehicleId,
                brand: dto.brand,
                model: dto.model,
                size: dto.size,
                season: dto.season,
                dot: dto.dot,
                treadDepthMm: dto.treadDepthMm,
                wearLevel: dto.wearLevel ?? 0,
                storageLocation: dto.storageLocation,
                notes: dto.notes,
            },
        });
    }
    async findAll(tenantId, filters) {
        const where = {
            tenantId,
            isActive: true,
        };
        if (filters.vehicleId) {
            where.vehicleId = filters.vehicleId;
        }
        if (filters.season) {
            where.season = filters.season;
        }
        if (filters.isStored !== undefined) {
            where.isStored = filters.isStored;
        }
        return this.prisma.tireSet.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
    }
    async findById(tenantId, id) {
        const tireSet = await this.prisma.tireSet.findFirst({
            where: { id, tenantId },
        });
        if (!tireSet) {
            throw new common_1.NotFoundException(`TireSet ${id} not found`);
        }
        return tireSet;
    }
    async update(tenantId, id, dto) {
        await this.findById(tenantId, id);
        return this.prisma.tireSet.update({
            where: { id },
            data: {
                ...dto,
            },
        });
    }
    async mount(tenantId, id, vehicleId) {
        const tireSet = await this.findById(tenantId, id);
        if (tireSet.isMounted) {
            throw new common_1.BadRequestException(`TireSet ${id} is already mounted`);
        }
        return this.prisma.tireSet.update({
            where: { id },
            data: {
                vehicleId,
                isMounted: true,
                mountedAt: new Date(),
                unmountedAt: null,
                isStored: false,
                storedAt: null,
                storageLocation: null,
            },
        });
    }
    async unmount(tenantId, id) {
        const tireSet = await this.findById(tenantId, id);
        if (!tireSet.isMounted) {
            throw new common_1.BadRequestException(`TireSet ${id} is not mounted`);
        }
        return this.prisma.tireSet.update({
            where: { id },
            data: {
                isMounted: false,
                unmountedAt: new Date(),
            },
        });
    }
    async store(tenantId, id, storageLocation) {
        const tireSet = await this.findById(tenantId, id);
        if (tireSet.isStored) {
            throw new common_1.BadRequestException(`TireSet ${id} is already in storage`);
        }
        if (tireSet.isMounted) {
            throw new common_1.BadRequestException(`TireSet ${id} must be unmounted before storing`);
        }
        return this.prisma.tireSet.update({
            where: { id },
            data: {
                isStored: true,
                storedAt: new Date(),
                storageLocation,
            },
        });
    }
    async retrieve(tenantId, id) {
        const tireSet = await this.findById(tenantId, id);
        if (!tireSet.isStored) {
            throw new common_1.BadRequestException(`TireSet ${id} is not in storage`);
        }
        return this.prisma.tireSet.update({
            where: { id },
            data: {
                isStored: false,
                storedAt: null,
                storageLocation: null,
            },
        });
    }
};
exports.TireService = TireService;
exports.TireService = TireService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TireService);
