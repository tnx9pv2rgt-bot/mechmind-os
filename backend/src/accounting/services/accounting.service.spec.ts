import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AccountingService } from './accounting.service';
import { PrismaService } from '../../common/services/prisma.service';
import { LoggerService } from '../../common/services/logger.service';

// Mock Prisma enums that may not be generated in test environment
jest.mock('@prisma/client', () => ({
  ...(jest.requireActual('@prisma/client') as Record<string, unknown>),
  AccountingProvider: {
    QUICKBOOKS: 'QUICKBOOKS',
    XERO: 'XERO',
    FATTUREINCLOUD: 'FATTUREINCLOUD',
  },
  AccountingSyncStatus: {
    PENDING: 'PENDING',
    SYNCING: 'SYNCING',
    SYNCED: 'SYNCED',
    FAILED: 'FAILED',
  },
}));

const mockPrisma = {
  accountingSync: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
};

const mockEventEmitter = { emit: jest.fn() };
const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

describe('AccountingService', () => {
  let service: AccountingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: LoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<AccountingService>(AccountingService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('syncInvoice', () => {
    it('should create sync record and attempt sync', async () => {
      const syncRecord = {
        id: '1',
        tenantId: 't1',
        entityType: 'INVOICE',
        entityId: 'inv1',
        provider: 'FATTUREINCLOUD',
        status: 'PENDING',
        payload: { invoiceId: 'inv1' },
        externalId: null,
      };
      mockPrisma.accountingSync.create.mockResolvedValue(syncRecord);
      // executeSyncRecord: mark syncing, then catch provider error
      mockPrisma.accountingSync.update
        .mockResolvedValueOnce({ ...syncRecord, status: 'SYNCING' })
        .mockResolvedValueOnce({ ...syncRecord, status: 'FAILED', error: 'Not connected' });

      const result = await service.syncInvoice('t1', 'inv1', 'FATTUREINCLOUD' as never);
      expect(result.entityType).toBe('INVOICE');
      expect(mockPrisma.accountingSync.create).toHaveBeenCalled();
    });
  });

  describe('syncCustomer', () => {
    it('should create sync record for customer', async () => {
      const syncRecord = {
        id: '2',
        tenantId: 't1',
        entityType: 'CUSTOMER',
        entityId: 'c1',
        provider: 'XERO',
        status: 'PENDING',
        payload: { customerId: 'c1' },
        externalId: null,
      };
      mockPrisma.accountingSync.create.mockResolvedValue(syncRecord);
      mockPrisma.accountingSync.update
        .mockResolvedValueOnce({ ...syncRecord, status: 'SYNCING' })
        .mockResolvedValueOnce({ ...syncRecord, status: 'FAILED' });

      const result = await service.syncCustomer('t1', 'c1', 'XERO' as never);
      expect(result.entityType).toBe('CUSTOMER');
    });
  });

  describe('findAll', () => {
    it('should return sync records with filters', async () => {
      const records = [{ id: '1', provider: 'XERO', status: 'SYNCED' }];
      mockPrisma.accountingSync.findMany.mockResolvedValue(records);
      mockPrisma.accountingSync.count.mockResolvedValue(1);

      const result = await service.findAll('t1', { provider: 'XERO' as never });
      expect(result.records).toEqual(records);
      expect(result.total).toBe(1);
    });
  });

  describe('retry', () => {
    it('should retry a failed sync', async () => {
      const existing = {
        id: '1',
        tenantId: 't1',
        status: 'FAILED',
        retryCount: 1,
        provider: 'XERO',
        entityType: 'INVOICE',
        entityId: 'inv1',
        payload: { invoiceId: 'inv1' },
        externalId: null,
      };
      mockPrisma.accountingSync.findFirst.mockResolvedValue(existing);
      const retried = { ...existing, status: 'PENDING', retryCount: 2 };
      mockPrisma.accountingSync.update
        .mockResolvedValueOnce(retried) // retry reset
        .mockResolvedValueOnce({ ...retried, status: 'SYNCING' }) // executeSyncRecord syncing
        .mockResolvedValueOnce({ ...retried, status: 'FAILED' }); // catch error

      const result = await service.retry('t1', '1');
      expect(mockPrisma.accountingSync.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when sync not found', async () => {
      mockPrisma.accountingSync.findFirst.mockResolvedValue(null);
      await expect(service.retry('t1', 'x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStatus', () => {
    it('should return sync status for entity', async () => {
      const records = [{ id: '1', status: 'SYNCED', syncedAt: new Date() }];
      mockPrisma.accountingSync.findMany.mockResolvedValue(records);

      const result = await service.getStatus('t1', 'INVOICE', 'inv1');
      expect(result).toEqual(records);
    });
  });
});
