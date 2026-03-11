import { PrismaClient, UserRole } from '@prisma/client';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const passwordHash: string = await bcrypt.hash('Demo2026!', 12);

  // 1. Create demo tenant
  const tenant = await prisma.tenant.upsert({
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

  console.log(`Tenant created/updated: ${tenant.id} (${tenant.name})`);

  // 2. Create main location
  const location = await prisma.location.upsert({
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

  console.log(`Location created/updated: ${location.id} (${location.name})`);

  // 3. Create admin user
  const admin = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'admin@demo.mechmind.it',
      },
    },
    update: {
      passwordHash,
      name: 'Admin Demo',
      role: UserRole.ADMIN,
      isActive: true,
      locationId: location.id,
    },
    create: {
      tenantId: tenant.id,
      email: 'admin@demo.mechmind.it',
      passwordHash,
      name: 'Admin Demo',
      role: UserRole.ADMIN,
      isActive: true,
      locationId: location.id,
    },
  });

  console.log(`Admin created/updated: ${admin.id} (${admin.email})`);

  // 4. Create manager user
  const manager = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'manager@demo.mechmind.it',
      },
    },
    update: {
      passwordHash,
      name: 'Marco Rossi',
      role: UserRole.MANAGER,
      isActive: true,
      locationId: location.id,
    },
    create: {
      tenantId: tenant.id,
      email: 'manager@demo.mechmind.it',
      passwordHash,
      name: 'Marco Rossi',
      role: UserRole.MANAGER,
      isActive: true,
      locationId: location.id,
    },
  });

  console.log(`Manager created/updated: ${manager.id} (${manager.email})`);

  // 5. Create mechanic user
  const mechanic = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'tecnico@demo.mechmind.it',
      },
    },
    update: {
      passwordHash,
      name: 'Luca Bianchi',
      role: UserRole.MECHANIC,
      isActive: true,
      locationId: location.id,
    },
    create: {
      tenantId: tenant.id,
      email: 'tecnico@demo.mechmind.it',
      passwordHash,
      name: 'Luca Bianchi',
      role: UserRole.MECHANIC,
      isActive: true,
      locationId: location.id,
    },
  });

  console.log(`Mechanic created/updated: ${mechanic.id} (${mechanic.email})`);

  console.log('\nSeed completed successfully!');
}

main()
  .catch((e: Error) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
