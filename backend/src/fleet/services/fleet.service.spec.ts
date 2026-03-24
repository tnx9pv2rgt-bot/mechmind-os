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

  describe('create', () => {
    it('should create a fleet', async () => {
      const dto = { name: 'Test Fleet', companyName: 'Acme' };
      const expected = { id: '1', tenantId: 't1', ...dto, isActive: true };
      mockPrisma.fleet.create.mockResolvedValue(expected);

      const result = await service.create('t1', dto as never);
      expect(result).toEqual(expected);
      expect(mockPrisma.fleet.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ tenantId: 't1', name: 'Test Fleet' }),
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('fleet.created', expect.any(Object));
    });
  });

  describe('findAll', () => {
    it('should return all fleets for tenant', async () => {
      const fleets = [{ id: '1', name: 'Fleet A' }];
      mockPrisma.fleet.findMany.mockResolvedValue(fleets);
      mockPrisma.fleet.count.mockResolvedValue(1);

      const result = await service.findAll('t1');
      expect(result).toEqual({ data: fleets, total: 1, page: 1, limit: 20, pages: 1 });
      expect(mockPrisma.fleet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId: 't1' }) }),
      );
    });
  });

  describe('findById', () => {
    it('should return fleet by id', async () => {
      const fleet = { id: '1', name: 'Fleet A', fleetVehicles: [] };
      mockPrisma.fleet.findFirst.mockResolvedValue(fleet);

      const result = await service.findById('t1', '1');
      expect(result).toEqual(fleet);
    });

    it('should throw NotFoundException when fleet not found', async () => {
      mockPrisma.fleet.findFirst.mockResolvedValue(null);
      await expect(service.findById('t1', 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a fleet', async () => {
      const existing = { id: '1', tenantId: 't1', name: 'Old Fleet' };
      mockPrisma.fleet.findFirst.mockResolvedValue(existing);
      const updated = { ...existing, name: 'New Fleet' };
      mockPrisma.fleet.update.mockResolvedValue(updated);

      const result = await service.update('t1', '1', { name: 'New Fleet' } as never);
      expect(result).toEqual(updated);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'fleet.updated',
        expect.objectContaining({ fleetId: '1', tenantId: 't1' }),
      );
    });

    it('should throw NotFoundException if fleet not found', async () => {
      mockPrisma.fleet.findFirst.mockResolvedValue(null);
      await expect(service.update('t1', 'nonexistent', { name: 'X' } as never)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should soft-delete a fleet', async () => {
      const existing = { id: '1', tenantId: 't1', name: 'Fleet' };
      mockPrisma.fleet.findFirst.mockResolvedValue(existing);
      const deleted = { ...existing, isActive: false };
      mockPrisma.fleet.update.mockResolvedValue(deleted);

      const result = await service.delete('t1', '1');
      expect(result).toEqual(deleted);
      expect(mockPrisma.fleet.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isActive: false },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'fleet.deleted',
        expect.objectContaining({ fleetId: '1', tenantId: 't1' }),
      );
    });

    it('should throw NotFoundException if fleet not found', async () => {
      mockPrisma.fleet.findFirst.mockResolvedValue(null);
      await expect(service.delete('t1', 'nonexistent')).rejects.toThrow(NotFoundException);
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
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('fleet.vehicle.added', expect.any(Object));
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
    it('should soft-remove vehicle from fleet', async () => {
      mockPrisma.fleet.findFirst.mockResolvedValue({ id: '1' });
      const existing = { id: 'fv1', fleetId: '1', vehicleId: 'v1', removedAt: null };
      mockPrisma.fleetVehicle.findFirst.mockResolvedValue(existing);
      mockPrisma.fleetVehicle.update.mockResolvedValue({ ...existing, removedAt: new Date() });

      await service.removeVehicle('t1', '1', 'v1');
      expect(mockPrisma.fleetVehicle.update).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'fleet.vehicle.removed',
        expect.any(Object),
      );
    });

    it('should throw NotFoundException if vehicle not assigned to fleet', async () => {
      mockPrisma.fleet.findFirst.mockResolvedValue({ id: '1' });
      mockPrisma.fleetVehicle.findFirst.mockResolvedValue(null);

      await expect(service.removeVehicle('t1', '1', 'v1')).rejects.toThrow(NotFoundException);
    });
  });
});
