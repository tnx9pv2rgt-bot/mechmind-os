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
  });
});
