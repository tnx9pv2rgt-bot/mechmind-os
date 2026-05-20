import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { PrismaService } from '@common/services/prisma.service';
import { UserRole } from '@prisma/client';

const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
  },
};

const mockReq = (userId = 'user-001', tenantId = 'tenant-001') => ({
  user: { userId, tenantId, email: 'admin@demo.mechmind.it', role: 'ADMIN' },
});

const mockUser = {
  id: 'user-001',
  email: 'admin@demo.mechmind.it',
  name: 'Admin User',
  role: UserRole.ADMIN,
  isActive: true,
  avatar: null,
  lastLoginAt: new Date(),
  createdAt: new Date(),
};

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPrisma.user.findFirst.mockResolvedValue(mockUser);
    mockPrisma.user.findMany.mockResolvedValue([mockUser]);
    mockPrisma.user.count.mockResolvedValue(1);
    mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    controller = module.get(UsersController);
  });

  describe('findAll', () => {
    it('should return paginated users with total count', async () => {
      const result = await controller.findAll(mockReq());

      expect(result.success).toBe(true);
      expect(result.total).toBe(1);
      expect(mockPrisma.user.findMany).toHaveBeenCalledTimes(1);
    });

    it('should filter by tenantId — tenant isolation', async () => {
      await controller.findAll(mockReq('u-001', 'tenant-xyz'));

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-xyz' }) }),
      );
      expect(mockPrisma.user.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-xyz' }) }),
      );
    });

    it('should apply valid role filter when provided', async () => {
      await controller.findAll(mockReq(), UserRole.MECHANIC);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ role: UserRole.MECHANIC }) }),
      );
      expect(mockPrisma.user.count).toHaveBeenCalledTimes(1);
    });

    it('should ignore invalid role filter value', async () => {
      await controller.findAll(mockReq(), 'INVALID_ROLE');

      const callArg = mockPrisma.user.findMany.mock.calls[0][0];
      expect(callArg.where.role).toBeUndefined();
      expect(mockPrisma.user.count).toHaveBeenCalledTimes(1);
    });

    it('should respect custom page and limit', async () => {
      await controller.findAll(mockReq(), undefined, '3', '10');

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10, skip: 20 }),
      );
      expect(mockPrisma.user.count).toHaveBeenCalledTimes(1);
    });

    it('should cap limit at 100', async () => {
      await controller.findAll(mockReq(), undefined, '1', '999');

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));
      expect(mockPrisma.user.count).toHaveBeenCalledTimes(1);
    });

    it('should exclude soft-deleted users (deletedAt: null)', async () => {
      await controller.findAll(mockReq());

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ deletedAt: null }) }),
      );
      expect(mockPrisma.user.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should return user for valid id and tenant', async () => {
      const result = await controller.findOne(mockReq(), 'user-001');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'user-001', tenantId: 'tenant-001' }),
        }),
      );
    });

    it('should throw NotFoundException when user does not exist for tenant', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(null);

      await expect(controller.findOne(mockReq(), 'ghost-user')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.user.findFirst).toHaveBeenCalledTimes(1);
    });

    it('should enforce tenant isolation — cross-tenant lookup returns 404', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(null);

      await expect(
        controller.findOne(mockReq('u-001', 'tenant-other'), 'user-001'),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-other' }) }),
      );
    });
  });

  describe('update', () => {
    it('should update user name and return updated data', async () => {
      const updatedUser = { ...mockUser, name: 'New Name' };
      mockPrisma.user.findFirst.mockResolvedValueOnce(mockUser).mockResolvedValueOnce(updatedUser);

      const result = await controller.update(mockReq(), 'user-001', { name: 'New Name' });

      expect(result.success).toBe(true);
      expect(mockPrisma.user.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant-001', id: 'user-001' }),
        }),
      );
    });

    it('should throw NotFoundException when user not found for update', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(null);

      await expect(controller.update(mockReq(), 'ghost', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.user.updateMany).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid role value', async () => {
      await expect(
        controller.update(mockReq(), 'user-001', { role: 'SUPERADMIN' as UserRole }),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.user.updateMany).not.toHaveBeenCalled();
    });

    it('should update isActive field when provided', async () => {
      mockPrisma.user.findFirst
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ ...mockUser, isActive: false });

      await controller.update(mockReq(), 'user-001', { isActive: false });

      const updateCall = mockPrisma.user.updateMany.mock.calls[0][0];
      expect(updateCall.data.isActive).toBe(false);
      expect(mockPrisma.user.updateMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    it('should soft-delete user and return success', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce({ ...mockUser, id: 'user-002' });

      const result = await controller.remove(mockReq('user-001', 'tenant-001'), 'user-002');

      expect(result.success).toBe(true);
      expect(mockPrisma.user.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: false }),
        }),
      );
    });

    it('should throw NotFoundException when user not found for delete', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(null);

      await expect(controller.remove(mockReq(), 'ghost')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.user.updateMany).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when trying to delete yourself', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce({ ...mockUser, id: 'user-001' });

      await expect(controller.remove(mockReq('user-001'), 'user-001')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.user.updateMany).not.toHaveBeenCalled();
    });

    it('should set deletedAt timestamp on soft delete', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce({ ...mockUser, id: 'user-002' });

      await controller.remove(mockReq('user-001'), 'user-002');

      const updateCall = mockPrisma.user.updateMany.mock.calls[0][0];
      expect(updateCall.data.deletedAt).toBeInstanceOf(Date);
      expect(mockPrisma.user.findFirst).toHaveBeenCalledTimes(1);
    });
  });
});
