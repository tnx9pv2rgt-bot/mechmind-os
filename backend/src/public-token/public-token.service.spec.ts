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

    it('should only revoke unused tokens (usedAt must be null)', async () => {
      prisma.publicToken.updateMany.mockResolvedValue({ count: 2 });

      const count = await service.revokeTokensForEntity('tenant-1', 'Estimate', 'est-1');

      const callArgs = (prisma.publicToken.updateMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.usedAt).toBeNull();
      expect(count).toBe(2);
    });

    it('should filter by tenantId (cross-tenant isolation)', async () => {
      prisma.publicToken.updateMany.mockResolvedValue({ count: 0 });

      await service.revokeTokensForEntity('tenant-other', 'Estimate', 'est-1');

      const callArgs = (prisma.publicToken.updateMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.tenantId).toBe('tenant-other');
      expect(prisma.publicToken.updateMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge cases & error handling', () => {
    it('generateToken should set metadata to undefined when not provided', async () => {
      prisma.publicToken.create.mockResolvedValue({ id: 'uuid-4' });

      await service.generateToken(
        'tenant-1',
        PublicTokenType.PAYMENT,
        'inv-1',
        'Invoice',
        72,
        undefined,
      );

      expect(prisma.publicToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: undefined,
        }),
      });
    });

    it('generateToken should handle null metadata', async () => {
      prisma.publicToken.create.mockResolvedValue({ id: 'uuid-5' });

      await service.generateToken(
        'tenant-1',
        PublicTokenType.DVI_REPORT,
        'dvi-1',
        'Inspection',
        72,
        null,
      );

      expect(prisma.publicToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: undefined,
        }),
      });
    });

    it('validateToken should throw NotFoundException with correct message', async () => {
      prisma.publicToken.findUnique.mockResolvedValue(null);

      const error = await service.validateToken('missing').catch(e => e);
      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toContain('non trovato');
    });

    it('validateToken should throw BadRequestException for used token with correct message', async () => {
      prisma.publicToken.findUnique.mockResolvedValueOnce({
        id: 'uuid-1',
        token: 'used-token',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: new Date(),
      });

      const error = await service.validateToken('used-token').catch(e => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toContain('già utilizzato');
    });

    it('validateToken should throw BadRequestException for expired token with correct message', async () => {
      prisma.publicToken.findUnique.mockResolvedValueOnce({
        id: 'uuid-1',
        token: 'expired-token',
        expiresAt: new Date(Date.now() - 1000),
        usedAt: null,
      });

      const error = await service.validateToken('expired-token').catch(e => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toContain('scaduto');
    });

    it('consumeToken should propagate errors from validateToken', async () => {
      prisma.publicToken.findUnique.mockResolvedValueOnce(null);

      await expect(service.consumeToken('missing')).rejects.toThrow(NotFoundException);
    });

    it('consumeToken should call update with correct ID from validated record', async () => {
      const record = {
        id: 'uuid-specific-123',
        token: 'consume-token',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
      };
      prisma.publicToken.findUnique.mockResolvedValueOnce(record);
      prisma.publicToken.update.mockResolvedValueOnce({ ...record, usedAt: new Date() });

      await service.consumeToken('consume-token');

      expect(prisma.publicToken.update).toHaveBeenCalledWith({
        where: { id: 'uuid-specific-123' },
        data: { usedAt: expect.any(Date) },
      });
    });

    it('generateToken should include tenantId in create call (tenant isolation)', async () => {
      prisma.publicToken.create.mockResolvedValue({ id: 'uuid-6' });

      await service.generateToken(
        'tenant-specific-123',
        PublicTokenType.ESTIMATE_APPROVAL,
        'est-1',
        'Estimate',
      );

      expect(prisma.publicToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-specific-123',
        }),
      });
    });

    it('validateToken should not perform tenant filtering (public endpoint)', async () => {
      const record = {
        id: 'uuid-1',
        token: 'public-token',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
      };
      prisma.publicToken.findUnique.mockResolvedValueOnce(record);

      const result = await service.validateToken('public-token');

      expect(result).toEqual(record);
      expect(prisma.publicToken.findUnique).toHaveBeenCalledWith({
        where: { token: 'public-token' },
      });
      // Note: no tenantId in where clause for public validation (by design)
    });

    it('should handle Date comparisons correctly for expiry', async () => {
      const now = Date.now();
      const justExpired = new Date(now - 1);
      const stillValid = new Date(now + 3600000);

      prisma.publicToken.findUnique.mockResolvedValueOnce({
        id: 'uuid-1',
        token: 'boundary-token',
        expiresAt: justExpired,
        usedAt: null,
      });

      await expect(service.validateToken('boundary-token')).rejects.toThrow(BadRequestException);

      prisma.publicToken.findUnique.mockResolvedValueOnce({
        id: 'uuid-2',
        token: 'valid-token',
        expiresAt: stillValid,
        usedAt: null,
      });

      const valid = await service.validateToken('valid-token');
      expect(valid.expiresAt).toEqual(stillValid);
    });

    it('validateToken: happy path returns complete record', async () => {
      const fullRecord = {
        id: 'uuid-full',
        tenantId: 'tenant-1',
        token: 'valid-full',
        type: PublicTokenType.PAYMENT,
        entityId: 'inv-999',
        entityType: 'Invoice',
        expiresAt: new Date(Date.now() + 7200000),
        usedAt: null,
        metadata: { invoiceNumber: 'INV-2024-001' },
        createdAt: new Date(),
      };
      prisma.publicToken.findUnique.mockResolvedValueOnce(fullRecord);

      const result = await service.validateToken('valid-full');

      expect(result).toEqual(fullRecord);
      expect(result.usedAt).toBeNull();
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('generateToken: both metadata true and false branches', async () => {
      // Branch: metadata provided (truthy)
      prisma.publicToken.create.mockResolvedValueOnce({ id: 'uuid-7' });
      await service.generateToken(
        'tenant-1',
        PublicTokenType.ESTIMATE_APPROVAL,
        'est-1',
        'Estimate',
        72,
        { custom: 'metadata' },
      );

      const callWithMetadata = (prisma.publicToken.create as jest.Mock).mock.calls.slice(-1)[0][0];
      expect(callWithMetadata.data.metadata).toEqual({ custom: 'metadata' });

      // Branch: metadata falsy (null, undefined)
      prisma.publicToken.create.mockResolvedValueOnce({ id: 'uuid-8' });
      await service.generateToken('tenant-1', PublicTokenType.PAYMENT, 'inv-1', 'Invoice');

      const callWithoutMetadata = (prisma.publicToken.create as jest.Mock).mock.calls.slice(
        -1,
      )[0][0];
      expect(callWithoutMetadata.data.metadata).toBeUndefined();
    });

    it('validateToken: true/false path for usedAt null check', async () => {
      // usedAt is NOT null (branch true)
      prisma.publicToken.findUnique.mockResolvedValueOnce({
        id: 'uuid-used',
        token: 'used',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: new Date(),
      });

      await expect(service.validateToken('used')).rejects.toThrow(BadRequestException);

      // usedAt IS null (branch false - happy path)
      prisma.publicToken.findUnique.mockResolvedValueOnce({
        id: 'uuid-fresh',
        token: 'fresh',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
      });

      const result = await service.validateToken('fresh');
      expect(result.usedAt).toBeNull();
    });

    it('validateToken: true/false path for expiresAt comparison', async () => {
      const past = new Date(Date.now() - 10000);
      const future = new Date(Date.now() + 10000);

      // expiresAt < now (branch true - expired)
      prisma.publicToken.findUnique.mockResolvedValueOnce({
        id: 'uuid-past',
        token: 'past',
        expiresAt: past,
        usedAt: null,
      });

      await expect(service.validateToken('past')).rejects.toThrow(BadRequestException);

      // expiresAt >= now (branch false - valid)
      prisma.publicToken.findUnique.mockResolvedValueOnce({
        id: 'uuid-future',
        token: 'future',
        expiresAt: future,
        usedAt: null,
      });

      const result = await service.validateToken('future');
      expect(result.expiresAt).toEqual(future);
    });

    it('validateToken: true/false path for record existence', async () => {
      // record is null (branch true - not found)
      prisma.publicToken.findUnique.mockResolvedValueOnce(null);

      await expect(service.validateToken('missing')).rejects.toThrow(NotFoundException);

      // record exists (branch false - found)
      const foundRecord = {
        id: 'uuid-found',
        token: 'found',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
      };
      prisma.publicToken.findUnique.mockResolvedValueOnce(foundRecord);

      const result = await service.validateToken('found');
      expect(result).toEqual(foundRecord);
    });

    it('consumeToken: calls validateToken then update', async () => {
      const validRecord = {
        id: 'uuid-seq',
        token: 'sequence-test',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
      };
      prisma.publicToken.findUnique.mockResolvedValueOnce(validRecord);
      prisma.publicToken.update.mockResolvedValueOnce({ ...validRecord, usedAt: new Date() });

      await service.consumeToken('sequence-test');

      // Verify both operations were called
      expect(prisma.publicToken.findUnique).toHaveBeenCalledTimes(1);
      expect(prisma.publicToken.update).toHaveBeenCalledTimes(1);
    });

    it('revokeTokensForEntity: verifies all where clause components', async () => {
      prisma.publicToken.updateMany.mockResolvedValueOnce({ count: 5 });

      await service.revokeTokensForEntity('tenant-X', 'WorkOrder', 'wo-123');

      const whereClause = (prisma.publicToken.updateMany as jest.Mock).mock.calls[0][0].where;
      expect(whereClause).toEqual({
        tenantId: 'tenant-X',
        entityType: 'WorkOrder',
        entityId: 'wo-123',
        usedAt: null,
      });
      expect(whereClause.usedAt).toBeNull();
      expect(whereClause.tenantId).toBeDefined();
      expect(whereClause.entityType).toBeDefined();
      expect(whereClause.entityId).toBeDefined();
    });
  });
});
