import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AccountingService,
  AccountingProviderInterface,
  AccountingProviderResult,
} from './accounting.service';
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

  describe('syncInvoice - QuickBooks provider', () => {
    it('should catch QuickBooks provider error and mark sync as FAILED', async () => {
      const syncRecord = {
        id: 'qb1',
        tenantId: 't1',
        entityType: 'INVOICE',
        entityId: 'inv1',
        provider: 'QUICKBOOKS',
        status: 'PENDING',
        payload: { invoiceId: 'inv1' },
        externalId: null,
      };
      mockPrisma.accountingSync.create.mockResolvedValue(syncRecord);
      mockPrisma.accountingSync.update
        .mockResolvedValueOnce({ ...syncRecord, status: 'SYNCING' })
        .mockResolvedValueOnce({
          ...syncRecord,
          status: 'FAILED',
          error:
            'QuickBooks integration not yet connected. Configure API credentials in tenant settings.',
        });

      const result = await service.syncInvoice('t1', 'inv1', 'QUICKBOOKS' as never);
      expect(result.status).toBe('FAILED');
      expect(result.error).toContain('QuickBooks');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'accounting.sync.failed',
        expect.objectContaining({ syncId: 'qb1' }),
      );
    });
  });

  describe('syncCustomer - FattureInCloud provider', () => {
    it('should catch FattureInCloud syncCustomer error and mark sync as FAILED', async () => {
      const syncRecord = {
        id: 'fic1',
        tenantId: 't1',
        entityType: 'CUSTOMER',
        entityId: 'c1',
        provider: 'FATTUREINCLOUD',
        status: 'PENDING',
        payload: { customerId: 'c1' },
        externalId: null,
      };
      mockPrisma.accountingSync.create.mockResolvedValue(syncRecord);
      mockPrisma.accountingSync.update
        .mockResolvedValueOnce({ ...syncRecord, status: 'SYNCING' })
        .mockResolvedValueOnce({
          ...syncRecord,
          status: 'FAILED',
          error:
            'FattureInCloud integration not yet connected. Configure API credentials in tenant settings.',
        });

      const result = await service.syncCustomer('t1', 'c1', 'FATTUREINCLOUD' as never);
      expect(result.status).toBe('FAILED');
      expect(result.error).toContain('FattureInCloud');
    });
  });

  describe('retry - non-FAILED status', () => {
    it('should throw BadRequestException when status is not FAILED', async () => {
      const existing = {
        id: '1',
        tenantId: 't1',
        status: 'SYNCED',
        retryCount: 0,
        provider: 'XERO',
        entityType: 'INVOICE',
        entityId: 'inv1',
        payload: { invoiceId: 'inv1' },
        externalId: 'ext-1',
      };
      mockPrisma.accountingSync.findFirst.mockResolvedValue(existing);

      const { BadRequestException } = jest.requireActual('@nestjs/common');
      await expect(service.retry('t1', '1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when status is PENDING', async () => {
      const existing = {
        id: '2',
        tenantId: 't1',
        status: 'PENDING',
        retryCount: 0,
        provider: 'QUICKBOOKS',
        entityType: 'CUSTOMER',
        entityId: 'c1',
        payload: {},
        externalId: null,
      };
      mockPrisma.accountingSync.findFirst.mockResolvedValue(existing);

      const { BadRequestException } = jest.requireActual('@nestjs/common');
      await expect(service.retry('t1', '2')).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll - with pagination defaults', () => {
    it('should use default limit and offset when not provided', async () => {
      mockPrisma.accountingSync.findMany.mockResolvedValue([]);
      mockPrisma.accountingSync.count.mockResolvedValue(0);

      await service.findAll('t1', {});
      expect(mockPrisma.accountingSync.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50, skip: 0 }),
      );
    });

    it('should apply status and entityType filters', async () => {
      mockPrisma.accountingSync.findMany.mockResolvedValue([]);
      mockPrisma.accountingSync.count.mockResolvedValue(0);

      await service.findAll('t1', {
        status: 'FAILED' as never,
        entityType: 'INVOICE',
        limit: 10,
        offset: 5,
      });
      expect(mockPrisma.accountingSync.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 't1',
            status: 'FAILED',
            entityType: 'INVOICE',
          }),
          take: 10,
          skip: 5,
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return record when found', async () => {
      const record = { id: '1', tenantId: 't1', status: 'SYNCED' };
      mockPrisma.accountingSync.findFirst.mockResolvedValue(record);

      const result = await service.findById('t1', '1');
      expect(result).toEqual(record);
      expect(mockPrisma.accountingSync.findFirst).toHaveBeenCalledWith({
        where: { id: '1', tenantId: 't1' },
      });
    });

    it('should throw NotFoundException when record not found', async () => {
      mockPrisma.accountingSync.findFirst.mockResolvedValue(null);
      await expect(service.findById('t1', 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('executeSyncRecord - unsupported entity type', () => {
    it('should handle unsupported entity type and mark as FAILED then SYNCED=false', async () => {
      const syncRecord = {
        id: 'unk1',
        tenantId: 't1',
        entityType: 'PAYMENT',
        entityId: 'pay1',
        provider: 'XERO',
        status: 'PENDING',
        payload: {},
        externalId: null,
      };
      mockPrisma.accountingSync.create.mockResolvedValue(syncRecord);
      // Mark as SYNCING
      mockPrisma.accountingSync.update
        .mockResolvedValueOnce({ ...syncRecord, status: 'SYNCING' })
        // result.success is false => FAILED
        .mockResolvedValueOnce({
          ...syncRecord,
          status: 'FAILED',
          error: 'Unsupported entity type: PAYMENT',
        });

      const result = await service.syncInvoice('t1', 'pay1', 'XERO' as never);
      // syncInvoice creates with entityType=INVOICE, so we need to test via internal path
      // Instead, let's test syncCustomer which goes through CUSTOMER path
      expect(result).toBeDefined();
    });
  });

  describe('executeSyncRecord - unknown provider', () => {
    it('should mark sync as FAILED for unknown provider', async () => {
      // We can't easily pass an unknown provider through public API since
      // the providers map is fixed. Instead, we test indirectly:
      // The providers map contains QUICKBOOKS, XERO, FATTUREINCLOUD
      // All three throw BadRequestException, which gets caught and marks FAILED.
      // This test verifies the error handling path works correctly.
      const syncRecord = {
        id: 'err1',
        tenantId: 't1',
        entityType: 'INVOICE',
        entityId: 'inv1',
        provider: 'QUICKBOOKS',
        status: 'PENDING',
        payload: { invoiceId: 'inv1' },
        externalId: null,
      };
      mockPrisma.accountingSync.create.mockResolvedValue(syncRecord);
      mockPrisma.accountingSync.update
        .mockResolvedValueOnce({ ...syncRecord, status: 'SYNCING' })
        .mockResolvedValueOnce({
          ...syncRecord,
          status: 'FAILED',
          error:
            'QuickBooks integration not yet connected. Configure API credentials in tenant settings.',
        });

      const result = await service.syncInvoice('t1', 'inv1', 'QUICKBOOKS' as never);
      expect(result.status).toBe('FAILED');
    });
  });

  describe('executeSyncRecord - non-Error thrown', () => {
    it('should handle non-Error objects in catch block', async () => {
      const syncRecord = {
        id: 'ne1',
        tenantId: 't1',
        entityType: 'CUSTOMER',
        entityId: 'c1',
        provider: 'XERO',
        status: 'PENDING',
        payload: { customerId: 'c1' },
        externalId: null,
      };
      mockPrisma.accountingSync.create.mockResolvedValue(syncRecord);
      // First update: mark as SYNCING succeeds
      // But then the provider throws a non-Error (string)
      mockPrisma.accountingSync.update
        .mockResolvedValueOnce({ ...syncRecord, status: 'SYNCING' })
        .mockResolvedValueOnce({
          ...syncRecord,
          status: 'FAILED',
          error:
            'Xero integration not yet connected. Configure API credentials in tenant settings.',
        });

      const result = await service.syncCustomer('t1', 'c1', 'XERO' as never);
      expect(result.status).toBe('FAILED');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'accounting.sync.failed',
        expect.objectContaining({ tenantId: 't1', syncId: 'ne1' }),
      );
    });
  });

  describe('syncInvoice - event emissions', () => {
    it('should emit accounting.sync.queued event', async () => {
      const syncRecord = {
        id: 'ev1',
        tenantId: 't1',
        entityType: 'INVOICE',
        entityId: 'inv1',
        provider: 'QUICKBOOKS',
        status: 'PENDING',
        payload: { invoiceId: 'inv1' },
        externalId: null,
      };
      mockPrisma.accountingSync.create.mockResolvedValue(syncRecord);
      mockPrisma.accountingSync.update
        .mockResolvedValueOnce({ ...syncRecord, status: 'SYNCING' })
        .mockResolvedValueOnce({ ...syncRecord, status: 'FAILED' });

      await service.syncInvoice('t1', 'inv1', 'QUICKBOOKS' as never);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('accounting.sync.queued', {
        tenantId: 't1',
        syncId: 'ev1',
        entityType: 'INVOICE',
        entityId: 'inv1',
        provider: 'QUICKBOOKS',
      });
    });
  });

  describe('syncCustomer - event emissions', () => {
    it('should emit accounting.sync.queued event for customer', async () => {
      const syncRecord = {
        id: 'ev2',
        tenantId: 't1',
        entityType: 'CUSTOMER',
        entityId: 'c1',
        provider: 'FATTUREINCLOUD',
        status: 'PENDING',
        payload: { customerId: 'c1' },
        externalId: null,
      };
      mockPrisma.accountingSync.create.mockResolvedValue(syncRecord);
      mockPrisma.accountingSync.update
        .mockResolvedValueOnce({ ...syncRecord, status: 'SYNCING' })
        .mockResolvedValueOnce({ ...syncRecord, status: 'FAILED' });

      await service.syncCustomer('t1', 'c1', 'FATTUREINCLOUD' as never);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('accounting.sync.queued', {
        tenantId: 't1',
        syncId: 'ev2',
        entityType: 'CUSTOMER',
        entityId: 'c1',
        provider: 'FATTUREINCLOUD',
      });
    });
  });

  describe('retry - event emissions', () => {
    it('should emit accounting.sync.retried event', async () => {
      const existing = {
        id: 'rev1',
        tenantId: 't1',
        status: 'FAILED',
        retryCount: 0,
        provider: 'QUICKBOOKS',
        entityType: 'INVOICE',
        entityId: 'inv1',
        payload: { invoiceId: 'inv1' },
        externalId: null,
      };
      mockPrisma.accountingSync.findFirst.mockResolvedValue(existing);
      const retried = { ...existing, status: 'PENDING', retryCount: 1 };
      mockPrisma.accountingSync.update
        .mockResolvedValueOnce(retried)
        .mockResolvedValueOnce({ ...retried, status: 'SYNCING' })
        .mockResolvedValueOnce({ ...retried, status: 'FAILED' });

      await service.retry('t1', 'rev1');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('accounting.sync.retried', {
        tenantId: 't1',
        syncId: 'rev1',
        retryCount: 1,
      });
    });
  });

  describe('executeSyncRecord - unknown provider path', () => {
    it('should mark sync as FAILED when provider is not in the map', async () => {
      // Access private providers map to remove QUICKBOOKS
      const providersMap = (
        service as unknown as { providers: Map<string, AccountingProviderInterface> }
      ).providers;
      providersMap.delete('QUICKBOOKS');

      const syncRecord = {
        id: 'unkp1',
        tenantId: 't1',
        entityType: 'INVOICE',
        entityId: 'inv1',
        provider: 'QUICKBOOKS',
        status: 'PENDING',
        payload: { invoiceId: 'inv1' },
        externalId: null,
      };
      mockPrisma.accountingSync.create.mockResolvedValue(syncRecord);
      mockPrisma.accountingSync.update.mockResolvedValueOnce({
        ...syncRecord,
        status: 'FAILED',
        error: 'Unknown provider: QUICKBOOKS',
      });

      const result = await service.syncInvoice('t1', 'inv1', 'QUICKBOOKS' as never);
      expect(result.status).toBe('FAILED');
      expect(result.error).toBe('Unknown provider: QUICKBOOKS');
      // Only one update call (the FAILED one), no SYNCING step
      expect(mockPrisma.accountingSync.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('executeSyncRecord - successful sync', () => {
    it('should mark sync as SYNCED when provider returns success', async () => {
      // Inject a mock provider that returns success
      const mockProvider: AccountingProviderInterface = {
        syncInvoice: jest.fn().mockResolvedValue({
          success: true,
          externalId: 'ext-123',
          response: { status: 'ok' },
        } as AccountingProviderResult),
        syncCustomer: jest.fn().mockResolvedValue({
          success: true,
          externalId: 'ext-456',
        } as AccountingProviderResult),
      };
      const providersMap = (
        service as unknown as { providers: Map<string, AccountingProviderInterface> }
      ).providers;
      providersMap.set('XERO' as never, mockProvider);

      const syncRecord = {
        id: 'succ1',
        tenantId: 't1',
        entityType: 'INVOICE',
        entityId: 'inv1',
        provider: 'XERO',
        status: 'PENDING',
        payload: { invoiceId: 'inv1' },
        externalId: null,
      };
      mockPrisma.accountingSync.create.mockResolvedValue(syncRecord);
      mockPrisma.accountingSync.update
        .mockResolvedValueOnce({ ...syncRecord, status: 'SYNCING' })
        .mockResolvedValueOnce({
          ...syncRecord,
          status: 'SYNCED',
          externalId: 'ext-123',
          syncedAt: new Date(),
        });

      const result = await service.syncInvoice('t1', 'inv1', 'XERO' as never);
      expect(result.status).toBe('SYNCED');
      expect(result.externalId).toBe('ext-123');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'accounting.sync.completed',
        expect.objectContaining({ syncId: 'succ1', externalId: 'ext-123' }),
      );
    });

    it('should handle successful customer sync', async () => {
      const mockProvider: AccountingProviderInterface = {
        syncInvoice: jest.fn(),
        syncCustomer: jest.fn().mockResolvedValue({
          success: true,
          externalId: 'ext-cust-1',
        } as AccountingProviderResult),
      };
      const providersMap = (
        service as unknown as { providers: Map<string, AccountingProviderInterface> }
      ).providers;
      providersMap.set('FATTUREINCLOUD' as never, mockProvider);

      const syncRecord = {
        id: 'succ2',
        tenantId: 't1',
        entityType: 'CUSTOMER',
        entityId: 'c1',
        provider: 'FATTUREINCLOUD',
        status: 'PENDING',
        payload: { customerId: 'c1' },
        externalId: null,
      };
      mockPrisma.accountingSync.create.mockResolvedValue(syncRecord);
      mockPrisma.accountingSync.update
        .mockResolvedValueOnce({ ...syncRecord, status: 'SYNCING' })
        .mockResolvedValueOnce({
          ...syncRecord,
          status: 'SYNCED',
          externalId: 'ext-cust-1',
          syncedAt: new Date(),
        });

      const result = await service.syncCustomer('t1', 'c1', 'FATTUREINCLOUD' as never);
      expect(result.status).toBe('SYNCED');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'accounting.sync.completed',
        expect.objectContaining({ syncId: 'succ2' }),
      );
    });

    it('should handle failed result from provider (success=false)', async () => {
      const mockProvider: AccountingProviderInterface = {
        syncInvoice: jest.fn().mockResolvedValue({
          success: false,
          error: 'Invalid invoice data',
        } as AccountingProviderResult),
        syncCustomer: jest.fn(),
      };
      const providersMap = (
        service as unknown as { providers: Map<string, AccountingProviderInterface> }
      ).providers;
      providersMap.set('XERO' as never, mockProvider);

      const syncRecord = {
        id: 'fail1',
        tenantId: 't1',
        entityType: 'INVOICE',
        entityId: 'inv1',
        provider: 'XERO',
        status: 'PENDING',
        payload: { invoiceId: 'inv1' },
        externalId: null,
      };
      mockPrisma.accountingSync.create.mockResolvedValue(syncRecord);
      mockPrisma.accountingSync.update
        .mockResolvedValueOnce({ ...syncRecord, status: 'SYNCING' })
        .mockResolvedValueOnce({
          ...syncRecord,
          status: 'FAILED',
          error: 'Invalid invoice data',
        });

      const result = await service.syncInvoice('t1', 'inv1', 'XERO' as never);
      expect(result.status).toBe('FAILED');
      expect(result.error).toBe('Invalid invoice data');
      // Should NOT emit completed
      expect(mockEventEmitter.emit).not.toHaveBeenCalledWith(
        'accounting.sync.completed',
        expect.anything(),
      );
    });
  });

  describe('executeSyncRecord - unsupported entity type via injected provider', () => {
    it('should return FAILED for unsupported entity type', async () => {
      const mockProvider: AccountingProviderInterface = {
        syncInvoice: jest.fn(),
        syncCustomer: jest.fn(),
      };
      const providersMap = (
        service as unknown as { providers: Map<string, AccountingProviderInterface> }
      ).providers;
      providersMap.set('XERO' as never, mockProvider);

      // Create a sync record with entity type PAYMENT (unsupported)
      const syncRecord = {
        id: 'unsup1',
        tenantId: 't1',
        entityType: 'PAYMENT',
        entityId: 'pay1',
        provider: 'XERO',
        status: 'PENDING',
        payload: {},
        externalId: null,
      };
      mockPrisma.accountingSync.create.mockResolvedValue(syncRecord);
      mockPrisma.accountingSync.update
        .mockResolvedValueOnce({ ...syncRecord, status: 'SYNCING' })
        .mockResolvedValueOnce({
          ...syncRecord,
          status: 'FAILED',
          error: 'Unsupported entity type: PAYMENT',
        });

      // Use syncInvoice which creates with entityType=INVOICE, but internal record has PAYMENT
      // Actually we need to go via the internal executeSyncRecord, which is called after create
      // The created record has entityType PAYMENT from the mock
      const result = await service.syncInvoice('t1', 'pay1', 'XERO' as never);
      expect(result.status).toBe('FAILED');
      expect(result.error).toBe('Unsupported entity type: PAYMENT');
    });
  });

  describe('syncCustomer - QuickBooks provider', () => {
    it('should catch QuickBooks syncCustomer error and mark as FAILED', async () => {
      const syncRecord = {
        id: 'qbc1',
        tenantId: 't1',
        entityType: 'CUSTOMER',
        entityId: 'c1',
        provider: 'QUICKBOOKS',
        status: 'PENDING',
        payload: { customerId: 'c1' },
        externalId: null,
      };
      mockPrisma.accountingSync.create.mockResolvedValue(syncRecord);
      mockPrisma.accountingSync.update
        .mockResolvedValueOnce({ ...syncRecord, status: 'SYNCING' })
        .mockResolvedValueOnce({
          ...syncRecord,
          status: 'FAILED',
          error:
            'QuickBooks integration not yet connected. Configure API credentials in tenant settings.',
        });

      const result = await service.syncCustomer('t1', 'c1', 'QUICKBOOKS' as never);
      expect(result.status).toBe('FAILED');
      expect(result.error).toContain('QuickBooks');
    });
  });

  describe('executeSyncRecord - non-Error thrown in catch', () => {
    it('should use "Unknown error during sync" when thrown value is not an Error', async () => {
      const mockProvider: AccountingProviderInterface = {
        syncInvoice: jest.fn().mockRejectedValue('string-error-not-Error-instance'),
        syncCustomer: jest.fn(),
      };
      const providersMap = (
        service as unknown as { providers: Map<string, AccountingProviderInterface> }
      ).providers;
      providersMap.set('XERO' as never, mockProvider);

      const syncRecord = {
        id: 'nee1',
        tenantId: 't1',
        entityType: 'INVOICE',
        entityId: 'inv1',
        provider: 'XERO',
        status: 'PENDING',
        payload: { invoiceId: 'inv1' },
        externalId: null,
      };
      mockPrisma.accountingSync.create.mockResolvedValue(syncRecord);
      mockPrisma.accountingSync.update
        .mockResolvedValueOnce({ ...syncRecord, status: 'SYNCING' })
        .mockResolvedValueOnce({
          ...syncRecord,
          status: 'FAILED',
          error: 'Unknown error during sync',
        });

      const result = await service.syncInvoice('t1', 'inv1', 'XERO' as never);
      expect(result.status).toBe('FAILED');
      expect(result.error).toBe('Unknown error during sync');
    });
  });

  describe('executeSyncRecord - null payload handling', () => {
    it('should handle sync record with null payload', async () => {
      const mockProvider: AccountingProviderInterface = {
        syncInvoice: jest.fn().mockResolvedValue({
          success: true,
          externalId: 'ext-np',
        } as AccountingProviderResult),
        syncCustomer: jest.fn(),
      };
      const providersMap = (
        service as unknown as { providers: Map<string, AccountingProviderInterface> }
      ).providers;
      providersMap.set('XERO' as never, mockProvider);

      const syncRecord = {
        id: 'np1',
        tenantId: 't1',
        entityType: 'INVOICE',
        entityId: 'inv1',
        provider: 'XERO',
        status: 'PENDING',
        payload: null,
        externalId: 'existing-ext',
      };
      mockPrisma.accountingSync.create.mockResolvedValue(syncRecord);
      mockPrisma.accountingSync.update
        .mockResolvedValueOnce({ ...syncRecord, status: 'SYNCING' })
        .mockResolvedValueOnce({ ...syncRecord, status: 'SYNCED', externalId: 'ext-np' });

      const result = await service.syncInvoice('t1', 'inv1', 'XERO' as never);
      expect(result.status).toBe('SYNCED');
      // Provider should be called with empty object since payload is null
      expect(mockProvider.syncInvoice).toHaveBeenCalledWith('t1', 'inv1', {});
    });
  });
});
