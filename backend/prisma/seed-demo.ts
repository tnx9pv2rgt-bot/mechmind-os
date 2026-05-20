// @ts-nocheck
/**
 * Seed demo — Autofficina Romano Srl
 * 100 clienti, 250 veicoli, 200 fatture (>€1M), 50 OdL, 30 appuntamenti, 20 preventivi
 * Run: cd backend && npx ts-node prisma/seed-demo.ts
 */
import {
  BookingStatus,
  CustomerSource,
  CustomerType,
  EstimateLineType,
  EstimateStatus,
  EstimateTier,
  FuelType,
  InvoiceItemType,
  InvoiceStatus,
  PrismaClient,
  SlotStatus,
  UserRole,
  VehicleStatus,
  WorkOrderStatus,
} from '@prisma/client';
import * as crypto from 'crypto';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const log = (msg: string): void => process.stdout.write(msg + '\n');

// ── Crypto helpers (same as EncryptionService) ──────────────────────────────

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getKey(): Buffer {
  const k = process.env.ENCRYPTION_KEY ?? '';
  if (k.length < 32) throw new Error('ENCRYPTION_KEY troppo corta');
  return Buffer.from(k.slice(0, 32));
}

function enc(data: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  let out = cipher.update(data, 'utf8', 'hex');
  out += cipher.final('hex');
  return iv.toString('hex') + out;
}

function hmac(data: string): string {
  const norm = data
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9+]/g, '');
  return crypto.createHmac('sha256', getKey()).update(norm).digest('hex');
}

function rnd(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Dati statici realistici ──────────────────────────────────────────────────

const NOMI = [
  'Marco',
  'Luca',
  'Matteo',
  'Giovanni',
  'Andrea',
  'Davide',
  'Simone',
  'Alberto',
  'Francesco',
  'Roberto',
  'Stefano',
  'Paolo',
  'Antonio',
  'Riccardo',
  'Massimo',
  'Filippo',
  'Nicola',
  'Lorenzo',
  'Fabio',
  'Claudio',
  'Elena',
  'Sara',
  'Giulia',
  'Maria',
  'Francesca',
  'Valentina',
  'Chiara',
  'Laura',
  'Monica',
  'Alessia',
  'Roberta',
  'Silvia',
  'Paola',
  'Cristina',
  'Anna',
  'Federica',
  'Giovanna',
  'Emanuela',
  'Daniela',
  'Lucia',
];
const COGNOMI = [
  'Romano',
  'Ferrari',
  'Rossi',
  'Esposito',
  'Ricci',
  'Marino',
  'Greco',
  'Bruno',
  'Gallo',
  'Conti',
  'De Luca',
  'Costa',
  'Giordano',
  'Mancini',
  'Rizzo',
  'Lombardi',
  'Moretti',
  'Barbieri',
  'Fontana',
  'Santoro',
  'Marini',
  'Rinaldi',
  'Caruso',
  'Ferretti',
  'Palumbo',
  'De Angelis',
  'Grasso',
  'Valentini',
  'Messina',
  'Montanari',
  'Fabbri',
  'Galli',
  'Cattaneo',
  'Longo',
  'Leone',
  'Ferri',
  'Coppola',
  'Pellegrini',
  'Martini',
  'Amato',
];
const VIE = [
  'Via Roma',
  'Via Milano',
  'Corso Vittorio Emanuele',
  'Via Nazionale',
  'Via Garibaldi',
  'Via Dante',
  'Via Mazzini',
  'Piazza della Repubblica',
  'Via Cavour',
  'Corso Umberto I',
  'Via della Libertà',
  'Via Verdi',
  'Via Napoli',
  'Via Torino',
  'Via Bologna',
  'Via Firenze',
  'Via Venezia',
  'Viale Europa',
  'Via del Corso',
  'Via Po',
];
const CITTA: [string, string, string][] = [
  ['Roma', '00183', 'RM'],
  ['Milano', '20100', 'MI'],
  ['Napoli', '80100', 'NA'],
  ['Torino', '10100', 'TO'],
  ['Palermo', '90100', 'PA'],
  ['Genova', '16100', 'GE'],
  ['Bologna', '40100', 'BO'],
  ['Firenze', '50100', 'FI'],
  ['Bari', '70100', 'BA'],
  ['Catania', '95100', 'CT'],
  ['Venezia', '30100', 'VE'],
  ['Verona', '37100', 'VR'],
  ['Messina', '98100', 'ME'],
  ['Padova', '35100', 'PD'],
  ['Trieste', '34100', 'TS'],
  ['Brescia', '25100', 'BS'],
  ['Prato', '59100', 'PO'],
  ['Taranto', '74100', 'TA'],
  ['Parma', '43100', 'PR'],
  ['Reggio Calabria', '89100', 'RC'],
];
const DOMINI = [
  'gmail.com',
  'libero.it',
  'yahoo.it',
  'hotmail.it',
  'outlook.it',
  'virgilio.it',
  'tiscali.it',
  'alice.it',
  'fastwebnet.it',
];

const MARCHE = [
  'Fiat',
  'Alfa Romeo',
  'Lancia',
  'Volkswagen',
  'BMW',
  'Mercedes',
  'Audi',
  'Ford',
  'Opel',
  'Toyota',
  'Renault',
  'Peugeot',
  'Citroen',
  'Honda',
  'Hyundai',
  'Kia',
  'Seat',
  'Skoda',
  'Volvo',
  'Jeep',
];
const MODELLI: Record<string, string[]> = {
  Fiat: ['Panda', '500', 'Punto', 'Bravo', 'Tipo', 'Stilo', 'Doblo', 'Ducato'],
  'Alfa Romeo': ['Giulia', 'Stelvio', 'Giulietta', '147', '156', '159', 'Mito'],
  Lancia: ['Ypsilon', 'Delta', 'Musa', 'Phedra'],
  Volkswagen: ['Golf', 'Polo', 'Passat', 'Tiguan', 'Touareg', 'T-Roc', 'Up'],
  BMW: ['Serie 1', 'Serie 3', 'Serie 5', 'Serie 7', 'X1', 'X3', 'X5', '320d', '520d'],
  Mercedes: ['Classe A', 'Classe C', 'Classe E', 'GLA', 'GLC', 'GLE', 'Vito', 'Sprinter'],
  Audi: ['A3', 'A4', 'A6', 'Q3', 'Q5', 'Q7', 'TT', 'A1'],
  Ford: ['Focus', 'Fiesta', 'Mondeo', 'Kuga', 'EcoSport', 'Puma', 'Transit'],
  Opel: ['Astra', 'Corsa', 'Insignia', 'Mokka', 'Crossland', 'Zafira'],
  Toyota: ['Corolla', 'Yaris', 'RAV4', 'Aygo', 'C-HR', 'Land Cruiser', 'Hilux'],
  Renault: ['Clio', 'Megane', 'Scenic', 'Kadjar', 'Captur', 'Twingo', 'Talisman'],
  Peugeot: ['208', '308', '408', '2008', '3008', '5008', 'Partner'],
  Citroen: ['C3', 'C4', 'C5', 'Berlingo', 'Jumpy', 'C-Elysee'],
  Honda: ['Civic', 'Jazz', 'CR-V', 'HR-V', 'Accord'],
  Hyundai: ['i20', 'i30', 'Tucson', 'Kona', 'Santa Fe', 'Ioniq'],
  Kia: ['Picanto', 'Rio', 'Ceed', 'Sportage', 'Sorento', 'Stinger'],
  Seat: ['Ibiza', 'Leon', 'Ateca', 'Arona', 'Tarraco'],
  Skoda: ['Fabia', 'Octavia', 'Superb', 'Karoq', 'Kodiaq'],
  Volvo: ['V40', 'V60', 'V90', 'XC40', 'XC60', 'XC90', 'S60'],
  Jeep: ['Renegade', 'Compass', 'Cherokee', 'Grand Cherokee', 'Wrangler'],
};
const COLORI = [
  'Bianco',
  'Nero',
  'Grigio',
  'Argento',
  'Rosso',
  'Blu',
  'Verde',
  'Giallo',
  'Arancione',
  'Marrone',
  'Beige',
];
const CARBURANTI: FuelType[] = [
  'BENZINA',
  'DIESEL',
  'GPL',
  'METANO',
  'IBRIDO_BENZINA',
  'IBRIDO_DIESEL',
  'ELETTRICO',
];

const SERVIZI_BASE = [
  { name: 'Tagliando base', price: 120, duration: 90 },
  { name: 'Tagliando completo', price: 250, duration: 150 },
  { name: 'Cambio olio e filtri', price: 80, duration: 60 },
  { name: 'Cambio pastiglie freno anteriori', price: 180, duration: 120 },
  { name: 'Cambio pastiglie freno posteriori', price: 160, duration: 90 },
  { name: 'Sostituzione dischi freno ant.', price: 350, duration: 180 },
  { name: 'Sostituzione dischi freno post.', price: 300, duration: 150 },
  { name: 'Sostituzione ammortizzatori ant.', price: 480, duration: 240 },
  { name: 'Sostituzione ammortizzatori post.', price: 420, duration: 210 },
  { name: 'Sostituzione batteria', price: 220, duration: 60 },
  { name: 'Sostituzione alternatore', price: 680, duration: 180 },
  { name: 'Sostituzione motorino avviamento', price: 520, duration: 150 },
  { name: 'Revisione impianto frenante', price: 140, duration: 90 },
  { name: 'Diagnosi elettronica', price: 60, duration: 60 },
  { name: 'Sostituzione distribuzione', price: 850, duration: 360 },
  { name: 'Cambio frizione', price: 1200, duration: 480 },
  { name: 'Revisione cambio', price: 2800, duration: 600 },
  { name: 'Sostituzione frizione e volano', price: 1800, duration: 540 },
  { name: 'Sostituzione candele', price: 120, duration: 90 },
  { name: 'Sostituzione iniettori', price: 950, duration: 300 },
];

const RICAMBI = [
  { name: 'Filtro olio', sku: 'FO-001', category: 'FILTERS', cost: 8, retail: 15 },
  { name: 'Filtro aria', sku: 'FA-001', category: 'FILTERS', cost: 12, retail: 22 },
  { name: 'Filtro abitacolo', sku: 'FAB-001', category: 'FILTERS', cost: 10, retail: 18 },
  { name: 'Filtro gasolio', sku: 'FG-001', category: 'FILTERS', cost: 15, retail: 28 },
  { name: 'Olio motore 5W30 (5L)', sku: 'OM-5W30', category: 'OILS', cost: 28, retail: 55 },
  { name: 'Olio motore 5W40 (5L)', sku: 'OM-5W40', category: 'OILS', cost: 30, retail: 58 },
  {
    name: 'Pastiglie freno ant. Brembo',
    sku: 'PF-ANT-001',
    category: 'BRAKES',
    cost: 35,
    retail: 75,
  },
  {
    name: 'Pastiglie freno post. Brembo',
    sku: 'PF-POST-001',
    category: 'BRAKES',
    cost: 28,
    retail: 62,
  },
  { name: 'Disco freno anteriore dx', sku: 'DF-ANT-DX', category: 'BRAKES', cost: 55, retail: 110 },
  { name: 'Disco freno anteriore sx', sku: 'DF-ANT-SX', category: 'BRAKES', cost: 55, retail: 110 },
  {
    name: 'Disco freno posteriore dx',
    sku: 'DF-POST-DX',
    category: 'BRAKES',
    cost: 45,
    retail: 95,
  },
  {
    name: 'Disco freno posteriore sx',
    sku: 'DF-POST-SX',
    category: 'BRAKES',
    cost: 45,
    retail: 95,
  },
  { name: 'Batteria 70Ah', sku: 'BAT-70', category: 'ELECTRICAL', cost: 80, retail: 140 },
  { name: 'Batteria 90Ah', sku: 'BAT-90', category: 'ELECTRICAL', cost: 100, retail: 170 },
  {
    name: 'Ammortizzatore ant. dx Sachs',
    sku: 'AMM-ANT-DX',
    category: 'SUSPENSION',
    cost: 85,
    retail: 160,
  },
  {
    name: 'Ammortizzatore ant. sx Sachs',
    sku: 'AMM-ANT-SX',
    category: 'SUSPENSION',
    cost: 85,
    retail: 160,
  },
  { name: 'Kit distribuzione Gates', sku: 'DISTR-001', category: 'ENGINE', cost: 180, retail: 320 },
  { name: 'Kit frizione LUK', sku: 'FRIZ-001', category: 'TRANSMISSION', cost: 280, retail: 520 },
  { name: 'Candele NGK (set 4)', sku: 'CAND-4', category: 'ENGINE', cost: 40, retail: 80 },
  { name: 'Iniettore Bosch', sku: 'INI-001', category: 'FUEL', cost: 140, retail: 250 },
];

const TECNICI = [
  {
    name: 'Marco Ferretti',
    email: 'marco.ferretti@romano-officina.it',
    skills: ['Motore', 'Distribuzione', 'Diagnostica'],
  },
  {
    name: 'Luigi Santoro',
    email: 'luigi.santoro@romano-officina.it',
    skills: ['Freni', 'Sospensioni', 'Geometria'],
  },
  {
    name: 'Giuseppe Amato',
    email: 'giuseppe.amato@romano-officina.it',
    skills: ['Elettrico', 'Climatizzazione', 'Diagnosi ECU'],
  },
  {
    name: 'Antonio Basile',
    email: 'antonio.basile@romano-officina.it',
    skills: ['Cambio', 'Frizione', 'Trasmissione'],
  },
  {
    name: 'Salvatore Fiore',
    email: 'salvatore.fiore@romano-officina.it',
    skills: ['Tagliando', 'Olio', 'Filtri'],
  },
];

const NOTE_OdL = [
  'Cliente segnala rumore proveniente dal motore a freddo. Verificare cinghia distribuzione.',
  'Spia ABS accesa. Diagnosi elettronica necessaria. Sensore ruota posteriore dx.',
  'Consumo olio eccessivo. Verificare guarnizioni e tenute.',
  'Sterzo rigido a basse velocità. Verificare servofreno e pompa servosterzo.',
  'Perdita liquido freni. Verificare pinze anteriori e posteriori.',
  'Frizione che slitta in quarta e quinta marcia. Kit frizione da sostituire.',
  'Trepidazione a 110 km/h. Bilanciatura ruote e convergenza necessaria.',
  'Avviamento difficoltoso al mattino. Candele e sensori da verificare.',
  'Climatizzatore non raffredda. Ricarica gas R134a e verifica perdite.',
  'Cambio automatico che scatta. Reset TCU e verifica livello olio cambio.',
  'Freni che cigolio in retromarcia. Pastiglie e dischi posteriori da sostituire.',
  'Spia motore accesa. Codice guasto P0171 - miscela troppo magra. Iniettori.',
  'Perdita acqua dal radiatore. Sostituzione radiatore e termostato.',
  'Alternatore non carica. Sostituzione alternatore e cinghia serpentina.',
  'Sospensioni anteriori rumorose. Bracci oscillanti e silent-block da verificare.',
];

// ── Generatori ────────────────────────────────────────────────────────────────

function targa(): string {
  const lett = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const L = (): string => lett[rnd(0, lett.length - 1)];
  const N = (): string => String(rnd(0, 9));
  return `${L()}${L()}${N()}${N()}${N()}${L()}${L()}`;
}

function vin(): string {
  const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
  return Array.from({ length: 17 }, () => chars[rnd(0, chars.length - 1)]).join('');
}

function pIva(): string {
  const base = Array.from({ length: 10 }, () => rnd(0, 9)).join('');
  let s = 0;
  for (let i = 0; i < 10; i++) {
    const d = parseInt(base[i]);
    if (i % 2 === 0) s += d;
    else {
      const t = d * 2;
      s += t > 9 ? t - 9 : t;
    }
  }
  return base + String((10 - (s % 10)) % 10);
}

function cf(nome: string, cognome: string, anno: number): string {
  const vow = (s: string): string => s.toUpperCase().replace(/[^AEIOU]/g, '');
  const con = (s: string): string => s.toUpperCase().replace(/[AEIOU]/g, '');
  const cod = (s: string): string => {
    const c = con(s) + vow(s) + 'XXX';
    return c.slice(0, 3);
  };
  const mesi = 'ABCDEHLMPRST';
  const mese = mesi[rnd(0, 11)];
  const giorno = String(rnd(1, 28)).padStart(2, '0');
  const annoStr = String(anno).slice(2);
  const ctrl = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[rnd(0, 25)];
  return `${cod(cognome)}${cod(nome)}${annoStr}${mese}${giorno}A${rnd(1000, 9999)}${ctrl}`;
}

function dateInRange(start: Date, end: Date): Date {
  const t = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(t);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  log('🚀 Avvio seed demo — Autofficina Romano Srl\n');

  const pwHash = await bcrypt.hash('Demo2026!', 12);

  // ── 1. TENANT ──────────────────────────────────────────────────────────────
  log('📋 Creazione tenant...');
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'romano' },
    update: { name: 'Autofficina Romano Srl', isActive: true },
    create: {
      name: 'Autofficina Romano Srl',
      slug: 'romano',
      isActive: true,
      settings: {
        timezone: 'Europe/Rome',
        currency: 'EUR',
        language: 'it',
        ragioneSociale: 'Autofficina Romano Srl',
        partitaIva: '10234567890',
        codiceFiscale: '10234567890',
        sdiCode: 'SUBM70N',
        pecEmail: 'romano.officina@pec.it',
        address: 'Via Appia Nuova 245',
        city: 'Roma',
        postalCode: '00183',
        province: 'RM',
        phone: '+39 06 7843221',
        shopType: 'multimarca',
        teamSize: '6-15',
        hourlyRate: 75,
      },
    },
  });
  log(`  ✅ Tenant: ${tenant.name} (${tenant.slug})`);

  // ── 2. UTENTE ADMIN ─────────────────────────────────────────────────────────
  log('👤 Creazione admin...');
  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'romano@romano-officina.it' } },
    update: { passwordHash: pwHash },
    create: {
      tenantId: tenant.id,
      email: 'romano@romano-officina.it',
      name: 'Giovanni Romano',
      role: UserRole.ADMIN,
      passwordHash: pwHash,
      emailVerified: new Date(),
      isActive: true,
      preferences: { onboardingCompleted: true },
    },
  });
  log(`  ✅ Admin: ${admin.email}`);

  // ── 3. TECNICI ─────────────────────────────────────────────────────────────
  log('🔧 Creazione tecnici...');
  const tecnici: any[] = [];
  for (const t of TECNICI) {
    let tec = await prisma.technician.findFirst({ where: { tenantId: tenant.id, email: t.email } });
    if (!tec) {
      tec = await prisma.technician.create({
        data: {
          tenantId: tenant.id,
          name: t.name,
          email: t.email,
          phone: `+39 3${rnd(30, 99)}${rnd(1000000, 9999999)}`,
          isActive: true,
          skills: t.skills,
          specializations: t.skills.slice(0, 2),
        },
      });
    }
    tecnici.push(tec);
  }
  log(`  ✅ ${tecnici.length} tecnici`);

  // ── 4. SERVIZI ─────────────────────────────────────────────────────────────
  log('🛠️  Creazione servizi...');
  const servizi: any[] = [];
  for (const s of SERVIZI_BASE) {
    const svc = await prisma.service.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: s.name } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: s.name,
        price: s.price,
        duration: s.duration,
        category: 'Manutenzione',
        laborRate: 75,
        isActive: true,
      },
    });
    servizi.push(svc);
  }
  log(`  ✅ ${servizi.length} servizi`);

  // ── 5. RICAMBI ─────────────────────────────────────────────────────────────
  log('📦 Creazione ricambi...');
  const parti: any[] = [];
  for (const p of RICAMBI) {
    const part = await prisma.part.upsert({
      where: { tenantId_sku: { tenantId: tenant.id, sku: p.sku } },
      update: {},
      create: {
        tenantId: tenant.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        costPrice: p.cost,
        retailPrice: p.retail,
        vatRate: 22,
        isActive: true,
        partType: 'AFTERMARKET',
        warrantyMonths: 24,
        minStockLevel: 5,
        reorderPoint: 10,
      },
    });
    parti.push(part);
  }
  log(`  ✅ ${parti.length} ricambi`);

  // ── 6. PULIZIA dati demo precedenti ────────────────────────────────────────
  log('🧹 Pulizia dati precedenti...');
  await prisma.estimateLine.deleteMany({ where: { estimate: { tenantId: tenant.id } } });
  await prisma.estimate.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.invoiceItem.deleteMany({ where: { invoice: { tenantId: tenant.id } } });
  await prisma.invoice.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.workOrder.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.booking.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.bookingSlot.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.vehicle.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.customer.deleteMany({ where: { tenantId: tenant.id } });
  log('  ✅ Pulizia completata');

  // ── 7. CLIENTI (100) ────────────────────────────────────────────────────────
  log('👥 Creazione 100 clienti...');
  const clienti: any[] = [];
  const usedPhones = new Set<string>();

  for (let i = 0; i < 100; i++) {
    const nome = pick(NOMI);
    const cognome = COGNOMI[i % COGNOMI.length];
    const [citta, cap, provincia] = pick(CITTA);
    const annoNascita = rnd(1955, 1998);
    const isAzienda = i < 10;

    let phone: string;
    do {
      phone = `+393${rnd(30, 99)}${rnd(1000000, 9999999)}`;
    } while (usedPhones.has(phone));
    usedPhones.add(phone);

    const nomePulito = nome.toLowerCase().replace(/[^a-z]/g, '');
    const cognomePulito = cognome.toLowerCase().replace(/[^a-z]/g, '');
    const email = isAzienda
      ? `info@${cognomePulito}srl.it`
      : `${nomePulito}.${cognomePulito}${rnd(1, 99)}@${pick(DOMINI)}`;

    const c = await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        encryptedPhone: enc(phone),
        encryptedEmail: enc(email),
        encryptedFirstName: enc(isAzienda ? cognome + ' Srl' : nome),
        encryptedLastName: enc(isAzienda ? '' : cognome),
        phoneHash: hmac(phone),
        emailHash: hmac(email),
        searchName: `${nome} ${cognome}`.toLowerCase(),
        gdprConsent: true,
        gdprConsentAt: dateInRange(new Date('2024-01-01'), new Date('2025-12-31')),
        gdprPrivacyVersion: '2.0',
        gdprConsentMethod: 'form-checkbox',
        marketingConsent: Math.random() > 0.4,
        customerType: isAzienda ? CustomerType.AZIENDA : CustomerType.PERSONA,
        codiceFiscale: isAzienda ? null : cf(nome, cognome, annoNascita),
        partitaIva: isAzienda ? pIva() : null,
        sdiCode: isAzienda ? `SDI${rnd(1000000, 9999999)}` : null,
        address: `${pick(VIE)} ${rnd(1, 200)}`,
        city: citta,
        postalCode: cap,
        province: provincia,
        country: 'IT',
        preferredChannel: pick(['PHONE', 'EMAIL', 'SMS', 'WHATSAPP']),
        preferredLanguage: 'it',
        source: pick(['PASSAPAROLA', 'GOOGLE', 'WALK_IN', 'SOCIAL', 'ALTRO']) as CustomerSource,
        notes: i % 5 === 0 ? 'Cliente fidelizzato. Sconto 10% su manodopera.' : null,
        createdAt: dateInRange(new Date('2021-01-01'), new Date('2025-06-01')),
      },
    });
    clienti.push(c);
  }
  log(`  ✅ ${clienti.length} clienti`);

  // ── 8. VEICOLI (250) ────────────────────────────────────────────────────────
  log('🚗 Creazione 250 veicoli...');
  const veicoli: any[] = [];
  for (let i = 0; i < 250; i++) {
    const cliente = clienti[i % 100];
    const marca = pick(MARCHE);
    const modello = pick(MODELLI[marca] ?? ['Base']);
    const anno = rnd(2008, 2024);
    const km = rnd(10000, 280000);
    const fuel = pick(CARBURANTI);
    const isElettrica = fuel === 'ELETTRICO';

    const v = await prisma.vehicle.create({
      data: {
        tenantId: tenant.id,
        customerId: cliente.id,
        licensePlate: targa(),
        make: marca,
        model: modello,
        year: anno,
        vin: vin(),
        status: VehicleStatus.ACTIVE,
        mileage: km,
        fuelType: fuel,
        engineDisplacement: isElettrica
          ? null
          : pick([1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500, 3000]),
        power: isElettrica
          ? pick([100, 150, 200, 300])
          : pick([55, 70, 85, 100, 110, 130, 150, 180, 200, 250]),
        color: pick(COLORI),
        registrationDate: new Date(`${anno}-${String(rnd(1, 12)).padStart(2, '0')}-01`),
        insuranceExpiry: addDays(new Date(), rnd(30, 400)),
        taxExpiry: addDays(new Date(), rnd(30, 365)),
        lastServiceDate: dateInRange(new Date('2024-01-01'), new Date('2026-04-01')),
        nextServiceDueKm: km + rnd(5000, 30000),
        revisionExpiry: addDays(new Date(), rnd(-180, 730)),
        createdAt: dateInRange(new Date('2021-01-01'), new Date('2025-12-01')),
      },
    });
    veicoli.push(v);
  }
  log(`  ✅ ${veicoli.length} veicoli`);

  // ── 9. WORK ORDERS (50) ─────────────────────────────────────────────────────
  log('📋 Creazione 50 ordini di lavoro...');
  const ordini: any[] = [];
  const statiWo: WorkOrderStatus[] = [
    'COMPLETED',
    'COMPLETED',
    'COMPLETED',
    'IN_PROGRESS',
    'WAITING_PARTS',
    'READY',
    'OPEN',
    'INVOICED',
  ];

  for (let i = 0; i < 50; i++) {
    const veicolo = veicoli[rnd(0, 249)];
    const tecnico = pick(tecnici);
    const stato = pick(statiWo);
    const dataInizio = dateInRange(new Date('2025-09-01'), new Date('2026-05-15'));
    const oreReali = rnd(1, 12);
    const costoManodopera = oreReali * 75;
    const costoRicambi = rnd(50, 1500);

    const wo = await prisma.workOrder.create({
      data: {
        tenantId: tenant.id,
        woNumber: `WO-2026-${String(i + 1).padStart(4, '0')}`,
        status: stato,
        vehicleId: veicolo.id,
        customerId: veicolo.customerId!,
        technicianId: tecnico.id,
        diagnosis: pick(NOTE_OdL),
        customerRequest: 'Cliente richiede verifica generale e risoluzione problema segnalato.',
        laborHours: oreReali,
        laborCost: costoManodopera,
        partsCost: costoRicambi,
        totalCost: costoManodopera + costoRicambi,
        mileageIn: veicolo.mileage ?? 50000,
        mileageOut:
          stato === 'COMPLETED' || stato === 'INVOICED'
            ? (veicolo.mileage ?? 50000) + rnd(0, 50)
            : null,
        actualStartTime: dataInizio,
        estimatedCompletion: addDays(dataInizio, rnd(1, 5)),
        actualCompletionTime:
          stato === 'COMPLETED' || stato === 'INVOICED' ? addDays(dataInizio, rnd(1, 4)) : null,
        priority: pick(['NORMAL', 'NORMAL', 'NORMAL', 'HIGH', 'URGENT']),
        woType: pick(['CUSTOMER_PAY', 'CUSTOMER_PAY', 'WARRANTY', 'INTERNAL']),
        createdAt: dataInizio,
      },
    });
    ordini.push(wo);
  }
  log(`  ✅ ${ordini.length} ordini di lavoro`);

  // ── 10. FATTURE (200) ────────────────────────────────────────────────────────
  log('🧾 Creazione 200 fatture...');
  let totFatturato = 0;
  const fatture: any[] = [];

  const vociMano = [
    'Manodopera tagliando',
    'Manodopera freni',
    'Manodopera distribuzione',
    'Manodopera frizione',
    'Manodopera diagnostica',
    'Manodopera sospensioni',
    'Manodopera cambio olio',
    'Manodopera alternatore',
    'Manodopera ammortizzatori',
    'Manodopera revisione cambio',
  ];
  const vociRic = [
    'Kit filtri completo',
    'Olio motore 5W30 Castrol 5L',
    'Pastiglie freno ant. Brembo',
    'Pastiglie freno post. Brembo',
    'Dischi freno anteriori (coppia)',
    'Dischi freno posteriori (coppia)',
    'Batteria 70Ah AGM',
    'Kit distribuzione Gates',
    'Kit frizione LUK',
    'Ammortizzatori ant. Sachs (coppia)',
    'Candele NGK Iridium (4 pz)',
    'Iniettori Bosch (4 pz)',
    'Termostato + guarnizione',
    'Cinghia serpentina + tendicinghia',
  ];
  const vociExt = [
    'Smaltimento rifiuti (olio esausto)',
    'Smaltimento parti',
    'Lavaggio interni',
    'Aspirazione refrigerante',
    'Collaudo e test su strada',
  ];

  const statiFattura: InvoiceStatus[] = ['PAID', 'PAID', 'PAID', 'PAID', 'SENT', 'OVERDUE'];
  const metodiPag = ['CONTANTI', 'CARTA', 'BONIFICO', 'BONIFICO', 'CARTA'];

  for (let i = 0; i < 200; i++) {
    const cliente = clienti[rnd(0, 99)];
    const stato = pick(statiFattura);
    const data = dateInRange(new Date('2026-01-02'), new Date('2026-05-15'));
    const metodo = pick(metodiPag);
    // 3 tier garantiti per superare €1.000.000:
    // Tier A (i<10): cambio motore/cambio completo ~€28.000 → 10 × €28k = €280k
    // Tier B (i<20): distribuzione+frizione+elettrico ~€9.000 → 10 × €9k = €90k
    // Tier C (i<30): revisione freni+sospensioni ~€4.500 → 10 × €4.5k = €45k
    // Tier D (170): normali ~€2.200 → 170 × €2.2k = €374k
    // Totale subtotale ~€789k → con IVA 22% = ~€963k + margine random = >€1M

    const righe: Array<{ type: InvoiceItemType; desc: string; qty: number; prezzo: number }> = [];

    if (i < 10) {
      // Tier A: cambio motore / revisione motore completa
      righe.push(
        {
          type: InvoiceItemType.LABOR,
          desc: 'Manodopera cambio motore completo',
          qty: 100,
          prezzo: 75,
        },
        {
          type: InvoiceItemType.PART,
          desc: 'Motore rigenerato certificato',
          qty: 1,
          prezzo: rnd(14000, 18000),
        },
        {
          type: InvoiceItemType.PART,
          desc: 'Kit distribuzione + pompa acqua Gates',
          qty: 1,
          prezzo: rnd(800, 1200),
        },
        { type: InvoiceItemType.PART, desc: pick(vociRic), qty: 1, prezzo: rnd(500, 1500) },
        {
          type: InvoiceItemType.LABOR,
          desc: 'Collaudo dinamometro e test su strada',
          qty: 3,
          prezzo: 120,
        },
        {
          type: InvoiceItemType.SERVICE,
          desc: 'Smaltimento motore e fluidi speciali',
          qty: 1,
          prezzo: rnd(400, 800),
        },
      );
    } else if (i < 20) {
      // Tier B: distribuzione + frizione + elettrico
      righe.push(
        {
          type: InvoiceItemType.LABOR,
          desc: 'Manodopera distribuzione e frizione',
          qty: 60,
          prezzo: 75,
        },
        {
          type: InvoiceItemType.PART,
          desc: 'Kit distribuzione Gates completo',
          qty: 1,
          prezzo: rnd(1500, 2500),
        },
        {
          type: InvoiceItemType.PART,
          desc: 'Kit frizione LUK + volano bimassa',
          qty: 1,
          prezzo: rnd(1800, 3200),
        },
        { type: InvoiceItemType.PART, desc: pick(vociRic), qty: 1, prezzo: rnd(500, 1200) },
        { type: InvoiceItemType.LABOR, desc: 'Diagnosi elettronica completa', qty: 1, prezzo: 120 },
        {
          type: InvoiceItemType.SERVICE,
          desc: 'Smaltimento rifiuti',
          qty: 1,
          prezzo: rnd(150, 300),
        },
      );
    } else if (i < 30) {
      // Tier C: freni + sospensioni + geometria
      righe.push(
        {
          type: InvoiceItemType.LABOR,
          desc: 'Manodopera freni e sospensioni',
          qty: 30,
          prezzo: 75,
        },
        {
          type: InvoiceItemType.PART,
          desc: 'Ammortizzatori Sachs (4 pz) + silent-block',
          qty: 1,
          prezzo: rnd(900, 1500),
        },
        {
          type: InvoiceItemType.PART,
          desc: 'Dischi e pastiglie freno (ant. + post.)',
          qty: 1,
          prezzo: rnd(600, 1000),
        },
        {
          type: InvoiceItemType.PART,
          desc: 'Kit revisione pinze freno',
          qty: 1,
          prezzo: rnd(300, 600),
        },
        { type: InvoiceItemType.SERVICE, desc: 'Geometria e assetto ruote', qty: 1, prezzo: 180 },
        { type: InvoiceItemType.SERVICE, desc: 'Smaltimento', qty: 1, prezzo: rnd(50, 120) },
      );
    } else {
      const nVoci = rnd(3, 6);
      for (let j = 0; j < nVoci; j++) {
        const tipo =
          j === 0
            ? InvoiceItemType.LABOR
            : j === nVoci - 1
              ? InvoiceItemType.SERVICE
              : pick([InvoiceItemType.LABOR, InvoiceItemType.PART]);
        const desc =
          tipo === InvoiceItemType.LABOR
            ? pick(vociMano)
            : tipo === InvoiceItemType.PART
              ? pick(vociRic)
              : pick(vociExt);
        const prezzo =
          tipo === InvoiceItemType.LABOR
            ? rnd(300, 1800)
            : tipo === InvoiceItemType.PART
              ? rnd(80, 900)
              : rnd(40, 150);
        righe.push({
          type: tipo,
          desc,
          qty:
            tipo === InvoiceItemType.LABOR
              ? rnd(1, 4)
              : tipo === InvoiceItemType.PART
                ? rnd(1, 3)
                : 1,
          prezzo,
        });
      }
    }

    const subtotale = righe.reduce((s, r) => s + r.qty * r.prezzo, 0);
    const iva = Math.round(subtotale * 0.22 * 100) / 100;
    const totale = subtotale + iva;
    totFatturato += totale;

    const fattura = await prisma.invoice.create({
      data: {
        tenantId: tenant.id,
        customerId: cliente.id,
        invoiceNumber: `${String(i + 1).padStart(4, '0')}/2026`,
        status: stato,
        subtotal: subtotale,
        taxRate: 22,
        taxAmount: iva,
        total: totale,
        documentType: 'FATTURA',
        paymentMethod: metodo as any,
        paymentTerms: 'IMMEDIATO',
        taxRegime: 'ORDINARIO',
        stampDuty: false,
        paidAt: stato === 'PAID' ? addDays(data, rnd(0, 10)) : null,
        sentAt: stato !== 'DRAFT' ? data : null,
        dueDate: addDays(data, 30),
        createdAt: data,
        updatedAt: data,
        invoiceItems: {
          create: righe.map((r, pos) => {
            const lineSub = r.qty * r.prezzo;
            const lineIva = Math.round(lineSub * 0.22 * 100) / 100;
            return {
              position: pos,
              itemType: r.type,
              description: r.desc,
              quantity: r.qty,
              unitPrice: r.prezzo,
              vatRate: 22,
              discount: 0,
              subtotal: lineSub,
              vatAmount: lineIva,
              total: lineSub + lineIva,
            };
          }),
        },
      },
    });
    fatture.push(fattura);

    if ((i + 1) % 50 === 0) process.stdout.write(`  📄 ${i + 1}/200 fatture...\n`);
  }
  log(`  ✅ ${fatture.length} fatture — Totale: €${totFatturato.toFixed(2)}`);

  // ── 11. APPUNTAMENTI (30) ────────────────────────────────────────────────────
  log('📅 Creazione 30 appuntamenti...');
  const appuntamenti: any[] = [];
  const orari = [8, 9, 10, 11, 14, 15, 16, 17];
  const descrizioniApp = [
    'Tagliando programmato',
    'Revisione impianto frenante',
    'Cambio olio urgente',
    'Diagnosi spia motore',
    'Sostituzione pneumatici',
    'Revisione pre-estate',
    'Sostituzione pastiglie',
    'Problemi avviamento',
    'Rumore sospetto anteriore',
    'Revisione periodica',
  ];

  const usedSlots = new Set<string>();

  for (let i = 0; i < 30; i++) {
    const data = dateInRange(new Date('2026-05-12'), new Date('2026-06-15'));
    data.setHours(pick(orari), 0, 0, 0);

    let key = data.toISOString();
    if (usedSlots.has(key)) {
      data.setMinutes(30);
      key = data.toISOString();
    }
    usedSlots.add(key);

    const dataFine = new Date(data.getTime() + 90 * 60000);
    const cliente = clienti[rnd(0, 99)];
    const veicolo = veicoli.find((v: any) => v.customerId === cliente.id) ?? veicoli[rnd(0, 249)];

    const slot = await prisma.bookingSlot.create({
      data: {
        tenantId: tenant.id,
        startTime: data,
        endTime: dataFine,
        status: SlotStatus.BOOKED,
      },
    });

    const booking = await prisma.booking.create({
      data: {
        tenantId: tenant.id,
        slotId: slot.id,
        customerId: cliente.id,
        vehicleId: veicolo.id,
        scheduledDate: data,
        durationMinutes: 90,
        status: data > new Date() ? BookingStatus.CONFIRMED : BookingStatus.COMPLETED,
        source: 'WEB',
        technicianId: pick(tecnici).id,
        notes: pick(descrizioniApp),
        createdAt: addDays(data, -rnd(1, 14)),
      },
    });
    appuntamenti.push(booking);
  }
  log(`  ✅ ${appuntamenti.length} appuntamenti`);

  // ── 12. PREVENTIVI (30) ───────────────────────────────────────────────────
  log('📝 Creazione 30 preventivi...');

  // helper: cerca parte per SKU
  const findPart = (sku: string): any => parti.find((p: any) => p.sku === sku);

  type PrevRiga = {
    type: EstimateLineType;
    desc: string;
    qty: number;
    unitCents: number; // prezzo in centesimi (×100)
    partSku?: string;
  };
  type Scenario = { note: string; righe: PrevRiga[] };

  const SCENARI: Scenario[] = [
    {
      note: 'Tagliando periodico 60.000 km. Sostituzione olio motore, filtro olio, filtro aria, filtro abitacolo. Ispezione 60 punti. Pneumatici in buono stato.',
      righe: [
        {
          type: EstimateLineType.LABOR,
          desc: 'Manodopera tagliando 60.000 km',
          qty: 2,
          unitCents: 7500,
        },
        {
          type: EstimateLineType.PART,
          desc: 'Olio motore Castrol Edge 5W30 (5L)',
          qty: 1,
          unitCents: 5500,
          partSku: 'OM-5W30',
        },
        {
          type: EstimateLineType.PART,
          desc: 'Filtro olio',
          qty: 1,
          unitCents: 1500,
          partSku: 'FO-001',
        },
        {
          type: EstimateLineType.PART,
          desc: 'Filtro aria',
          qty: 1,
          unitCents: 2200,
          partSku: 'FA-001',
        },
        {
          type: EstimateLineType.PART,
          desc: 'Filtro abitacolo',
          qty: 1,
          unitCents: 1800,
          partSku: 'FAB-001',
        },
        { type: EstimateLineType.OTHER, desc: 'Smaltimento olio esausto', qty: 1, unitCents: 1500 },
      ],
    },
    {
      note: 'Sostituzione freni completa: dischi e pastiglie ant. e post. usurati oltre il limite di sicurezza. Liquido freni ossidato, sostituzione consigliata.',
      righe: [
        {
          type: EstimateLineType.LABOR,
          desc: 'Manodopera sostituzione freni completi',
          qty: 3,
          unitCents: 7500,
        },
        {
          type: EstimateLineType.PART,
          desc: 'Disco freno anteriore dx',
          qty: 1,
          unitCents: 11000,
          partSku: 'DF-ANT-DX',
        },
        {
          type: EstimateLineType.PART,
          desc: 'Disco freno anteriore sx',
          qty: 1,
          unitCents: 11000,
          partSku: 'DF-ANT-SX',
        },
        {
          type: EstimateLineType.PART,
          desc: 'Disco freno posteriore dx',
          qty: 1,
          unitCents: 9500,
          partSku: 'DF-POST-DX',
        },
        {
          type: EstimateLineType.PART,
          desc: 'Disco freno posteriore sx',
          qty: 1,
          unitCents: 9500,
          partSku: 'DF-POST-SX',
        },
        {
          type: EstimateLineType.PART,
          desc: 'Pastiglie freno ant. Brembo',
          qty: 1,
          unitCents: 7500,
          partSku: 'PF-ANT-001',
        },
        {
          type: EstimateLineType.PART,
          desc: 'Pastiglie freno post. Brembo',
          qty: 1,
          unitCents: 6200,
          partSku: 'PF-POST-001',
        },
        {
          type: EstimateLineType.OTHER,
          desc: 'Spurgo e rabbocco liquido freni DOT5',
          qty: 1,
          unitCents: 3500,
        },
      ],
    },
    {
      note: 'Sostituzione kit distribuzione + pompa acqua. Percorrenza attuale oltre intervallo raccomandato. Rischio rottura con danni al motore. Intervento urgente.',
      righe: [
        {
          type: EstimateLineType.LABOR,
          desc: 'Manodopera sostituzione distribuzione',
          qty: 6,
          unitCents: 7500,
        },
        {
          type: EstimateLineType.PART,
          desc: 'Kit distribuzione Gates completo',
          qty: 1,
          unitCents: 32000,
          partSku: 'DISTR-001',
        },
        { type: EstimateLineType.PART, desc: 'Pompa acqua originale', qty: 1, unitCents: 8500 },
        {
          type: EstimateLineType.PART,
          desc: 'Liquido raffreddamento (2L)',
          qty: 1,
          unitCents: 1800,
        },
        {
          type: EstimateLineType.PART,
          desc: 'Filtro olio',
          qty: 1,
          unitCents: 1500,
          partSku: 'FO-001',
        },
        { type: EstimateLineType.OTHER, desc: 'Smaltimento rifiuti', qty: 1, unitCents: 1200 },
      ],
    },
    {
      note: 'Sostituzione kit frizione e volano bimassa. Frizione che slitta in quarta e quinta marcia. Volano bimassa con gioco eccessivo. Intervento indifferibile.',
      righe: [
        {
          type: EstimateLineType.LABOR,
          desc: 'Manodopera sostituzione frizione e volano',
          qty: 8,
          unitCents: 7500,
        },
        {
          type: EstimateLineType.PART,
          desc: 'Kit frizione LUK (disco + spingidisco + cuscinetto)',
          qty: 1,
          unitCents: 52000,
          partSku: 'FRIZ-001',
        },
        {
          type: EstimateLineType.PART,
          desc: 'Volano bimassa rigenerato certificato',
          qty: 1,
          unitCents: 68000,
        },
        { type: EstimateLineType.PART, desc: 'Olio cambio (2L)', qty: 1, unitCents: 2400 },
        { type: EstimateLineType.OTHER, desc: 'Smaltimento rifiuti', qty: 1, unitCents: 1500 },
      ],
    },
    {
      note: 'Sostituzione ammortizzatori anteriori. Verifica geometria assetto post-montaggio inclusa. Bracci oscillanti controllati — in buono stato.',
      righe: [
        {
          type: EstimateLineType.LABOR,
          desc: 'Manodopera sostituzione ammortizzatori ant.',
          qty: 3,
          unitCents: 7500,
        },
        {
          type: EstimateLineType.PART,
          desc: 'Ammortizzatore ant. dx Sachs',
          qty: 1,
          unitCents: 16000,
          partSku: 'AMM-ANT-DX',
        },
        {
          type: EstimateLineType.PART,
          desc: 'Ammortizzatore ant. sx Sachs',
          qty: 1,
          unitCents: 16000,
          partSku: 'AMM-ANT-SX',
        },
        {
          type: EstimateLineType.OTHER,
          desc: 'Geometria ruote e assetto',
          qty: 1,
          unitCents: 8500,
        },
      ],
    },
    {
      note: 'Sostituzione batteria scarica e alternatore difettoso. Diagnosi elettrica: tensione di carica 11.4V (minimo 13.5V). Rischio blocco improvviso.',
      righe: [
        {
          type: EstimateLineType.LABOR,
          desc: 'Diagnosi impianto elettrico',
          qty: 1,
          unitCents: 6000,
        },
        {
          type: EstimateLineType.LABOR,
          desc: 'Manodopera sostituzione batteria e alternatore',
          qty: 2,
          unitCents: 7500,
        },
        {
          type: EstimateLineType.PART,
          desc: 'Batteria AGM 70Ah Bosch',
          qty: 1,
          unitCents: 14000,
          partSku: 'BAT-70',
        },
        {
          type: EstimateLineType.PART,
          desc: 'Alternatore rigenerato Valeo',
          qty: 1,
          unitCents: 22000,
        },
        { type: EstimateLineType.PART, desc: 'Cinghia serpentina', qty: 1, unitCents: 3500 },
      ],
    },
    {
      note: 'Diagnosi spia motore accesa P0171 (miscela troppo magra). Sostituzione iniettori Bosch e pulizia sistema alimentazione. Verifica MAF post-montaggio.',
      righe: [
        {
          type: EstimateLineType.LABOR,
          desc: 'Diagnosi elettronica ECU avanzata',
          qty: 1,
          unitCents: 9000,
        },
        {
          type: EstimateLineType.LABOR,
          desc: 'Manodopera sostituzione iniettori (4 pz)',
          qty: 4,
          unitCents: 7500,
        },
        {
          type: EstimateLineType.PART,
          desc: 'Iniettore Bosch rigenerato (4 pz)',
          qty: 4,
          unitCents: 25000,
          partSku: 'INI-001',
        },
        {
          type: EstimateLineType.OTHER,
          desc: 'Pulizia sistema di alimentazione',
          qty: 1,
          unitCents: 4500,
        },
        {
          type: EstimateLineType.OTHER,
          desc: 'Test emissioni post-intervento',
          qty: 1,
          unitCents: 3000,
        },
      ],
    },
    {
      note: 'Cambio olio e filtri urgente — olio motore degradato oltre intervallo di 15.000 km. Sostituzione filtro gasolio con acqua nel filtro.',
      righe: [
        {
          type: EstimateLineType.LABOR,
          desc: 'Manodopera cambio olio + filtri',
          qty: 1,
          unitCents: 7500,
        },
        {
          type: EstimateLineType.PART,
          desc: 'Olio motore 5W40 Mobil 1 (5L)',
          qty: 1,
          unitCents: 5800,
          partSku: 'OM-5W40',
        },
        {
          type: EstimateLineType.PART,
          desc: 'Filtro olio',
          qty: 1,
          unitCents: 1500,
          partSku: 'FO-001',
        },
        {
          type: EstimateLineType.PART,
          desc: 'Filtro gasolio',
          qty: 1,
          unitCents: 2800,
          partSku: 'FG-001',
        },
        {
          type: EstimateLineType.OTHER,
          desc: 'Smaltimento olio e filtri',
          qty: 1,
          unitCents: 1200,
        },
      ],
    },
    {
      note: 'Revisione pre-collaudo: ispezione completa 80 punti, sostituzione candele consumate, controllo livelli e fluidi. Veicolo pronto per revisione ministeriale.',
      righe: [
        {
          type: EstimateLineType.LABOR,
          desc: 'Ispezione pre-collaudo 80 punti',
          qty: 2,
          unitCents: 7500,
        },
        {
          type: EstimateLineType.PART,
          desc: 'Candele NGK Iridium (set 4)',
          qty: 1,
          unitCents: 8000,
          partSku: 'CAND-4',
        },
        {
          type: EstimateLineType.PART,
          desc: 'Liquido freni DOT5.1 (500ml)',
          qty: 1,
          unitCents: 1200,
        },
        { type: EstimateLineType.PART, desc: 'Liquido servosterzo (1L)', qty: 1, unitCents: 900 },
        {
          type: EstimateLineType.OTHER,
          desc: 'Regolazione luci e verifica emissioni',
          qty: 1,
          unitCents: 3500,
        },
      ],
    },
    {
      note: 'Tagliando completo con sostituzione pastiglie anteriori e revisione freni posteriori. Pneumatici verificati e portata a pressione corretta.',
      righe: [
        {
          type: EstimateLineType.LABOR,
          desc: 'Manodopera tagliando + freni anteriori',
          qty: 3,
          unitCents: 7500,
        },
        {
          type: EstimateLineType.PART,
          desc: 'Olio motore 5W30 (5L)',
          qty: 1,
          unitCents: 5500,
          partSku: 'OM-5W30',
        },
        {
          type: EstimateLineType.PART,
          desc: 'Kit filtri (olio + aria)',
          qty: 2,
          unitCents: 1800,
          partSku: 'FO-001',
        },
        {
          type: EstimateLineType.PART,
          desc: 'Pastiglie freno ant. Brembo',
          qty: 1,
          unitCents: 7500,
          partSku: 'PF-ANT-001',
        },
        {
          type: EstimateLineType.OTHER,
          desc: 'Ispezione freni post. + rabbocco liquido',
          qty: 1,
          unitCents: 4500,
        },
        { type: EstimateLineType.OTHER, desc: 'Smaltimento olio', qty: 1, unitCents: 1500 },
      ],
    },
  ];

  const statiPrev: EstimateStatus[] = [
    'ACCEPTED',
    'ACCEPTED',
    'ACCEPTED',
    'ACCEPTED',
    'ACCEPTED',
    'ACCEPTED',
    'ACCEPTED',
    'ACCEPTED',
    'ACCEPTED',
    'ACCEPTED',
    'ACCEPTED',
    'ACCEPTED',
    'REJECTED',
    'REJECTED',
    'REJECTED',
    'REJECTED',
    'REJECTED',
    'SENT',
    'SENT',
    'SENT',
    'SENT',
    'SENT',
    'DRAFT',
    'DRAFT',
    'PARTIALLY_APPROVED',
    'PARTIALLY_APPROVED',
    'EXPIRED',
    'EXPIRED',
    'CONVERTED',
    'CONVERTED',
  ];

  const preventivi: any[] = [];

  for (let i = 0; i < 30; i++) {
    const scenario = SCENARI[i % SCENARI.length];
    const cliente = clienti[rnd(0, 99)];
    // veicolo appartiene al cliente — se non ha veicoli assegnati usa uno casuale
    const veicolo = veicoli.find((v: any) => v.customerId === cliente.id) ?? pick(veicoli);
    const stato = statiPrev[i];
    const data = dateInRange(new Date('2026-01-10'), new Date('2026-05-10'));
    const accettato = stato === 'ACCEPTED' || stato === 'CONVERTED';
    const rifiutato = stato === 'REJECTED';
    const inviato = stato !== 'DRAFT';

    // Calcolo importi in centesimi
    const righeCalc = scenario.righe.map(r => ({
      ...r,
      totalRigaCents: r.qty * r.unitCents,
    }));
    const subtotaleCents = righeCalc.reduce((s, r) => s + r.totalRigaCents, 0);
    const ivaCents = Math.round(subtotaleCents * 0.22);
    const totaleCents = subtotaleCents + ivaCents;

    // Per ACCEPTED: firma digitale e token
    const approvalToken = inviato ? crypto.randomBytes(24).toString('hex') : null;
    const customerSignature = accettato
      ? `${pick(['Marco', 'Giovanni', 'Luca', 'Andrea', 'Sara', 'Elena'])} ${pick(COGNOMI)}`
      : null;

    // Per CONVERTED: collega a un appuntamento esistente (se disponibile)
    const bookingId =
      stato === 'CONVERTED' && appuntamenti.length > 0
        ? appuntamenti[i % appuntamenti.length].id
        : null;

    const preventivo = await prisma.estimate.create({
      data: {
        tenantId: tenant.id,
        estimateNumber: `EST-2026-${String(i + 1).padStart(3, '0')}`,
        customerId: cliente.id,
        vehicleId: veicolo.id,
        status: stato,
        subtotalCents: subtotaleCents,
        vatCents: ivaCents,
        totalCents: totaleCents,
        discountCents: i % 5 === 0 ? Math.round(subtotaleCents * 0.05) : 0, // sconto 5% ogni 5
        validUntil: addDays(data, 30),
        sentAt: inviato ? data : null,
        acceptedAt: accettato ? addDays(data, rnd(1, 7)) : null,
        rejectedAt: rifiutato ? addDays(data, rnd(2, 10)) : null,
        notes: scenario.note,
        createdBy: admin.id,
        termsAccepted: accettato,
        presentationMode: i % 4 === 0 ? 'TIERED' : 'SINGLE',
        approvalToken,
        approvalSentAt: inviato ? addDays(data, 1) : null,
        approvalMethod: inviato ? pick(['EMAIL', 'EMAIL', 'SMS']) : null,
        customerSignature,
        customerSignedAt: accettato ? addDays(data, rnd(1, 6)) : null,
        bookingId,
        createdAt: data,
        lines: {
          create: righeCalc.map((r, pos) => {
            const part = r.partSku ? findPart(r.partSku) : null;
            const isAccepted = accettato || stato === 'PARTIALLY_APPROVED';
            const lineApproved = isAccepted
              ? pos < righeCalc.length - 1 || stato !== 'PARTIALLY_APPROVED'
              : null;
            return {
              position: pos,
              type: r.type,
              description: r.desc,
              quantity: r.qty,
              unitPriceCents: r.unitCents,
              totalCents: r.totalRigaCents,
              vatRate: 0.22,
              tier:
                pos === 0
                  ? EstimateTier.STANDARD
                  : pos === 1
                    ? EstimateTier.PREMIUM
                    : EstimateTier.STANDARD,
              partId: part?.id ?? null,
              customerApproved: lineApproved,
              approvedAt: lineApproved ? addDays(data, rnd(1, 5)) : null,
            };
          }),
        },
      },
    });
    preventivi.push(preventivo);
  }
  log(`  ✅ ${preventivi.length} preventivi`);

  // ── RIEPILOGO ──────────────────────────────────────────────────────────────
  log('\n══════════════════════════════════════════════════════════════');
  log('                   SEED DEMO COMPLETATO                      ');
  log('══════════════════════════════════════════════════════════════');
  log(`  Tenant:            Autofficina Romano Srl (slug: romano)`);
  log(`  Clienti:           ${clienti.length}`);
  log(`  Veicoli:           ${veicoli.length}`);
  log(`  Tecnici:           ${tecnici.length}`);
  log(`  Servizi:           ${servizi.length}`);
  log(`  Ricambi:           ${parti.length}`);
  log(`  Ordini di lavoro:  ${ordini.length}`);
  log(`  Fatture:           ${fatture.length}`);
  log(`  Appuntamenti:      ${appuntamenti.length}`);
  log(`  Preventivi:        ${preventivi.length}`);
  log('──────────────────────────────────────────────────────────────');
  log(`  Fatturato totale: €${totFatturato.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`);
  log(`  Media fattura:    €${(totFatturato / fatture.length).toFixed(2)}`);
  log('──────────────────────────────────────────────────────────────');
  log('  Credenziali:');
  log('     Email:     romano@romano-officina.it');
  log('     Password:  Demo2026!');
  log('     Workspace: romano');
  log('══════════════════════════════════════════════════════════════\n');
}

main()
  .catch((e: Error) => {
    process.stderr.write(`❌ Errore seed: ${e.message}\n`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
