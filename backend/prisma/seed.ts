import { CustomerType, FuelType, PrismaClient, UserRole, WorkOrderStatus } from '@prisma/client';
import * as crypto from 'crypto';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// ── Standalone encryption helpers (same algorithm as EncryptionService) ──

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters');
  }
  return Buffer.from(key.slice(0, 32));
}

function encrypt(data: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + encrypted;
}

function hmacHash(data: string): string {
  const key = getEncryptionKey();
  const normalized = data
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9+]/g, '');
  return crypto.createHmac('sha256', key).update(normalized).digest('hex');
}

async function main(): Promise<void> {
  const passwordHash: string = await bcrypt.hash('Demo2026!', 12);

  // 1. Create demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {
      name: 'Demo Officina Roma',
      isActive: true,
      settings: {
        timezone: 'Europe/Rome',
        currency: 'EUR',
        language: 'it',
        ragioneSociale: 'Autofficina Demo Srl',
        partitaIva: '12345678901',
        codiceFiscale: '12345678901',
        sdiCode: '0000000',
        pecEmail: 'demo@pec.mechmind.it',
        address: 'Via Roma 1',
        city: 'Roma',
        postalCode: '00100',
        province: 'RM',
        regimeFiscale: 'ORDINARIO',
        defaultVatRate: 22,
      },
    },
    create: {
      name: 'Demo Officina Roma',
      slug: 'demo',
      isActive: true,
      settings: {
        timezone: 'Europe/Rome',
        currency: 'EUR',
        language: 'it',
        ragioneSociale: 'Autofficina Demo Srl',
        partitaIva: '12345678901',
        codiceFiscale: '12345678901',
        sdiCode: '0000000',
        pecEmail: 'demo@pec.mechmind.it',
        address: 'Via Roma 1',
        city: 'Roma',
        postalCode: '00100',
        province: 'RM',
        regimeFiscale: 'ORDINARIO',
        defaultVatRate: 22,
      },
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

  // 6. Create receptionist user
  const receptionist = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'reception@demo.mechmind.it',
      },
    },
    update: {
      passwordHash,
      name: 'Giulia Verdi',
      role: UserRole.RECEPTIONIST,
      isActive: true,
      locationId: location.id,
    },
    create: {
      tenantId: tenant.id,
      email: 'reception@demo.mechmind.it',
      passwordHash,
      name: 'Giulia Verdi',
      role: UserRole.RECEPTIONIST,
      isActive: true,
      locationId: location.id,
    },
  });

  console.log(`Receptionist created/updated: ${receptionist.id} (${receptionist.email})`);

  // ==========================================
  // 7. Create Italian demo customers (properly encrypted)
  // ==========================================

  const customersData = [
    {
      firstName: 'Mario',
      lastName: 'Bianchi',
      email: 'mario.bianchi@gmail.com',
      phone: '+39 333 1234567',
      codiceFiscale: 'BNCMRA80A01H501U',
      customerType: CustomerType.PERSONA,
      address: 'Via Garibaldi 15',
      city: 'Roma',
      postalCode: '00185',
      province: 'RM',
    },
    {
      firstName: 'Francesca',
      lastName: 'Conti',
      email: 'francesca.conti@yahoo.it',
      phone: '+39 338 7654321',
      codiceFiscale: 'CNTFNC85M41F205X',
      customerType: CustomerType.PERSONA,
      address: 'Corso Italia 42',
      city: 'Roma',
      postalCode: '00198',
      province: 'RM',
    },
    {
      firstName: 'Alessandro',
      lastName: 'Russo',
      email: 'a.russo@libero.it',
      phone: '+39 347 5551234',
      codiceFiscale: 'RSSLSN78H15L219P',
      customerType: CustomerType.PERSONA,
      address: 'Via Nazionale 88',
      city: 'Roma',
      postalCode: '00184',
      province: 'RM',
    },
    {
      firstName: 'Chiara',
      lastName: 'Moretti',
      email: 'chiara.moretti@gmail.com',
      phone: '+39 320 9876543',
      codiceFiscale: 'MRTCHR92R56A944K',
      customerType: CustomerType.PERSONA,
      address: 'Viale Trastevere 120',
      city: 'Roma',
      postalCode: '00153',
      province: 'RM',
    },
    {
      firstName: 'Roberto',
      lastName: 'Ferrari',
      email: 'r.ferrari@pec.it',
      phone: '+39 335 1112233',
      codiceFiscale: 'FRRRBR70T12F839Q',
      partitaIva: '01234567890',
      customerType: CustomerType.AZIENDA,
      address: 'Via Tuscolana 200',
      city: 'Roma',
      postalCode: '00182',
      province: 'RM',
    },
    {
      firstName: 'Elena',
      lastName: 'Colombo',
      email: 'elena.colombo@hotmail.it',
      phone: '+39 349 4445566',
      codiceFiscale: 'CLMLEN88E65G224V',
      customerType: CustomerType.PERSONA,
      address: 'Piazza Navona 5',
      city: 'Roma',
      postalCode: '00186',
      province: 'RM',
    },
  ];

  const customers: Array<{ id: string }> = [];
  for (const data of customersData) {
    const phoneHash = hmacHash(data.phone);

    // Check if customer already exists by phoneHash
    const existing = await prisma.customer.findFirst({
      where: { tenantId: tenant.id, phoneHash },
    });

    if (existing) {
      // Update existing record with proper encryption
      const updated = await prisma.customer.update({
        where: { id: existing.id },
        data: {
          encryptedFirstName: encrypt(data.firstName),
          encryptedLastName: encrypt(data.lastName),
          encryptedEmail: encrypt(data.email),
          encryptedPhone: encrypt(data.phone),
          phoneHash,
          codiceFiscale: encrypt(data.codiceFiscale),
          address: data.address,
          city: data.city,
          postalCode: data.postalCode,
          province: data.province,
        },
      });
      customers.push(updated);
      console.log(`Customer updated: ${updated.id} (${data.firstName} ${data.lastName})`);
    } else {
      const customer = await prisma.customer.create({
        data: {
          tenantId: tenant.id,
          encryptedFirstName: encrypt(data.firstName),
          encryptedLastName: encrypt(data.lastName),
          encryptedEmail: encrypt(data.email),
          encryptedPhone: encrypt(data.phone),
          phoneHash,
          codiceFiscale: encrypt(data.codiceFiscale),
          partitaIva: data.partitaIva ?? null,
          customerType: data.customerType,
          gdprConsent: true,
          gdprConsentAt: new Date(),
          address: data.address,
          city: data.city,
          postalCode: data.postalCode,
          province: data.province,
        },
      });
      customers.push(customer);
      console.log(`Customer created: ${customer.id} (${data.firstName} ${data.lastName})`);
    }
  }

  // ==========================================
  // 8. Create Italian demo vehicles
  // ==========================================

  const vehiclesData = [
    {
      licensePlate: 'AB123CD',
      make: 'Fiat',
      model: 'Panda',
      year: 2020,
      fuelType: FuelType.BENZINA,
      mileage: 55000,
      customerIdx: 0,
    },
    {
      licensePlate: 'EF456GH',
      make: 'Alfa Romeo',
      model: 'Giulietta',
      year: 2018,
      fuelType: FuelType.DIESEL,
      mileage: 87000,
      customerIdx: 1,
    },
    {
      licensePlate: 'LM789NP',
      make: 'Volkswagen',
      model: 'Golf',
      year: 2021,
      fuelType: FuelType.BENZINA,
      mileage: 32000,
      customerIdx: 2,
    },
    {
      licensePlate: 'QR012ST',
      make: 'Toyota',
      model: 'Yaris',
      year: 2019,
      fuelType: FuelType.IBRIDO_BENZINA,
      mileage: 61000,
      customerIdx: 3,
    },
    {
      licensePlate: 'UV345WX',
      make: 'BMW',
      model: 'Serie 3',
      year: 2022,
      fuelType: FuelType.DIESEL,
      mileage: 28000,
      customerIdx: 4,
    },
    {
      licensePlate: 'YZ678AB',
      make: 'Fiat',
      model: '500',
      year: 2023,
      fuelType: FuelType.ELETTRICO,
      mileage: 12000,
      customerIdx: 5,
    },
  ];

  const vehicles: Array<{ id: string }> = [];
  for (const data of vehiclesData) {
    // Check if vehicle already exists by license plate
    const existing = await prisma.vehicle.findFirst({
      where: { licensePlate: data.licensePlate, customerId: customers[data.customerIdx].id },
    });

    if (existing) {
      vehicles.push(existing);
      console.log(
        `Vehicle already exists: ${existing.id} (${data.make} ${data.model} - ${data.licensePlate})`,
      );
    } else {
      const vehicle = await prisma.vehicle.create({
        data: {
          licensePlate: data.licensePlate,
          make: data.make,
          model: data.model,
          year: data.year,
          fuelType: data.fuelType,
          mileage: data.mileage,
          status: 'ACTIVE',
          tenantId: tenant.id,
          customerId: customers[data.customerIdx].id,
        },
      });
      vehicles.push(vehicle);
      console.log(
        `Vehicle created: ${vehicle.id} (${data.make} ${data.model} - ${data.licensePlate})`,
      );
    }
  }

  // ==========================================
  // 9. Create demo work orders
  // ==========================================

  const workOrdersData = [
    {
      woNumber: 'WO-DEMO-001',
      status: WorkOrderStatus.COMPLETED,
      vehicleIdx: 0,
      customerIdx: 0,
      diagnosis:
        'Tagliando completo 50.000 km. Sostituzione olio motore, filtro olio, filtro aria, filtro abitacolo.',
      customerRequest: 'Tagliando periodico e controllo freni',
      mileageIn: 54800,
      mileageOut: 54800,
    },
    {
      woNumber: 'WO-DEMO-002',
      status: WorkOrderStatus.IN_PROGRESS,
      vehicleIdx: 1,
      customerIdx: 1,
      diagnosis: 'Sostituzione pastiglie freno anteriori e posteriori. Controllo dischi.',
      customerRequest: 'Rumore in frenata, vibrazioni al volante',
      mileageIn: 86500,
    },
    {
      woNumber: 'WO-DEMO-003',
      status: WorkOrderStatus.PENDING,
      vehicleIdx: 2,
      customerIdx: 2,
      customerRequest: 'Spia motore accesa, perdita di potenza in accelerazione',
    },
  ];

  for (const data of workOrdersData) {
    const existing = await prisma.workOrder.findUnique({
      where: { tenantId_woNumber: { tenantId: tenant.id, woNumber: data.woNumber } },
    });

    if (existing) {
      console.log(`Work order already exists: ${existing.id} (${data.woNumber})`);
    } else {
      const workOrder = await prisma.workOrder.create({
        data: {
          tenantId: tenant.id,
          woNumber: data.woNumber,
          status: data.status,
          vehicleId: vehicles[data.vehicleIdx].id,
          customerId: customers[data.customerIdx].id,
          diagnosis: data.diagnosis ?? null,
          customerRequest: data.customerRequest ?? null,
          mileageIn: data.mileageIn ?? null,
          mileageOut: data.mileageOut ?? null,
          actualStartTime:
            data.status !== WorkOrderStatus.PENDING ? new Date('2026-03-14T08:30:00') : null,
          actualCompletionTime:
            data.status === WorkOrderStatus.COMPLETED ? new Date('2026-03-14T16:00:00') : null,
        },
      });
      console.log(`Work order created: ${workOrder.id} (${data.woNumber} - ${data.status})`);
    }
  }

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
