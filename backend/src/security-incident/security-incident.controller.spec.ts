import { Test, TestingModule } from '@nestjs/testing';
import { SecurityIncidentController } from './security-incident.controller';
import { SecurityIncidentService } from './security-incident.service';

const TENANT_ID = 'tenant-uuid-001';
const USER_ID = 'user-uuid-001';

const mockService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  updateStatus: jest.fn(),
  getDashboard: jest.fn(),
  getComplianceOverview: jest.fn(),
};

describe('SecurityIncidentController', () => {
  let controller: SecurityIncidentController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SecurityIncidentController],
      providers: [{ provide: SecurityIncidentService, useValue: mockService }],
    }).compile();

    controller = module.get(SecurityIncidentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── GET / (findAll) ───
  describe('findAll', () => {
    it('should return paginated incidents', async () => {
      const expected = { data: [], total: 0, page: 1, limit: 20 };
      mockService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(TENANT_ID, {});

      expect(mockService.findAll).toHaveBeenCalledWith(TENANT_ID, {});
      expect(result).toEqual(expected);
    });
  });

  // ─── GET /:id (findOne) ───
  describe('findOne', () => {
    it('should return single incident', async () => {
      const expected = { id: 'inc-001', title: 'Test' };
      mockService.findOne.mockResolvedValue(expected);

      const result = await controller.findOne(TENANT_ID, 'inc-001');

      expect(mockService.findOne).toHaveBeenCalledWith(TENANT_ID, 'inc-001');
      expect(result).toEqual(expected);
    });
  });

  // ─── POST / (create) ───
  describe('create', () => {
    it('should create incident with tenantId and userId', async () => {
      const dto = {
        title: 'Brute force',
        description: 'Attack detected',
        severity: 'HIGH' as const,
        detectedAt: '2026-03-24T08:00:00Z',
        incidentType: 'unauthorized_access' as const,
      };
      const expected = { id: 'inc-new', ...dto };
      mockService.create.mockResolvedValue(expected);

      const result = await controller.create(TENANT_ID, USER_ID, dto);

      expect(mockService.create).toHaveBeenCalledWith(TENANT_ID, dto, USER_ID);
      expect(result).toEqual(expected);
    });
  });

  // ─── PATCH /:id (update) ───
  describe('update', () => {
    it('should update incident', async () => {
      const dto = { title: 'Updated title' };
      mockService.update.mockResolvedValue({ id: 'inc-001', ...dto });

      const result = await controller.update(TENANT_ID, 'inc-001', dto);

      expect(mockService.update).toHaveBeenCalledWith(TENANT_ID, 'inc-001', dto);
      expect(result.title).toBe('Updated title');
    });
  });

  // ─── PATCH /:id/status (updateStatus) ───
  describe('updateStatus', () => {
    it('should transition status', async () => {
      const dto = { status: 'INVESTIGATING' as const };
      mockService.updateStatus.mockResolvedValue({ id: 'inc-001', status: 'INVESTIGATING' });

      const result = await controller.updateStatus(TENANT_ID, 'inc-001', dto);

      expect(mockService.updateStatus).toHaveBeenCalledWith(TENANT_ID, 'inc-001', dto);
      expect(result.status).toBe('INVESTIGATING');
    });
  });

  // ─── GET /dashboard ───
  describe('getDashboard', () => {
    it('should return dashboard stats', async () => {
      const expected = {
        total: 5,
        bySeverity: { LOW: 1, MEDIUM: 2, HIGH: 1, CRITICAL: 1 },
        byStatus: {},
        avgResolutionTimeHours: 24,
        nis2Alerts: [],
      };
      mockService.getDashboard.mockResolvedValue(expected);

      const result = await controller.getDashboard(TENANT_ID);

      expect(mockService.getDashboard).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual(expected);
    });
  });

  // ─── GET /compliance ───
  describe('getCompliance', () => {
    it('should return compliance overview', async () => {
      const expected = {
        mfaEnabledForAdmins: true,
        encryptionAtRest: true,
        auditLogging: true,
        incidentResponsePlanActive: false,
        openIncidents: 0,
        avgResolutionTimeHours: null,
        nis2DeadlineAlerts: [],
        complianceScore: 100,
      };
      mockService.getComplianceOverview.mockResolvedValue(expected);

      const result = await controller.getCompliance(TENANT_ID);

      expect(mockService.getComplianceOverview).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual(expected);
    });
  });
});
