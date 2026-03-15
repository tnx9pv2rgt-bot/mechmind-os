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
exports.FleetService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../../common/services/prisma.service");
const logger_service_1 = require("../../common/services/logger.service");
let FleetService = class FleetService {
    constructor(prisma, eventEmitter, logger) {
        this.prisma = prisma;
        this.eventEmitter = eventEmitter;
        this.logger = logger;
    }
    async create(tenantId, dto) {
        this.logger.log(`Creating fleet "${dto.name}" for tenant ${tenantId}`);
        const fleet = await this.prisma.fleet.create({
            data: {
                tenantId,
                name: dto.name,
                description: dto.description,
                companyName: dto.companyName,
                contactName: dto.contactName,
                contactEmail: dto.contactEmail,
                contactPhone: dto.contactPhone,
                isActive: true,
            },
        });
        this.eventEmitter.emit('fleet.created', {
            fleetId: fleet.id,
            tenantId,
            name: fleet.name,
        });
        return fleet;
    }
    async findAll(tenantId) {
        return this.prisma.fleet.findMany({
            where: {
                tenantId,
                isActive: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findById(tenantId, id) {
        const fleet = await this.prisma.fleet.findFirst({
            where: {
                id,
                tenantId,
            },
            include: {
                vehicles: {
                    where: { removedAt: null },
                    include: { vehicle: true },
                },
            },
        });
        if (!fleet) {
            throw new common_1.NotFoundException(`Fleet with ID ${id} not found`);
        }
        return fleet;
    }
    async update(tenantId, id, dto) {
        await this.findById(tenantId, id);
        const fleet = await this.prisma.fleet.update({
            where: { id },
            data: {
                ...dto,
            },
        });
        this.eventEmitter.emit('fleet.updated', {
            fleetId: fleet.id,
            tenantId,
        });
        return fleet;
    }
    async delete(tenantId, id) {
        await this.findById(tenantId, id);
        const fleet = await this.prisma.fleet.update({
            where: { id },
            data: { isActive: false },
        });
        this.eventEmitter.emit('fleet.deleted', {
            fleetId: fleet.id,
            tenantId,
        });
        return fleet;
    }
    async addVehicle(tenantId, fleetId, vehicleId) {
        await this.findById(tenantId, fleetId);
        const vehicle = await this.prisma.vehicle.findFirst({
            where: { id: vehicleId },
        });
        if (!vehicle) {
            throw new common_1.NotFoundException(`Vehicle with ID ${vehicleId} not found`);
        }
        const existing = await this.prisma.fleetVehicle.findFirst({
            where: {
                tenantId,
                fleetId,
                vehicleId,
                removedAt: null,
            },
        });
        if (existing) {
            throw new common_1.BadRequestException(`Vehicle ${vehicleId} is already assigned to fleet ${fleetId}`);
        }
        const fleetVehicle = await this.prisma.fleetVehicle.create({
            data: {
                tenantId,
                fleetId,
                vehicleId,
                assignedAt: new Date(),
            },
        });
        this.eventEmitter.emit('fleet.vehicle.added', {
            fleetId,
            vehicleId,
            tenantId,
        });
        return fleetVehicle;
    }
    async removeVehicle(tenantId, fleetId, vehicleId) {
        await this.findById(tenantId, fleetId);
        const fleetVehicle = await this.prisma.fleetVehicle.findFirst({
            where: {
                tenantId,
                fleetId,
                vehicleId,
                removedAt: null,
            },
        });
        if (!fleetVehicle) {
            throw new common_1.NotFoundException(`Vehicle ${vehicleId} is not assigned to fleet ${fleetId}`);
        }
        const updated = await this.prisma.fleetVehicle.update({
            where: { id: fleetVehicle.id },
            data: { removedAt: new Date() },
        });
        this.eventEmitter.emit('fleet.vehicle.removed', {
            fleetId,
            vehicleId,
            tenantId,
        });
        return updated;
    }
};
exports.FleetService = FleetService;
exports.FleetService = FleetService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2,
        logger_service_1.LoggerService])
], FleetService);
