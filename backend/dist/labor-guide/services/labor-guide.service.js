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
exports.LaborGuideService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/services/prisma.service");
let LaborGuideService = class LaborGuideService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createGuide(tenantId, dto) {
        const existing = await this.prisma.laborGuide.findUnique({
            where: { tenantId_name: { tenantId, name: dto.name } },
        });
        if (existing) {
            throw new common_1.BadRequestException(`Labor guide with name "${dto.name}" already exists`);
        }
        return this.prisma.laborGuide.create({
            data: {
                tenantId,
                name: dto.name,
                description: dto.description,
                source: dto.source,
            },
        });
    }
    async findAllGuides(tenantId) {
        return this.prisma.laborGuide.findMany({
            where: { tenantId, isActive: true },
            orderBy: { name: 'asc' },
        });
    }
    async findGuideById(tenantId, id) {
        const guide = await this.prisma.laborGuide.findFirst({
            where: { id, tenantId },
            include: { entries: { orderBy: { operationName: 'asc' } } },
        });
        if (!guide) {
            throw new common_1.NotFoundException(`Labor guide with id "${id}" not found`);
        }
        return guide;
    }
    async updateGuide(tenantId, id, dto) {
        await this.findGuideById(tenantId, id);
        if (dto.name) {
            const existing = await this.prisma.laborGuide.findFirst({
                where: {
                    tenantId,
                    name: dto.name,
                    id: { not: id },
                },
            });
            if (existing) {
                throw new common_1.BadRequestException(`Labor guide with name "${dto.name}" already exists`);
            }
        }
        return this.prisma.laborGuide.update({
            where: { id },
            data: {
                name: dto.name,
                description: dto.description,
                source: dto.source,
                isActive: dto.isActive,
            },
        });
    }
    async deleteGuide(tenantId, id) {
        await this.findGuideById(tenantId, id);
        return this.prisma.laborGuide.update({
            where: { id },
            data: { isActive: false },
        });
    }
    async addEntry(tenantId, guideId, dto) {
        await this.findGuideById(tenantId, guideId);
        if (dto.yearFrom && dto.yearTo && dto.yearFrom > dto.yearTo) {
            throw new common_1.BadRequestException('yearFrom must be less than or equal to yearTo');
        }
        return this.prisma.laborGuideEntry.create({
            data: {
                tenantId,
                guideId,
                make: dto.make,
                model: dto.model,
                yearFrom: dto.yearFrom,
                yearTo: dto.yearTo,
                operationCode: dto.operationCode,
                operationName: dto.operationName,
                category: dto.category,
                laborTimeMinutes: dto.laborTimeMinutes,
                difficultyLevel: dto.difficultyLevel ?? 1,
                notes: dto.notes,
            },
        });
    }
    async updateEntry(tenantId, entryId, dto) {
        const entry = await this.prisma.laborGuideEntry.findFirst({
            where: { id: entryId, tenantId },
        });
        if (!entry) {
            throw new common_1.NotFoundException(`Labor guide entry with id "${entryId}" not found`);
        }
        const yearFrom = dto.yearFrom ?? entry.yearFrom;
        const yearTo = dto.yearTo ?? entry.yearTo;
        if (yearFrom && yearTo && yearFrom > yearTo) {
            throw new common_1.BadRequestException('yearFrom must be less than or equal to yearTo');
        }
        return this.prisma.laborGuideEntry.update({
            where: { id: entryId },
            data: {
                make: dto.make,
                model: dto.model,
                yearFrom: dto.yearFrom,
                yearTo: dto.yearTo,
                operationCode: dto.operationCode,
                operationName: dto.operationName,
                category: dto.category,
                laborTimeMinutes: dto.laborTimeMinutes,
                difficultyLevel: dto.difficultyLevel,
                notes: dto.notes,
            },
        });
    }
    async deleteEntry(tenantId, entryId) {
        const entry = await this.prisma.laborGuideEntry.findFirst({
            where: { id: entryId, tenantId },
        });
        if (!entry) {
            throw new common_1.NotFoundException(`Labor guide entry with id "${entryId}" not found`);
        }
        return this.prisma.laborGuideEntry.delete({
            where: { id: entryId },
        });
    }
    async searchEntries(tenantId, make, model, category) {
        const where = {
            tenantId,
            make: { equals: make, mode: 'insensitive' },
            guide: { isActive: true },
        };
        if (model) {
            where.model = { equals: model, mode: 'insensitive' };
        }
        if (category) {
            where.category = { equals: category, mode: 'insensitive' };
        }
        return this.prisma.laborGuideEntry.findMany({
            where,
            include: { guide: { select: { id: true, name: true, source: true } } },
            orderBy: [{ category: 'asc' }, { operationName: 'asc' }],
        });
    }
};
exports.LaborGuideService = LaborGuideService;
exports.LaborGuideService = LaborGuideService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LaborGuideService);
