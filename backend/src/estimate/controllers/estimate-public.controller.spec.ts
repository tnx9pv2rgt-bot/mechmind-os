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

    it('should pass correct parameters including IP address', async () => {
      const approved = { ...mockEstimate, status: 'ACCEPTED' };
      service.approveAll.mockResolvedValue(approved as never);
      const dto = { customerSignature: 'Anna Bianchi', termsAccepted: false };

      await controller.approveAll('tok-xyz', dto, '192.168.1.100');

      expect(service.approveAll).toHaveBeenCalledWith(
        'tok-xyz',
        'Anna Bianchi',
        false,
        '192.168.1.100',
      );
    });

    it('should handle service errors from approveAll', async () => {
      service.approveAll.mockRejectedValue(new Error('Token expired'));
      const dto = { customerSignature: 'Mario Rossi', termsAccepted: true };

      await expect(controller.approveAll('tok-abc', dto, '127.0.0.1')).rejects.toThrow(
        'Token expired',
      );
    });
  });

  describe('approveLines - error scenarios', () => {
    it('should propagate service errors on processApproval', async () => {
      service.processApproval.mockRejectedValue(new Error('Invalid line ID'));
      const dto = {
        approvals: [{ lineId: 'line-001', approved: true }],
        customerSignature: 'Mario Rossi',
        termsAccepted: true,
      };

      await expect(controller.approveLines('tok-abc', dto, '127.0.0.1')).rejects.toThrow(
        'Invalid line ID',
      );
    });

    it('should handle rejection without reason', async () => {
      const approved = { ...mockEstimate, status: 'PARTIALLY_APPROVED' };
      service.processApproval.mockResolvedValue(approved as never);
      const dto = {
        approvals: [{ lineId: 'line-001', approved: false }],
        customerSignature: 'Mario Rossi',
        termsAccepted: true,
      };

      const result = await controller.approveLines('tok-abc', dto, '127.0.0.1');

      expect(service.processApproval).toHaveBeenCalledWith(
        'tok-abc',
        [{ lineId: 'line-001', approved: false }],
        'Mario Rossi',
        true,
        '127.0.0.1',
      );
      expect(result.success).toBe(true);
    });

    it('should handle multiple line approvals with mixed decisions', async () => {
      const approved = { ...mockEstimate, status: 'PARTIALLY_APPROVED' };
      service.processApproval.mockResolvedValue(approved as never);
      const dto = {
        approvals: [
          { lineId: 'line-001', approved: true },
          { lineId: 'line-002', approved: true },
          { lineId: 'line-003', approved: false, reason: 'Non disponibile' },
        ],
        customerSignature: 'Luca Verdi',
        termsAccepted: true,
      };

      const result = await controller.approveLines('tok-def', dto, '10.0.0.1');

      expect(service.processApproval).toHaveBeenCalledWith(
        'tok-def',
        dto.approvals,
        'Luca Verdi',
        true,
        '10.0.0.1',
      );
      const resultData = result.data as typeof approved;
      expect(resultData.status).toBe('PARTIALLY_APPROVED');
    });
  });

  describe('getEstimateByToken - error scenarios', () => {
    it('should propagate service errors on getByApprovalToken', async () => {
      service.getByApprovalToken.mockRejectedValue(new Error('Token not found'));

      await expect(controller.getEstimateByToken('invalid-token')).rejects.toThrow(
        'Token not found',
      );
    });

    it('should handle valid token with estimate data', async () => {
      const estimateWithDetails = {
        id: 'est-002',
        tenantId: 'tenant-002',
        status: 'SENT',
        total: 1500,
        lines: [
          { id: 'l1', description: 'Service 1', amount: 1000 },
          { id: 'l2', description: 'Service 2', amount: 500 },
        ],
      };
      service.getByApprovalToken.mockResolvedValue(estimateWithDetails as never);

      const result = await controller.getEstimateByToken('tok-complex');

      expect(result).toEqual({ success: true, data: estimateWithDetails });
      const estimateData = result.data as typeof estimateWithDetails;
      expect(estimateData.lines.length).toBe(2);
    });
  });
});
