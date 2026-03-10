import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EstimateService } from './estimate.service';
import { PrismaService } from '../../common/services/prisma.service';
import { LoggerService } from '../../common/services/logger.service';

// Mock Prisma enums that may not be generated in test environment
jest.mock('@prisma/client', () => ({
  ...(jest.requireActual('@prisma/client') as Record<string, unknown>),
  EstimateStatus: {
    DRAFT: 'DRAFT',
    SENT: 'SENT',
    ACCEPTED: 'ACCEPTED',
    REJECTED: 'REJECTED',
    CONVERTED: 'CONVERTED',
    EXPIRED: 'EXPIRED',
  },
}));

const mockPrisma = {
  estimate: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  estimateLine: {
    create: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockEventEmitter = { emit: jest.fn() };
const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

describe('EstimateService', () => {
  let service: EstimateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EstimateService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: LoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<EstimateService>(EstimateService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an estimate with lines', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue(null);
      const expected = {
        id: '1',
        estimateNumber: 'EST-2026-0001',
        status: 'DRAFT',
        lines: [],
      };
      mockPrisma.estimate.create.mockResolvedValue(expected);

      const result = await service.create('t1', {
        customerId: 'c1',
        createdBy: 'u1',
        lines: [],
      } as never);
      expect(result.estimateNumber).toContain('EST-');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('estimate.created', expect.any(Object));
    });
  });

  describe('findAll', () => {
    it('should return estimates with pagination', async () => {
      const estimates = [{ id: '1', lines: [] }];
      mockPrisma.$transaction.mockResolvedValue([estimates, 1]);

      const result = await service.findAll('t1', {});
      expect(result).toEqual({ estimates, total: 1 });
    });
  });

  describe('findById', () => {
    it('should return estimate with lines', async () => {
      const estimate = { id: '1', lines: [{ id: 'l1' }] };
      mockPrisma.estimate.findFirst.mockResolvedValue(estimate);

      const result = await service.findById('t1', '1');
      expect(result).toEqual(estimate);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue(null);
      await expect(service.findById('t1', 'x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('send', () => {
    it('should mark estimate as SENT', async () => {
      const estimate = { id: '1', status: 'DRAFT', customerId: 'c1', estimateNumber: 'EST-001' };
      mockPrisma.estimate.findFirst.mockResolvedValue(estimate);
      mockPrisma.estimate.update.mockResolvedValue({ ...estimate, status: 'SENT' });

      const result = await service.send('t1', '1');
      expect(result.status).toBe('SENT');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('estimate.sent', expect.any(Object));
    });
  });

  describe('accept', () => {
    it('should mark estimate as ACCEPTED', async () => {
      const estimate = { id: '1', status: 'SENT', customerId: 'c1', estimateNumber: 'EST-001' };
      mockPrisma.estimate.findFirst.mockResolvedValue(estimate);
      mockPrisma.estimate.update.mockResolvedValue({ ...estimate, status: 'ACCEPTED' });

      const result = await service.accept('t1', '1');
      expect(result.status).toBe('ACCEPTED');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('estimate.accepted', expect.any(Object));
    });
  });

  describe('reject', () => {
    it('should mark estimate as REJECTED', async () => {
      const estimate = { id: '1', status: 'SENT', customerId: 'c1', estimateNumber: 'EST-001' };
      mockPrisma.estimate.findFirst.mockResolvedValue(estimate);
      mockPrisma.estimate.update.mockResolvedValue({ ...estimate, status: 'REJECTED' });

      const result = await service.reject('t1', '1');
      expect(result.status).toBe('REJECTED');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('estimate.rejected', expect.any(Object));
    });
  });
});
