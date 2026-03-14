import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { GdprRequestService } from './gdpr-request.service';
import { PrismaService } from '@common/services/prisma.service';
import { LoggerService } from '@common/services/logger.service';

describe('GdprRequestService', () => {
  let service: GdprRequestService;
  let prisma: {
    withTenant: jest.Mock;
    tenant: { findUnique: jest.Mock };
    dataSubjectRequest: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
      groupBy: jest.Mock;
      aggregate: jest.Mock;
    };
    auditLog: { create: jest.Mock };
  };

  const TENANT_ID = 'tenant-001';
  const REQUEST_ID = 'req-001';
  const USER_ID = 'user-001';
  const CUSTOMER_ID = 'customer-001';

  const now = new Date('2026-03-12T10:00:00Z');
  const deadlineAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const mockRequest = {
    id: REQUEST_ID,
    ticketNumber: 'GDPR-2026-0001',
    requestType: 'ACCESS',
    status: 'RECEIVED',
    requesterEmail: 'test@example.com',
    requesterPhone: '+39123456789',
    customerId: CUSTOMER_ID,
    tenantId: TENANT_ID,
    receivedAt: now,
    deadlineAt,
    verifiedAt: null,
    completedAt: null,
    slaMet: null,
    assignedTo: null,
    rejectionReason: null,
    notes: null,
  };

  const mockTenant = { id: TENANT_ID, name: 'Test Tenant' };

  beforeEach(async () => {
    prisma = {
      withTenant: jest.fn((_tenantId: string, cb: (p: typeof prisma) => unknown) => cb(prisma)),
      tenant: {
        findUnique: jest.fn().mockResolvedValue(mockTenant),
      },
      dataSubjectRequest: {
        create: jest.fn().mockResolvedValue(mockRequest),
        findFirst: jest.fn().mockResolvedValue(mockRequest),
        findMany: jest.fn().mockResolvedValue([mockRequest]),
        update: jest.fn().mockResolvedValue(mockRequest),
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
        aggregate: jest.fn().mockResolvedValue({ _count: { slaMet: 0 } }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GdprRequestService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<GdprRequestService>(GdprRequestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // createRequest
  // =========================================================================
  describe('createRequest', () => {
    it('should create a request with ticket number', async () => {
      const result = await service.createRequest({
        tenantId: TENANT_ID,
        requestType: 'ACCESS',
        requesterEmail: 'test@example.com',
        customerId: CUSTOMER_ID,
      });

      expect(result.id).toBe(REQUEST_ID);
      expect(result.ticketNumber).toBe('GDPR-2026-0001');
      expect(result.requestType).toBe('ACCESS');
      expect(result.status).toBe('RECEIVED');
      expect(result.requesterEmail).toBe('test@example.com');
      expect(result.customerId).toBe(CUSTOMER_ID);
      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({ where: { id: TENANT_ID } });
      expect(prisma.dataSubjectRequest.count).toHaveBeenCalled();
      expect(prisma.dataSubjectRequest.create).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it('should generate correct ticket number based on existing count', async () => {
      prisma.dataSubjectRequest.count.mockResolvedValue(5);

      const createdWithSequence = { ...mockRequest, ticketNumber: 'GDPR-2026-0006' };
      prisma.dataSubjectRequest.create.mockResolvedValue(createdWithSequence);

      const result = await service.createRequest({
        tenantId: TENANT_ID,
        requestType: 'DELETION',
        requesterEmail: 'user@example.com',
      });

      expect(result.ticketNumber).toBe('GDPR-2026-0006');
    });

    it('should throw NotFoundException when tenant does not exist', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.createRequest({
          tenantId: 'nonexistent',
          requestType: 'ACCESS',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create request with all optional fields', async () => {
      await service.createRequest({
        tenantId: TENANT_ID,
        requestType: 'PORTABILITY',
        requesterEmail: 'test@example.com',
        requesterPhone: '+39123456789',
        customerId: CUSTOMER_ID,
        source: 'WEB_FORM',
        priority: 'HIGH',
        notes: 'Urgent request',
        metadata: { reason: 'moving' },
      });

      const createCall = prisma.dataSubjectRequest.create.mock.calls[0][0];
      expect(createCall.data.source).toBe('WEB_FORM');
      expect(createCall.data.priority).toBe('HIGH');
      expect(createCall.data.notes).toBe('Urgent request');
      expect(createCall.data.metadata).toBe(JSON.stringify({ reason: 'moving' }));
    });

    it('should use default source and priority when not provided', async () => {
      await service.createRequest({
        tenantId: TENANT_ID,
        requestType: 'ACCESS',
      });

      const createCall = prisma.dataSubjectRequest.create.mock.calls[0][0];
      expect(createCall.data.source).toBe('EMAIL');
      expect(createCall.data.priority).toBe('NORMAL');
    });

    it('should not set metadata when not provided', async () => {
      await service.createRequest({
        tenantId: TENANT_ID,
        requestType: 'ACCESS',
      });

      const createCall = prisma.dataSubjectRequest.create.mock.calls[0][0];
      expect(createCall.data.metadata).toBeUndefined();
    });

    it('should create audit log entry after request creation', async () => {
      await service.createRequest({
        tenantId: TENANT_ID,
        requestType: 'DELETION',
        requesterEmail: 'delete@example.com',
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          action: 'DSR_CREATED',
          tableName: 'data_subject_requests',
          recordId: REQUEST_ID,
        }),
      });
    });

    it('should handle all request types', async () => {
      const types = [
        'ACCESS',
        'DELETION',
        'RECTIFICATION',
        'PORTABILITY',
        'RESTRICTION',
        'OBJECTION',
      ] as const;

      for (const requestType of types) {
        await service.createRequest({ tenantId: TENANT_ID, requestType });
      }

      expect(prisma.dataSubjectRequest.create).toHaveBeenCalledTimes(types.length);
    });
  });

  // =========================================================================
  // getRequest
  // =========================================================================
  describe('getRequest', () => {
    it('should return a request by ID', async () => {
      const result = await service.getRequest(REQUEST_ID, TENANT_ID);

      expect(result.id).toBe(REQUEST_ID);
      expect(result.ticketNumber).toBe('GDPR-2026-0001');
      expect(prisma.withTenant).toHaveBeenCalledWith(TENANT_ID, expect.any(Function));
    });

    it('should throw NotFoundException when request not found', async () => {
      prisma.dataSubjectRequest.findFirst.mockResolvedValue(null);

      await expect(service.getRequest('nonexistent', TENANT_ID)).rejects.toThrow(NotFoundException);
    });

    it('should query with both requestId and tenantId', async () => {
      await service.getRequest(REQUEST_ID, TENANT_ID);

      expect(prisma.dataSubjectRequest.findFirst).toHaveBeenCalledWith({
        where: { id: REQUEST_ID, tenantId: TENANT_ID },
      });
    });

    it('should map null fields to undefined in response', async () => {
      prisma.dataSubjectRequest.findFirst.mockResolvedValue({
        ...mockRequest,
        requesterEmail: null,
        requesterPhone: null,
        customerId: null,
        verifiedAt: null,
        completedAt: null,
        slaMet: null,
        assignedTo: null,
      });

      const result = await service.getRequest(REQUEST_ID, TENANT_ID);

      expect(result.requesterEmail).toBeUndefined();
      expect(result.requesterPhone).toBeUndefined();
      expect(result.customerId).toBeUndefined();
      expect(result.verifiedAt).toBeUndefined();
      expect(result.completedAt).toBeUndefined();
      expect(result.slaMet).toBeUndefined();
      expect(result.assignedTo).toBeUndefined();
    });
  });

  // =========================================================================
  // getRequestByTicket
  // =========================================================================
  describe('getRequestByTicket', () => {
    it('should return a request by ticket number', async () => {
      const result = await service.getRequestByTicket('GDPR-2026-0001', TENANT_ID);

      expect(result.ticketNumber).toBe('GDPR-2026-0001');
      expect(prisma.dataSubjectRequest.findFirst).toHaveBeenCalledWith({
        where: { ticketNumber: 'GDPR-2026-0001', tenantId: TENANT_ID },
      });
    });

    it('should throw NotFoundException when ticket not found', async () => {
      prisma.dataSubjectRequest.findFirst.mockResolvedValue(null);

      await expect(service.getRequestByTicket('GDPR-2026-9999', TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =========================================================================
  // listRequests
  // =========================================================================
  describe('listRequests', () => {
    it('should list all requests for a tenant', async () => {
      const result = await service.listRequests(TENANT_ID);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(REQUEST_ID);
      expect(prisma.dataSubjectRequest.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
        orderBy: { receivedAt: 'desc' },
      });
    });

    it('should filter by status', async () => {
      await service.listRequests(TENANT_ID, { status: 'IN_PROGRESS' });

      expect(prisma.dataSubjectRequest.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, status: 'IN_PROGRESS' },
        orderBy: { receivedAt: 'desc' },
      });
    });

    it('should filter by type', async () => {
      await service.listRequests(TENANT_ID, { type: 'DELETION' });

      expect(prisma.dataSubjectRequest.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, requestType: 'DELETION' },
        orderBy: { receivedAt: 'desc' },
      });
    });

    it('should filter pending requests', async () => {
      await service.listRequests(TENANT_ID, { pending: true });

      expect(prisma.dataSubjectRequest.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          status: { notIn: ['COMPLETED', 'REJECTED', 'CANCELLED'] },
        },
        orderBy: { receivedAt: 'desc' },
      });
    });

    it('should return empty array when no requests found', async () => {
      prisma.dataSubjectRequest.findMany.mockResolvedValue([]);

      const result = await service.listRequests(TENANT_ID);

      expect(result).toEqual([]);
    });

    it('should apply no extra filters when filters object is empty', async () => {
      await service.listRequests(TENANT_ID, {});

      expect(prisma.dataSubjectRequest.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
        orderBy: { receivedAt: 'desc' },
      });
    });
  });

  // =========================================================================
  // updateStatus
  // =========================================================================
  describe('updateStatus', () => {
    it('should update request status', async () => {
      const updatedRequest = { ...mockRequest, status: 'IN_PROGRESS' };
      prisma.dataSubjectRequest.update.mockResolvedValue(updatedRequest);

      const result = await service.updateStatus(REQUEST_ID, TENANT_ID, 'IN_PROGRESS');

      expect(result.status).toBe('IN_PROGRESS');
      expect(prisma.dataSubjectRequest.update).toHaveBeenCalledWith({
        where: { id: REQUEST_ID },
        data: { status: 'IN_PROGRESS' },
      });
    });

    it('should set completedAt and slaMet when status is COMPLETED', async () => {
      const completedRequest = {
        ...mockRequest,
        status: 'COMPLETED',
        completedAt: now,
        slaMet: true,
      };
      prisma.dataSubjectRequest.update.mockResolvedValue(completedRequest);

      await service.updateStatus(REQUEST_ID, TENANT_ID, 'COMPLETED');

      const updateCall = prisma.dataSubjectRequest.update.mock.calls[0][0];
      expect(updateCall.data.completedAt).toBeInstanceOf(Date);
      expect(updateCall.data.slaMet).toBeDefined();
    });

    it('should throw BadRequestException when updating COMPLETED request', async () => {
      prisma.dataSubjectRequest.findFirst.mockResolvedValue({
        ...mockRequest,
        status: 'COMPLETED',
      });

      await expect(service.updateStatus(REQUEST_ID, TENANT_ID, 'IN_PROGRESS')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when updating REJECTED request', async () => {
      prisma.dataSubjectRequest.findFirst.mockResolvedValue({
        ...mockRequest,
        status: 'REJECTED',
      });

      await expect(service.updateStatus(REQUEST_ID, TENANT_ID, 'IN_PROGRESS')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when request does not exist', async () => {
      prisma.dataSubjectRequest.findFirst.mockResolvedValue(null);

      await expect(service.updateStatus('nonexistent', TENANT_ID, 'IN_PROGRESS')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should set notes when provided (notes field not in response DTO)', async () => {
      // NOTE: updateStatus calls getRequest which returns DataSubjectRequestResponse,
      // which does NOT include a `notes` field. So `request.notes` is always undefined,
      // meaning notes are always set directly (never appended to previous notes).
      // This is a known limitation of the current implementation.
      const requestWithNotes = { ...mockRequest, notes: 'Previous notes' };
      prisma.dataSubjectRequest.findFirst.mockResolvedValue(requestWithNotes);
      prisma.dataSubjectRequest.update.mockResolvedValue({
        ...requestWithNotes,
        status: 'IN_PROGRESS',
      });

      await service.updateStatus(REQUEST_ID, TENANT_ID, 'IN_PROGRESS', 'New note');

      const updateCall = prisma.dataSubjectRequest.update.mock.calls[0][0];
      // Since notes is not on the response DTO, it's always set directly
      expect(updateCall.data.notes).toBe('New note');
    });

    it('should set notes directly when no previous notes exist', async () => {
      prisma.dataSubjectRequest.update.mockResolvedValue({
        ...mockRequest,
        status: 'IN_PROGRESS',
      });

      await service.updateStatus(REQUEST_ID, TENANT_ID, 'IN_PROGRESS', 'First note');

      const updateCall = prisma.dataSubjectRequest.update.mock.calls[0][0];
      expect(updateCall.data.notes).toBe('First note');
    });

    it('should not include notes in update when not provided', async () => {
      prisma.dataSubjectRequest.update.mockResolvedValue({
        ...mockRequest,
        status: 'IN_PROGRESS',
      });

      await service.updateStatus(REQUEST_ID, TENANT_ID, 'IN_PROGRESS');

      const updateCall = prisma.dataSubjectRequest.update.mock.calls[0][0];
      expect(updateCall.data.notes).toBeUndefined();
    });
  });

  // =========================================================================
  // verifyIdentity
  // =========================================================================
  describe('verifyIdentity', () => {
    it('should verify identity for RECEIVED request', async () => {
      const result = await service.verifyIdentity(REQUEST_ID, TENANT_ID, {
        method: 'ID_DOCUMENT',
        documents: ['passport.pdf'],
        verifiedBy: USER_ID,
      });

      expect(result.success).toBe(true);
      expect(result.method).toBe('ID_DOCUMENT');
      expect(result.verifiedAt).toBeInstanceOf(Date);
      expect(result.documents).toEqual(['passport.pdf']);

      expect(prisma.dataSubjectRequest.update).toHaveBeenCalledWith({
        where: { id: REQUEST_ID },
        data: expect.objectContaining({
          status: 'VERIFIED',
          verificationMethod: 'ID_DOCUMENT',
          verificationDocuments: ['passport.pdf'],
          identityVerified: true,
        }),
      });
    });

    it('should verify identity for VERIFICATION_PENDING request', async () => {
      prisma.dataSubjectRequest.findFirst.mockResolvedValue({
        ...mockRequest,
        status: 'VERIFICATION_PENDING',
      });

      const result = await service.verifyIdentity(REQUEST_ID, TENANT_ID, {
        method: 'EMAIL',
      });

      expect(result.success).toBe(true);
    });

    it('should throw BadRequestException when request is not pending verification', async () => {
      prisma.dataSubjectRequest.findFirst.mockResolvedValue({
        ...mockRequest,
        status: 'IN_PROGRESS',
      });

      await expect(
        service.verifyIdentity(REQUEST_ID, TENANT_ID, { method: 'ID_DOCUMENT' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for COMPLETED request', async () => {
      prisma.dataSubjectRequest.findFirst.mockResolvedValue({
        ...mockRequest,
        status: 'COMPLETED',
      });

      await expect(
        service.verifyIdentity(REQUEST_ID, TENANT_ID, { method: 'EMAIL' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when request does not exist', async () => {
      prisma.dataSubjectRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.verifyIdentity('nonexistent', TENANT_ID, { method: 'EMAIL' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should set default verifiedBy to system when not provided', async () => {
      await service.verifyIdentity(REQUEST_ID, TENANT_ID, {
        method: 'EMAIL',
      });

      const updateCall = prisma.dataSubjectRequest.update.mock.calls[0][0];
      expect(updateCall.data.notes).toContain('system');
    });

    it('should set verifiedBy to the provided user', async () => {
      await service.verifyIdentity(REQUEST_ID, TENANT_ID, {
        method: 'ID_DOCUMENT',
        verifiedBy: 'admin-user',
      });

      const updateCall = prisma.dataSubjectRequest.update.mock.calls[0][0];
      expect(updateCall.data.notes).toContain('admin-user');
    });

    it('should return empty documents when not provided', async () => {
      const result = await service.verifyIdentity(REQUEST_ID, TENANT_ID, {
        method: 'EMAIL',
      });

      expect(result.documents).toBeUndefined();
    });
  });

  // =========================================================================
  // assignRequest
  // =========================================================================
  describe('assignRequest', () => {
    it('should assign request to a user and set status to IN_PROGRESS', async () => {
      const assignedRequest = { ...mockRequest, assignedTo: USER_ID, status: 'IN_PROGRESS' };
      prisma.dataSubjectRequest.update.mockResolvedValue(assignedRequest);

      const result = await service.assignRequest(REQUEST_ID, TENANT_ID, USER_ID);

      expect(result.assignedTo).toBe(USER_ID);
      expect(result.status).toBe('IN_PROGRESS');
      expect(prisma.dataSubjectRequest.update).toHaveBeenCalledWith({
        where: { id: REQUEST_ID },
        data: {
          assignedTo: USER_ID,
          status: 'IN_PROGRESS',
        },
      });
    });

    it('should use withTenant for assignment', async () => {
      prisma.dataSubjectRequest.update.mockResolvedValue({
        ...mockRequest,
        assignedTo: USER_ID,
        status: 'IN_PROGRESS',
      });

      await service.assignRequest(REQUEST_ID, TENANT_ID, USER_ID);

      expect(prisma.withTenant).toHaveBeenCalledWith(TENANT_ID, expect.any(Function));
    });
  });

  // =========================================================================
  // rejectRequest
  // =========================================================================
  describe('rejectRequest', () => {
    it('should reject a request with reason', async () => {
      const rejectedRequest = {
        ...mockRequest,
        status: 'REJECTED',
        rejectionReason: 'Identity not verified',
        completedAt: now,
      };
      prisma.dataSubjectRequest.update.mockResolvedValue(rejectedRequest);

      const result = await service.rejectRequest(REQUEST_ID, TENANT_ID, 'Identity not verified');

      expect(result.status).toBe('REJECTED');
      expect(prisma.dataSubjectRequest.update).toHaveBeenCalledWith({
        where: { id: REQUEST_ID },
        data: expect.objectContaining({
          status: 'REJECTED',
          rejectionReason: 'Identity not verified',
          notes: 'Rejected: Identity not verified',
        }),
      });
    });

    it('should reject with legal basis', async () => {
      const rejectedRequest = { ...mockRequest, status: 'REJECTED' };
      prisma.dataSubjectRequest.update.mockResolvedValue(rejectedRequest);

      await service.rejectRequest(REQUEST_ID, TENANT_ID, 'Legal obligation', 'Art. 17(3)(b)');

      const updateCall = prisma.dataSubjectRequest.update.mock.calls[0][0];
      expect(updateCall.data.rejectionBasis).toBe('Art. 17(3)(b)');
    });

    it('should set completedAt when rejecting', async () => {
      prisma.dataSubjectRequest.update.mockResolvedValue({
        ...mockRequest,
        status: 'REJECTED',
      });

      await service.rejectRequest(REQUEST_ID, TENANT_ID, 'Invalid request');

      const updateCall = prisma.dataSubjectRequest.update.mock.calls[0][0];
      expect(updateCall.data.completedAt).toBeInstanceOf(Date);
    });

    it('should throw BadRequestException when rejecting COMPLETED request', async () => {
      prisma.dataSubjectRequest.findFirst.mockResolvedValue({
        ...mockRequest,
        status: 'COMPLETED',
      });

      await expect(service.rejectRequest(REQUEST_ID, TENANT_ID, 'Too late')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when request does not exist', async () => {
      prisma.dataSubjectRequest.findFirst.mockResolvedValue(null);

      await expect(service.rejectRequest('nonexistent', TENANT_ID, 'Not found')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject without legal basis', async () => {
      prisma.dataSubjectRequest.update.mockResolvedValue({
        ...mockRequest,
        status: 'REJECTED',
      });

      await service.rejectRequest(REQUEST_ID, TENANT_ID, 'Duplicate request');

      const updateCall = prisma.dataSubjectRequest.update.mock.calls[0][0];
      expect(updateCall.data.rejectionBasis).toBeUndefined();
    });
  });

  // =========================================================================
  // getPendingRequests
  // =========================================================================
  describe('getPendingRequests', () => {
    const pastDeadline = new Date('2026-03-01T00:00:00Z');
    const nearDeadline = new Date('2026-03-15T00:00:00Z');
    const farDeadline = new Date('2026-04-30T00:00:00Z');

    it('should categorize requests by urgency', async () => {
      const overdueReq = { ...mockRequest, id: 'overdue-1', deadlineAt: pastDeadline };
      const urgentReq = { ...mockRequest, id: 'urgent-1', deadlineAt: nearDeadline };
      const normalReq = { ...mockRequest, id: 'normal-1', deadlineAt: farDeadline };

      prisma.dataSubjectRequest.findMany.mockResolvedValue([overdueReq, urgentReq, normalReq]);

      const result = await service.getPendingRequests(TENANT_ID);

      expect(result.overdue).toHaveLength(1);
      expect(result.overdue[0].id).toBe('overdue-1');
      expect(result.urgent).toHaveLength(1);
      expect(result.urgent[0].id).toBe('urgent-1');
      expect(result.normal).toHaveLength(1);
      expect(result.normal[0].id).toBe('normal-1');
    });

    it('should filter by tenantId when provided', async () => {
      prisma.dataSubjectRequest.findMany.mockResolvedValue([]);

      await service.getPendingRequests(TENANT_ID);

      expect(prisma.dataSubjectRequest.findMany).toHaveBeenCalledWith({
        where: {
          status: { notIn: ['COMPLETED', 'REJECTED', 'CANCELLED'] },
          tenantId: TENANT_ID,
        },
        orderBy: { deadlineAt: 'asc' },
      });
    });

    it('should not filter by tenantId when not provided', async () => {
      prisma.dataSubjectRequest.findMany.mockResolvedValue([]);

      await service.getPendingRequests();

      expect(prisma.dataSubjectRequest.findMany).toHaveBeenCalledWith({
        where: {
          status: { notIn: ['COMPLETED', 'REJECTED', 'CANCELLED'] },
        },
        orderBy: { deadlineAt: 'asc' },
      });
    });

    it('should return empty arrays when no pending requests', async () => {
      prisma.dataSubjectRequest.findMany.mockResolvedValue([]);

      const result = await service.getPendingRequests(TENANT_ID);

      expect(result.overdue).toEqual([]);
      expect(result.urgent).toEqual([]);
      expect(result.normal).toEqual([]);
    });
  });

  // =========================================================================
  // getStatistics
  // =========================================================================
  describe('getStatistics', () => {
    it('should return statistics for a tenant', async () => {
      prisma.dataSubjectRequest.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(2); // overdue
      prisma.dataSubjectRequest.groupBy
        .mockResolvedValueOnce([
          { requestType: 'ACCESS', _count: { requestType: 5 } },
          { requestType: 'DELETION', _count: { requestType: 3 } },
        ])
        .mockResolvedValueOnce([
          { status: 'COMPLETED', _count: { status: 7 } },
          { status: 'IN_PROGRESS', _count: { status: 3 } },
        ]);
      prisma.dataSubjectRequest.aggregate.mockResolvedValue({
        _count: { slaMet: 6 },
      });

      const result = await service.getStatistics(TENANT_ID);

      expect(result.totalRequests).toBe(10);
      expect(result.byType).toEqual({
        ACCESS: 5,
        DELETION: 3,
      });
      expect(result.byStatus).toEqual({
        COMPLETED: 7,
        IN_PROGRESS: 3,
      });
      expect(result.overdueCount).toBe(2);
      expect(result.slaComplianceRate).toBe(6 / (6 + 2));
      expect(result.averageCompletionTime).toBe(0);
    });

    it('should return statistics without tenant filter', async () => {
      prisma.dataSubjectRequest.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      prisma.dataSubjectRequest.groupBy.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      prisma.dataSubjectRequest.aggregate.mockResolvedValue({
        _count: { slaMet: 0 },
      });

      const result = await service.getStatistics();

      expect(result.totalRequests).toBe(0);
      expect(result.byType).toEqual({});
      expect(result.byStatus).toEqual({});
      expect(result.overdueCount).toBe(0);
      expect(result.slaComplianceRate).toBe(0);
    });

    it('should handle zero division for SLA compliance rate', async () => {
      prisma.dataSubjectRequest.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      prisma.dataSubjectRequest.groupBy.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      prisma.dataSubjectRequest.aggregate.mockResolvedValue({
        _count: { slaMet: 0 },
      });

      const result = await service.getStatistics(TENANT_ID);

      expect(result.slaComplianceRate).toBe(0);
    });
  });
});
