import { Test, TestingModule } from '@nestjs/testing';
import { InspectionPublicController } from './inspection-public.controller';
import { InspectionService } from '../services/inspection.service';

describe('InspectionPublicController', () => {
  let controller: InspectionPublicController;
  let service: jest.Mocked<InspectionService>;

  const mockInspection = {
    id: 'insp-001',
    tenantId: 'tenant-001',
    vehicleId: 'veh-001',
    status: 'COMPLETED',
    findings: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InspectionPublicController],
      providers: [
        {
          provide: InspectionService,
          useValue: {
            getByPublicToken: jest.fn(),
            approveRepairsViaToken: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<InspectionPublicController>(InspectionPublicController);
    service = module.get(InspectionService) as jest.Mocked<InspectionService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getInspectionByToken', () => {
    it('should delegate to service with token and return inspection', async () => {
      service.getByPublicToken.mockResolvedValue(mockInspection as never);

      const result = await controller.getInspectionByToken('tok-abc');

      expect(service.getByPublicToken).toHaveBeenCalledWith('tok-abc');
      expect(result).toEqual({ success: true, data: mockInspection });
    });
  });

  describe('approveRepairs', () => {
    it('should delegate to service with token and finding IDs', async () => {
      service.approveRepairsViaToken.mockResolvedValue(undefined as never);
      const dto = {
        approvedFindingIds: ['find-001', 'find-002'],
        declinedFindingIds: ['find-003'],
      };

      const result = await controller.approveRepairs('tok-abc', dto);

      expect(service.approveRepairsViaToken).toHaveBeenCalledWith(
        'tok-abc',
        ['find-001', 'find-002'],
        ['find-003'],
      );
      expect(result).toEqual({
        success: true,
        message: 'Riparazioni approvate con successo',
      });
    });
  });
});
