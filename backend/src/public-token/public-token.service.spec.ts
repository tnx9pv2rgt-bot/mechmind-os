import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PublicTokenService } from './public-token.service';
import { PrismaService } from '@common/services/prisma.service';
import { PublicTokenType } from '@prisma/client';

describe('PublicTokenService', () => {
  let service: PublicTokenService;
  let prisma: {
    publicToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      publicToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PublicTokenService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<PublicTokenService>(PublicTokenService);
  });

  describe('generateToken', () => {
    it('should create a token with default 72h expiry', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const created = {
        id: 'uuid-1',
        tenantId: 'tenant-1',
        token: 'abc123',
        type: PublicTokenType.ESTIMATE_APPROVAL,
        entityId: 'est-1',
        entityType: 'Estimate',
        expiresAt: new Date(now + 72 * 60 * 60 * 1000),
        usedAt: null,
        metadata: null,
        createdAt: new Date(now),
      };
      prisma.publicToken.create.mockResolvedValue(created);

      const result = await service.generateToken(
        'tenant-1',
        PublicTokenType.ESTIMATE_APPROVAL,
        'est-1',
        'Estimate',
      );

      expect(prisma.publicToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          type: PublicTokenType.ESTIMATE_APPROVAL,
          entityId: 'est-1',
          entityType: 'Estimate',
          expiresAt: new Date(now + 72 * 60 * 60 * 1000),
        }),
      });
      expect(result).toEqual(created);

      jest.restoreAllMocks();
    });

    it('should create a token with custom expiry', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      prisma.publicToken.create.mockResolvedValue({ id: 'uuid-2' });

      await service.generateToken('tenant-1', PublicTokenType.PAYMENT, 'inv-1', 'Invoice', 24);

      expect(prisma.publicToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expiresAt: new Date(now + 24 * 60 * 60 * 1000),
        }),
      });

      jest.restoreAllMocks();
    });

    it('should store metadata when provided', async () => {
      prisma.publicToken.create.mockResolvedValue({ id: 'uuid-3' });

      await service.generateToken(
        'tenant-1',
        PublicTokenType.DVI_REPORT,
        'dvi-1',
        'Inspection',
        72,
        { reportUrl: '/reports/dvi-1' },
      );

      expect(prisma.publicToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: { reportUrl: '/reports/dvi-1' },
        }),
      });
    });
  });

  describe('validateToken', () => {
    it('should return a valid token record', async () => {
      const record = {
        id: 'uuid-1',
        token: 'valid-token',
        type: PublicTokenType.ESTIMATE_APPROVAL,
        entityId: 'est-1',
        entityType: 'Estimate',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
        metadata: null,
      };
      prisma.publicToken.findUnique.mockResolvedValue(record);

      const result = await service.validateToken('valid-token');
      expect(result).toEqual(record);
      expect(prisma.publicToken.findUnique).toHaveBeenCalledWith({
        where: { token: 'valid-token' },
      });
    });

    it('should throw NotFoundException for unknown token', async () => {
      prisma.publicToken.findUnique.mockResolvedValue(null);

      await expect(service.validateToken('unknown')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for already used token', async () => {
      prisma.publicToken.findUnique.mockResolvedValue({
        id: 'uuid-1',
        token: 'used-token',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: new Date(),
      });

      await expect(service.validateToken('used-token')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for expired token', async () => {
      prisma.publicToken.findUnique.mockResolvedValue({
        id: 'uuid-1',
        token: 'expired-token',
        expiresAt: new Date(Date.now() - 1000),
        usedAt: null,
      });

      await expect(service.validateToken('expired-token')).rejects.toThrow(BadRequestException);
    });
  });

  describe('consumeToken', () => {
    it('should mark a valid token as used', async () => {
      const record = {
        id: 'uuid-1',
        token: 'consume-me',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
      };
      prisma.publicToken.findUnique.mockResolvedValue(record);

      const updated = { ...record, usedAt: new Date() };
      prisma.publicToken.update.mockResolvedValue(updated);

      const result = await service.consumeToken('consume-me');

      expect(prisma.publicToken.update).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        data: { usedAt: expect.any(Date) },
      });
      expect(result.usedAt).toBeDefined();
    });

    it('should throw if token is already used', async () => {
      prisma.publicToken.findUnique.mockResolvedValue({
        id: 'uuid-1',
        token: 'already-used',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: new Date(),
      });

      await expect(service.consumeToken('already-used')).rejects.toThrow(BadRequestException);
    });
  });

  describe('revokeTokensForEntity', () => {
    it('should revoke all unused tokens for an entity', async () => {
      prisma.publicToken.updateMany.mockResolvedValue({ count: 3 });

      const count = await service.revokeTokensForEntity('tenant-1', 'Estimate', 'est-1');

      expect(count).toBe(3);
      expect(prisma.publicToken.updateMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-1',
          entityType: 'Estimate',
          entityId: 'est-1',
          usedAt: null,
        },
        data: { usedAt: expect.any(Date) },
      });
    });

    it('should return 0 when no tokens exist', async () => {
      prisma.publicToken.updateMany.mockResolvedValue({ count: 0 });

      const count = await service.revokeTokensForEntity('tenant-1', 'Invoice', 'inv-999');

      expect(count).toBe(0);
    });
  });
});
