import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SecurityIncidentService } from './security-incident.service';
import { PrismaService } from '@common/services/prisma.service';

const TENANT_ID = 'tenant-uuid-001';

function mockIncident(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'inc-uuid-001',
    tenantId: TENANT_ID,
    title: 'Test incident',
    description: 'Test description',
    severity: 'HIGH',
    status: 'DETECTED',
    detectedAt: new Date('2026-03-24T08:00:00Z'),
    reportedAt: null,
    containedAt: null,
    resolvedAt: null,
    incidentType: 'unauthorized_access',
    affectedSystems: ['database'],
    affectedUsers: 10,
    dataBreached: false,
    responseActions: null,
    rootCause: null,
    preventiveMeasures: null,
    createdBy: 'user-001',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('SecurityIncidentService', () => {
  let service: SecurityIncidentService;
  let prisma: {
    securityIncident: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    user: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      securityIncident: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      user: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityIncidentService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(SecurityIncidentService);
  });

  // ─── create ───
  describe('create', () => {
    it('should create a new incident', async () => {
      const dto = {
        title: 'Brute force detected',
        description: 'Multiple failed login attempts',
        severity: 'HIGH' as const,
        detectedAt: '2026-03-24T08:00:00Z',
        incidentType: 'unauthorized_access' as const,
        affectedSystems: ['auth-service'],
        affectedUsers: 5,
        dataBreached: false,
      };
      const expected = mockIncident({ ...dto, detectedAt: new Date(dto.detectedAt) });
      prisma.securityIncident.create.mockResolvedValue(expected);

      const result = await service.create(TENANT_ID, dto, 'user-001');

      expect(prisma.securityIncident.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          title: dto.title,
          status: 'DETECTED',
          createdBy: 'user-001',
        }),
      });
      expect(result).toEqual(expected);
    });
  });

  // ─── findAll ───
  describe('findAll', () => {
    it('should return paginated incidents', async () => {
      const incidents = [mockIncident()];
      prisma.securityIncident.findMany.mockResolvedValue(incidents);
      prisma.securityIncident.count.mockResolvedValue(1);

      const result = await service.findAll(TENANT_ID, { page: 1, limit: 20 });

      expect(result).toEqual({ data: incidents, total: 1, page: 1, limit: 20 });
      expect(prisma.securityIncident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID },
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should apply status filter', async () => {
      prisma.securityIncident.findMany.mockResolvedValue([]);
      prisma.securityIncident.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, { status: 'INVESTIGATING' });

      expect(prisma.securityIncident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, status: 'INVESTIGATING' },
        }),
      );
    });
  });

  // ─── findOne ───
  describe('findOne', () => {
    it('should return incident by ID', async () => {
      const inc = mockIncident();
      prisma.securityIncident.findUnique.mockResolvedValue(inc);

      const result = await service.findOne(TENANT_ID, 'inc-uuid-001');

      expect(result).toEqual(inc);
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.securityIncident.findUnique.mockResolvedValue(null);

      await expect(service.findOne(TENANT_ID, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if wrong tenant', async () => {
      prisma.securityIncident.findUnique.mockResolvedValue(
        mockIncident({ tenantId: 'other-tenant' }),
      );

      await expect(service.findOne(TENANT_ID, 'inc-uuid-001')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── update ───
  describe('update', () => {
    it('should update incident details', async () => {
      const inc = mockIncident();
      prisma.securityIncident.findUnique.mockResolvedValue(inc);
      prisma.securityIncident.update.mockResolvedValue({ ...inc, title: 'Updated' });

      const result = await service.update(TENANT_ID, 'inc-uuid-001', {
        title: 'Updated',
      });

      expect(result.title).toBe('Updated');
    });
  });

  // ─── updateStatus (state machine) ───
  describe('updateStatus', () => {
    it('should transition DETECTED -> INVESTIGATING', async () => {
      const inc = mockIncident({ status: 'DETECTED' });
      prisma.securityIncident.findUnique.mockResolvedValue(inc);
      prisma.securityIncident.update.mockResolvedValue({
        ...inc,
        status: 'INVESTIGATING',
      });

      const result = await service.updateStatus(TENANT_ID, 'inc-uuid-001', {
        status: 'INVESTIGATING',
      });

      expect(result.status).toBe('INVESTIGATING');
    });

    it('should set containedAt when transitioning to CONTAINED', async () => {
      const inc = mockIncident({ status: 'INVESTIGATING' });
      prisma.securityIncident.findUnique.mockResolvedValue(inc);
      prisma.securityIncident.update.mockResolvedValue({
        ...inc,
        status: 'CONTAINED',
      });

      await service.updateStatus(TENANT_ID, 'inc-uuid-001', {
        status: 'CONTAINED',
      });

      expect(prisma.securityIncident.update).toHaveBeenCalledWith({
        where: { id: 'inc-uuid-001' },
        data: expect.objectContaining({
          status: 'CONTAINED',
          containedAt: expect.any(Date),
        }),
      });
    });

    it('should set reportedAt when transitioning to REPORTED_ACN', async () => {
      const inc = mockIncident({ status: 'RESOLVED' });
      prisma.securityIncident.findUnique.mockResolvedValue(inc);
      prisma.securityIncident.update.mockResolvedValue({
        ...inc,
        status: 'REPORTED_ACN',
      });

      await service.updateStatus(TENANT_ID, 'inc-uuid-001', {
        status: 'REPORTED_ACN',
      });

      expect(prisma.securityIncident.update).toHaveBeenCalledWith({
        where: { id: 'inc-uuid-001' },
        data: expect.objectContaining({
          status: 'REPORTED_ACN',
          reportedAt: expect.any(Date),
        }),
      });
    });

    it('should reject invalid transitions', async () => {
      const inc = mockIncident({ status: 'DETECTED' });
      prisma.securityIncident.findUnique.mockResolvedValue(inc);

      await expect(
        service.updateStatus(TENANT_ID, 'inc-uuid-001', { status: 'CLOSED' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject transitions from CLOSED', async () => {
      const inc = mockIncident({ status: 'CLOSED' });
      prisma.securityIncident.findUnique.mockResolvedValue(inc);

      await expect(
        service.updateStatus(TENANT_ID, 'inc-uuid-001', { status: 'DETECTED' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── checkNis2Deadlines ───
  describe('checkNis2Deadlines', () => {
    it('should flag overdue incidents', async () => {
      const old = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48h ago
      prisma.securityIncident.findMany.mockResolvedValue([
        mockIncident({ detectedAt: old, status: 'DETECTED' }),
      ]);

      const alerts = await service.checkNis2Deadlines(TENANT_ID);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].earlyWarningOverdue).toBe(true);
      expect(alerts[0].fullReportOverdue).toBe(false);
    });

    it('should flag full report overdue for 96h incidents', async () => {
      const old = new Date(Date.now() - 96 * 60 * 60 * 1000); // 96h ago
      prisma.securityIncident.findMany.mockResolvedValue([
        mockIncident({ detectedAt: old, status: 'INVESTIGATING' }),
      ]);

      const alerts = await service.checkNis2Deadlines(TENANT_ID);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].earlyWarningOverdue).toBe(true);
      expect(alerts[0].fullReportOverdue).toBe(true);
    });

    it('should not include reported/closed incidents', async () => {
      prisma.securityIncident.findMany.mockResolvedValue([]);

      const alerts = await service.checkNis2Deadlines(TENANT_ID);

      expect(alerts).toHaveLength(0);
      expect(prisma.securityIncident.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          status: { notIn: ['REPORTED_ACN', 'CLOSED'] },
        },
        orderBy: { detectedAt: 'asc' },
      });
    });
  });

  // ─── getDashboard ───
  describe('getDashboard', () => {
    it('should return dashboard stats', async () => {
      const resolved = mockIncident({
        status: 'RESOLVED',
        resolvedAt: new Date('2026-03-24T20:00:00Z'),
        detectedAt: new Date('2026-03-24T08:00:00Z'),
      });
      prisma.securityIncident.findMany.mockResolvedValue([resolved]);

      const result = await service.getDashboard(TENANT_ID);

      expect(result.total).toBe(1);
      expect(result.avgResolutionTimeHours).toBeCloseTo(12, 0);
      expect(result.bySeverity).toBeDefined();
      expect(result.byStatus).toBeDefined();
    });
  });

  // ─── getComplianceOverview ───
  describe('getComplianceOverview', () => {
    it('should return compliance checklist', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'u1', totpEnabled: true, smsOtpEnabled: false },
      ]);
      prisma.securityIncident.count.mockResolvedValue(0);
      prisma.securityIncident.findMany.mockResolvedValue([]);

      const result = await service.getComplianceOverview(TENANT_ID);

      expect(result.mfaEnabledForAdmins).toBe(true);
      expect(result.encryptionAtRest).toBe(true);
      expect(result.auditLogging).toBe(true);
      expect(result.complianceScore).toBeGreaterThanOrEqual(75);
    });

    it('should report MFA not enabled if admin lacks TOTP', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'u1', totpEnabled: false, smsOtpEnabled: false },
      ]);
      prisma.securityIncident.count.mockResolvedValue(0);
      prisma.securityIncident.findMany.mockResolvedValue([]);

      const result = await service.getComplianceOverview(TENANT_ID);

      expect(result.mfaEnabledForAdmins).toBe(false);
      expect(result.complianceScore).toBeLessThan(100);
    });
  });
});
