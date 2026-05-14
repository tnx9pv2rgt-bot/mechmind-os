import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { AdminSetupService } from './admin-setup.service';
import { PrismaService } from '../common/services/prisma.service';

jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('hashed-pw') }));
import * as bcrypt from 'bcrypt';

const mockTenant = { id: 'tenant-001', slug: 'demo', name: 'Demo Officina Roma' };
const mockLocation = { id: 'location-001' };
const mockUsers = [
  { id: 'u-001', email: 'admin@demo.mechmind.it', role: UserRole.ADMIN },
  { id: 'u-002', email: 'manager@demo.mechmind.it', role: UserRole.MANAGER },
  { id: 'u-003', email: 'tecnico@demo.mechmind.it', role: UserRole.MECHANIC },
];

const mockPrisma = {
  $transaction: jest.fn(),
  tenant: { upsert: jest.fn() },
  location: { upsert: jest.fn() },
  user: { upsert: jest.fn() },
};

const mockConfig = { get: jest.fn() };

describe('AdminSetupService', () => {
  let service: AdminSetupService;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockConfig.get.mockReturnValue('Demo2026!');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pw');

    mockPrisma.$transaction.mockImplementation((fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
      fn(mockPrisma),
    );
    mockPrisma.tenant.upsert.mockResolvedValue(mockTenant);
    mockPrisma.location.upsert.mockResolvedValue(mockLocation);
    mockPrisma.user.upsert
      .mockResolvedValueOnce(mockUsers[0])
      .mockResolvedValueOnce(mockUsers[1])
      .mockResolvedValueOnce(mockUsers[2]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminSetupService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get(AdminSetupService);
  });

  describe('seedDemoData', () => {
    it('should return tenantId, locationId and 3 users', async () => {
      const result = await service.seedDemoData();

      expect(result.tenantId).toBe('tenant-001');
      expect(result.locationId).toBe('location-001');
      expect(result.users).toHaveLength(3);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should create tenant and location via upsert inside transaction', async () => {
      await service.seedDemoData();

      expect(mockPrisma.tenant.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slug: 'demo' } }),
      );
      expect(mockPrisma.location.upsert).toHaveBeenCalledTimes(1);
    });

    it('should upsert 3 users with correct roles', async () => {
      const result = await service.seedDemoData();

      expect(mockPrisma.user.upsert).toHaveBeenCalledTimes(3);
      expect(result.users[0].role).toBe(UserRole.ADMIN);
    });

    it('should hash password using bcrypt with cost 12', async () => {
      await service.seedDemoData();

      expect(bcrypt.hash).toHaveBeenCalledWith('Demo2026!', 12);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should use custom DEMO_PASSWORD from config', async () => {
      mockConfig.get.mockReturnValueOnce('CustomPass123!');

      await service.seedDemoData();

      expect(bcrypt.hash).toHaveBeenCalledWith('CustomPass123!', 12);
      expect(mockPrisma.tenant.upsert).toHaveBeenCalledTimes(1);
    });

    it('should propagate transaction errors', async () => {
      mockPrisma.$transaction.mockRejectedValueOnce(new Error('DB connection lost'));

      await expect(service.seedDemoData()).rejects.toThrow('DB connection lost');
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should include locationId in user creation', async () => {
      await service.seedDemoData();

      expect(mockPrisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ tenantId: 'tenant-001', locationId: 'location-001' }),
        }),
      );
      expect(mockPrisma.location.upsert).toHaveBeenCalledTimes(1);
    });

    it('should handle update branch for existing tenant', async () => {
      // Even though upsert usually creates, verify the update path is properly configured
      const result = await service.seedDemoData();

      expect(mockPrisma.tenant.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug: 'demo' },
          update: expect.objectContaining({
            name: 'Demo Officina Roma',
            isActive: true,
            settings: { timezone: 'Europe/Rome', currency: 'EUR', language: 'it' },
          }),
        }),
      );
      expect(result.tenantId).toBeDefined();
    });

    it('should handle update branch for existing location', async () => {
      const result = await service.seedDemoData();

      expect(mockPrisma.location.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            name: 'Sede Principale',
            isActive: true,
          }),
        }),
      );
      expect(result.locationId).toBeDefined();
    });

    it('should handle update branch for existing users', async () => {
      const result = await service.seedDemoData();

      // Verify that user upserts call update path with proper fields
      expect(mockPrisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            passwordHash: 'hashed-pw',
            isActive: true,
            locationId: 'location-001',
          }),
        }),
      );
      expect(result.users).toHaveLength(3);
    });

    it('should set trialEndsAt to 14 days in the future on both create and update', async () => {
      const nowBefore = Date.now();
      await service.seedDemoData();
      const nowAfter = Date.now();

      const call = (mockPrisma.tenant.upsert as jest.Mock).mock.calls[0][0];
      const trialCreate: Date = call.create.trialEndsAt;
      const trialUpdate: Date = call.update.trialEndsAt;

      expect(trialCreate).toBeDefined();
      expect(trialUpdate).toBeDefined();
      expect(trialCreate).toEqual(trialUpdate);

      const expectedMs = 14 * 24 * 60 * 60 * 1000;
      const actualMs = trialCreate.getTime() - nowBefore;
      expect(Math.abs(actualMs - expectedMs)).toBeLessThan(1000);
      expect(trialCreate.getTime()).toBeLessThanOrEqual(nowAfter + expectedMs);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});
