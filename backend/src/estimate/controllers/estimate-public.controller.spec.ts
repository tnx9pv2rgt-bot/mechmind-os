import { Test, TestingModule } from '@nestjs/testing';
import { EstimatePublicController } from './estimate-public.controller';
import { EstimateService } from '../services/estimate.service';

describe('EstimatePublicController', () => {
  let controller: EstimatePublicController;
  let service: jest.Mocked<EstimateService>;

  const mockEstimate = {
    id: 'est-001',
    tenantId: 'tenant-001',
    status: 'SENT',
    total: 500,
    lines: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EstimatePublicController],
      providers: [
        {
          provide: EstimateService,
          useValue: {
            getByApprovalToken: jest.fn(),
            processApproval: jest.fn(),
            approveAll: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<EstimatePublicController>(EstimatePublicController);
    service = module.get(EstimateService) as jest.Mocked<EstimateService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getEstimateByToken', () => {
    it('should delegate to service with token and return estimate', async () => {
      service.getByApprovalToken.mockResolvedValue(mockEstimate as never);

      const result = await controller.getEstimateByToken('tok-abc');

      expect(service.getByApprovalToken).toHaveBeenCalledWith('tok-abc');
      expect(result).toEqual({ success: true, data: mockEstimate });
    });
  });

  describe('approveLines', () => {
    it('should delegate to service with token and approvals', async () => {
      const approved = { ...mockEstimate, status: 'PARTIALLY_APPROVED' };
      service.processApproval.mockResolvedValue(approved as never);
      const dto = {
        approvals: [
          { lineId: 'line-001', approved: true },
          { lineId: 'line-002', approved: false, reason: 'Troppo caro' },
        ],
        customerSignature: 'Mario Rossi',
        termsAccepted: true,
      };

      const result = await controller.approveLines('tok-abc', dto, '127.0.0.1');

      expect(service.processApproval).toHaveBeenCalledWith(
        'tok-abc',
        dto.approvals,
        'Mario Rossi',
        true,
        '127.0.0.1',
      );
      expect(result).toEqual({
        success: true,
        data: approved,
        message: 'Approvazione processata con successo',
      });
    });
  });

  describe('approveAll', () => {
    it('should delegate to service with token and signature', async () => {
      const approved = { ...mockEstimate, status: 'ACCEPTED' };
      service.approveAll.mockResolvedValue(approved as never);
      const dto = { customerSignature: 'Mario Rossi', termsAccepted: true };

      const result = await controller.approveAll('tok-abc', dto, '127.0.0.1');

      expect(service.approveAll).toHaveBeenCalledWith('tok-abc', 'Mario Rossi', true, '127.0.0.1');
      expect(result).toEqual({
        success: true,
        data: approved,
        message: 'Preventivo approvato completamente',
      });
    });
  });
});
