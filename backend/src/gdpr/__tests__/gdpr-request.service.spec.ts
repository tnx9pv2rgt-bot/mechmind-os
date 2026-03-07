import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { GdprRequestService, CreateDataSubjectRequestDto, DataSubjectRequestType, RequestStatus, RequestPriority } from '../services/gdpr-request.service';
import { PrismaService } from '@common/services/prisma.service';
import { LoggerService } from '@common/services/logger.service';

describe('GdprRequestService', () => {
  let service: GdprRequestService;
  let mockPrismaService: jest.Mocked<Partial<PrismaService>>;
  let mockLoggerService: jest.Mocked<Partial<LoggerService>>;

  const mockTenantId = 'tenant-123';
  const mockCustomerId = 'customer-456';
  const mockRequestId = 'request-789';
  const mockUserId = 'user-abc';

  beforeEach(async () => {
    mockPrismaService = {
      withTenant: jest.fn(),
      tenant: {
        findUnique: jest.fn(),
      } as any,
      dataSubjectRequests: {
        findMany: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
        aggregate: jest.fn(),
      } as any,
    };

    mockLoggerService = {
      log: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GdprRequestService,
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

    service = module.get<GdprRequestService>(GdprRequestService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRequest', () => {
    it('should create an ACCESS request successfully', async () => {
      // Arrange
      const mockTenant = { id: mockTenantId, name: 'Test Tenant' };
      const mockRequest = {
        id: mockRequestId,
        tenantId: mockTenantId,
        ticketNumber: 'GDPR-2026-0001',
        requestType: 'ACCESS',
        status: 'RECEIVED',
        requesterEmail: 'user@example.com',
        requesterPhone: '+1234567890',
        customerId: mockCustomerId,
        receivedAt: new Date(),
        deadlineAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        priority: 'NORMAL',
        source: 'EMAIL',
        notes: 'Test request',
        metadata: null,
      };

      (mockPrismaService.tenant!.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (mockPrismaService.dataSubjectRequests!.count as jest.Mock).mockResolvedValue(0);

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            dataSubjectRequests: {
              create: jest.fn().mockResolvedValue(mockRequest),
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      const dto: CreateDataSubjectRequestDto = {
        tenantId: mockTenantId,
        requestType: 'ACCESS',
        requesterEmail: 'user@example.com',
        requesterPhone: '+1234567890',
        customerId: mockCustomerId,
        source: 'EMAIL',
        priority: 'NORMAL',
        notes: 'Test request',
      };

      // Act
      const result = await service.createRequest(dto);

      // Assert
      expect(result).toMatchObject({
        id: mockRequestId,
        ticketNumber: 'GDPR-2026-0001',
        requestType: 'ACCESS',
        status: 'RECEIVED',
        requesterEmail: 'user@example.com',
        requesterPhone: '+1234567890',
        customerId: mockCustomerId,
        slaMet: undefined,
      });
      expect(result.receivedAt).toBeInstanceOf(Date);
      expect(result.deadlineAt).toBeInstanceOf(Date);
    });

    it('should create a DELETION request', async () => {
      // Arrange
      const mockTenant = { id: mockTenantId };
      const mockRequest = {
        id: mockRequestId,
        tenantId: mockTenantId,
        ticketNumber: 'GDPR-2026-0002',
        requestType: 'DELETION',
        status: 'RECEIVED',
        receivedAt: new Date(),
        deadlineAt: new Date(),
        priority: 'HIGH',
        source: 'WEB_FORM',
      };

      (mockPrismaService.tenant!.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (mockPrismaService.dataSubjectRequests!.count as jest.Mock).mockResolvedValue(1);

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            dataSubjectRequests: {
              create: jest.fn().mockResolvedValue(mockRequest),
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      const dto: CreateDataSubjectRequestDto = {
        tenantId: mockTenantId,
        requestType: 'DELETION',
        source: 'WEB_FORM',
        priority: 'HIGH',
      };

      // Act
      const result = await service.createRequest(dto);

      // Assert
      expect(result.requestType).toBe('DELETION');
      expect(result.ticketNumber).toBe('GDPR-2026-0002');
    });

    it('should create a PORTABILITY request', async () => {
      // Arrange
      const mockTenant = { id: mockTenantId };
      const mockRequest = {
        id: mockRequestId,
        tenantId: mockTenantId,
        ticketNumber: 'GDPR-2026-0003',
        requestType: 'PORTABILITY',
        status: 'RECEIVED',
        receivedAt: new Date(),
        deadlineAt: new Date(),
        priority: 'NORMAL',
        source: 'EMAIL',
      };

      (mockPrismaService.tenant!.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (mockPrismaService.dataSubjectRequests!.count as jest.Mock).mockResolvedValue(2);

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            dataSubjectRequests: {
              create: jest.fn().mockResolvedValue(mockRequest),
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      const dto: CreateDataSubjectRequestDto = {
        tenantId: mockTenantId,
        requestType: 'PORTABILITY',
        source: 'EMAIL',
      };

      // Act
      const result = await service.createRequest(dto);

      // Assert
      expect(result.requestType).toBe('PORTABILITY');
    });

    it('should create a RECTIFICATION request', async () => {
      // Arrange
      const mockTenant = { id: mockTenantId };
      const mockRequest = {
        id: mockRequestId,
        tenantId: mockTenantId,
        ticketNumber: 'GDPR-2026-0004',
        requestType: 'RECTIFICATION',
        status: 'RECEIVED',
        receivedAt: new Date(),
        deadlineAt: new Date(),
        priority: 'URGENT',
        source: 'PHONE',
      };

      (mockPrismaService.tenant!.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (mockPrismaService.dataSubjectRequests!.count as jest.Mock).mockResolvedValue(3);

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            dataSubjectRequests: {
              create: jest.fn().mockResolvedValue(mockRequest),
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      const dto: CreateDataSubjectRequestDto = {
        tenantId: mockTenantId,
        requestType: 'RECTIFICATION',
        source: 'PHONE',
        priority: 'URGENT',
      };

      // Act
      const result = await service.createRequest(dto);

      // Assert
      expect(result.requestType).toBe('RECTIFICATION');
    });

    it('should create a RESTRICTION request', async () => {
      // Arrange
      const mockTenant = { id: mockTenantId };
      const mockRequest = {
        id: mockRequestId,
        tenantId: mockTenantId,
        ticketNumber: 'GDPR-2026-0005',
        requestType: 'RESTRICTION',
        status: 'RECEIVED',
        receivedAt: new Date(),
        deadlineAt: new Date(),
        priority: 'NORMAL',
        source: 'MAIL',
      };

      (mockPrismaService.tenant!.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (mockPrismaService.dataSubjectRequests!.count as jest.Mock).mockResolvedValue(4);

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            dataSubjectRequests: {
              create: jest.fn().mockResolvedValue(mockRequest),
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      const dto: CreateDataSubjectRequestDto = {
        tenantId: mockTenantId,
        requestType: 'RESTRICTION',
        source: 'MAIL',
      };

      // Act
      const result = await service.createRequest(dto);

      // Assert
      expect(result.requestType).toBe('RESTRICTION');
    });

    it('should create an OBJECTION request', async () => {
      // Arrange
      const mockTenant = { id: mockTenantId };
      const mockRequest = {
        id: mockRequestId,
        tenantId: mockTenantId,
        ticketNumber: 'GDPR-2026-0006',
        requestType: 'OBJECTION',
        status: 'RECEIVED',
        receivedAt: new Date(),
        deadlineAt: new Date(),
        priority: 'LOW',
        source: 'EMAIL',
      };

      (mockPrismaService.tenant!.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (mockPrismaService.dataSubjectRequests!.count as jest.Mock).mockResolvedValue(5);

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            dataSubjectRequests: {
              create: jest.fn().mockResolvedValue(mockRequest),
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      const dto: CreateDataSubjectRequestDto = {
        tenantId: mockTenantId,
        requestType: 'OBJECTION',
        source: 'EMAIL',
        priority: 'LOW',
      };

      // Act
      const result = await service.createRequest(dto);

      // Assert
      expect(result.requestType).toBe('OBJECTION');
    });

    it('should throw NotFoundException if tenant not found', async () => {
      // Arrange
      (mockPrismaService.tenant!.findUnique as jest.Mock).mockResolvedValue(null);

      const dto: CreateDataSubjectRequestDto = {
        tenantId: 'invalid-tenant',
        requestType: 'ACCESS',
      };

      // Act & Assert
      await expect(service.createRequest(dto)).rejects.toThrow(NotFoundException);
    });

    it('should use default priority and source if not provided', async () => {
      // Arrange
      const mockTenant = { id: mockTenantId };
      const mockRequest = {
        id: mockRequestId,
        tenantId: mockTenantId,
        ticketNumber: 'GDPR-2026-0001',
        requestType: 'ACCESS',
        status: 'RECEIVED',
        receivedAt: new Date(),
        deadlineAt: new Date(),
        priority: 'NORMAL',
        source: 'EMAIL',
      };

      (mockPrismaService.tenant!.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (mockPrismaService.dataSubjectRequests!.count as jest.Mock).mockResolvedValue(0);

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            dataSubjectRequests: {
              create: jest.fn().mockResolvedValue(mockRequest),
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      const dto: CreateDataSubjectRequestDto = {
        tenantId: mockTenantId,
        requestType: 'ACCESS',
      };

      // Act
      const result = await service.createRequest(dto);

      // Assert
      expect(result.requestType).toBe('ACCESS');
    });

    it('should handle metadata as object', async () => {
      // Arrange
      const mockTenant = { id: mockTenantId };
      const mockRequest = {
        id: mockRequestId,
        tenantId: mockTenantId,
        ticketNumber: 'GDPR-2026-0001',
        requestType: 'ACCESS',
        status: 'RECEIVED',
        receivedAt: new Date(),
        deadlineAt: new Date(),
        priority: 'NORMAL',
        source: 'EMAIL',
        metadata: JSON.stringify({ campaign: 'test' }),
      };

      (mockPrismaService.tenant!.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (mockPrismaService.dataSubjectRequests!.count as jest.Mock).mockResolvedValue(0);

      const createMock = jest.fn().mockResolvedValue(mockRequest);
      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            dataSubjectRequests: {
              create: createMock,
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      const dto: CreateDataSubjectRequestDto = {
        tenantId: mockTenantId,
        requestType: 'ACCESS',
        metadata: { campaign: 'test' },
      };

      // Act
      await service.createRequest(dto);

      // Assert
      expect(createMock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: JSON.stringify({ campaign: 'test' }),
        }),
      });
    });

    it('should set deadline to 30 days from received date', async () => {
      // Arrange
      const mockTenant = { id: mockTenantId };
      const receivedAt = new Date();
      const mockRequest = {
        id: mockRequestId,
        tenantId: mockTenantId,
        ticketNumber: 'GDPR-2026-0001',
        requestType: 'ACCESS',
        status: 'RECEIVED',
        receivedAt,
        deadlineAt: new Date(receivedAt.getTime() + 30 * 24 * 60 * 60 * 1000),
        priority: 'NORMAL',
        source: 'EMAIL',
      };

      (mockPrismaService.tenant!.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (mockPrismaService.dataSubjectRequests!.count as jest.Mock).mockResolvedValue(0);

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            dataSubjectRequests: {
              create: jest.fn().mockResolvedValue(mockRequest),
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      const dto: CreateDataSubjectRequestDto = {
        tenantId: mockTenantId,
        requestType: 'ACCESS',
      };

      // Act
      const result = await service.createRequest(dto);

      // Assert
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
      const deadlineDiff = result.deadlineAt.getTime() - result.receivedAt.getTime();
      expect(deadlineDiff).toBeGreaterThanOrEqual(thirtyDaysInMs - 1000);
      expect(deadlineDiff).toBeLessThanOrEqual(thirtyDaysInMs + 1000);
    });
  });

  describe('getRequest', () => {
    it('should return request by ID', async () => {
      // Arrange
      const mockRequest = {
        id: mockRequestId,
        tenantId: mockTenantId,
        ticketNumber: 'GDPR-2026-0001',
        requestType: 'ACCESS',
        status: 'RECEIVED',
        receivedAt: new Date(),
        deadlineAt: new Date(),
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            dataSubjectRequests: {
              findFirst: jest.fn().mockResolvedValue(mockRequest),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.getRequest(mockRequestId, mockTenantId);

      // Assert
      expect(result.id).toBe(mockRequestId);
      expect(result.ticketNumber).toBe('GDPR-2026-0001');
    });

    it('should throw NotFoundException if request not found', async () => {
      // Arrange
      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            dataSubjectRequests: {
              findFirst: jest.fn().mockResolvedValue(null),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act & Assert
      await expect(service.getRequest('invalid-id', mockTenantId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRequestByTicket', () => {
    it('should return request by ticket number', async () => {
      // Arrange
      const mockRequest = {
        id: mockRequestId,
        tenantId: mockTenantId,
        ticketNumber: 'GDPR-2026-0001',
        requestType: 'ACCESS',
        status: 'RECEIVED',
        receivedAt: new Date(),
        deadlineAt: new Date(),
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            dataSubjectRequests: {
              findFirst: jest.fn().mockResolvedValue(mockRequest),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.getRequestByTicket('GDPR-2026-0001', mockTenantId);

      // Assert
      expect(result.ticketNumber).toBe('GDPR-2026-0001');
    });

    it('should throw NotFoundException if ticket not found', async () => {
      // Arrange
      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            dataSubjectRequests: {
              findFirst: jest.fn().mockResolvedValue(null),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act & Assert
      await expect(service.getRequestByTicket('INVALID', mockTenantId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('listRequests', () => {
    it('should list all requests for tenant', async () => {
      // Arrange
      const mockRequests = [
        { id: 'req-1', tenantId: mockTenantId, ticketNumber: 'GDPR-2026-0001', requestType: 'ACCESS', status: 'RECEIVED', receivedAt: new Date(), deadlineAt: new Date() },
        { id: 'req-2', tenantId: mockTenantId, ticketNumber: 'GDPR-2026-0002', requestType: 'DELETION', status: 'IN_PROGRESS', receivedAt: new Date(), deadlineAt: new Date() },
      ];

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            dataSubjectRequests: {
              findMany: jest.fn().mockResolvedValue(mockRequests),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.listRequests(mockTenantId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].ticketNumber).toBe('GDPR-2026-0001');
      expect(result[1].ticketNumber).toBe('GDPR-2026-0002');
    });

    it('should filter by status', async () => {
      // Arrange
      const mockRequests = [
        { id: 'req-1', tenantId: mockTenantId, ticketNumber: 'GDPR-2026-0001', requestType: 'ACCESS', status: 'RECEIVED', receivedAt: new Date(), deadlineAt: new Date() },
      ];

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            dataSubjectRequests: {
              findMany: jest.fn().mockResolvedValue(mockRequests),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.listRequests(mockTenantId, { status: 'RECEIVED' });

      // Assert
      expect(result).toHaveLength(1);
    });

    it('should filter by type', async () => {
      // Arrange
      const mockRequests = [
        { id: 'req-1', tenantId: mockTenantId, ticketNumber: 'GDPR-2026-0001', requestType: 'ACCESS', status: 'RECEIVED', receivedAt: new Date(), deadlineAt: new Date() },
      ];

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            dataSubjectRequests: {
              findMany: jest.fn().mockResolvedValue(mockRequests),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.listRequests(mockTenantId, { type: 'ACCESS' });

      // Assert
      expect(result).toHaveLength(1);
    });

    it('should filter pending requests', async () => {
      // Arrange
      const mockRequests = [
        { id: 'req-1', tenantId: mockTenantId, ticketNumber: 'GDPR-2026-0001', requestType: 'ACCESS', status: 'RECEIVED', receivedAt: new Date(), deadlineAt: new Date() },
      ];

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            dataSubjectRequests: {
              findMany: jest.fn().mockResolvedValue(mockRequests),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.listRequests(mockTenantId, { pending: true });

      // Assert
      expect(result).toHaveLength(1);
    });
  });

  describe('updateStatus', () => {
    it('should update request status to IN_PROGRESS', async () => {
      // Arrange
      const mockRequest = {
        id: mockRequestId,
        tenantId: mockTenantId,
        ticketNumber: 'GDPR-2026-0001',
        requestType: 'ACCESS',
        status: 'RECEIVED',
        receivedAt: new Date(),
        deadlineAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      const updatedRequest = { ...mockRequest, status: 'IN_PROGRESS' };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            dataSubjectRequests: {
              findFirst: jest.fn().mockResolvedValue(mockRequest),
              update: jest.fn().mockResolvedValue(updatedRequest),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.updateStatus(mockRequestId, mockTenantId, 'IN_PROGRESS');

      // Assert
      expect(result.status).toBe('IN_PROGRESS');
    });

    it('should update request status to COMPLETED and set slaMet', async () => {
      // Arrange
      const deadlineAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const mockRequest = {
        id: mockRequestId,
        tenantId: mockTenantId,
        ticketNumber: 'GDPR-2026-0001',
        requestType: 'ACCESS',
        status: 'IN_PROGRESS',
        receivedAt: new Date(),
        deadlineAt,
      };

      const updatedRequest = { 
        ...mockRequest, 
        status: 'COMPLETED',
        completedAt: new Date(),
        slaMet: true,
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            dataSubjectRequests: {
              findFirst: jest.fn().mockResolvedValue(mockRequest),
              update: jest.fn().mockResolvedValue(updatedRequest),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.updateStatus(mockRequestId, mockTenantId, 'COMPLETED');

      // Assert
      expect(result.status).toBe('COMPLETED');
      expect(result.completedAt).toBeInstanceOf(Date);
      expect(result.slaMet).toBe(true);
    });

    it('should throw BadRequestException for completed requests', async () => {
      // Arrange
      const mockRequest = {
        id: mockRequestId,
        tenantId: mockTenantId,
        ticketNumber: 'GDPR-2026-0001',
        requestType: 'ACCESS',
        status: 'COMPLETED',
        receivedAt: new Date(),
        deadlineAt: new Date(),
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            dataSubjectRequests: {
              findFirst: jest.fn().mockResolvedValue(mockRequest),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act & Assert
      await expect(service.updateStatus(mockRequestId, mockTenantId, 'IN_PROGRESS'))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for rejected requests', async () => {
      // Arrange
      const mockRequest = {
        id: mockRequestId,
        tenantId: mockTenantId,
        ticketNumber: 'GDPR-2026-0001',
        requestType: 'ACCESS',
        status: 'REJECTED',
        receivedAt: new Date(),
        deadlineAt: new Date(),
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            dataSubjectRequests: {
              findFirst: jest.fn().mockResolvedValue(mockRequest),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act & Assert
      await expect(service.updateStatus(mockRequestId, mockTenantId, 'IN_PROGRESS'))
        .rejects.toThrow(BadRequestException);
    });

    it('should append notes when updating status', async () => {
      // Arrange
      const mockRequest = {
        id: mockRequestId,
        tenantId: mockTenantId,
        ticketNumber: 'GDPR-2026-0001',
        requestType: 'ACCESS',
        status: 'RECEIVED',
        receivedAt: new Date(),
        deadlineAt: new Date(),
        notes: 'Original note',
      };

      const updatedRequest = { ...mockRequest, status: 'IN_PROGRESS', notes: 'Original note\n2026-01-01T00:00:00.000Z: Additional note' };

      const updateMock = jest.fn().mockResolvedValue(updatedRequest);
      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            dataSubjectRequests: {
              findFirst: jest.fn().mockResolvedValue(mockRequest),
              update: updateMock,
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      await service.updateStatus(mockRequestId, mockTenantId, 'IN_PROGRESS', 'Additional note');

      // Assert
      expect(updateMock).toHaveBeenCalledWith({
        where: { id: mockRequestId },
        data: expect.objectContaining({
          status: 'IN_PROGRESS',
          notes: expect.any(String),
        }),
      });
    });

    it('should set notes when no existing notes', async () => {
      // Arrange
      const mockRequest = {
        id: mockRequestId,
        tenantId: mockTenantId,
        ticketNumber: 'GDPR-2026-0001',
        requestType: 'ACCESS',
        status: 'RECEIVED',
        receivedAt: new Date(),
        deadlineAt: new Date(),
        notes: null,
      };

      const updateMock = jest.fn().mockResolvedValue({ ...mockRequest, notes: 'New note' });
      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            dataSubjectRequests: {
              findFirst: jest.fn().mockResolvedValue(mockRequest),
              update: updateMock,
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      await service.updateStatus(mockRequestId, mockTenantId, 'IN_PROGRESS', 'New note');

      // Assert
      expect(updateMock).toHaveBeenCalledWith({
        where: { id: mockRequestId },
        data: expect.objectContaining({
          notes: 'New note',
        }),
      });
    });
  });

  describe('verifyIdentity', () => {
    it('should verify identity for pending request', async () => {
      // Arrange
      const mockRequest = {
        id: mockRequestId,
        tenantId: mockTenantId,
        ticketNumber: 'GDPR-2026-0001',
        requestType: 'ACCESS',
        status: 'RECEIVED',
        receivedAt: new Date(),
        deadlineAt: new Date(),
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            dataSubjectRequests: {
              findFirst: jest.fn().mockResolvedValue(mockRequest),
              update: jest.fn().mockResolvedValue({ ...mockRequest, status: 'VERIFIED' }),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.verifyIdentity(mockRequestId, mockTenantId, {
        method: 'EMAIL_OTP',
        documents: ['id_card.pdf'],
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.method).toBe('EMAIL_OTP');
      expect(result.verifiedAt).toBeInstanceOf(Date);
      expect(result.documents).toEqual(['id_card.pdf']);
    });

    it('should throw BadRequestException for non-pending requests', async () => {
      // Arrange
      const mockRequest = {
        id: mockRequestId,
        tenantId: mockTenantId,
        ticketNumber: 'GDPR-2026-0001',
        requestType: 'ACCESS',
        status: 'COMPLETED',
        receivedAt: new Date(),
        deadlineAt: new Date(),
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            dataSubjectRequests: {
              findFirst: jest.fn().mockResolvedValue(mockRequest),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act & Assert
      await expect(service.verifyIdentity(mockRequestId, mockTenantId, { method: 'EMAIL' }))
        .rejects.toThrow(BadRequestException);
    });

    it('should allow verification for VERIFICATION_PENDING status', async () => {
      // Arrange
      const mockRequest = {
        id: mockRequestId,
        tenantId: mockTenantId,
        ticketNumber: 'GDPR-2026-0001',
        requestType: 'ACCESS',
        status: 'VERIFICATION_PENDING',
        receivedAt: new Date(),
        deadlineAt: new Date(),
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            dataSubjectRequests: {
              findFirst: jest.fn().mockResolvedValue(mockRequest),
              update: jest.fn().mockResolvedValue({ ...mockRequest, status: 'VERIFIED' }),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.verifyIdentity(mockRequestId, mockTenantId, {
        method: 'PHONE_OTP',
      });

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('assignRequest', () => {
    it('should assign request to user', async () => {
      // Arrange
      const updatedRequest = {
        id: mockRequestId,
        tenantId: mockTenantId,
        ticketNumber: 'GDPR-2026-0001',
        requestType: 'ACCESS',
        status: 'IN_PROGRESS',
        assignedTo: mockUserId,
        receivedAt: new Date(),
        deadlineAt: new Date(),
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            dataSubjectRequests: {
              update: jest.fn().mockResolvedValue(updatedRequest),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.assignRequest(mockRequestId, mockTenantId, mockUserId);

      // Assert
      expect(result.assignedTo).toBe(mockUserId);
      expect(result.status).toBe('IN_PROGRESS');
    });
  });

  describe('rejectRequest', () => {
    it('should reject a request with reason', async () => {
      // Arrange
      const mockRequest = {
        id: mockRequestId,
        tenantId: mockTenantId,
        ticketNumber: 'GDPR-2026-0001',
        requestType: 'ACCESS',
        status: 'RECEIVED',
        receivedAt: new Date(),
        deadlineAt: new Date(),
      };

      const rejectedRequest = {
        ...mockRequest,
        status: 'REJECTED',
        completedAt: new Date(),
        rejectionReason: 'Invalid request',
        rejectionBasis: 'Article 12(5)',
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            dataSubjectRequests: {
              findFirst: jest.fn().mockResolvedValue(mockRequest),
              update: jest.fn().mockResolvedValue(rejectedRequest),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act
      const result = await service.rejectRequest(mockRequestId, mockTenantId, 'Invalid request', 'Article 12(5)');

      // Assert
      expect(result.status).toBe('REJECTED');
    });

    it('should throw BadRequestException for completed requests', async () => {
      // Arrange
      const mockRequest = {
        id: mockRequestId,
        tenantId: mockTenantId,
        ticketNumber: 'GDPR-2026-0001',
        requestType: 'ACCESS',
        status: 'COMPLETED',
        receivedAt: new Date(),
        deadlineAt: new Date(),
      };

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            dataSubjectRequests: {
              findFirst: jest.fn().mockResolvedValue(mockRequest),
            },
          };
          return callback(mockPrisma as any);
        });

      // Act & Assert
      await expect(service.rejectRequest(mockRequestId, mockTenantId, 'Test'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('getPendingRequests', () => {
    it('should return pending requests grouped by urgency', async () => {
      // Arrange
      const now = new Date();
      const overdueRequest = {
        id: 'req-1',
        tenantId: mockTenantId,
        ticketNumber: 'GDPR-2026-0001',
        requestType: 'ACCESS',
        status: 'RECEIVED',
        receivedAt: new Date(),
        deadlineAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Yesterday
      };
      const urgentRequest = {
        id: 'req-2',
        tenantId: mockTenantId,
        ticketNumber: 'GDPR-2026-0002',
        requestType: 'DELETION',
        status: 'IN_PROGRESS',
        receivedAt: new Date(),
        deadlineAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days
      };
      const normalRequest = {
        id: 'req-3',
        tenantId: mockTenantId,
        ticketNumber: 'GDPR-2026-0003',
        requestType: 'PORTABILITY',
        status: 'VERIFIED',
        receivedAt: new Date(),
        deadlineAt: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000), // 20 days
      };

      (mockPrismaService.dataSubjectRequests!.findMany as jest.Mock).mockResolvedValue([
        overdueRequest,
        urgentRequest,
        normalRequest,
      ]);

      // Act
      const result = await service.getPendingRequests(mockTenantId);

      // Assert
      expect(result.overdue).toHaveLength(1);
      expect(result.overdue[0].ticketNumber).toBe('GDPR-2026-0001');
      expect(result.urgent).toHaveLength(1);
      expect(result.urgent[0].ticketNumber).toBe('GDPR-2026-0002');
      expect(result.normal).toHaveLength(1);
      expect(result.normal[0].ticketNumber).toBe('GDPR-2026-0003');
    });

    it('should work without tenant filter', async () => {
      // Arrange
      (mockPrismaService.dataSubjectRequests!.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await service.getPendingRequests();

      // Assert
      expect(result.overdue).toEqual([]);
      expect(result.urgent).toEqual([]);
      expect(result.normal).toEqual([]);
    });
  });

  describe('getStatistics', () => {
    it('should return request statistics', async () => {
      // Arrange
      (mockPrismaService.dataSubjectRequests!.count as jest.Mock).mockResolvedValue(10);
      (mockPrismaService.dataSubjectRequests!.groupBy as jest.Mock)
        .mockResolvedValueOnce([
          { requestType: 'ACCESS', _count: { requestType: 5 } },
          { requestType: 'DELETION', _count: { requestType: 3 } },
        ])
        .mockResolvedValueOnce([
          { status: 'COMPLETED', _count: { status: 7 } },
          { status: 'RECEIVED', _count: { status: 3 } },
        ]);
      (mockPrismaService.dataSubjectRequests!.aggregate as jest.Mock).mockResolvedValue({
        _count: { slaMet: 6 },
      });

      // Act
      const result = await service.getStatistics(mockTenantId);

      // Assert
      expect(result.totalRequests).toBe(10);
      expect(result.byType.ACCESS).toBe(5);
      expect(result.byType.DELETION).toBe(3);
      expect(result.byStatus.COMPLETED).toBe(7);
      expect(result.byStatus.RECEIVED).toBe(3);
    });

    it('should calculate SLA compliance rate', async () => {
      // Arrange
      (mockPrismaService.dataSubjectRequests!.count as jest.Mock).mockResolvedValue(10);
      (mockPrismaService.dataSubjectRequests!.groupBy as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      (mockPrismaService.dataSubjectRequests!.aggregate as jest.Mock).mockResolvedValue({
        _count: { slaMet: 8 },
      });

      // Act
      const result = await service.getStatistics(mockTenantId);

      // Assert
      expect(result.slaComplianceRate).toBeGreaterThanOrEqual(0);
      expect(result.slaComplianceRate).toBeLessThanOrEqual(1);
    });
  });

  describe('logging', () => {
    it('should log request creation', async () => {
      // Arrange
      const mockTenant = { id: mockTenantId };
      const mockRequest = {
        id: mockRequestId,
        tenantId: mockTenantId,
        ticketNumber: 'GDPR-2026-0001',
        requestType: 'ACCESS',
        status: 'RECEIVED',
        receivedAt: new Date(),
        deadlineAt: new Date(),
        priority: 'NORMAL',
        source: 'EMAIL',
      };

      (mockPrismaService.tenant!.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (mockPrismaService.dataSubjectRequests!.count as jest.Mock).mockResolvedValue(0);

      mockPrismaService.withTenant = jest.fn()
        .mockImplementation(async (_tenantId, callback) => {
          const mockPrisma = {
            dataSubjectRequests: {
              create: jest.fn().mockResolvedValue(mockRequest),
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockPrisma as any);
        });

      const dto: CreateDataSubjectRequestDto = {
        tenantId: mockTenantId,
        requestType: 'ACCESS',
      };

      // Act
      await service.createRequest(dto);

      // Assert
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('Created data subject request'),
        'GdprRequestService',
      );
    });
  });
});
