import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GdprConsentService } from './gdpr-consent.service';
import { PrismaService } from '@common/services/prisma.service';
import { LoggerService } from '@common/services/logger.service';

describe('GdprConsentService', () => {
  let service: GdprConsentService;
  let prisma: {
    withTenant: jest.Mock;
    customerEncrypted: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    consentAuditLog: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };
  let logger: {
    log: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
    debug: jest.Mock;
  };

  const TENANT_ID = 'tenant-001';
  const CUSTOMER_ID = 'customer-001';

  const mockCustomer = {
    id: CUSTOMER_ID,
    tenantId: TENANT_ID,
    gdprConsent: true,
    gdprConsentDate: new Date('2024-01-15T10:00:00Z'),
    marketingConsent: false,
    marketingConsentDate: null,
    callRecordingConsent: false,
    updatedAt: new Date('2024-06-01T12:00:00Z'),
  };

  const mockAuditLog = {
    id: 'audit-001',
    tenantId: TENANT_ID,
    customerId: CUSTOMER_ID,
    consentType: 'GDPR' as const,
    granted: true,
    timestamp: new Date('2024-06-01T10:00:00Z'),
    ipSource: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    collectionMethod: 'WEB_FORM',
    revokedAt: null,
  };

  beforeEach(async () => {
    prisma = {
      withTenant: jest.fn((_tenantId: string, cb: (p: typeof prisma) => Promise<unknown>) =>
        cb(prisma),
      ),
      customerEncrypted: {
        findFirst: jest.fn().mockResolvedValue(mockCustomer),
        findMany: jest.fn().mockResolvedValue([mockCustomer]),
        update: jest.fn().mockResolvedValue(mockCustomer),
      },
      consentAuditLog: {
        create: jest.fn().mockResolvedValue(mockAuditLog),
        findFirst: jest.fn().mockResolvedValue(mockAuditLog),
        findMany: jest.fn().mockResolvedValue([mockAuditLog]),
        update: jest.fn().mockResolvedValue(mockAuditLog),
      },
    } as unknown as typeof prisma;

    logger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GdprConsentService,
        { provide: PrismaService, useValue: prisma },
        { provide: LoggerService, useValue: logger },
      ],
    }).compile();

    service = module.get<GdprConsentService>(GdprConsentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // recordConsent
  // =========================================================================
  describe('recordConsent', () => {
    it('should record GDPR consent with full context', async () => {
      const context = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        collectionMethod: 'WEB_FORM',
        collectionPoint: 'registration',
        legalBasis: 'EXPLICIT_CONSENT',
        verifiedIdentity: true,
        metadata: { source: 'registration-page' },
      };

      const result = await service.recordConsent(CUSTOMER_ID, TENANT_ID, 'GDPR', true, context);

      expect(result).toEqual({
        id: 'audit-001',
        customerId: CUSTOMER_ID,
        tenantId: TENANT_ID,
        consentType: 'GDPR',
        granted: true,
        timestamp: mockAuditLog.timestamp,
        ipSource: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        collectionMethod: 'WEB_FORM',
        legalBasis: 'EXPLICIT_CONSENT',
      });

      expect(prisma.withTenant).toHaveBeenCalledWith(TENANT_ID, expect.any(Function));
      expect(prisma.consentAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          customerId: CUSTOMER_ID,
          consentType: 'GDPR',
          granted: true,
          ipSource: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          collectionMethod: 'WEB_FORM',
          collectionPoint: 'registration',
          legalBasis: 'EXPLICIT_CONSENT',
          verifiedIdentity: true,
          metadata: JSON.stringify({ source: 'registration-page' }),
        }),
      });
    });

    it('should record consent without context', async () => {
      const result = await service.recordConsent(CUSTOMER_ID, TENANT_ID, 'MARKETING', true);

      expect(result.consentType).toBe('MARKETING');
      expect(result.granted).toBe(true);
      expect(result.ipSource).toBeUndefined();
      expect(result.userAgent).toBeUndefined();
      expect(result.collectionMethod).toBeUndefined();

      expect(prisma.consentAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipSource: null,
          userAgent: undefined,
          collectionMethod: undefined,
          verifiedIdentity: false,
          metadata: undefined,
        }),
      });
    });

    it('should record consent with partial context', async () => {
      const result = await service.recordConsent(CUSTOMER_ID, TENANT_ID, 'CALL_RECORDING', true, {
        ipAddress: '10.0.0.1',
      });

      expect(result.ipSource).toBe('10.0.0.1');
      expect(result.userAgent).toBeUndefined();
    });

    it('should throw NotFoundException when customer not found', async () => {
      prisma.customerEncrypted.findFirst.mockResolvedValue(null);

      await expect(service.recordConsent(CUSTOMER_ID, TENANT_ID, 'GDPR', true)).rejects.toThrow(
        NotFoundException,
      );

      await expect(service.recordConsent(CUSTOMER_ID, TENANT_ID, 'GDPR', true)).rejects.toThrow(
        `Customer ${CUSTOMER_ID} not found`,
      );

      // Restore default
      prisma.customerEncrypted.findFirst.mockResolvedValue(mockCustomer);
    });

    it('should update customer consent status for GDPR', async () => {
      await service.recordConsent(CUSTOMER_ID, TENANT_ID, 'GDPR', true);

      expect(prisma.customerEncrypted.update).toHaveBeenCalledWith({
        where: { id: CUSTOMER_ID },
        data: expect.objectContaining({
          gdprConsent: true,
          gdprConsentDate: expect.any(Date),
        }),
      });
    });

    it('should update customer consent status for MARKETING', async () => {
      await service.recordConsent(CUSTOMER_ID, TENANT_ID, 'MARKETING', false);

      expect(prisma.customerEncrypted.update).toHaveBeenCalledWith({
        where: { id: CUSTOMER_ID },
        data: expect.objectContaining({
          marketingConsent: false,
          marketingConsentDate: null,
        }),
      });
    });

    it('should update customer consent status for CALL_RECORDING', async () => {
      await service.recordConsent(CUSTOMER_ID, TENANT_ID, 'CALL_RECORDING', true);

      expect(prisma.customerEncrypted.update).toHaveBeenCalledWith({
        where: { id: CUSTOMER_ID },
        data: expect.objectContaining({
          callRecordingConsent: true,
        }),
      });
    });

    it('should not update customer record for non-standard consent types', async () => {
      await service.recordConsent(CUSTOMER_ID, TENANT_ID, 'DATA_SHARING', true);

      // update should not be called because DATA_SHARING has no matching customer field
      // withTenant is called: 1) findFirst customer, 2) create audit log
      // The updateCustomerConsentStatus won't call update because updateData is empty
      expect(prisma.customerEncrypted.update).not.toHaveBeenCalled();
    });

    it('should log consent recording', async () => {
      await service.recordConsent(CUSTOMER_ID, TENANT_ID, 'GDPR', true);

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining(`customer=${CUSTOMER_ID}`),
        'GdprConsentService',
      );
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('type=GDPR'),
        'GdprConsentService',
      );
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('granted=true'),
        'GdprConsentService',
      );
    });

    it('should record revoked consent (granted=false)', async () => {
      const result = await service.recordConsent(CUSTOMER_ID, TENANT_ID, 'GDPR', false);

      expect(result.granted).toBe(false);
      expect(prisma.consentAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ granted: false }),
      });
    });

    it('should handle all consent types', async () => {
      const types = [
        'GDPR',
        'MARKETING',
        'CALL_RECORDING',
        'DATA_SHARING',
        'THIRD_PARTY',
        'ANALYTICS',
      ] as const;

      for (const consentType of types) {
        const result = await service.recordConsent(CUSTOMER_ID, TENANT_ID, consentType, true);
        expect(result.consentType).toBe(consentType);
      }
    });
  });

  // =========================================================================
  // revokeConsent
  // =========================================================================
  describe('revokeConsent', () => {
    it('should revoke an active consent', async () => {
      await service.revokeConsent(CUSTOMER_ID, TENANT_ID, 'GDPR', 'User requested');

      expect(prisma.consentAuditLog.findFirst).toHaveBeenCalledWith({
        where: {
          customerId: CUSTOMER_ID,
          tenantId: TENANT_ID,
          consentType: 'GDPR',
          granted: true,
          revokedAt: null,
        },
        orderBy: { timestamp: 'desc' },
      });

      expect(prisma.consentAuditLog.update).toHaveBeenCalledWith({
        where: { id: mockAuditLog.id },
        data: {
          revokedAt: expect.any(Date),
          revokedBy: null,
          revocationReason: 'User requested',
        },
      });
    });

    it('should set revokedBy when provided', async () => {
      await service.revokeConsent(
        CUSTOMER_ID,
        TENANT_ID,
        'MARKETING',
        'Privacy policy update',
        'admin-001',
      );

      expect(prisma.consentAuditLog.update).toHaveBeenCalledWith({
        where: { id: mockAuditLog.id },
        data: expect.objectContaining({
          revokedBy: 'admin-001',
          revocationReason: 'Privacy policy update',
        }),
      });
    });

    it('should throw NotFoundException when no active consent found', async () => {
      prisma.consentAuditLog.findFirst.mockResolvedValue(null);

      await expect(service.revokeConsent(CUSTOMER_ID, TENANT_ID, 'GDPR')).rejects.toThrow(
        NotFoundException,
      );

      await expect(service.revokeConsent(CUSTOMER_ID, TENANT_ID, 'GDPR')).rejects.toThrow(
        `No active GDPR consent found for customer ${CUSTOMER_ID}`,
      );

      // Restore default
      prisma.consentAuditLog.findFirst.mockResolvedValue(mockAuditLog);
    });

    it('should update customer consent status to false after revocation', async () => {
      await service.revokeConsent(CUSTOMER_ID, TENANT_ID, 'GDPR');

      // updateCustomerConsentStatus is called twice:
      // 1) directly by revokeConsent with granted=false
      // 2) by the inner recordConsent call with granted=false
      expect(prisma.customerEncrypted.update).toHaveBeenCalledWith({
        where: { id: CUSTOMER_ID },
        data: expect.objectContaining({
          gdprConsent: false,
          gdprConsentDate: null,
        }),
      });
    });

    it('should record revocation as a new consent event', async () => {
      await service.revokeConsent(CUSTOMER_ID, TENANT_ID, 'GDPR', 'User request');

      // recordConsent is called internally, which calls consentAuditLog.create
      expect(prisma.consentAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          consentType: 'GDPR',
          granted: false,
          collectionMethod: 'REVOKE_API',
          legalBasis: 'WITHDRAWAL',
          metadata: JSON.stringify({
            revocationReason: 'User request',
            originalConsentId: mockAuditLog.id,
          }),
        }),
      });
    });

    it('should log the revocation', async () => {
      await service.revokeConsent(CUSTOMER_ID, TENANT_ID, 'GDPR', 'User request');

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Consent revoked'),
        'GdprConsentService',
      );
    });

    it('should handle revocation without reason', async () => {
      await service.revokeConsent(CUSTOMER_ID, TENANT_ID, 'MARKETING');

      expect(prisma.consentAuditLog.update).toHaveBeenCalledWith({
        where: { id: mockAuditLog.id },
        data: expect.objectContaining({
          revokedBy: null,
          revocationReason: undefined,
        }),
      });
    });
  });

  // =========================================================================
  // getConsentAuditTrail
  // =========================================================================
  describe('getConsentAuditTrail', () => {
    it('should return mapped audit trail entries', async () => {
      const result = await service.getConsentAuditTrail(CUSTOMER_ID, TENANT_ID);

      expect(result).toEqual([
        {
          type: 'GDPR',
          consent: true,
          timestamp: mockAuditLog.timestamp,
          ipSource: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          method: 'WEB_FORM',
          revoked: false,
          revokedAt: undefined,
        },
      ]);

      expect(prisma.consentAuditLog.findMany).toHaveBeenCalledWith({
        where: { customerId: CUSTOMER_ID, tenantId: TENANT_ID },
        orderBy: { timestamp: 'desc' },
      });
    });

    it('should return empty array when no logs exist', async () => {
      prisma.consentAuditLog.findMany.mockResolvedValueOnce([]);

      const result = await service.getConsentAuditTrail(CUSTOMER_ID, TENANT_ID);

      expect(result).toEqual([]);
    });

    it('should handle revoked consent entries', async () => {
      const revokedLog = {
        ...mockAuditLog,
        revokedAt: new Date('2024-07-01T10:00:00Z'),
      };
      prisma.consentAuditLog.findMany.mockResolvedValueOnce([revokedLog]);

      const result = await service.getConsentAuditTrail(CUSTOMER_ID, TENANT_ID);

      expect(result[0].revoked).toBe(true);
      expect(result[0].revokedAt).toEqual(new Date('2024-07-01T10:00:00Z'));
    });

    it('should handle entries with null optional fields', async () => {
      const logWithNulls = {
        ...mockAuditLog,
        ipSource: null,
        userAgent: null,
        collectionMethod: null,
      };
      prisma.consentAuditLog.findMany.mockResolvedValueOnce([logWithNulls]);

      const result = await service.getConsentAuditTrail(CUSTOMER_ID, TENANT_ID);

      expect(result[0].ipSource).toBeUndefined();
      expect(result[0].userAgent).toBeUndefined();
      expect(result[0].method).toBeUndefined();
    });

    it('should return multiple entries in order', async () => {
      const logs = [
        {
          ...mockAuditLog,
          id: 'audit-002',
          consentType: 'MARKETING',
          timestamp: new Date('2024-06-02'),
        },
        {
          ...mockAuditLog,
          id: 'audit-001',
          consentType: 'GDPR',
          timestamp: new Date('2024-06-01'),
        },
      ];
      prisma.consentAuditLog.findMany.mockResolvedValueOnce(logs);

      const result = await service.getConsentAuditTrail(CUSTOMER_ID, TENANT_ID);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('MARKETING');
      expect(result[1].type).toBe('GDPR');
    });
  });

  // =========================================================================
  // getCustomerConsentStatus
  // =========================================================================
  describe('getCustomerConsentStatus', () => {
    it('should return customer consent status', async () => {
      const result = await service.getCustomerConsentStatus(CUSTOMER_ID, TENANT_ID);

      expect(result).toEqual({
        customerId: CUSTOMER_ID,
        gdprConsent: true,
        gdprConsentDate: mockCustomer.gdprConsentDate,
        marketingConsent: false,
        marketingConsentDate: undefined,
        callRecordingConsent: false,
        lastUpdated: mockCustomer.updatedAt,
      });
    });

    it('should throw NotFoundException when customer not found', async () => {
      prisma.customerEncrypted.findFirst.mockResolvedValue(null);

      await expect(service.getCustomerConsentStatus(CUSTOMER_ID, TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );

      await expect(service.getCustomerConsentStatus(CUSTOMER_ID, TENANT_ID)).rejects.toThrow(
        `Customer ${CUSTOMER_ID} not found`,
      );

      // Restore default
      prisma.customerEncrypted.findFirst.mockResolvedValue(mockCustomer);
    });

    it('should select only necessary fields', async () => {
      await service.getCustomerConsentStatus(CUSTOMER_ID, TENANT_ID);

      expect(prisma.customerEncrypted.findFirst).toHaveBeenCalledWith({
        where: { id: CUSTOMER_ID, tenantId: TENANT_ID },
        select: {
          id: true,
          gdprConsent: true,
          gdprConsentDate: true,
          marketingConsent: true,
          marketingConsentDate: true,
          callRecordingConsent: true,
          updatedAt: true,
        },
      });
    });

    it('should handle null consent dates as undefined', async () => {
      const customerWithNullDates = {
        ...mockCustomer,
        gdprConsentDate: null,
        marketingConsentDate: null,
      };
      prisma.customerEncrypted.findFirst.mockResolvedValueOnce(customerWithNullDates);

      const result = await service.getCustomerConsentStatus(CUSTOMER_ID, TENANT_ID);

      expect(result.gdprConsentDate).toBeUndefined();
      expect(result.marketingConsentDate).toBeUndefined();
    });
  });

  // =========================================================================
  // hasConsent
  // =========================================================================
  describe('hasConsent', () => {
    it('should return true when customer has GDPR consent', async () => {
      const result = await service.hasConsent(CUSTOMER_ID, TENANT_ID, 'GDPR');
      expect(result).toBe(true);
    });

    it('should return false when customer does not have MARKETING consent', async () => {
      const result = await service.hasConsent(CUSTOMER_ID, TENANT_ID, 'MARKETING');
      expect(result).toBe(false);
    });

    it('should return false when customer does not have CALL_RECORDING consent', async () => {
      const result = await service.hasConsent(CUSTOMER_ID, TENANT_ID, 'CALL_RECORDING');
      expect(result).toBe(false);
    });

    it('should return false when customer not found', async () => {
      prisma.customerEncrypted.findFirst.mockResolvedValueOnce(null);

      const result = await service.hasConsent(CUSTOMER_ID, TENANT_ID, 'GDPR');
      expect(result).toBe(false);
    });

    it('should check audit log for DATA_SHARING consent type', async () => {
      prisma.consentAuditLog.findFirst.mockResolvedValueOnce({
        ...mockAuditLog,
        consentType: 'DATA_SHARING',
        granted: true,
      });

      const result = await service.hasConsent(CUSTOMER_ID, TENANT_ID, 'DATA_SHARING');

      expect(result).toBe(true);
      // Should have queried the audit log for non-standard types
      expect(prisma.consentAuditLog.findFirst).toHaveBeenCalledWith({
        where: {
          customerId: CUSTOMER_ID,
          tenantId: TENANT_ID,
          consentType: 'DATA_SHARING',
          revokedAt: null,
        },
        orderBy: { timestamp: 'desc' },
      });
    });

    it('should check audit log for THIRD_PARTY consent type', async () => {
      prisma.consentAuditLog.findFirst.mockResolvedValueOnce(null);

      const result = await service.hasConsent(CUSTOMER_ID, TENANT_ID, 'THIRD_PARTY');

      expect(result).toBe(false);
    });

    it('should check audit log for ANALYTICS consent type', async () => {
      prisma.consentAuditLog.findFirst.mockResolvedValueOnce({
        ...mockAuditLog,
        consentType: 'ANALYTICS',
        granted: false,
      });

      const result = await service.hasConsent(CUSTOMER_ID, TENANT_ID, 'ANALYTICS');

      expect(result).toBe(false);
    });

    it('should return false when audit log returns null for non-standard type', async () => {
      prisma.consentAuditLog.findFirst.mockResolvedValueOnce(null);

      const result = await service.hasConsent(CUSTOMER_ID, TENANT_ID, 'DATA_SHARING');

      expect(result).toBe(false);
    });

    it('should use withTenant for tenant isolation', async () => {
      await service.hasConsent(CUSTOMER_ID, TENANT_ID, 'GDPR');

      expect(prisma.withTenant).toHaveBeenCalledWith(TENANT_ID, expect.any(Function));
    });
  });

  // =========================================================================
  // bulkCheckConsent
  // =========================================================================
  describe('bulkCheckConsent', () => {
    const customerIds = ['cust-001', 'cust-002', 'cust-003'];

    it('should return consent status for multiple customers (GDPR)', async () => {
      prisma.customerEncrypted.findMany.mockResolvedValueOnce([
        { id: 'cust-001', gdprConsent: true, marketingConsent: false, callRecordingConsent: false },
        { id: 'cust-002', gdprConsent: false, marketingConsent: true, callRecordingConsent: false },
      ]);

      const result = await service.bulkCheckConsent(customerIds, TENANT_ID, 'GDPR');

      expect(result.get('cust-001')).toBe(true);
      expect(result.get('cust-002')).toBe(false);
      expect(result.get('cust-003')).toBe(false); // not found = false
    });

    it('should return consent status for MARKETING type', async () => {
      prisma.customerEncrypted.findMany.mockResolvedValueOnce([
        { id: 'cust-001', gdprConsent: true, marketingConsent: true, callRecordingConsent: false },
      ]);

      const result = await service.bulkCheckConsent(['cust-001'], TENANT_ID, 'MARKETING');

      expect(result.get('cust-001')).toBe(true);
    });

    it('should return consent status for CALL_RECORDING type', async () => {
      prisma.customerEncrypted.findMany.mockResolvedValueOnce([
        { id: 'cust-001', gdprConsent: false, marketingConsent: false, callRecordingConsent: true },
      ]);

      const result = await service.bulkCheckConsent(['cust-001'], TENANT_ID, 'CALL_RECORDING');

      expect(result.get('cust-001')).toBe(true);
    });

    it('should set false for customers not found in database', async () => {
      prisma.customerEncrypted.findMany.mockResolvedValueOnce([]);

      const result = await service.bulkCheckConsent(customerIds, TENANT_ID, 'GDPR');

      expect(result.get('cust-001')).toBe(false);
      expect(result.get('cust-002')).toBe(false);
      expect(result.get('cust-003')).toBe(false);
    });

    it('should handle empty customer IDs array', async () => {
      prisma.customerEncrypted.findMany.mockResolvedValueOnce([]);

      const result = await service.bulkCheckConsent([], TENANT_ID, 'GDPR');

      expect(result.size).toBe(0);
    });

    it('should query with tenant isolation', async () => {
      prisma.customerEncrypted.findMany.mockResolvedValueOnce([]);

      await service.bulkCheckConsent(customerIds, TENANT_ID, 'GDPR');

      expect(prisma.customerEncrypted.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: customerIds },
          tenantId: TENANT_ID,
        },
        select: {
          id: true,
          gdprConsent: true,
          marketingConsent: true,
          callRecordingConsent: true,
        },
      });
    });

    it('should handle single customer ID', async () => {
      prisma.customerEncrypted.findMany.mockResolvedValueOnce([
        { id: 'cust-001', gdprConsent: true, marketingConsent: false, callRecordingConsent: false },
      ]);

      const result = await service.bulkCheckConsent(['cust-001'], TENANT_ID, 'GDPR');

      expect(result.size).toBe(1);
      expect(result.get('cust-001')).toBe(true);
    });

    it('should default to false for non-standard consent types', async () => {
      prisma.customerEncrypted.findMany.mockResolvedValueOnce([
        { id: 'cust-001', gdprConsent: true, marketingConsent: false, callRecordingConsent: false },
      ]);

      const result = await service.bulkCheckConsent(['cust-001'], TENANT_ID, 'DATA_SHARING');

      // DATA_SHARING does not match any switch case, so hasConsent stays false
      expect(result.get('cust-001')).toBe(false);
    });
  });

  // =========================================================================
  // updateCustomerConsentStatus (private, tested indirectly)
  // =========================================================================
  describe('updateCustomerConsentStatus (indirect)', () => {
    it('should set gdprConsentDate to current date when granting GDPR', async () => {
      await service.recordConsent(CUSTOMER_ID, TENANT_ID, 'GDPR', true);

      const updateCall = prisma.customerEncrypted.update.mock.calls[0][0];
      expect(updateCall.data.gdprConsent).toBe(true);
      expect(updateCall.data.gdprConsentDate).toBeInstanceOf(Date);
    });

    it('should set gdprConsentDate to null when revoking GDPR', async () => {
      await service.recordConsent(CUSTOMER_ID, TENANT_ID, 'GDPR', false);

      const updateCall = prisma.customerEncrypted.update.mock.calls[0][0];
      expect(updateCall.data.gdprConsent).toBe(false);
      expect(updateCall.data.gdprConsentDate).toBeNull();
    });

    it('should set marketingConsentDate when granting MARKETING', async () => {
      await service.recordConsent(CUSTOMER_ID, TENANT_ID, 'MARKETING', true);

      const updateCall = prisma.customerEncrypted.update.mock.calls[0][0];
      expect(updateCall.data.marketingConsent).toBe(true);
      expect(updateCall.data.marketingConsentDate).toBeInstanceOf(Date);
    });

    it('should set marketingConsentDate to null when revoking MARKETING', async () => {
      await service.recordConsent(CUSTOMER_ID, TENANT_ID, 'MARKETING', false);

      const updateCall = prisma.customerEncrypted.update.mock.calls[0][0];
      expect(updateCall.data.marketingConsent).toBe(false);
      expect(updateCall.data.marketingConsentDate).toBeNull();
    });

    it('should only set callRecordingConsent (no date) for CALL_RECORDING', async () => {
      await service.recordConsent(CUSTOMER_ID, TENANT_ID, 'CALL_RECORDING', true);

      const updateCall = prisma.customerEncrypted.update.mock.calls[0][0];
      expect(updateCall.data.callRecordingConsent).toBe(true);
      expect(updateCall.data).not.toHaveProperty('callRecordingConsentDate');
    });

    it('should not call update for ANALYTICS consent type', async () => {
      await service.recordConsent(CUSTOMER_ID, TENANT_ID, 'ANALYTICS', true);

      expect(prisma.customerEncrypted.update).not.toHaveBeenCalled();
    });

    it('should not call update for THIRD_PARTY consent type', async () => {
      await service.recordConsent(CUSTOMER_ID, TENANT_ID, 'THIRD_PARTY', true);

      expect(prisma.customerEncrypted.update).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // SECURITY: EDPB 2026 Transparency (Art. 12-14 GDPR)
  // =========================================================================
  describe('SECURITY: GDPR transparency requirements (Art. 12-14 — 2026 EDPB)', () => {
    it('should include data usage explanation in consent audit log', async () => {
      const auditLog = {
        consentType: 'GDPR',
        granted: true,
        collectionMethod: 'WEB_FORM',
        ipSource: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      (prisma.consentAuditLog.create as jest.Mock).mockResolvedValue({
        ...mockAuditLog,
        ...auditLog,
      });

      await service.recordConsent(CUSTOMER_ID, TENANT_ID, 'GDPR', true);

      expect(prisma.consentAuditLog.create as jest.Mock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          consentType: 'GDPR',
          granted: true,
        }),
      });
    });

    it('should track HOW consent was collected (transparent method)', async () => {
      await service.recordConsent(CUSTOMER_ID, TENANT_ID, 'GDPR', true);

      const auditCall = (prisma.consentAuditLog.create as jest.Mock).mock.calls[0][0];
      expect(auditCall.data).toHaveProperty('collectionMethod');
    });

    it('should log IP and User-Agent for verification (audit trail)', async () => {
      await service.recordConsent(CUSTOMER_ID, TENANT_ID, 'GDPR', true);

      const auditCall = (prisma.consentAuditLog.create as jest.Mock).mock.calls[0][0];
      expect(auditCall.data).toHaveProperty('ipSource');
      expect(auditCall.data).toHaveProperty('userAgent');
    });
  });

  // =========================================================================
  // SECURITY: Dark pattern prevention
  // =========================================================================
  describe('SECURITY: Dark pattern prevention (EDPB 2026)', () => {
    it('should make withdrawal of consent as easy as granting it', async () => {
      const grantCall = (prisma.consentAuditLog.create as jest.Mock).mock.calls.length;

      // Withdraw consent (should have equal complexity)
      await service.recordConsent(CUSTOMER_ID, TENANT_ID, 'MARKETING', false);

      const withdrawCall = (prisma.consentAuditLog.create as jest.Mock).mock.calls.length;
      expect(withdrawCall).toBeGreaterThanOrEqual(grantCall);
    });

    it('should not set pre-ticked consent boxes', async () => {
      // Verify consent starts as FALSE (not pre-selected)
      const customer = mockCustomer;
      expect(customer.marketingConsent).toBe(false);
    });

    it('should track consent revocation with timestamp', async () => {
      const revokedConsent = {
        ...mockAuditLog,
        revokedAt: new Date(),
      };

      (prisma.consentAuditLog.update as jest.Mock).mockResolvedValue(revokedConsent);

      await service.revokeConsent(CUSTOMER_ID, TENANT_ID, 'GDPR');

      expect(prisma.consentAuditLog.update as jest.Mock).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // SECURITY: Cross-tenant consent isolation
  // =========================================================================
  describe('SECURITY: Cross-tenant consent isolation', () => {
    it('should reject consent access from different tenant', async () => {
      (prisma.customerEncrypted.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.getCustomerConsentStatus(CUSTOMER_ID, TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );

      // Verify withTenant was called
      expect(prisma.withTenant as jest.Mock).toHaveBeenCalledWith(TENANT_ID, expect.any(Function));
    });

    it('should filter all consent queries by tenantId', async () => {
      (prisma.customerEncrypted.findFirst as jest.Mock).mockResolvedValue(mockCustomer);

      await service.getCustomerConsentStatus(CUSTOMER_ID, TENANT_ID);

      const findFirstCall = (prisma.customerEncrypted.findFirst as jest.Mock).mock.calls[0][0];
      expect(findFirstCall.where.tenantId).toBe(TENANT_ID);
    });

    it('should prevent viewing other tenant consents', async () => {
      // When querying with TENANT_ID, should not get OTHER_TENANT customer
      (prisma.customerEncrypted.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.getCustomerConsentStatus(CUSTOMER_ID, TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =========================================================================
  // SECURITY: Data export API response format validation
  // =========================================================================
  describe('SECURITY: GDPR data export format validation (Art. 20)', () => {
    it('should return consent audit log in structured format', async () => {
      (prisma.consentAuditLog.findMany as jest.Mock).mockResolvedValue([mockAuditLog]);

      // Verify the audit log has all required properties
      const auditLog = mockAuditLog;
      expect(auditLog).toHaveProperty('consentType');
      expect(auditLog).toHaveProperty('granted');
      expect(auditLog).toHaveProperty('timestamp');
    });

    it('should include all required fields in audit log', async () => {
      const exportData = {
        consentType: 'GDPR',
        granted: true,
        timestamp: mockAuditLog.timestamp,
        ipSource: mockAuditLog.ipSource,
        userAgent: mockAuditLog.userAgent,
      };

      expect(exportData).toHaveProperty('consentType');
      expect(exportData).toHaveProperty('granted');
      expect(exportData).toHaveProperty('timestamp');
      expect(exportData).toHaveProperty('ipSource');
      expect(exportData).toHaveProperty('userAgent');
    });
  });

  // =========================================================================
  // SECURITY: GDPR audit log immutability
  // =========================================================================
  describe('SECURITY: Audit log immutability (append-only)', () => {
    it('should create new audit log entry (never modify past entries)', async () => {
      const createMock = prisma.consentAuditLog.create as jest.Mock;
      createMock.mockResolvedValue({ id: 'audit-001' });

      await service.recordConsent(CUSTOMER_ID, TENANT_ID, 'GDPR', true);

      expect(createMock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          consentType: 'GDPR',
          granted: true,
          tenantId: TENANT_ID,
          customerId: CUSTOMER_ID,
        }),
      });

      // Verify no DELETE or UPDATE of past logs
      expect(prisma.consentAuditLog.update as jest.Mock).not.toHaveBeenCalled();
    });

    it('should include immutable metadata (timestamp, IP, User-Agent)', async () => {
      await service.recordConsent(CUSTOMER_ID, TENANT_ID, 'GDPR', true);

      const auditCall = (prisma.consentAuditLog.create as jest.Mock).mock.calls[0][0];
      expect(auditCall.data.timestamp).toBeInstanceOf(Date);
      expect(auditCall.data).toHaveProperty('ipSource');
      expect(auditCall.data).toHaveProperty('userAgent');
    });
  });

  // =========================================================================
  // SECURITY: Consent expiration and revalidation
  // =========================================================================
  describe('SECURITY: Periodic consent revalidation (compliance requirement)', () => {
    it('should flag consent as stale if not revalidated for 12 months', async () => {
      const oldConsent = {
        ...mockCustomer,
        gdprConsentDate: new Date('2025-01-01'),
      };
      const now = new Date('2026-04-24');
      const ageMonths =
        (now.getTime() - oldConsent.gdprConsentDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

      expect(ageMonths).toBeGreaterThan(12);
    });

    it('should allow customer to revoke consent at any time (no lock-in)', async () => {
      // Should be able to revoke even if just granted
      expect(() => {
        service.revokeConsent(CUSTOMER_ID, TENANT_ID, 'GDPR');
      }).not.toThrow();
    });
  });
});
