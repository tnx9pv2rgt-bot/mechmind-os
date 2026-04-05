import { Test, TestingModule } from '@nestjs/testing';
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
      service.validateToken.mockResolvedValue(mockTokenRecord as never);

      const result = await controller.resolveToken('tok-abc-123');

      expect(service.validateToken).toHaveBeenCalledWith('tok-abc-123');
      expect(result).toEqual({
        type: 'ESTIMATE_APPROVAL',
        entityId: 'est-001',
        entityType: 'estimate',
        metadata: { tenantId: 'tenant-001' },
      });
    });
  });
});
