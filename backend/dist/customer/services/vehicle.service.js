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
exports.VehicleService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/services/prisma.service");
const logger_service_1 = require("../../common/services/logger.service");
let VehicleService = class VehicleService {
    constructor(prisma, logger) {
        this.prisma = prisma;
        this.logger = logger;
    }
    async create(tenantId, customerId, dto) {
        return this.prisma.withTenant(tenantId, async (prisma) => {
            const customer = await prisma.customer.findFirst({
                where: { id: customerId, tenantId },
            });
            if (!customer) {
                throw new common_1.NotFoundException(`Customer ${customerId} not found`);
            }
            const normalizedPlate = dto.licensePlate.toUpperCase().replace(/\s+/g, '');
            const existing = await prisma.vehicle.findFirst({
                where: {
                    licensePlate: normalizedPlate,
                    customerId,
                },
            });
            if (existing) {
                throw new common_1.NotFoundException(`Vehicle with license plate ${dto.licensePlate} already exists for this customer`);
            }
            const vehicle = await prisma.vehicle.create({
                data: {
                    licensePlate: normalizedPlate,
                    make: dto.make,
                    model: dto.model,
                    year: dto.year,
                    vin: dto.vin?.toUpperCase(),
                    notes: dto.notes,
                    customer: { connect: { id: customerId } },
                },
            });
            this.logger.log(`Created vehicle ${vehicle.id} for customer ${customerId}`);
            return vehicle;
        });
    }
    async findById(tenantId, vehicleId) {
        return this.prisma.withTenant(tenantId, async (prisma) => {
            const vehicle = await prisma.vehicle.findFirst({
                where: { id: vehicleId },
                include: {
                    customer: true,
                    bookings: {
                        orderBy: { scheduledDate: 'desc' },
                        take: 5,
                    },
                },
            });
            if (!vehicle) {
                throw new common_1.NotFoundException(`Vehicle ${vehicleId} not found`);
            }
            return vehicle;
        });
    }
    async findByCustomer(tenantId, customerId) {
        return this.prisma.withTenant(tenantId, async (prisma) => {
            const customer = await prisma.customer.findFirst({
                where: { id: customerId, tenantId },
            });
            if (!customer) {
                throw new common_1.NotFoundException(`Customer ${customerId} not found`);
            }
            return prisma.vehicle.findMany({
                where: { customerId },
                orderBy: { createdAt: 'desc' },
            });
        });
    }
    async findByLicensePlate(tenantId, licensePlate) {
        return this.prisma.withTenant(tenantId, async (prisma) => {
            const normalizedPlate = licensePlate.toUpperCase().replace(/\s+/g, '');
            return prisma.vehicle.findFirst({
                where: { licensePlate: normalizedPlate },
                include: {
                    customer: true,
                },
            });
        });
    }
    async update(tenantId, vehicleId, dto) {
        return this.prisma.withTenant(tenantId, async (prisma) => {
            const vehicle = await prisma.vehicle.findFirst({
                where: { id: vehicleId },
            });
            if (!vehicle) {
                throw new common_1.NotFoundException(`Vehicle ${vehicleId} not found`);
            }
            const updateData = {};
            if (dto.licensePlate) {
                updateData.licensePlate = dto.licensePlate
                    .toUpperCase()
                    .replace(/\s+/g, '');
            }
            if (dto.make)
                updateData.make = dto.make;
            if (dto.model)
                updateData.model = dto.model;
            if (dto.year !== undefined)
                updateData.year = dto.year;
            if (dto.vin)
                updateData.vin = dto.vin.toUpperCase();
            if (dto.notes !== undefined)
                updateData.notes = dto.notes;
            const updated = await prisma.vehicle.update({
                where: { id: vehicleId },
                data: updateData,
            });
            this.logger.log(`Updated vehicle ${vehicleId}`);
            return updated;
        });
    }
    async delete(tenantId, vehicleId) {
        return this.prisma.withTenant(tenantId, async (prisma) => {
            const vehicle = await prisma.vehicle.findFirst({
                where: { id: vehicleId },
            });
            if (!vehicle) {
                throw new common_1.NotFoundException(`Vehicle ${vehicleId} not found`);
            }
            await prisma.vehicle.delete({
                where: { id: vehicleId },
            });
            this.logger.log(`Deleted vehicle ${vehicleId}`);
        });
    }
};
exports.VehicleService = VehicleService;
exports.VehicleService = VehicleService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        logger_service_1.LoggerService])
], VehicleService);
