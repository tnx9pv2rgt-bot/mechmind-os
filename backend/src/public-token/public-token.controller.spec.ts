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

    it('should validate token and cast metadata to Record', async () => {
      const testRecord = {
        type: 'PAYMENT',
        entityId: 'inv-123',
        entityType: 'Invoice',
        metadata: { amount: 1500, currency: 'EUR' },
      };
      service.validateToken.mockResolvedValueOnce(testRecord as never);

      const result = await controller.resolveToken('token-inv-123');

      expect(result).toBeDefined();
      expect(result.type).toBe('PAYMENT');
      expect(result.entityId).toBe('inv-123');
      expect(result.entityType).toBe('Invoice');
      expect(result.metadata).toEqual({ amount: 1500, currency: 'EUR' });
      expect(service.validateToken).toHaveBeenCalledTimes(1);
      expect(service.validateToken).toHaveBeenCalledWith('token-inv-123');
    });

    it('should handle undefined metadata by casting to null', async () => {
      const recordWithoutMetadata = {
        type: 'ESTIMATE_APPROVAL',
        entityId: 'est-456',
        entityType: 'Estimate',
        metadata: undefined,
      };
      service.validateToken.mockResolvedValueOnce(recordWithoutMetadata as never);

      const result = await controller.resolveToken('token-est-456');

      expect(result.metadata).toBeUndefined();
      expect(service.validateToken).toHaveBeenCalledWith('token-est-456');
    });

    it('should preserve type, entityId, entityType through response mapping', async () => {
      const record = {
        id: 'uuid-map-test',
        tenantId: 'tenant-123',
        token: 'token-test',
        type: 'DVI_REPORT',
        entityId: 'dvi-789',
        entityType: 'Inspection',
        metadata: { reportId: 'RPT-001', status: 'pending' },
        expiresAt: new Date(),
        usedAt: null,
        createdAt: new Date(),
      };
      service.validateToken.mockResolvedValueOnce(record as never);

      const result = await controller.resolveToken('token-test');

      expect(result.type).toBe(record.type);
      expect(result.entityId).toBe(record.entityId);
      expect(result.entityType).toBe(record.entityType);
      expect(result.metadata).toBe(record.metadata);
      expect((result as any).id).toBeUndefined();
      expect((result as any).tenantId).toBeUndefined();
      expect((result as any).token).toBeUndefined();
      expect((result as any).expiresAt).toBeUndefined();
    });

    it('should delegate validation errors transparently', async () => {
      const errors = [
        new NotFoundException('Non trovato'),
        new BadRequestException('Token scaduto'),
        new BadRequestException('Token già utilizzato'),
      ];

      for (const error of errors) {
        service.validateToken.mockRejectedValueOnce(error);
        await expect(controller.resolveToken('bad-token')).rejects.toThrow(error.constructor);
        expect(service.validateToken).toHaveBeenCalled();
      }
    });

    it('should handle complex nested metadata structures', async () => {
      const complexMetadata = {
        nestedData: {
          level1: {
            level2: ['array', 'of', 'values'],
          },
        },
        timestamp: '2026-05-02T10:30:00Z',
        flags: { active: true, premium: false },
      };
      service.validateToken.mockResolvedValueOnce({
        type: 'ESTIMATE_APPROVAL',
        entityId: 'est-complex',
        entityType: 'Estimate',
        metadata: complexMetadata,
      } as never);

      const result = await controller.resolveToken('token-complex');

      expect(result.metadata).toEqual(complexMetadata);
      expect(typeof result.metadata).toBe('object');
      expect((result.metadata as any).nestedData.level1.level2).toEqual(['array', 'of', 'values']);
    });
  });
});
