import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PublicTokenController } from './public-token.controller';
import { PublicTokenService } from './public-token.service';

describe('PublicTokenController', () => {
  let controller: PublicTokenController;
  let service: jest.Mocked<PublicTokenService>;

  const mockTokenRecord = {
    type: 'ESTIMATE_APPROVAL',
    entityId: 'est-001',
    entityType: 'estimate',
    metadata: { tenantId: 'tenant-001' },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicTokenController],
      providers: [
        {
          provide: PublicTokenService,
          useValue: {
            validateToken: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PublicTokenController>(PublicTokenController);
    service = module.get(PublicTokenService) as jest.Mocked<PublicTokenService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('resolveToken', () => {
    it('should delegate to service and return resolved token data', async () => {
      service.validateToken.mockResolvedValueOnce(mockTokenRecord as never);

      const result = await controller.resolveToken('tok-abc-123');

      expect(service.validateToken).toHaveBeenCalledWith('tok-abc-123');
      expect(result).toEqual({
        type: 'ESTIMATE_APPROVAL',
        entityId: 'est-001',
        entityType: 'estimate',
        metadata: { tenantId: 'tenant-001' },
      });
    });

    it('should transform metadata to Record type when casting as unknown', async () => {
      service.validateToken.mockResolvedValueOnce({
        type: 'PAYMENT',
        entityId: 'inv-001',
        entityType: 'Invoice',
        metadata: { invoiceNumber: 'INV-2024-001', amount: 1000 },
      } as never);

      const result = await controller.resolveToken('token-payment-001');

      expect(result.metadata).toEqual({ invoiceNumber: 'INV-2024-001', amount: 1000 });
      expect(typeof result.metadata).toBe('object');
    });

    it('should handle null metadata gracefully', async () => {
      service.validateToken.mockResolvedValueOnce({
        type: 'DVI_REPORT',
        entityId: 'dvi-001',
        entityType: 'Inspection',
        metadata: null,
      } as never);

      const result = await controller.resolveToken('token-dvi-001');

      expect(result.metadata).toBeNull();
    });

    it('should propagate NotFoundException when token not found', async () => {
      service.validateToken.mockRejectedValueOnce(new NotFoundException('Token non trovato'));

      await expect(controller.resolveToken('invalid-token')).rejects.toThrow(NotFoundException);
      expect(service.validateToken).toHaveBeenCalledWith('invalid-token');
    });

    it('should propagate BadRequestException when token expired', async () => {
      service.validateToken.mockRejectedValueOnce(new BadRequestException('Token scaduto'));

      await expect(controller.resolveToken('expired-token')).rejects.toThrow(BadRequestException);
      expect(service.validateToken).toHaveBeenCalledWith('expired-token');
    });

    it('should propagate BadRequestException when token already used', async () => {
      service.validateToken.mockRejectedValueOnce(new BadRequestException('Token già utilizzato'));

      await expect(controller.resolveToken('used-token')).rejects.toThrow(BadRequestException);
      expect(service.validateToken).toHaveBeenCalledWith('used-token');
    });

    it('should preserve all token fields in response DTO', async () => {
      const fullRecord = {
        type: 'ESTIMATE_APPROVAL',
        entityId: 'est-full-123',
        entityType: 'Estimate',
        metadata: { estimateNumber: 'EST-2024-001', stage: 'approval' },
      };
      service.validateToken.mockResolvedValueOnce(fullRecord as never);

      const result = await controller.resolveToken('token-full');

      expect(result.type).toBe('ESTIMATE_APPROVAL');
      expect(result.entityId).toBe('est-full-123');
      expect(result.entityType).toBe('Estimate');
      expect(result.metadata).toEqual({ estimateNumber: 'EST-2024-001', stage: 'approval' });
    });

    it('should call validateToken exactly once per request', async () => {
      service.validateToken.mockResolvedValueOnce(mockTokenRecord as never);

      await controller.resolveToken('single-call-token');

      expect(service.validateToken).toHaveBeenCalledTimes(1);
      expect(service.validateToken).toHaveBeenCalledWith('single-call-token');
    });

    it('should handle token parameter variations (special chars, long strings)', async () => {
      const specialToken = 'abc123-xyz789_ABC.XYZ/test+special=';
      service.validateToken.mockResolvedValueOnce(mockTokenRecord as never);

      await controller.resolveToken(specialToken);

      expect(service.validateToken).toHaveBeenCalledWith(specialToken);
    });

    it('should return exact response DTO structure', async () => {
      service.validateToken.mockResolvedValueOnce(mockTokenRecord as never);

      const result = await controller.resolveToken('dto-test');

      expect(Object.keys(result).sort()).toEqual(
        ['type', 'entityId', 'entityType', 'metadata'].sort(),
      );
    });
  });
});
