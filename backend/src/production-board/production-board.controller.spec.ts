import { Test, TestingModule } from '@nestjs/testing';
import { ProductionBoardController } from './production-board.controller';
import { ProductionBoardService } from './production-board.service';

describe('ProductionBoardController', () => {
  let controller: ProductionBoardController;
  let service: jest.Mocked<ProductionBoardService>;

  const TENANT_ID = 'tenant-001';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductionBoardController],
      providers: [
        {
          provide: ProductionBoardService,
          useValue: {
            getBoardState: jest.fn(),
            assignToBay: jest.fn(),
            moveJob: jest.fn(),
            updateJobStatus: jest.fn(),
            getUnassignedJobs: jest.fn(),
            getTodayKpis: jest.fn(),
            getTvPayload: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProductionBoardController>(ProductionBoardController);
    service = module.get(ProductionBoardService) as jest.Mocked<ProductionBoardService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getBoardState', () => {
    it('should delegate to service with tenantId', async () => {
      const bays = [{ id: 'bay-001', workOrder: null }];
      service.getBoardState.mockResolvedValue(bays as never);

      const result = await controller.getBoardState(TENANT_ID);

      expect(service.getBoardState).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual({ success: true, data: bays });
    });
  });

  describe('assignToBay', () => {
    it('should delegate to service with dto and tenantId', async () => {
      const assigned = { bayId: 'bay-001', workOrderId: 'wo-001' };
      service.assignToBay.mockResolvedValue(assigned as never);
      const dto = { bayId: 'bay-001', workOrderId: 'wo-001' };

      const result = await controller.assignToBay(TENANT_ID, dto as never);

      expect(service.assignToBay).toHaveBeenCalledWith(dto, TENANT_ID);
      expect(result).toEqual({ success: true, data: assigned });
    });
  });

  describe('moveJob', () => {
    it('should delegate to service with dto and tenantId', async () => {
      const moved = { fromBay: 'bay-001', toBay: 'bay-002' };
      service.moveJob.mockResolvedValue(moved as never);
      const dto = { workOrderId: 'wo-001', fromBayId: 'bay-001', toBayId: 'bay-002' };

      const result = await controller.moveJob(TENANT_ID, dto as never);

      expect(service.moveJob).toHaveBeenCalledWith(dto, TENANT_ID);
      expect(result).toEqual({ success: true, data: moved });
    });
  });

  describe('updateJobStatus', () => {
    it('should delegate to service with id, status, and tenantId', async () => {
      const updated = { id: 'wo-001', status: 'IN_PROGRESS' };
      service.updateJobStatus.mockResolvedValue(updated as never);

      const result = await controller.updateJobStatus(TENANT_ID, 'wo-001', {
        status: 'IN_PROGRESS',
      } as never);

      expect(service.updateJobStatus).toHaveBeenCalledWith('wo-001', 'IN_PROGRESS', TENANT_ID);
      expect(result).toEqual({ success: true, data: updated });
    });
  });

  describe('getUnassignedJobs', () => {
    it('should delegate to service with tenantId', async () => {
      const jobs = [{ id: 'wo-002' }];
      service.getUnassignedJobs.mockResolvedValue(jobs as never);

      const result = await controller.getUnassignedJobs(TENANT_ID);

      expect(service.getUnassignedJobs).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual({ success: true, data: jobs });
    });
  });

  describe('getTodayKpis', () => {
    it('should delegate to service with tenantId', async () => {
      const kpis = { completed: 5, inProgress: 3, avgCycleTime: 120 };
      service.getTodayKpis.mockResolvedValue(kpis as never);

      const result = await controller.getTodayKpis(TENANT_ID);

      expect(service.getTodayKpis).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual({ success: true, data: kpis });
    });
  });

  describe('getTvPayload', () => {
    it('should delegate to service with tenantId', async () => {
      const payload = { bays: [], ticker: [] };
      service.getTvPayload.mockResolvedValue(payload as never);

      const result = await controller.getTvPayload(TENANT_ID);

      expect(service.getTvPayload).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual({ success: true, data: payload });
    });
  });
});
