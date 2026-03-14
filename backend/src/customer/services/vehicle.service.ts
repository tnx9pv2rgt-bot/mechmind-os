import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Vehicle } from '@prisma/client';
import { PrismaService } from '@common/services/prisma.service';
import { LoggerService } from '@common/services/logger.service';
import { CreateVehicleDto, UpdateVehicleDto } from '../dto/vehicle.dto';

const vehicleWithCustomerAndBookings = {
  customer: true,
  bookings: {
    orderBy: { scheduledDate: 'desc' as const },
    take: 5,
  },
} as const;

type VehicleWithRelations = Prisma.VehicleGetPayload<{
  include: typeof vehicleWithCustomerAndBookings;
}>;

type VehicleWithCustomer = Prisma.VehicleGetPayload<{
  include: { customer: true };
}>;

@Injectable()
export class VehicleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Create a new vehicle for a customer
   */
  async create(tenantId: string, customerId: string, dto: CreateVehicleDto): Promise<Vehicle> {
    return this.prisma.withTenant(tenantId, async prisma => {
      // Verify customer exists
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, tenantId },
      });

      if (!customer) {
        throw new NotFoundException(`Customer ${customerId} not found`);
      }

      // Normalize license plate
      const normalizedPlate = dto.licensePlate.toUpperCase().replace(/\s+/g, '');

      // Check for duplicate license plate
      const existing = await prisma.vehicle.findFirst({
        where: {
          licensePlate: normalizedPlate,
          customerId,
        },
      });

      if (existing) {
        throw new NotFoundException(
          `Vehicle with license plate ${dto.licensePlate} already exists for this customer`,
        );
      }

      const vehicle = await prisma.vehicle.create({
        data: {
          licensePlate: normalizedPlate,
          make: dto.make,
          model: dto.model,
          year: dto.year,
          vin: dto.vin?.toUpperCase(),
          notes: dto.notes,
          status: dto.status || 'active',
          mileage: dto.mileage,
          customer: { connect: { id: customerId } },
        },
      });

      this.logger.log(`Created vehicle ${vehicle.id} for customer ${customerId}`);

      return vehicle;
    });
  }

  /**
   * Find all vehicles with pagination and filtering
   */
  async findAll(
    tenantId: string,
    options?: { limit?: number; offset?: number; search?: string; status?: string },
  ): Promise<{ vehicles: Vehicle[]; total: number }> {
    return this.prisma.withTenant(tenantId, async prisma => {
      const where: Prisma.VehicleWhereInput = {};

      if (options?.search) {
        where.OR = [
          { licensePlate: { contains: options.search.toUpperCase(), mode: 'insensitive' } },
          { make: { contains: options.search, mode: 'insensitive' } },
          { model: { contains: options.search, mode: 'insensitive' } },
        ];
      }
      if (options?.status) {
        where.status = options.status;
      }

      const [vehicles, total] = await Promise.all([
        prisma.vehicle.findMany({
          where,
          include: { customer: true },
          orderBy: { updatedAt: 'desc' },
          take: options?.limit || 50,
          skip: options?.offset || 0,
        }),
        prisma.vehicle.count({ where }),
      ]);

      return { vehicles, total };
    });
  }

  /**
   * Find vehicle by ID
   */
  async findById(tenantId: string, vehicleId: string): Promise<VehicleWithRelations> {
    return this.prisma.withTenant(tenantId, async prisma => {
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
        throw new NotFoundException(`Vehicle ${vehicleId} not found`);
      }

      return vehicle;
    });
  }

  /**
   * Find vehicles by customer
   */
  async findByCustomer(tenantId: string, customerId: string): Promise<Vehicle[]> {
    return this.prisma.withTenant(tenantId, async prisma => {
      // Verify customer exists
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, tenantId },
      });

      if (!customer) {
        throw new NotFoundException(`Customer ${customerId} not found`);
      }

      return prisma.vehicle.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
      });
    });
  }

  /**
   * Find vehicle by license plate
   */
  async findByLicensePlate(
    tenantId: string,
    licensePlate: string,
  ): Promise<VehicleWithCustomer | null> {
    return this.prisma.withTenant(tenantId, async prisma => {
      const normalizedPlate = licensePlate.toUpperCase().replace(/\s+/g, '');

      return prisma.vehicle.findFirst({
        where: { licensePlate: normalizedPlate },
        include: {
          customer: true,
        },
      });
    });
  }

  /**
   * Update vehicle
   */
  async update(tenantId: string, vehicleId: string, dto: UpdateVehicleDto): Promise<Vehicle> {
    return this.prisma.withTenant(tenantId, async prisma => {
      const vehicle = await prisma.vehicle.findFirst({
        where: { id: vehicleId },
      });

      if (!vehicle) {
        throw new NotFoundException(`Vehicle ${vehicleId} not found`);
      }

      const updateData: Prisma.VehicleUpdateInput = {};

      if (dto.licensePlate) {
        updateData.licensePlate = dto.licensePlate.toUpperCase().replace(/\s+/g, '');
      }
      if (dto.make) updateData.make = dto.make;
      if (dto.model) updateData.model = dto.model;
      if (dto.year !== undefined) updateData.year = dto.year;
      if (dto.vin) updateData.vin = dto.vin.toUpperCase();
      if (dto.notes !== undefined) updateData.notes = dto.notes;
      if (dto.status) updateData.status = dto.status;
      if (dto.mileage !== undefined) updateData.mileage = dto.mileage;

      const updated = await prisma.vehicle.update({
        where: { id: vehicleId },
        data: updateData,
      });

      this.logger.log(`Updated vehicle ${vehicleId}`);

      return updated;
    });
  }

  /**
   * Delete vehicle
   */
  async delete(tenantId: string, vehicleId: string): Promise<void> {
    return this.prisma.withTenant(tenantId, async prisma => {
      const vehicle = await prisma.vehicle.findFirst({
        where: { id: vehicleId },
      });

      if (!vehicle) {
        throw new NotFoundException(`Vehicle ${vehicleId} not found`);
      }

      await prisma.vehicle.delete({
        where: { id: vehicleId },
      });

      this.logger.log(`Deleted vehicle ${vehicleId}`);
    });
  }
}
