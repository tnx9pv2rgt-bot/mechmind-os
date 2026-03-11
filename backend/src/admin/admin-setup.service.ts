import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/services/prisma.service';

interface SeedResult {
  tenantId: string;
  locationId: string;
  users: { id: string; email: string; role: UserRole }[];
}

@Injectable()
export class AdminSetupService {
  constructor(private readonly prisma: PrismaService) {}

  async seedDemoData(): Promise<SeedResult> {
    const passwordHash: string = await bcrypt.hash('Demo2026!', 12);

    // 1. Create demo tenant
    const tenant = await this.prisma.tenant.upsert({
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

    // 2. Create main location
    const location = await this.prisma.location.upsert({
      where: {
        tenantId_isMain: {
          tenantId: tenant.id,
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
        tenantId: tenant.id,
        name: 'Sede Principale',
        address: 'Via Roma 1',
        city: 'Roma',
        postalCode: '00100',
        country: 'IT',
        isMain: true,
        isActive: true,
      },
    });

    // 3. Create users
    const usersConfig: { email: string; name: string; role: UserRole }[] = [
      { email: 'admin@demo.mechmind.it', name: 'Admin Demo', role: UserRole.ADMIN },
      { email: 'manager@demo.mechmind.it', name: 'Marco Rossi', role: UserRole.MANAGER },
      { email: 'tecnico@demo.mechmind.it', name: 'Luca Bianchi', role: UserRole.MECHANIC },
    ];

    const users: { id: string; email: string; role: UserRole }[] = [];

    for (const userConfig of usersConfig) {
      const user = await this.prisma.user.upsert({
        where: {
          tenantId_email: {
            tenantId: tenant.id,
            email: userConfig.email,
          },
        },
        update: {
          passwordHash,
          name: userConfig.name,
          role: userConfig.role,
          isActive: true,
          locationId: location.id,
        },
        create: {
          tenantId: tenant.id,
          email: userConfig.email,
          passwordHash,
          name: userConfig.name,
          role: userConfig.role,
          isActive: true,
          locationId: location.id,
        },
      });

      users.push({ id: user.id, email: user.email, role: user.role });
    }

    return {
      tenantId: tenant.id,
      locationId: location.id,
      users,
    };
  }
}
