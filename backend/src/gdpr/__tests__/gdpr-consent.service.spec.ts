import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GdprConsentService, ConsentRecord, CustomerConsentStatus } from '../services/gdpr-consent.service';
import { PrismaService } from '@common/services/prisma.service';
import { LoggerService } from '@common/services/logger.service';

describe('GdprConsentService', () => {
  let service: GdprConsentService;
  let mockPrismaService: jest.Mocked<Partial<PrismaService>>;
  let mockLoggerService: jest.Mocked<Partial<LoggerService>>;

  const mockTenantId = 'tenant-123';
  const mockCustomerId = 'customer-456';

  beforeEach(async () => {
    mockPrismaService = {
      withTenant: jest.fn(),
    };

    mockLoggerService = {
      log: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GdprConsentService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<GdprConsentService>(GdprConsentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recordConsent', () => {
    it('should record GDPR consent successfully', async () => {
      // Arrange
      const mockCustomer = { id: mockCustomerId, tenantId: mockTenantId };
      const mockAuditLog = {
        id: 123,
        timestamp: new Date(),
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
              update: jest.fn().mockResolvedValue({}),
            },
            consentAuditLog: {
              create: jest.fn().mockResolvedValue(mockAuditLog),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.recordConsent(
        mockCustomerId,
        mockTenantId,
        'GDPR',
        true,
        {
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          collectionMethod: 'WEB_FORM',
          legalBasis: 'CONSENT',
        },
      );

      // Assert
      expect(result).toMatchObject<Partial<ConsentRecord>>({
        customerId: mockCustomerId,
        tenantId: mockTenantId,
        consentType: 'GDPR',
        granted: true,
        ipSource: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        collectionMethod: 'WEB_FORM',
        legalBasis: 'CONSENT',
      });
    });

    it('should record marketing consent', async () => {
      // Arrange
      const mockCustomer = { id: mockCustomerId, tenantId: mockTenantId };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
              update: jest.fn().mockResolvedValue({}),
            },
            consentAuditLog: {
              create: jest.fn().mockResolvedValue({ id: 1, timestamp: new Date() }),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.recordConsent(
        mockCustomerId,
        mockTenantId,
        'MARKETING',
        true,
      );

      // Assert
      expect(result.consentType).toBe('MARKETING');
      expect(result.granted).toBe(true);
    });

    it('should record CALL_RECORDING consent', async () => {
      // Arrange
      const mockCustomer = { id: mockCustomerId, tenantId: mockTenantId };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
              update: jest.fn().mockResolvedValue({}),
            },
            consentAuditLog: {
              create: jest.fn().mockResolvedValue({ id: 1, timestamp: new Date() }),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.recordConsent(
        mockCustomerId,
        mockTenantId,
        'CALL_RECORDING',
        true,
      );

      // Assert
      expect(result.consentType).toBe('CALL_RECORDING');
    });

    it('should record DATA_SHARING consent', async () => {
      // Arrange
      const mockCustomer = { id: mockCustomerId, tenantId: mockTenantId };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
              update: jest.fn().mockResolvedValue({}),
            },
            consentAuditLog: {
              create: jest.fn().mockResolvedValue({ id: 1, timestamp: new Date() }),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.recordConsent(
        mockCustomerId,
        mockTenantId,
        'DATA_SHARING',
        true,
      );

      // Assert
      expect(result.consentType).toBe('DATA_SHARING');
    });

    it('should throw NotFoundException if customer not found', async () => {
      // Arrange
      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(null),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act & Assert
      await expect(
        service.recordConsent(mockCustomerId, mockTenantId, 'GDPR', true),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update customer consent status after recording', async () => {
      // Arrange
      const mockCustomer = { id: mockCustomerId, tenantId: mockTenantId };
      const updateMock = jest.fn().mockResolvedValue({});

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
              update: updateMock,
            },
            consentAuditLog: {
              create: jest.fn().mockResolvedValue({ id: 1, timestamp: new Date() }),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      await service.recordConsent(mockCustomerId, mockTenantId, 'GDPR', true);

      // Assert
      expect(updateMock).toHaveBeenCalledWith({
        where: { id: mockCustomerId },
        data: expect.objectContaining({
          gdprConsent: true,
          gdprConsentDate: expect.any(Date),
        }),
      });
    });

    it('should set gdprConsentDate to null when revoking consent', async () => {
      // Arrange
      const mockCustomer = { id: mockCustomerId, tenantId: mockTenantId };
      const updateMock = jest.fn().mockResolvedValue({});

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
              update: updateMock,
            },
            consentAuditLog: {
              create: jest.fn().mockResolvedValue({ id: 1, timestamp: new Date() }),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      await service.recordConsent(mockCustomerId, mockTenantId, 'GDPR', false);

      // Assert
      expect(updateMock).toHaveBeenCalledWith({
        where: { id: mockCustomerId },
        data: expect.objectContaining({
          gdprConsent: false,
          gdprConsentDate: null,
        }),
      });
    });

    it('should handle metadata in context', async () => {
      // Arrange
      const mockCustomer = { id: mockCustomerId, tenantId: mockTenantId };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
              update: jest.fn().mockResolvedValue({}),
            },
            consentAuditLog: {
              create: jest.fn().mockResolvedValue({ id: 1, timestamp: new Date() }),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      await service.recordConsent(
        mockCustomerId,
        mockTenantId,
        'GDPR',
        true,
        {
          metadata: { source: 'mobile_app', campaign: 'spring2024' },
        },
      );
    });
  });

  describe('revokeConsent', () => {
    it('should revoke previously given consent', async () => {
      // Arrange
      const mockConsent = {
        id: 123,
        customerId: mockCustomerId,
        consentType: 'MARKETING',
        granted: true,
        revokedAt: null,
      };

      // Track call sequence: findConsent, updateConsent, updateCustomer, recordConsent
      let callCount = 0;
      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          callCount++;
          // Calls 1-3: find consent, update consent, update customer
          if (callCount <= 3) {
            const mockPrisma = {
              consentAuditLog: {
                findFirst: jest.fn().mockResolvedValue(mockConsent),
                update: jest.fn().mockResolvedValue({}),
                create: jest.fn().mockResolvedValue({ id: 124, timestamp: new Date() }),
              },
              customerEncrypted: {
                findFirst: jest.fn().mockResolvedValue({ id: mockCustomerId }),
                update: jest.fn().mockResolvedValue({}),
              },
            };
            return callback(mockPrisma as any);
          }
          // Call 4: recordConsent needs customerEncrypted.findFirst
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue({ id: mockCustomerId }),
              update: jest.fn().mockResolvedValue({}),
            },
            consentAuditLog: {
              create: jest.fn().mockResolvedValue({ id: 125, timestamp: new Date() }),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      await service.revokeConsent(
        mockCustomerId,
        mockTenantId,
        'MARKETING',
        'No longer interested',
        'user@example.com',
      );

      // Assert - should complete without error
      expect(callCount).toBeGreaterThanOrEqual(3);
    });

    it('should throw NotFoundException if no active consent found', async () => {
      // Arrange
      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            consentAuditLog: {
              findFirst: jest.fn().mockResolvedValue(null),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act & Assert
      await expect(
        service.revokeConsent(mockCustomerId, mockTenantId, 'GDPR'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update consent record with revocation details', async () => {
      // Arrange
      const mockConsent = {
        id: 123,
        customerId: mockCustomerId,
        consentType: 'MARKETING',
        granted: true,
        revokedAt: null,
      };
      const updateMock = jest.fn().mockResolvedValue({});

      let callCount = 0;
      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          callCount++;
          const mockPrisma = {
            consentAuditLog: {
              findFirst: jest.fn().mockResolvedValue(mockConsent),
              update: updateMock,
              create: jest.fn().mockResolvedValue({ id: 124, timestamp: new Date() }),
            },
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue({ id: mockCustomerId }),
              update: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      await service.revokeConsent(
        mockCustomerId,
        mockTenantId,
        'MARKETING',
        'Customer request',
        'admin@example.com',
      );

      // Assert
      expect(updateMock).toHaveBeenCalledWith({
        where: { id: 123 },
        data: {
          revokedAt: expect.any(Date),
          revokedBy: 'admin@example.com',
          revocationReason: 'Customer request',
        },
      });
    });

    it('should record revocation as new consent event', async () => {
      // Arrange
      const mockConsent = {
        id: 123,
        customerId: mockCustomerId,
        consentType: 'GDPR',
        granted: true,
        revokedAt: null,
      };
      const createMock = jest.fn().mockResolvedValue({ id: 124, timestamp: new Date() });

      // Track call number to return different mocks
      let callCount = 0;
      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          callCount++;
          if (callCount <= 3) {
            // First three calls: find consent, update consent, update customer
            const mockPrisma = {
              consentAuditLog: {
                findFirst: jest.fn().mockResolvedValue(mockConsent),
                update: jest.fn().mockResolvedValue({}),
              },
              customerEncrypted: {
                findFirst: jest.fn().mockResolvedValue({ id: mockCustomerId }),
                update: jest.fn().mockResolvedValue({}),
              },
            };
            return callback(mockPrisma as any);
          }
          // Fourth call is for recordConsent inside revokeConsent
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue({ id: mockCustomerId }),
              update: jest.fn().mockResolvedValue({}),
            },
            consentAuditLog: {
              create: createMock,
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      await service.revokeConsent(
        mockCustomerId,
        mockTenantId,
        'GDPR',
        'Withdrawal',
      );

      // Assert
      expect(createMock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          customerId: mockCustomerId,
          consentType: 'GDPR',
          granted: false,
          collectionMethod: 'REVOKE_API',
          legalBasis: 'WITHDRAWAL',
          metadata: expect.stringContaining('revocationReason'),
        }),
      });
    });

    it('should handle optional parameters being undefined', async () => {
      // Arrange
      const mockConsent = {
        id: 123,
        customerId: mockCustomerId,
        consentType: 'ANALYTICS',
        granted: true,
        revokedAt: null,
      };

      let callCount = 0;
      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          callCount++;
          if (callCount <= 3) {
            const mockPrisma = {
              consentAuditLog: {
                findFirst: jest.fn().mockResolvedValue(mockConsent),
                update: jest.fn().mockResolvedValue({}),
              },
              customerEncrypted: {
                findFirst: jest.fn().mockResolvedValue({ id: mockCustomerId }),
                update: jest.fn().mockResolvedValue({}),
              },
            };
            return callback(mockPrisma as any);
          }
          // Fourth call for recordConsent
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue({ id: mockCustomerId }),
              update: jest.fn().mockResolvedValue({}),
            },
            consentAuditLog: {
              create: jest.fn().mockResolvedValue({ id: 124, timestamp: new Date() }),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      await service.revokeConsent(mockCustomerId, mockTenantId, 'ANALYTICS');

      // Assert - should complete without error
    });
  });

  describe('getConsentAuditTrail', () => {
    it('should return all consent history for a customer', async () => {
      // Arrange
      const mockLogs = [
        {
          consentType: 'GDPR',
          granted: true,
          timestamp: new Date('2024-01-01'),
          ipSource: '192.168.1.1',
          userAgent: 'Mozilla',
          collectionMethod: 'WEB',
          revokedAt: null,
        },
        {
          consentType: 'MARKETING',
          granted: false,
          timestamp: new Date('2024-01-15'),
          ipSource: null,
          userAgent: null,
          collectionMethod: 'REVOKE_API',
          revokedAt: new Date('2024-01-15'),
        },
      ];

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            consentAuditLog: {
              findMany: jest.fn().mockResolvedValue(mockLogs),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.getConsentAuditTrail(mockCustomerId, mockTenantId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        type: 'GDPR',
        consent: true,
        revoked: false,
      });
      expect(result[1]).toMatchObject({
        type: 'MARKETING',
        consent: false,
        revoked: true,
      });
    });

    it('should order results by timestamp descending', async () => {
      // Arrange
      const mockLogs = [
        { consentType: 'GDPR', granted: true, timestamp: new Date('2024-01-01'), revokedAt: null },
        { consentType: 'GDPR', granted: false, timestamp: new Date('2024-02-01'), revokedAt: null },
      ];

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            consentAuditLog: {
              findMany: jest.fn().mockResolvedValue(mockLogs),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      await service.getConsentAuditTrail(mockCustomerId, mockTenantId);

      // Assert
      const mockCall = (mockPrismaService.withTenant as jest.Mock).mock.calls[0];
      const prismaMock = { consentAuditLog: { findMany: jest.fn() } };
      await mockCall[1](prismaMock as any);
      expect(prismaMock.consentAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { timestamp: 'desc' },
        }),
      );
    });

    it('should handle empty audit trail', async () => {
      // Arrange
      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            consentAuditLog: {
              findMany: jest.fn().mockResolvedValue([]),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.getConsentAuditTrail(mockCustomerId, mockTenantId);

      // Assert
      expect(result).toEqual([]);
    });

    it('should map optional fields correctly', async () => {
      // Arrange
      const mockLogs = [
        {
          consentType: 'THIRD_PARTY',
          granted: true,
          timestamp: new Date(),
          ipSource: null,
          userAgent: null,
          collectionMethod: null,
          revokedAt: null,
        },
      ];

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            consentAuditLog: {
              findMany: jest.fn().mockResolvedValue(mockLogs),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.getConsentAuditTrail(mockCustomerId, mockTenantId);

      // Assert
      expect(result[0].ipSource).toBeUndefined();
      expect(result[0].userAgent).toBeUndefined();
      expect(result[0].method).toBeUndefined();
      expect(result[0].revokedAt).toBeUndefined();
    });
  });

  describe('getCustomerConsentStatus', () => {
    it('should return current consent status', async () => {
      // Arrange
      const mockCustomer = {
        id: mockCustomerId,
        gdprConsent: true,
        gdprConsentDate: new Date('2024-01-01'),
        marketingConsent: false,
        marketingConsentDate: null,
        callRecordingConsent: true,
        updatedAt: new Date('2024-02-01'),
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.getCustomerConsentStatus(mockCustomerId, mockTenantId);

      // Assert
      expect(result).toMatchObject<Partial<CustomerConsentStatus>>({
        customerId: mockCustomerId,
        gdprConsent: true,
        marketingConsent: false,
        callRecordingConsent: true,
        lastUpdated: mockCustomer.updatedAt,
      });
      expect(result.gdprConsentDate).toEqual(mockCustomer.gdprConsentDate);
      expect(result.marketingConsentDate).toBeUndefined();
    });

    it('should throw NotFoundException if customer not found', async () => {
      // Arrange
      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(null),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act & Assert
      await expect(
        service.getCustomerConsentStatus(mockCustomerId, mockTenantId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle all consent types being false', async () => {
      // Arrange
      const mockCustomer = {
        id: mockCustomerId,
        gdprConsent: false,
        gdprConsentDate: null,
        marketingConsent: false,
        marketingConsentDate: null,
        callRecordingConsent: false,
        updatedAt: new Date(),
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.getCustomerConsentStatus(mockCustomerId, mockTenantId);

      // Assert
      expect(result.gdprConsent).toBe(false);
      expect(result.marketingConsent).toBe(false);
      expect(result.callRecordingConsent).toBe(false);
      expect(result.gdprConsentDate).toBeUndefined();
      expect(result.marketingConsentDate).toBeUndefined();
    });
  });

  describe('hasConsent', () => {
    it('should return true for GDPR consent when granted', async () => {
      // Arrange
      const mockCustomer = {
        gdprConsent: true,
        marketingConsent: false,
        callRecordingConsent: false,
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.hasConsent(mockCustomerId, mockTenantId, 'GDPR');

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for customer not found', async () => {
      // Arrange
      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(null),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.hasConsent(mockCustomerId, mockTenantId, 'GDPR');

      // Assert
      expect(result).toBe(false);
    });

    it('should return marketingConsent value for MARKETING type', async () => {
      // Arrange
      const mockCustomer = {
        gdprConsent: true,
        marketingConsent: true,
        callRecordingConsent: false,
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.hasConsent(mockCustomerId, mockTenantId, 'MARKETING');

      // Assert
      expect(result).toBe(true);
    });

    it('should return callRecordingConsent value for CALL_RECORDING type', async () => {
      // Arrange
      const mockCustomer = {
        gdprConsent: false,
        marketingConsent: false,
        callRecordingConsent: true,
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.hasConsent(mockCustomerId, mockTenantId, 'CALL_RECORDING');

      // Assert
      expect(result).toBe(true);
    });

    it('should check audit log for other consent types', async () => {
      // Arrange
      const mockCustomer = {
        gdprConsent: false,
        marketingConsent: false,
        callRecordingConsent: false,
      };
      const mockLatestConsent = {
        granted: true,
        revokedAt: null,
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
            },
            consentAuditLog: {
              findFirst: jest.fn().mockResolvedValue(mockLatestConsent),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.hasConsent(mockCustomerId, mockTenantId, 'THIRD_PARTY');

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for revoked consent in audit log', async () => {
      // Arrange
      const mockCustomer = {
        gdprConsent: false,
        marketingConsent: false,
        callRecordingConsent: false,
      };
      // When revokedAt is NOT null, the query returns null (no active consent)
      // because the filter requires revokedAt: null
      const mockLatestConsent = null;

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
            },
            consentAuditLog: {
              findFirst: jest.fn().mockResolvedValue(mockLatestConsent),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.hasConsent(mockCustomerId, mockTenantId, 'DATA_SHARING');

      // Assert - no active consent found, should return false
      expect(result).toBe(false);
    });

    it('should return false if no consent record in audit log', async () => {
      // Arrange
      const mockCustomer = {
        gdprConsent: false,
        marketingConsent: false,
        callRecordingConsent: false,
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
            },
            consentAuditLog: {
              findFirst: jest.fn().mockResolvedValue(null),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.hasConsent(mockCustomerId, mockTenantId, 'ANALYTICS');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('bulkCheckConsent', () => {
    it('should return consent status for multiple customers', async () => {
      // Arrange
      const mockCustomers = [
        { id: 'cust-1', gdprConsent: true, marketingConsent: false, callRecordingConsent: true },
        { id: 'cust-2', gdprConsent: false, marketingConsent: true, callRecordingConsent: false },
      ];

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findMany: jest.fn().mockResolvedValue(mockCustomers),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.bulkCheckConsent(
        ['cust-1', 'cust-2'],
        mockTenantId,
        'GDPR',
      );

      // Assert
      expect(result.get('cust-1')).toBe(true);
      expect(result.get('cust-2')).toBe(false);
    });

    it('should return false for non-existent customers', async () => {
      // Arrange
      const mockCustomers = [
        { id: 'cust-1', gdprConsent: true, marketingConsent: false, callRecordingConsent: false },
      ];

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findMany: jest.fn().mockResolvedValue(mockCustomers),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.bulkCheckConsent(
        ['cust-1', 'cust-2'], // cust-2 doesn't exist
        mockTenantId,
        'GDPR',
      );

      // Assert
      expect(result.get('cust-1')).toBe(true);
      expect(result.get('cust-2')).toBe(false);
    });

    it('should handle MARKETING consent type', async () => {
      // Arrange
      const mockCustomers = [
        { id: 'cust-1', gdprConsent: false, marketingConsent: true, callRecordingConsent: false },
      ];

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findMany: jest.fn().mockResolvedValue(mockCustomers),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.bulkCheckConsent(
        ['cust-1'],
        mockTenantId,
        'MARKETING',
      );

      // Assert
      expect(result.get('cust-1')).toBe(true);
    });

    it('should handle CALL_RECORDING consent type', async () => {
      // Arrange
      const mockCustomers = [
        { id: 'cust-1', gdprConsent: false, marketingConsent: false, callRecordingConsent: true },
      ];

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findMany: jest.fn().mockResolvedValue(mockCustomers),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.bulkCheckConsent(
        ['cust-1'],
        mockTenantId,
        'CALL_RECORDING',
      );

      // Assert
      expect(result.get('cust-1')).toBe(true);
    });

    it('should handle empty customer list', async () => {
      // Arrange
      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findMany: jest.fn().mockResolvedValue([]),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.bulkCheckConsent([], mockTenantId, 'GDPR');

      // Assert
      expect(result.size).toBe(0);
    });
  });

  describe('updateCustomerConsentStatus (private)', () => {
    it('should update GDPR consent status', async () => {
      // Arrange
      const mockCustomer = { id: mockCustomerId, tenantId: mockTenantId };
      const updateMock = jest.fn().mockResolvedValue({});

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
              update: updateMock,
            },
            consentAuditLog: {
              create: jest.fn().mockResolvedValue({ id: 1, timestamp: new Date() }),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      await service.recordConsent(mockCustomerId, mockTenantId, 'GDPR', true);

      // Assert
      expect(updateMock).toHaveBeenCalledWith({
        where: { id: mockCustomerId },
        data: {
          gdprConsent: true,
          gdprConsentDate: expect.any(Date),
        },
      });
    });

    it('should update MARKETING consent status', async () => {
      // Arrange
      const mockCustomer = { id: mockCustomerId, tenantId: mockTenantId };
      const updateMock = jest.fn().mockResolvedValue({});

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
              update: updateMock,
            },
            consentAuditLog: {
              create: jest.fn().mockResolvedValue({ id: 1, timestamp: new Date() }),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      await service.recordConsent(mockCustomerId, mockTenantId, 'MARKETING', true);

      // Assert
      expect(updateMock).toHaveBeenCalledWith({
        where: { id: mockCustomerId },
        data: {
          marketingConsent: true,
          marketingConsentDate: expect.any(Date),
        },
      });
    });

    it('should not update for unknown consent types', async () => {
      // Arrange
      const mockCustomer = { id: mockCustomerId, tenantId: mockTenantId };
      const updateMock = jest.fn().mockResolvedValue({});

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            customerEncrypted: {
              findFirst: jest.fn().mockResolvedValue(mockCustomer),
              update: updateMock,
            },
            consentAuditLog: {
              create: jest.fn().mockResolvedValue({ id: 1, timestamp: new Date() }),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      await service.recordConsent(mockCustomerId, mockTenantId, 'THIRD_PARTY' as any, true);

      // Assert - updateMock should not be called for unknown types since switch has no default
      // Actually the method calls updateCustomerConsentStatus which has a switch
      // THIRD_PARTY falls to default (no update)
      expect(updateMock).not.toHaveBeenCalled();
    });
  });
});
