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
      providers: [SecurityIncidentService, { provide: PrismaService, useValue: prisma }],
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

      await expect(service.findOne(TENANT_ID, 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if wrong tenant', async () => {
      prisma.securityIncident.findUnique.mockResolvedValue(
        mockIncident({ tenantId: 'other-tenant' }),
      );

      await expect(service.findOne(TENANT_ID, 'inc-uuid-001')).rejects.toThrow(NotFoundException);
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
      prisma.securityIncident.count
        .mockResolvedValueOnce(0) // openIncidents
        .mockResolvedValueOnce(1); // handledIncidents
      prisma.securityIncident.findMany
        .mockResolvedValueOnce([]) // resolvedIncidents
        .mockResolvedValueOnce([]); // checkNis2Deadlines

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

    it('should report MFA enabled when admin has smsOtp', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'u1', totpEnabled: false, smsOtpEnabled: true },
      ]);
      prisma.securityIncident.count.mockResolvedValue(0);
      prisma.securityIncident.findMany.mockResolvedValue([]);

      const result = await service.getComplianceOverview(TENANT_ID);

      expect(result.mfaEnabledForAdmins).toBe(true);
    });

    it('should report MFA not enabled when no admins exist', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.securityIncident.count.mockResolvedValue(0);
      prisma.securityIncident.findMany.mockResolvedValue([]);

      const result = await service.getComplianceOverview(TENANT_ID);

      expect(result.mfaEnabledForAdmins).toBe(false);
    });

    it('should calculate avg resolution time when resolved incidents exist', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.securityIncident.count.mockResolvedValue(0);
      prisma.securityIncident.findMany
        .mockResolvedValueOnce([
          {
            detectedAt: new Date('2026-03-24T08:00:00Z'),
            resolvedAt: new Date('2026-03-24T20:00:00Z'),
          },
        ]) // resolvedIncidents
        .mockResolvedValueOnce([]); // checkNis2Deadlines

      const result = await service.getComplianceOverview(TENANT_ID);

      expect(result.avgResolutionTimeHours).toBeCloseTo(12, 0);
    });

    it('should return null avg resolution when no resolved incidents', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.securityIncident.count.mockResolvedValue(0);
      prisma.securityIncident.findMany.mockResolvedValue([]);

      const result = await service.getComplianceOverview(TENANT_ID);

      expect(result.avgResolutionTimeHours).toBeNull();
    });

    it('should set incidentResponsePlanActive when handled incidents exist', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.securityIncident.count
        .mockResolvedValueOnce(0) // openIncidents
        .mockResolvedValueOnce(5); // handledIncidents
      prisma.securityIncident.findMany.mockResolvedValue([]);

      const result = await service.getComplianceOverview(TENANT_ID);

      expect(result.incidentResponsePlanActive).toBe(true);
    });

    it('should give 15 points for 1-2 overdue NIS2 deadlines', async () => {
      const old = new Date(Date.now() - 48 * 60 * 60 * 1000);
      prisma.user.findMany.mockResolvedValue([
        { id: 'u1', totpEnabled: true, smsOtpEnabled: false },
      ]);
      prisma.securityIncident.count.mockResolvedValue(0);
      prisma.securityIncident.findMany
        .mockResolvedValueOnce([]) // resolvedIncidents query
        .mockResolvedValueOnce([
          // checkNis2Deadlines query
          mockIncident({ detectedAt: old, status: 'DETECTED' }),
        ]);

      const result = await service.getComplianceOverview(TENANT_ID);

      // 25 (mfa) + 25 (encryption) + 25 (audit) + 15 (1-2 overdue) = 90
      expect(result.complianceScore).toBe(90);
    });

    it('should give 5 points for 3+ overdue NIS2 deadlines', async () => {
      const old = new Date(Date.now() - 96 * 60 * 60 * 1000);
      prisma.user.findMany.mockResolvedValue([
        { id: 'u1', totpEnabled: true, smsOtpEnabled: false },
      ]);
      prisma.securityIncident.count.mockResolvedValue(0);
      prisma.securityIncident.findMany
        .mockResolvedValueOnce([]) // resolvedIncidents query
        .mockResolvedValueOnce([
          // checkNis2Deadlines query
          mockIncident({ id: 'inc-1', detectedAt: old, status: 'DETECTED' }),
          mockIncident({ id: 'inc-2', detectedAt: old, status: 'INVESTIGATING' }),
          mockIncident({ id: 'inc-3', detectedAt: old, status: 'CONTAINED' }),
        ]);

      const result = await service.getComplianceOverview(TENANT_ID);

      // 25 (mfa) + 25 (encryption) + 25 (audit) + 5 (3+ overdue) = 80
      expect(result.complianceScore).toBe(80);
    });

    it('should score 25 points when encryptionAtRest is hardcoded true', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'u1', totpEnabled: false, smsOtpEnabled: false },
      ]);
      prisma.securityIncident.count.mockResolvedValue(0);
      prisma.securityIncident.findMany.mockResolvedValue([]);

      const result = await service.getComplianceOverview(TENANT_ID);

      // encryptionAtRest is hardcoded true
      expect(result.encryptionAtRest).toBe(true);
      // Score = 0 (no mfa) + 25 (encryption) + 25 (audit) + 0 (no incidents) = 50
      expect(result.complianceScore).toBeGreaterThanOrEqual(50);
    });

    it('should score 25 points when auditLogging is hardcoded true', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'u1', totpEnabled: false, smsOtpEnabled: false },
      ]);
      prisma.securityIncident.count.mockResolvedValue(0);
      prisma.securityIncident.findMany.mockResolvedValue([]);

      const result = await service.getComplianceOverview(TENANT_ID);

      // auditLogging is hardcoded true
      expect(result.auditLogging).toBe(true);
      // Score = 0 (no mfa) + 25 (encryption) + 25 (audit) + 0 (no incidents) = 50
      expect(result.complianceScore).toBeGreaterThanOrEqual(50);
    });

    it('should calculate score correctly with all conditions met', async () => {
      prisma.user.findMany.mockResolvedValueOnce([
        { id: 'u1', totpEnabled: true, smsOtpEnabled: false },
      ]);
      prisma.securityIncident.count.mockResolvedValue(0);
      const recent = new Date(Date.now() - 6 * 60 * 60 * 1000); // 6h ago, no overdue
      prisma.securityIncident.findMany
        .mockResolvedValueOnce([]) // resolvedIncidents
        .mockResolvedValueOnce([
          // checkNis2Deadlines
          mockIncident({ detectedAt: recent, status: 'DETECTED' }),
        ]);

      const result = await service.getComplianceOverview(TENANT_ID);

      // 25 (mfa) + 25 (encryption) + 25 (audit) + 25 (no overdue NIS2) = 100
      expect(result.complianceScore).toBe(100);
    });

    it('should give exactly 15 points for exactly 2 overdue NIS2 deadlines', async () => {
      const old = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48h ago, overdue early warning
      prisma.user.findMany.mockResolvedValueOnce([
        { id: 'u1', totpEnabled: true, smsOtpEnabled: false },
      ]);
      prisma.securityIncident.count.mockResolvedValue(0);
      prisma.securityIncident.findMany
        .mockResolvedValueOnce([]) // resolvedIncidents
        .mockResolvedValueOnce([
          // checkNis2Deadlines — exactly 2 overdue
          mockIncident({ id: 'inc-1', detectedAt: old, status: 'DETECTED' }),
          mockIncident({ id: 'inc-2', detectedAt: old, status: 'INVESTIGATING' }),
        ]);

      const result = await service.getComplianceOverview(TENANT_ID);

      // 25 (mfa) + 25 (encryption) + 25 (audit) + 15 (exactly 2 overdue) = 90
      expect(result.complianceScore).toBe(90);
    });

    it('should give exactly 5 points for exactly 3 overdue NIS2 deadlines', async () => {
      const old = new Date(Date.now() - 96 * 60 * 60 * 1000); // 96h ago, overdue full report
      prisma.user.findMany.mockResolvedValueOnce([
        { id: 'u1', totpEnabled: true, smsOtpEnabled: false },
      ]);
      prisma.securityIncident.count.mockResolvedValue(0);
      prisma.securityIncident.findMany
        .mockResolvedValueOnce([]) // resolvedIncidents
        .mockResolvedValueOnce([
          // checkNis2Deadlines — exactly 3 overdue
          mockIncident({ id: 'inc-1', detectedAt: old, status: 'DETECTED' }),
          mockIncident({ id: 'inc-2', detectedAt: old, status: 'INVESTIGATING' }),
          mockIncident({ id: 'inc-3', detectedAt: old, status: 'CONTAINED' }),
        ]);

      const result = await service.getComplianceOverview(TENANT_ID);

      // 25 (mfa) + 25 (encryption) + 25 (audit) + 5 (3+ overdue) = 80
      expect(result.complianceScore).toBe(80);
    });

    it('should give 0 points for MFA when disabled', async () => {
      prisma.user.findMany.mockResolvedValueOnce([
        { id: 'u1', totpEnabled: false, smsOtpEnabled: false },
      ]);
      prisma.securityIncident.count.mockResolvedValue(0);
      const recent = new Date(Date.now() - 6 * 60 * 60 * 1000);
      prisma.securityIncident.findMany
        .mockResolvedValueOnce([]) // resolvedIncidents
        .mockResolvedValueOnce([
          mockIncident({ detectedAt: recent, status: 'DETECTED' }),
        ]); // checkNis2Deadlines

      const result = await service.getComplianceOverview(TENANT_ID);

      // 0 (no mfa) + 25 (encryption) + 25 (audit) + 25 (no overdue) = 75
      expect(result.complianceScore).toBe(75);
    });
  });

  // ─── update — additional branches ───
  describe('update (additional branches)', () => {
    it('should handle partial update with multiple fields', async () => {
      const inc = mockIncident();
      prisma.securityIncident.findUnique.mockResolvedValue(inc);
      prisma.securityIncident.update.mockResolvedValue({
        ...inc,
        title: 'New title',
        rootCause: 'Weak password',
        preventiveMeasures: 'Enforce MFA',
      });

      const result = await service.update(TENANT_ID, 'inc-uuid-001', {
        title: 'New title',
        rootCause: 'Weak password',
        preventiveMeasures: 'Enforce MFA',
      });

      expect(prisma.securityIncident.update).toHaveBeenCalledWith({
        where: { id: 'inc-uuid-001' },
        data: expect.objectContaining({
          title: 'New title',
          rootCause: 'Weak password',
          preventiveMeasures: 'Enforce MFA',
        }),
      });
      expect(result).toBeDefined();
    });

    it('should not include undefined fields in update', async () => {
      const inc = mockIncident();
      prisma.securityIncident.findUnique.mockResolvedValue(inc);
      prisma.securityIncident.update.mockResolvedValue(inc);

      await service.update(TENANT_ID, 'inc-uuid-001', { title: 'Only title' });

      const updateCall = prisma.securityIncident.update.mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty('rootCause');
      expect(updateCall.data).not.toHaveProperty('preventiveMeasures');
    });
  });

  // ─── findAll — additional filters ───
  describe('findAll (additional filters)', () => {
    it('should apply severity filter', async () => {
      prisma.securityIncident.findMany.mockResolvedValue([]);
      prisma.securityIncident.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, { severity: 'CRITICAL' });

      expect(prisma.securityIncident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, severity: 'CRITICAL' },
        }),
      );
    });

    it('should apply incidentType filter', async () => {
      prisma.securityIncident.findMany.mockResolvedValue([]);
      prisma.securityIncident.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, { incidentType: 'data_breach' });

      expect(prisma.securityIncident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, incidentType: 'data_breach' },
        }),
      );
    });

    it('should use default pagination when not provided', async () => {
      prisma.securityIncident.findMany.mockResolvedValue([]);
      prisma.securityIncident.count.mockResolvedValue(0);

      const result = await service.findAll(TENANT_ID, {});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  // ─── updateStatus — set resolvedAt, containedAt, reportedAt ───
  describe('updateStatus (timestamp branches)', () => {
    it('should set resolvedAt when transitioning to RESOLVED', async () => {
      const inc = mockIncident({ status: 'CONTAINED' });
      prisma.securityIncident.findUnique.mockResolvedValue(inc);
      prisma.securityIncident.update.mockResolvedValue({ ...inc, status: 'RESOLVED' });

      await service.updateStatus(TENANT_ID, 'inc-uuid-001', { status: 'RESOLVED' });

      expect(prisma.securityIncident.update).toHaveBeenCalledWith({
        where: { id: 'inc-uuid-001' },
        data: expect.objectContaining({
          status: 'RESOLVED',
          resolvedAt: expect.any(Date),
        }),
      });
    });

    it('should set all three timestamps across multiple transitions', async () => {
      // Test INVESTIGATING -> CONTAINED
      const inc1 = mockIncident({ status: 'INVESTIGATING' });
      prisma.securityIncident.findUnique.mockResolvedValueOnce(inc1);
      prisma.securityIncident.update.mockResolvedValueOnce({
        ...inc1,
        status: 'CONTAINED',
      });

      await service.updateStatus(TENANT_ID, 'inc-uuid-001', { status: 'CONTAINED' });

      const callArgs1 = prisma.securityIncident.update.mock.calls[0][0];
      expect(callArgs1.data.containedAt).toBeDefined();
      expect(callArgs1.data.resolvedAt).toBeUndefined();
      expect(callArgs1.data.reportedAt).toBeUndefined();

      // Test CONTAINED -> RESOLVED
      const inc2 = mockIncident({ status: 'CONTAINED' });
      prisma.securityIncident.findUnique.mockResolvedValueOnce(inc2);
      prisma.securityIncident.update.mockResolvedValueOnce({
        ...inc2,
        status: 'RESOLVED',
      });

      await service.updateStatus(TENANT_ID, 'inc-uuid-001', { status: 'RESOLVED' });

      const callArgs2 = prisma.securityIncident.update.mock.calls[1][0];
      expect(callArgs2.data.resolvedAt).toBeDefined();
      expect(callArgs2.data.containedAt).toBeUndefined();
      expect(callArgs2.data.reportedAt).toBeUndefined();
    });

    it('should not set unwanted timestamps for INVESTIGATING transition', async () => {
      const inc = mockIncident({ status: 'DETECTED' });
      prisma.securityIncident.findUnique.mockResolvedValue(inc);
      prisma.securityIncident.update.mockResolvedValue({ ...inc, status: 'INVESTIGATING' });

      await service.updateStatus(TENANT_ID, 'inc-uuid-001', {
        status: 'INVESTIGATING',
      });

      const callArgs = prisma.securityIncident.update.mock.calls[0][0];
      expect(callArgs.data.status).toBe('INVESTIGATING');
      // Should not have resolvedAt, containedAt, reportedAt
      expect(callArgs.data.resolvedAt).toBeUndefined();
      expect(callArgs.data.containedAt).toBeUndefined();
      expect(callArgs.data.reportedAt).toBeUndefined();
    });

    it('should transition CONTAINED -> RESOLVED and set both timestamps correctly', async () => {
      const inc = mockIncident({ status: 'CONTAINED', containedAt: new Date() });
      prisma.securityIncident.findUnique.mockResolvedValue(inc);
      prisma.securityIncident.update.mockResolvedValue({ ...inc, status: 'RESOLVED' });

      await service.updateStatus(TENANT_ID, 'inc-uuid-001', { status: 'RESOLVED' });

      const callArgs = prisma.securityIncident.update.mock.calls[0][0];
      expect(callArgs.data.status).toBe('RESOLVED');
      expect(callArgs.data.resolvedAt).toBeDefined();
      expect(callArgs.data.containedAt).toBeUndefined(); // Should not change containedAt
    });
  });

  // ─── getDashboard — additional cases ───
  describe('getDashboard (additional cases)', () => {
    it('should return null avgResolutionTimeHours when no resolved incidents', async () => {
      prisma.securityIncident.findMany.mockResolvedValue([
        mockIncident({ status: 'DETECTED', resolvedAt: null }),
      ]);

      const result = await service.getDashboard(TENANT_ID);

      expect(result.avgResolutionTimeHours).toBeNull();
    });

    it('should count by severity and status', async () => {
      prisma.securityIncident.findMany.mockResolvedValue([
        mockIncident({ severity: 'HIGH', status: 'DETECTED' }),
        mockIncident({ severity: 'CRITICAL', status: 'INVESTIGATING' }),
        mockIncident({ severity: 'HIGH', status: 'CLOSED' }),
      ]);

      const result = await service.getDashboard(TENANT_ID);

      expect(result.bySeverity.HIGH).toBe(2);
      expect(result.bySeverity.CRITICAL).toBe(1);
      expect(result.byStatus.DETECTED).toBe(1);
      expect(result.byStatus.INVESTIGATING).toBe(1);
      expect(result.byStatus.CLOSED).toBe(1);
    });
  });

  // ─── checkNis2Deadlines — within deadline ───
  describe('checkNis2Deadlines (within deadline)', () => {
    it('should not flag incidents within 24h', async () => {
      const recent = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12h ago
      prisma.securityIncident.findMany.mockResolvedValue([
        mockIncident({ detectedAt: recent, status: 'DETECTED' }),
      ]);

      const alerts = await service.checkNis2Deadlines(TENANT_ID);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].earlyWarningOverdue).toBe(false);
      expect(alerts[0].fullReportOverdue).toBe(false);
    });
  });

  // ─── getDashboard — branch coverage for severity/status initialization ───
  describe('getDashboard (severity/status branches)', () => {
    it('should initialize bySeverity with all levels', async () => {
      prisma.securityIncident.findMany.mockResolvedValue([]);

      const result = await service.getDashboard(TENANT_ID);

      expect(result.bySeverity).toEqual({
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      });
    });

    it('should initialize byStatus with all states', async () => {
      prisma.securityIncident.findMany.mockResolvedValue([]);

      const result = await service.getDashboard(TENANT_ID);

      expect(result.byStatus).toEqual({
        DETECTED: 0,
        INVESTIGATING: 0,
        CONTAINED: 0,
        RESOLVED: 0,
        REPORTED_ACN: 0,
        CLOSED: 0,
      });
    });

    it('should handle mixed severity and status', async () => {
      prisma.securityIncident.findMany.mockResolvedValue([
        mockIncident({ severity: 'LOW', status: 'DETECTED' }),
        mockIncident({ severity: 'MEDIUM', status: 'INVESTIGATING' }),
        mockIncident({ severity: 'HIGH', status: 'CONTAINED' }),
        mockIncident({ severity: 'CRITICAL', status: 'RESOLVED' }),
      ]);

      const result = await service.getDashboard(TENANT_ID);

      expect(result.bySeverity.LOW).toBe(1);
      expect(result.bySeverity.MEDIUM).toBe(1);
      expect(result.bySeverity.HIGH).toBe(1);
      expect(result.bySeverity.CRITICAL).toBe(1);
    });
  });

  // ─── getComplianceOverview — branch coverage for admin checks ───
  describe('getComplianceOverview (admin MFA branches)', () => {
    it('should report MFA enabled when all admins have TOTP or SMS OTP', async () => {
      prisma.user.findMany.mockResolvedValueOnce([
        { id: 'u1', totpEnabled: true, smsOtpEnabled: false },
        { id: 'u2', totpEnabled: false, smsOtpEnabled: true },
      ]);
      prisma.securityIncident.count.mockResolvedValue(0);
      prisma.securityIncident.findMany.mockResolvedValue([]);

      const result = await service.getComplianceOverview(TENANT_ID);

      expect(result.mfaEnabledForAdmins).toBe(true);
    });

    it('should report MFA disabled when any admin lacks both TOTP and SMS OTP', async () => {
      prisma.user.findMany.mockResolvedValueOnce([
        { id: 'u1', totpEnabled: true, smsOtpEnabled: false },
        { id: 'u2', totpEnabled: false, smsOtpEnabled: false },
      ]);
      prisma.securityIncident.count.mockResolvedValue(0);
      prisma.securityIncident.findMany.mockResolvedValue([]);

      const result = await service.getComplianceOverview(TENANT_ID);

      expect(result.mfaEnabledForAdmins).toBe(false);
    });

    it('should report MFA disabled when all admins lack both TOTP and SMS OTP', async () => {
      prisma.user.findMany.mockResolvedValueOnce([
        { id: 'u1', totpEnabled: false, smsOtpEnabled: false },
        { id: 'u2', totpEnabled: false, smsOtpEnabled: false },
      ]);
      prisma.securityIncident.count.mockResolvedValue(0);
      prisma.securityIncident.findMany.mockResolvedValue([]);

      const result = await service.getComplianceOverview(TENANT_ID);

      expect(result.mfaEnabledForAdmins).toBe(false);
    });

    it('should give 25 points for zero NIS2 deadline overdue', async () => {
      const recent = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12h ago
      prisma.user.findMany.mockResolvedValueOnce([
        { id: 'u1', totpEnabled: true, smsOtpEnabled: false },
      ]);
      prisma.securityIncident.count.mockResolvedValue(0);
      prisma.securityIncident.findMany
        .mockResolvedValueOnce([]) // resolvedIncidents query
        .mockResolvedValueOnce([
          mockIncident({ detectedAt: recent, status: 'DETECTED' }),
        ]); // checkNis2Deadlines query

      const result = await service.getComplianceOverview(TENANT_ID);

      // 25 (mfa) + 25 (encryption) + 25 (audit) + 25 (no overdue) = 100
      expect(result.complianceScore).toBe(100);
    });

    it('should report incidentResponsePlanActive as false when no handled incidents', async () => {
      prisma.user.findMany.mockResolvedValueOnce([]);
      prisma.securityIncident.count
        .mockResolvedValueOnce(0) // openIncidents
        .mockResolvedValueOnce(0); // handledIncidents
      prisma.securityIncident.findMany.mockResolvedValue([]);

      const result = await service.getComplianceOverview(TENANT_ID);

      expect(result.incidentResponsePlanActive).toBe(false);
    });
  });

  // ─── updateStatus — edge case with incident not found after findOne ───
  describe('updateStatus (edge case)', () => {
    it('should handle incident not found gracefully', async () => {
      prisma.securityIncident.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus(TENANT_ID, 'nonexistent', { status: 'INVESTIGATING' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findAll — combined filters ───
  describe('findAll (combined filters)', () => {
    it('should apply status, severity, and incidentType filters together', async () => {
      prisma.securityIncident.findMany.mockResolvedValue([]);
      prisma.securityIncident.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, {
        status: 'INVESTIGATING',
        severity: 'HIGH',
        incidentType: 'data_breach',
      });

      expect(prisma.securityIncident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TENANT_ID,
            status: 'INVESTIGATING',
            severity: 'HIGH',
            incidentType: 'data_breach',
          },
        }),
      );
    });
  });

  // ─── create — affectedSystems and dataBreached defaults ───
  describe('create (defaults)', () => {
    it('should use empty array for affectedSystems when not provided', async () => {
      const dto = {
        title: 'Incident',
        description: 'Desc',
        severity: 'MEDIUM' as const,
        detectedAt: '2026-03-24T08:00:00Z',
        incidentType: 'unauthorized_access' as const,
        affectedUsers: 1,
      };
      const expected = mockIncident({ ...dto, affectedSystems: [] });
      prisma.securityIncident.create.mockResolvedValue(expected);

      await service.create(TENANT_ID, dto);

      expect(prisma.securityIncident.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          affectedSystems: [],
          dataBreached: false,
        }),
      });
    });

    it('should preserve affectedSystems when provided', async () => {
      const dto = {
        title: 'Incident',
        description: 'Desc',
        severity: 'HIGH' as const,
        detectedAt: '2026-03-24T08:00:00Z',
        incidentType: 'data_breach' as const,
        affectedSystems: ['api', 'database'],
        affectedUsers: 10,
        dataBreached: true,
      };
      const expected = mockIncident({ ...dto });
      prisma.securityIncident.create.mockResolvedValue(expected);

      await service.create(TENANT_ID, dto);

      expect(prisma.securityIncident.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          affectedSystems: ['api', 'database'],
          dataBreached: true,
        }),
      });
    });
  });

  // ─── getDashboard — branch for resolvedAt present/absent ───
  describe('getDashboard (resolvedAt branches)', () => {
    it('should calculate avgResolutionTimeHours when incident has both detectedAt and resolvedAt', async () => {
      prisma.securityIncident.findMany.mockResolvedValue([
        mockIncident({
          status: 'RESOLVED',
          detectedAt: new Date('2026-03-24T08:00:00Z'),
          resolvedAt: new Date('2026-03-24T14:00:00Z'),
        }),
      ]);

      const result = await service.getDashboard(TENANT_ID);

      expect(result.avgResolutionTimeHours).toBeCloseTo(6, 0);
    });

    it('should skip calculation when incident lacks resolvedAt', async () => {
      prisma.securityIncident.findMany.mockResolvedValue([
        mockIncident({
          status: 'INVESTIGATING',
          detectedAt: new Date('2026-03-24T08:00:00Z'),
          resolvedAt: null,
        }),
      ]);

      const result = await service.getDashboard(TENANT_ID);

      expect(result.avgResolutionTimeHours).toBeNull();
    });

    it('should handle multiple incidents with mixed resolution states', async () => {
      prisma.securityIncident.findMany.mockResolvedValue([
        mockIncident({
          status: 'RESOLVED',
          detectedAt: new Date('2026-03-24T08:00:00Z'),
          resolvedAt: new Date('2026-03-24T14:00:00Z'),
        }),
        mockIncident({
          status: 'INVESTIGATING',
          detectedAt: new Date('2026-03-25T10:00:00Z'),
          resolvedAt: null,
        }),
      ]);

      const result = await service.getDashboard(TENANT_ID);

      // Only first incident contributes to average
      expect(result.avgResolutionTimeHours).toBeCloseTo(6, 0);
    });
  });

  // ─── checkNis2Deadlines — empty incidents ───
  describe('checkNis2Deadlines (empty)', () => {
    it('should return empty array when no open incidents', async () => {
      prisma.securityIncident.findMany.mockResolvedValue([]);

      const alerts = await service.checkNis2Deadlines(TENANT_ID);

      expect(alerts).toHaveLength(0);
    });
  });

  // ─── getComplianceOverview — resolvedAt date math ───
  describe('getComplianceOverview (date calculations)', () => {
    it('should calculate avgResolutionTimeHours from multiple resolved incidents', async () => {
      prisma.user.findMany.mockResolvedValueOnce([]);
      prisma.securityIncident.count.mockResolvedValue(0);
      prisma.securityIncident.findMany
        .mockResolvedValueOnce([
          {
            detectedAt: new Date('2026-03-24T08:00:00Z'),
            resolvedAt: new Date('2026-03-24T14:00:00Z'), // 6 hours
          },
          {
            detectedAt: new Date('2026-03-25T10:00:00Z'),
            resolvedAt: new Date('2026-03-25T22:00:00Z'), // 12 hours
          },
        ]) // resolvedIncidents query
        .mockResolvedValueOnce([]); // checkNis2Deadlines query

      const result = await service.getComplianceOverview(TENANT_ID);

      // avg of 6 and 12 hours = 9 hours
      expect(result.avgResolutionTimeHours).toBeCloseTo(9, 0);
    });

    it('should handle single resolved incident for avgResolutionTimeHours', async () => {
      prisma.user.findMany.mockResolvedValueOnce([]);
      prisma.securityIncident.count.mockResolvedValue(0);
      prisma.securityIncident.findMany
        .mockResolvedValueOnce([
          {
            detectedAt: new Date('2026-03-24T08:00:00Z'),
            resolvedAt: new Date('2026-03-24T20:00:00Z'), // 12 hours
          },
        ]) // resolvedIncidents query
        .mockResolvedValueOnce([]); // checkNis2Deadlines query

      const result = await service.getComplianceOverview(TENANT_ID);

      expect(result.avgResolutionTimeHours).toBeCloseTo(12, 0);
    });
  });
});
