import { Test, TestingModule } from '@nestjs/testing';
import { AdminSetupService } from './admin-setup.service';
import { PrismaService } from '../common/services/prisma.service';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password-123'),
}));

// Mock Prisma enums
jest.mock('@prisma/client', () => ({
  ...(jest.requireActual('@prisma/client') as Record<string, unknown>),
  UserRole: {
    ADMIN: 'ADMIN',
    MANAGER: 'MANAGER',
    MECHANIC: 'MECHANIC',
    RECEPTIONIST: 'RECEPTIONIST',
    VIEWER: 'VIEWER',
  },
}));

const mockPrisma = {
  tenant: {
    upsert: jest.fn(),
  },
  location: {
    upsert: jest.fn(),
  },
  user: {
    upsert: jest.fn(),
  },
};

describe('AdminSetupService', () => {
  let service: AdminSetupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminSetupService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<AdminSetupService>(AdminSetupService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('seedDemoData', () => {
    const mockTenant = {
      id: 'tenant-uuid-1',
      name: 'Demo Officina Roma',
      slug: 'demo',
      isActive: true,
      settings: { timezone: 'Europe/Rome', currency: 'EUR', language: 'it' },
    };

    const mockLocation = {
      id: 'location-uuid-1',
      tenantId: 'tenant-uuid-1',
      name: 'Sede Principale',
      address: 'Via Roma 1',
      city: 'Roma',
      postalCode: '00100',
      country: 'IT',
      isMain: true,
      isActive: true,
    };

    const mockUsers = [
      { id: 'user-1', email: 'admin@demo.mechmind.it', role: 'ADMIN', name: 'Admin Demo' },
      { id: 'user-2', email: 'manager@demo.mechmind.it', role: 'MANAGER', name: 'Marco Rossi' },
      { id: 'user-3', email: 'tecnico@demo.mechmind.it', role: 'MECHANIC', name: 'Luca Bianchi' },
    ];

    beforeEach(() => {
      mockPrisma.tenant.upsert.mockResolvedValue(mockTenant);
      mockPrisma.location.upsert.mockResolvedValue(mockLocation);
      mockPrisma.user.upsert
        .mockResolvedValueOnce(mockUsers[0])
        .mockResolvedValueOnce(mockUsers[1])
        .mockResolvedValueOnce(mockUsers[2]);
    });

    it('should return SeedResult with tenantId, locationId, and users', async () => {
      const result = await service.seedDemoData();

      expect(result).toEqual({
        tenantId: 'tenant-uuid-1',
        locationId: 'location-uuid-1',
        users: [
          { id: 'user-1', email: 'admin@demo.mechmind.it', role: 'ADMIN' },
          { id: 'user-2', email: 'manager@demo.mechmind.it', role: 'MANAGER' },
          { id: 'user-3', email: 'tecnico@demo.mechmind.it', role: 'MECHANIC' },
        ],
      });
    });

    it('should upsert tenant with slug "demo"', async () => {
      await service.seedDemoData();

      expect(mockPrisma.tenant.upsert).toHaveBeenCalledWith({
        where: { slug: 'demo' },
        update: {
          name: 'Demo Officina Roma',
          isActive: true,
          settings: { timezone: 'Europe/Rome', currency: 'EUR', language: 'it' },
        },
        create: {
          name: 'Demo Officina Roma',
          slug: 'demo',
          isActive: true,
          settings: { timezone: 'Europe/Rome', currency: 'EUR', language: 'it' },
        },
      });
    });

    it('should upsert location with tenantId and isMain=true', async () => {
      await service.seedDemoData();

      expect(mockPrisma.location.upsert).toHaveBeenCalledWith({
        where: {
          tenantId_isMain: {
            tenantId: 'tenant-uuid-1',
            isMain: true,
          },
        },
        update: {
          name: 'Sede Principale',
          address: 'Via Roma 1',
          city: 'Roma',
          postalCode: '00100',
          country: 'IT',
          isActive: true,
        },
        create: {
          tenantId: 'tenant-uuid-1',
          name: 'Sede Principale',
          address: 'Via Roma 1',
          city: 'Roma',
          postalCode: '00100',
          country: 'IT',
          isMain: true,
          isActive: true,
        },
      });
    });

    it('should create three users with correct roles', async () => {
      await service.seedDemoData();

      expect(mockPrisma.user.upsert).toHaveBeenCalledTimes(3);

      // ADMIN user
      expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
        where: {
          tenantId_email: {
            tenantId: 'tenant-uuid-1',
            email: 'admin@demo.mechmind.it',
          },
        },
        update: {
          passwordHash: 'hashed-password-123',
          name: 'Admin Demo',
          role: 'ADMIN',
          isActive: true,
          locationId: 'location-uuid-1',
        },
        create: {
          tenantId: 'tenant-uuid-1',
          email: 'admin@demo.mechmind.it',
          passwordHash: 'hashed-password-123',
          name: 'Admin Demo',
          role: 'ADMIN',
          isActive: true,
          locationId: 'location-uuid-1',
        },
      });

      // MANAGER user
      expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
        where: {
          tenantId_email: {
            tenantId: 'tenant-uuid-1',
            email: 'manager@demo.mechmind.it',
          },
        },
        update: {
          passwordHash: 'hashed-password-123',
          name: 'Marco Rossi',
          role: 'MANAGER',
          isActive: true,
          locationId: 'location-uuid-1',
        },
        create: {
          tenantId: 'tenant-uuid-1',
          email: 'manager@demo.mechmind.it',
          passwordHash: 'hashed-password-123',
          name: 'Marco Rossi',
          role: 'MANAGER',
          isActive: true,
          locationId: 'location-uuid-1',
        },
      });

      // MECHANIC user
      expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
        where: {
          tenantId_email: {
            tenantId: 'tenant-uuid-1',
            email: 'tecnico@demo.mechmind.it',
          },
        },
        update: {
          passwordHash: 'hashed-password-123',
          name: 'Luca Bianchi',
          role: 'MECHANIC',
          isActive: true,
          locationId: 'location-uuid-1',
        },
        create: {
          tenantId: 'tenant-uuid-1',
          email: 'tecnico@demo.mechmind.it',
          passwordHash: 'hashed-password-123',
          name: 'Luca Bianchi',
          role: 'MECHANIC',
          isActive: true,
          locationId: 'location-uuid-1',
        },
      });
    });

    it('should hash password with bcrypt using salt rounds 12', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const bcrypt = require('bcrypt');
      await service.seedDemoData();

      expect(bcrypt.hash).toHaveBeenCalledWith('Demo2026!', 12);
    });

    it('should call upsert operations in correct order: tenant, location, then users', async () => {
      const callOrder: string[] = [];
      mockPrisma.tenant.upsert.mockReset();
      mockPrisma.location.upsert.mockReset();
      mockPrisma.user.upsert.mockReset();

      mockPrisma.tenant.upsert.mockImplementation(() => {
        callOrder.push('tenant');
        return Promise.resolve(mockTenant);
      });
      mockPrisma.location.upsert.mockImplementation(() => {
        callOrder.push('location');
        return Promise.resolve(mockLocation);
      });
      mockPrisma.user.upsert.mockImplementation(
        (args: { where: { tenantId_email: { email: string } } }) => {
          callOrder.push(`user-${args.where.tenantId_email.email}`);
          const idx = mockUsers.findIndex(u => u.email === args.where.tenantId_email.email);
          return Promise.resolve(mockUsers[idx >= 0 ? idx : 0]);
        },
      );

      await service.seedDemoData();

      expect(callOrder[0]).toBe('tenant');
      expect(callOrder[1]).toBe('location');
      expect(callOrder[2]).toBe('user-admin@demo.mechmind.it');
      expect(callOrder[3]).toBe('user-manager@demo.mechmind.it');
      expect(callOrder[4]).toBe('user-tecnico@demo.mechmind.it');
    });

    it('should propagate error when tenant upsert fails', async () => {
      mockPrisma.tenant.upsert.mockRejectedValue(new Error('DB connection failed'));

      await expect(service.seedDemoData()).rejects.toThrow('DB connection failed');
    });

    it('should propagate error when location upsert fails', async () => {
      mockPrisma.location.upsert.mockRejectedValue(new Error('Location constraint error'));

      await expect(service.seedDemoData()).rejects.toThrow('Location constraint error');
    });

    it('should propagate error when user upsert fails', async () => {
      mockPrisma.user.upsert.mockReset();
      mockPrisma.user.upsert.mockRejectedValue(new Error('Unique constraint violated'));

      await expect(service.seedDemoData()).rejects.toThrow('Unique constraint violated');
    });
  });
});
