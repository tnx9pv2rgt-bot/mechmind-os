import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FleetService } from './fleet.service';
import { PrismaService } from '../../common/services/prisma.service';
import { LoggerService } from '../../common/services/logger.service';

const mockPrisma = {
  fleet: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  fleetVehicle: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  vehicle: {
    findFirst: jest.fn(),
  },
};

const mockEventEmitter = { emit: jest.fn() };
const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

describe('FleetService', () => {
  let service: FleetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FleetService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: LoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<FleetService>(FleetService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create — success path variations', () => {
    it('should create a fleet with all required fields', async () => {
      const dto = {
        name: 'Test Fleet',
        companyName: 'Acme',
        description: 'Test description',
        contactName: 'John',
        contactEmail: 'john@acme.com',
        contactPhone: '+1234567890',
      };
      const expected = { id: '1', tenantId: 't1', ...dto, isActive: true };
      mockPrisma.fleet.create.mockResolvedValue(expected);

      const result = await service.create('t1', dto as never);
      expect(result).toEqual(expected);
      expect(mockPrisma.fleet.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 't1',
          name: 'Test Fleet',
          companyName: 'Acme',
          description: 'Test description',
          contactName: 'John',
          contactEmail: 'john@acme.com',
          contactPhone: '+1234567890',
          isActive: true,
        }),
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'fleet.created',
        expect.objectContaining({ fleetId: '1', tenantId: 't1', name: 'Test Fleet' }),
      );
    });

    it('should create a fleet with minimal fields', async () => {
      const dto = { name: 'Minimal Fleet', companyName: 'Corp' };
      const expected = { id: '2', tenantId: 't1', ...dto, isActive: true };
      mockPrisma.fleet.create.mockResolvedValue(expected);

      const result = await service.create('t1', dto as never);
      expect(result).toEqual(expected);
      expect(mockEventEmitter.emit).toHaveBeenCalledTimes(1);
    });

    it('should emit fleet.created event with correct payload', async () => {
      const dto = { name: 'Event Test', companyName: 'Test Co' };
      const created = { id: 'fleet-123', tenantId: 't1', ...dto, isActive: true };
      mockPrisma.fleet.create.mockResolvedValue(created);

      await service.create('t1', dto as never);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('fleet.created', {
        fleetId: 'fleet-123',
        tenantId: 't1',
        name: 'Event Test',
      });
    });

    it('should pass tenantId in create data', async () => {
      const dto = { name: 'Fleet', companyName: 'Co' };
      mockPrisma.fleet.create.mockResolvedValue({ id: '1', tenantId: 't1', ...dto } as never);

      await service.create('tenant-xyz', dto as never);
      expect(mockPrisma.fleet.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ tenantId: 'tenant-xyz' }),
      });
    });

    it('should log fleet creation', async () => {
      const dto = { name: 'Test Fleet', companyName: 'Corp' };
      mockPrisma.fleet.create.mockResolvedValue({ id: '1', tenantId: 't1', ...dto } as never);

      await service.create('t1', dto as never);
      expect(mockLogger.log).toHaveBeenCalledWith(`Creating fleet "Test Fleet" for tenant t1`);
    });
  });

  describe('findAll', () => {
    it('should return all fleets for tenant with default pagination', async () => {
      const fleets = [{ id: '1', name: 'Fleet A' }];
      mockPrisma.fleet.findMany.mockResolvedValue(fleets);
      mockPrisma.fleet.count.mockResolvedValue(1);

      const result = await service.findAll('t1');
      expect(result).toEqual({ data: fleets, total: 1, page: 1, limit: 20, pages: 1 });
      expect(mockPrisma.fleet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 't1', isActive: true }),
          skip: 0,
          take: 20,
        }),
      );
      expect(mockPrisma.fleet.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId: 't1', isActive: true }) }),
      );
    });

    it('should handle custom page and limit', async () => {
      const fleets = [{ id: '2', name: 'Fleet B' }];
      mockPrisma.fleet.findMany.mockResolvedValue(fleets);
      mockPrisma.fleet.count.mockResolvedValue(50);

      const result = await service.findAll('t1', 2, 10);
      expect(result).toEqual({ data: fleets, total: 50, page: 2, limit: 10, pages: 5 });
      expect(mockPrisma.fleet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should calculate pages correctly', async () => {
      mockPrisma.fleet.findMany.mockResolvedValue([]);
      mockPrisma.fleet.count.mockResolvedValue(45);

      const result = await service.findAll('t1', 1, 10);
      expect(result.pages).toBe(5); // ceil(45/10) = 5
    });

    it('should filter only active fleets', async () => {
      mockPrisma.fleet.findMany.mockResolvedValue([]);
      mockPrisma.fleet.count.mockResolvedValue(0);

      await service.findAll('t1');
      expect(mockPrisma.fleet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should handle zero results', async () => {
      mockPrisma.fleet.findMany.mockResolvedValue([]);
      mockPrisma.fleet.count.mockResolvedValue(0);

      const result = await service.findAll('t1');
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.pages).toBe(0); // ceil(0/20) = 0
    });

    it('should calculate pages correctly with fractional pages', async () => {
      mockPrisma.fleet.findMany.mockResolvedValue([]);
      mockPrisma.fleet.count.mockResolvedValue(25);

      const result = await service.findAll('t1', 1, 10);
      expect(result.pages).toBe(3); // ceil(25/10) = 3
    });

    it('should sort by createdAt descending', async () => {
      mockPrisma.fleet.findMany.mockResolvedValue([]);
      mockPrisma.fleet.count.mockResolvedValue(0);

      await service.findAll('t1');
      expect(mockPrisma.fleet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });

    it('should call both findMany and count in parallel', async () => {
      mockPrisma.fleet.findMany.mockResolvedValue([]);
      mockPrisma.fleet.count.mockResolvedValue(0);

      await service.findAll('t1');
      expect(mockPrisma.fleet.findMany).toHaveBeenCalled();
      expect(mockPrisma.fleet.count).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return fleet by id with tenant isolation', async () => {
      const fleet = { id: '1', tenantId: 't1', name: 'Fleet A', vehicles: [] };
      mockPrisma.fleet.findFirst.mockResolvedValue(fleet);

      const result = await service.findById('t1', '1');
      expect(result).toEqual(fleet);
      expect(mockPrisma.fleet.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: '1', tenantId: 't1' }),
        }),
      );
    });

    it('should include vehicle associations', async () => {
      const fleet = { id: '1', tenantId: 't1', name: 'Fleet A', vehicles: [] };
      mockPrisma.fleet.findFirst.mockResolvedValue(fleet);

      await service.findById('t1', '1');
      expect(mockPrisma.fleet.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            vehicles: expect.objectContaining({ where: { removedAt: null } }),
          }),
        }),
      );
    });

    it('should throw NotFoundException when fleet not found for tenant', async () => {
      mockPrisma.fleet.findFirst.mockResolvedValue(null);
      await expect(service.findById('t1', 'nonexistent')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.fleet.findFirst).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException with correct error message', async () => {
      mockPrisma.fleet.findFirst.mockResolvedValue(null);
      await expect(service.findById('t1', 'fleet-xyz')).rejects.toThrow(
        new NotFoundException('Fleet with ID fleet-xyz not found'),
      );
    });

    it('should filter out removed vehicles', async () => {
      const fleet = { id: '1', tenantId: 't1', name: 'Fleet A', vehicles: [] };
      mockPrisma.fleet.findFirst.mockResolvedValue(fleet);

      await service.findById('t1', '1');
      expect(mockPrisma.fleet.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            vehicles: {
              where: { removedAt: null },
              include: { vehicle: true },
            },
          },
        }),
      );
    });
  });

  describe('update', () => {
    it('should update a fleet name', async () => {
      const existing = { id: '1', tenantId: 't1', name: 'Old Fleet', companyName: 'Acme' };
      mockPrisma.fleet.findFirst.mockResolvedValue(existing);
      const updated = { ...existing, name: 'New Fleet' };
      mockPrisma.fleet.update.mockResolvedValue(updated);

      const result = await service.update('t1', '1', { name: 'New Fleet' } as never);
      expect(result).toEqual(updated);
      expect(mockPrisma.fleet.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { name: 'New Fleet' },
      });
    });

    it('should update multiple fields', async () => {
      const existing = { id: '1', tenantId: 't1', name: 'Old', description: 'Old desc' };
      mockPrisma.fleet.findFirst.mockResolvedValue(existing);
      const dto = { name: 'New', description: 'New desc', contactName: 'John' };
      const updated = { ...existing, ...dto };
      mockPrisma.fleet.update.mockResolvedValue(updated);

      await service.update('t1', '1', dto as never);
      expect(mockPrisma.fleet.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining(dto),
      });
    });

    it('should emit fleet.updated event', async () => {
      mockPrisma.fleet.findFirst.mockResolvedValue({ id: '1' });
      const updated = { id: '1', tenantId: 't1', name: 'New' };
      mockPrisma.fleet.update.mockResolvedValue(updated);

      await service.update('t1', '1', { name: 'New' } as never);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'fleet.updated',
        expect.objectContaining({ fleetId: '1', tenantId: 't1' }),
      );
    });

    it('should verify fleet exists before updating', async () => {
      mockPrisma.fleet.findFirst.mockResolvedValue(null);
      await expect(service.update('t1', 'nonexistent', { name: 'X' } as never)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.fleet.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException with correct error message', async () => {
      mockPrisma.fleet.findFirst.mockResolvedValue(null);
      await expect(service.update('t1', 'fleet-999', { name: 'X' } as never)).rejects.toThrow(
        new NotFoundException('Fleet with ID fleet-999 not found'),
      );
    });
  });

  describe('delete', () => {
    it('should soft-delete a fleet by setting isActive to false', async () => {
      const existing = { id: '1', tenantId: 't1', name: 'Fleet', isActive: true };
      mockPrisma.fleet.findFirst.mockResolvedValue(existing);
      const deleted = { ...existing, isActive: false };
      mockPrisma.fleet.update.mockResolvedValue(deleted);

      const result = await service.delete('t1', '1');
      expect(result).toEqual(deleted);
      expect(result.isActive).toBe(false);
      expect(mockPrisma.fleet.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isActive: false },
      });
    });

    it('should emit fleet.deleted event', async () => {
      mockPrisma.fleet.findFirst.mockResolvedValue({ id: '1' });
      const deleted = { id: '1', tenantId: 't1', isActive: false };
      mockPrisma.fleet.update.mockResolvedValue(deleted);

      await service.delete('t1', '1');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'fleet.deleted',
        expect.objectContaining({ fleetId: '1', tenantId: 't1' }),
      );
    });

    it('should verify fleet exists before deleting', async () => {
      mockPrisma.fleet.findFirst.mockResolvedValue(null);
      await expect(service.delete('t1', 'nonexistent')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.fleet.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException with correct error message', async () => {
      mockPrisma.fleet.findFirst.mockResolvedValue(null);
      await expect(service.delete('t1', 'fleet-999')).rejects.toThrow(
        new NotFoundException('Fleet with ID fleet-999 not found'),
      );
    });

    it('should use correct fleet ID in update', async () => {
      mockPrisma.fleet.findFirst.mockResolvedValue({ id: 'fleet-xyz' });
      mockPrisma.fleet.update.mockResolvedValue({ id: 'fleet-xyz', isActive: false } as never);

      await service.delete('t1', 'fleet-xyz');
      expect(mockPrisma.fleet.update).toHaveBeenCalledWith({
        where: { id: 'fleet-xyz' },
        data: { isActive: false },
      });
    });
  });

  describe('event emission', () => {
    it('should emit event with correct fleet.created payload shape', async () => {
      const dto = { name: 'Event Fleet', companyName: 'Co' };
      const created = { id: 'ev1', tenantId: 't1', name: 'Event Fleet', companyName: 'Co' };
      mockPrisma.fleet.create.mockResolvedValue(created as never);

      await service.create('t1', dto as never);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'fleet.created',
        expect.objectContaining({
          fleetId: 'ev1',
          tenantId: 't1',
          name: 'Event Fleet',
        }),
      );
    });

    it('should emit event on fleet update', async () => {
      mockPrisma.fleet.findFirst.mockResolvedValue({ id: 'upd1' });
      mockPrisma.fleet.update.mockResolvedValue({ id: 'upd1', tenantId: 't1' } as never);

      await service.update('t1', 'upd1', { name: 'Updated' } as never);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'fleet.updated',
        expect.objectContaining({ fleetId: 'upd1', tenantId: 't1' }),
      );
    });

    it('should emit event on fleet delete', async () => {
      mockPrisma.fleet.findFirst.mockResolvedValue({ id: 'del1' });
      mockPrisma.fleet.update.mockResolvedValue({ id: 'del1', tenantId: 't1' } as never);

      await service.delete('t1', 'del1');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'fleet.deleted',
        expect.objectContaining({ fleetId: 'del1', tenantId: 't1' }),
      );
    });

    it('should emit event on vehicle add with all fields', async () => {
      mockPrisma.fleet.findFirst.mockResolvedValue({ id: 'f1' });
      mockPrisma.vehicle.findFirst.mockResolvedValue({ id: 'v1' });
      mockPrisma.fleetVehicle.findFirst.mockResolvedValue(null);
      mockPrisma.fleetVehicle.create.mockResolvedValue({ id: 'fv1' } as never);

      await service.addVehicle('t1', 'f1', 'v1');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'fleet.vehicle.added',
        expect.objectContaining({
          fleetId: 'f1',
          vehicleId: 'v1',
          tenantId: 't1',
        }),
      );
    });

    it('should emit event on vehicle remove with all fields', async () => {
      mockPrisma.fleet.findFirst.mockResolvedValue({ id: 'f1' });
      mockPrisma.fleetVehicle.findFirst.mockResolvedValue({ id: 'fv1' });
      mockPrisma.fleetVehicle.update.mockResolvedValue({ id: 'fv1' } as never);

      await service.removeVehicle('t1', 'f1', 'v1');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'fleet.vehicle.removed',
        expect.objectContaining({
          fleetId: 'f1',
          vehicleId: 'v1',
          tenantId: 't1',
        }),
      );
    });
  });

  describe('cross-tenant isolation', () => {
    it('should not find fleet from different tenant', async () => {
      mockPrisma.fleet.findFirst.mockResolvedValue(null);

      await expect(service.findById('tenant-other', 'fleet-1')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.fleet.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant-other' }),
        }),
      );
    });

    it('should filter findAll by tenant', async () => {
      mockPrisma.fleet.findMany.mockResolvedValue([]);
      mockPrisma.fleet.count.mockResolvedValue(0);

      await service.findAll('different-tenant', 1, 20);
      expect(mockPrisma.fleet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'different-tenant' }),
        }),
      );
    });

    it('should include tenantId in all create queries', async () => {
      const dto = { name: 'Fleet', companyName: 'Co' };
      mockPrisma.fleet.create.mockResolvedValue({ id: '1', tenantId: 'secure-tenant' } as never);

      await service.create('secure-tenant', dto as never);
      expect(mockPrisma.fleet.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ tenantId: 'secure-tenant' }),
      });
    });
  });

  describe('addVehicle', () => {
    it('should add vehicle to fleet', async () => {
      mockPrisma.fleet.findFirst.mockResolvedValue({ id: '1' });
      mockPrisma.vehicle.findFirst.mockResolvedValue({ id: 'v1' });
      mockPrisma.fleetVehicle.findFirst.mockResolvedValue(null);
      const expected = { id: 'fv1', fleetId: '1', vehicleId: 'v1' };
      mockPrisma.fleetVehicle.create.mockResolvedValue(expected);

      const result = await service.addVehicle('t1', '1', 'v1');
      expect(result).toEqual(expected);
      expect(mockPrisma.fleetVehicle.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ tenantId: 't1', fleetId: '1', vehicleId: 'v1' }) }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('fleet.vehicle.added', expect.any(Object));
    });

    it('should throw NotFoundException if fleet not found', async () => {
      mockPrisma.fleet.findFirst.mockResolvedValue(null);
      await expect(service.addVehicle('t1', 'nonexistent', 'v1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if vehicle not found', async () => {
      mockPrisma.fleet.findFirst.mockResolvedValue({ id: '1' });
      mockPrisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.addVehicle('t1', '1', 'v-nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if vehicle already assigned', async () => {
      mockPrisma.fleet.findFirst.mockResolvedValue({ id: '1' });
      mockPrisma.vehicle.findFirst.mockResolvedValue({ id: 'v1' });
      mockPrisma.fleetVehicle.findFirst.mockResolvedValue({
        id: 'fv1',
        fleetId: '1',
        vehicleId: 'v1',
        removedAt: null,
      });

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { BadRequestException } = require('@nestjs/common');
      await expect(service.addVehicle('t1', '1', 'v1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeVehicle', () => {
    it('should soft-remove vehicle from fleet by setting removedAt', async () => {
      mockPrisma.fleet.findFirst.mockResolvedValue({ id: '1' });
      const existing = { id: 'fv1', fleetId: '1', vehicleId: 'v1', removedAt: null };
      const removedDate = new Date('2026-05-01T10:00:00Z');
      mockPrisma.fleetVehicle.findFirst.mockResolvedValue(existing);
      mockPrisma.fleetVehicle.update.mockResolvedValue({ ...existing, removedAt: removedDate });

      const result = await service.removeVehicle('t1', '1', 'v1');
      expect(result.removedAt).toEqual(removedDate);
      expect(mockPrisma.fleetVehicle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'fv1' },
          data: { removedAt: expect.any(Date) },
        }),
      );
    });

    it('should emit fleet.vehicle.removed event', async () => {
      mockPrisma.fleet.findFirst.mockResolvedValue({ id: '1' });
      const existing = { id: 'fv1', fleetId: '1', vehicleId: 'v1', removedAt: null };
      mockPrisma.fleetVehicle.findFirst.mockResolvedValue(existing);
      mockPrisma.fleetVehicle.update.mockResolvedValue({ ...existing, removedAt: new Date() });

      await service.removeVehicle('t1', '1', 'v1');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'fleet.vehicle.removed',
        expect.objectContaining({ fleetId: '1', vehicleId: 'v1', tenantId: 't1' }),
      );
    });

    it('should throw NotFoundException if fleet not found', async () => {
      mockPrisma.fleet.findFirst.mockResolvedValue(null);
      await expect(service.removeVehicle('t1', 'nonexistent', 'v1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if vehicle not assigned to fleet', async () => {
      mockPrisma.fleet.findFirst.mockResolvedValue({ id: '1' });
      mockPrisma.fleetVehicle.findFirst.mockResolvedValue(null);

      await expect(service.removeVehicle('t1', '1', 'v1')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.fleetVehicle.update).not.toHaveBeenCalled();
    });

    it('should only remove vehicles with removedAt=null (not already removed)', async () => {
      mockPrisma.fleet.findFirst.mockResolvedValue({ id: '1' });
      mockPrisma.fleetVehicle.findFirst.mockResolvedValue(null); // Already removed
      await expect(service.removeVehicle('t1', '1', 'v1')).rejects.toThrow(NotFoundException);
    });

    it('should filter by tenantId and fleetId', async () => {
      mockPrisma.fleet.findFirst.mockResolvedValue({ id: '1' });
      const existing = { id: 'fv1', fleetId: '1', vehicleId: 'v1', removedAt: null };
      mockPrisma.fleetVehicle.findFirst.mockResolvedValue(existing);
      mockPrisma.fleetVehicle.update.mockResolvedValue({ ...existing, removedAt: new Date() });

      await service.removeVehicle('t1', '1', 'v1');
      expect(mockPrisma.fleetVehicle.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 't1',
            fleetId: '1',
            vehicleId: 'v1',
            removedAt: null,
          }),
        }),
      );
    });
  });
});
