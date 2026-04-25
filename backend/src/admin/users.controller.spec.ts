import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { PrismaService } from '@common/services/prisma.service';
import { UserRole } from '@prisma/client';

describe('UsersController', () => {
  let controller: UsersController;
  let prisma: {
    user: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  const mockReq = {
    user: { userId: 'user-1', tenantId: 'tenant-1', email: 'test@test.com', role: 'ADMIN' },
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all users for tenant', async () => {
      const users = [{ id: 'u1', email: 'a@b.com', name: 'Test', role: UserRole.ADMIN }];
      prisma.user.findMany.mockResolvedValue(users);
      prisma.user.count.mockResolvedValue(1);

      const result = await controller.findAll(mockReq);

      expect(result).toEqual({ success: true, data: users, total: 1 });
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1', deletedAt: null },
        }),
      );
    });

    it('should filter by role when provided', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await controller.findAll(mockReq, 'MECHANIC');

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1', deletedAt: null, role: 'MECHANIC' },
        }),
      );
    });

    it('should ignore invalid role filter', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await controller.findAll(mockReq, 'INVALID_ROLE');

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1', deletedAt: null },
        }),
      );
    });

    // ========================================================================
    // ENHANCED TESTS FOR BRANCH COVERAGE — RBAC AUDIT TRAIL
    // ========================================================================

    it('should enforce tenant isolation in findAll', async () => {
      const otherTenantReq = {
        user: { userId: 'user-2', tenantId: 'tenant-2', email: 'other@test.com', role: 'ADMIN' },
      };
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await controller.findAll(otherTenantReq);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-2', deletedAt: null },
        }),
      );
    });

    it('should exclude soft-deleted users', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await controller.findAll(mockReq);

      const where = prisma.user.findMany.mock.calls[0][0].where;
      expect(where.deletedAt).toBe(null);
    });

    it('should handle multiple valid roles', async () => {
      const validRoles = ['ADMIN', 'MANAGER', 'MECHANIC', 'RECEPTIONIST', 'VIEWER'];

      for (const role of validRoles) {
        prisma.user.findMany.mockClear();
        prisma.user.count.mockClear();
        prisma.user.findMany.mockResolvedValue([]);
        prisma.user.count.mockResolvedValue(0);

        await controller.findAll(mockReq, role);

        expect(prisma.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ role }),
          }),
        );
      }
    });

    it('should handle pagination with default values', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await controller.findAll(mockReq, undefined, '2', '20');

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 20,
        }),
      );
    });

    it('should clamp limit to max 100', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await controller.findAll(mockReq, undefined, '1', '500');

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      );
    });

    it('should handle page 0 as page 1', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await controller.findAll(mockReq, undefined, '0', '25');

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
        }),
      );
    });

    it('should return success=true', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      const result = await controller.findAll(mockReq);

      expect(result.success).toBe(true);
    });

    it('should order by createdAt descending', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await controller.findAll(mockReq);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      const user = { id: 'u1', email: 'a@b.com', name: 'Test', role: UserRole.ADMIN };
      prisma.user.findFirst.mockResolvedValue(user);

      const result = await controller.findOne(mockReq, 'u1');

      expect(result).toEqual({ success: true, data: user });
      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u1', tenantId: 'tenant-1', deletedAt: null },
        }),
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(controller.findOne(mockReq, 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    // ========================================================================
    // ENHANCED TESTS FOR BRANCH COVERAGE — RBAC AUDIT TRAIL (findOne)
    // ========================================================================

    it('should enforce tenant isolation in findOne', async () => {
      const otherTenantReq = {
        user: { userId: 'user-2', tenantId: 'tenant-2', email: 'other@test.com', role: 'ADMIN' },
      };
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(controller.findOne(otherTenantReq, 'u1')).rejects.toThrow(NotFoundException);

      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u1', tenantId: 'tenant-2', deletedAt: null },
        }),
      );
    });

    it('should exclude soft-deleted users in findOne', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(controller.findOne(mockReq, 'u1')).rejects.toThrow(NotFoundException);

      const where = prisma.user.findFirst.mock.calls[0][0].where;
      expect(where.deletedAt).toBe(null);
    });

    it('should select all relevant user fields', async () => {
      const user = { id: 'u1', email: 'a@b.com', name: 'Test' };
      prisma.user.findFirst.mockResolvedValue(user);

      await controller.findOne(mockReq, 'u1');

      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('should update a user successfully', async () => {
      const existing = { id: 'u1', tenantId: 'tenant-1' };
      const updated = {
        id: 'u1',
        email: 'a@b.com',
        name: 'Updated',
        role: UserRole.MANAGER,
        isActive: true,
      };
      prisma.user.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(updated);
      prisma.user.updateMany.mockResolvedValue({ count: 1 });

      const result = await controller.update(mockReq, 'u1', {
        name: 'Updated',
        role: UserRole.MANAGER,
      });

      expect(result).toEqual({ success: true, data: updated });
      expect(prisma.user.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u1', tenantId: 'tenant-1' },
          data: { name: 'Updated', role: UserRole.MANAGER },
        }),
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(controller.update(mockReq, 'nonexistent', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for invalid role', async () => {
      const existing = { id: 'u1', tenantId: 'tenant-1' };
      prisma.user.findFirst.mockResolvedValue(existing);

      await expect(
        controller.update(mockReq, 'u1', { role: 'INVALID' as UserRole }),
      ).rejects.toThrow(BadRequestException);
    });

    // ========================================================================
    // ENHANCED TESTS FOR BRANCH COVERAGE — RBAC AUDIT TRAIL (update)
    // ========================================================================

    it('should enforce tenant isolation in update', async () => {
      const otherTenantReq = {
        user: { userId: 'user-2', tenantId: 'tenant-2', email: 'other@test.com', role: 'ADMIN' },
      };
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(controller.update(otherTenantReq, 'u1', { name: 'Hacker' })).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'u1', tenantId: 'tenant-2' }),
        }),
      );
    });

    it('should update only provided fields', async () => {
      const existing = { id: 'u1', tenantId: 'tenant-1' };
      const updated = { id: 'u1', name: 'NewName', email: 'old@test.com' };
      prisma.user.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(updated);
      prisma.user.updateMany.mockResolvedValue({ count: 1 });

      await controller.update(mockReq, 'u1', { name: 'NewName' });

      expect(prisma.user.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { name: 'NewName' },
        }),
      );
    });

    it('should accept all valid roles for update', async () => {
      const validRoles = ['ADMIN', 'MANAGER', 'MECHANIC', 'RECEPTIONIST', 'VIEWER'];
      const existing = { id: 'u1', tenantId: 'tenant-1' };

      for (const role of validRoles) {
        prisma.user.findFirst.mockClear();
        prisma.user.updateMany.mockClear();
        prisma.user.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce({});
        prisma.user.updateMany.mockResolvedValue({ count: 1 });

        await controller.update(mockReq, 'u1', { role: role as UserRole });

        expect(prisma.user.updateMany).toHaveBeenCalledWith(
          expect.objectContaining({
            data: { role },
          }),
        );
      }
    });

    it('should return success=true on update', async () => {
      const existing = { id: 'u1', tenantId: 'tenant-1' };
      prisma.user.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce({});
      prisma.user.updateMany.mockResolvedValue({ count: 1 });

      const result = await controller.update(mockReq, 'u1', { name: 'X' });

      expect(result.success).toBe(true);
    });
  });

  describe('remove', () => {
    it('should soft-delete a user', async () => {
      const existing = { id: 'u2', tenantId: 'tenant-1' };
      prisma.user.findFirst.mockResolvedValue(existing);
      prisma.user.updateMany.mockResolvedValue({ count: 1 });

      const result = await controller.remove(mockReq, 'u2');

      expect(result).toEqual({ success: true });
      expect(prisma.user.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u2', tenantId: 'tenant-1' },
          data: expect.objectContaining({ isActive: false }),
        }),
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(controller.remove(mockReq, 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when deleting self', async () => {
      const existing = { id: 'user-1', tenantId: 'tenant-1' };
      prisma.user.findFirst.mockResolvedValue(existing);

      await expect(controller.remove(mockReq, 'user-1')).rejects.toThrow(BadRequestException);
    });

    // ========================================================================
    // ENHANCED TESTS FOR BRANCH COVERAGE — RBAC AUDIT TRAIL (remove)
    // ========================================================================

    it('should enforce tenant isolation in remove', async () => {
      const otherTenantReq = {
        user: { userId: 'user-2', tenantId: 'tenant-2', email: 'other@test.com', role: 'ADMIN' },
      };
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(controller.remove(otherTenantReq, 'u1')).rejects.toThrow(NotFoundException);

      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'u1', tenantId: 'tenant-2' }),
        }),
      );
    });

    it('should set isActive=false on delete', async () => {
      const existing = { id: 'u3', tenantId: 'tenant-1' };
      prisma.user.findFirst.mockResolvedValue(existing);
      prisma.user.updateMany.mockResolvedValue({ count: 1 });

      await controller.remove(mockReq, 'u3');

      expect(prisma.user.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: false }),
        }),
      );
    });

    it('should return success=true on remove', async () => {
      const existing = { id: 'u4', tenantId: 'tenant-1' };
      prisma.user.findFirst.mockResolvedValue(existing);
      prisma.user.updateMany.mockResolvedValue({ count: 1 });

      const result = await controller.remove(mockReq, 'u4');

      expect(result.success).toBe(true);
    });

    it('should use updateMany with tenantId scoping', async () => {
      const existing = { id: 'u5', tenantId: 'tenant-1' };
      prisma.user.findFirst.mockResolvedValue(existing);
      prisma.user.updateMany.mockResolvedValue({ count: 1 });

      await controller.remove(mockReq, 'u5');

      expect(prisma.user.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u5', tenantId: 'tenant-1' },
        }),
      );
    });
  });
});
