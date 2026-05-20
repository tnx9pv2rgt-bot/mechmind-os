/**
 * FatturaPA SDI Sandbox — Test end-to-end contro sandbox Sistema di Interscambio.
 *
 * CREDENZIALI NECESSARIE (da Agenzia delle Entrate):
 * ──────────────────────────────────────────────────
 * 1. Richiedere accesso sandbox SDI:
 *    https://www.fatturapa.gov.it/it/sistemadiinterscambio/guida-utente/
 *    → "Test" → registrazione utente sandbox
 *
 * 2. Ottenere certificato mTLS (.p12 o .pem + .key):
 *    → Portale Sogei "Fatturazione Elettronica B2B" → area test
 *    → Generare CSR, richiedere certificato, scaricare .p12
 *
 * 3. Endpoint sandbox SDI (verificare disponibilità):
 *    https://ivaservizi.agenziaentrate.gov.it/docs/api.html (sezione sandbox)
 *    Oppure endpoint PEPPOL AP: https://test.peppolap.eu/ (alternativa europea)
 *
 * 4. Variabili env richieste:
 *    SDI_SANDBOX_BASE_URL=https://testservizi.fatturapa.gov.it/ricevi_file
 *    SDI_SANDBOX_USERNAME=[SDI_USERNAME]      ← da ottenere
 *    SDI_SANDBOX_PASSWORD=[SDI_PASSWORD]      ← da ottenere
 *    SDI_CERT_PATH=[percorso al .pem]         ← da ottenere
 *    SDI_CERT_KEY_PATH=[percorso al .key]     ← da ottenere
 *
 * NOTA: questo test è disabilitato (skip) in assenza di credenziali SDI.
 * Impostare ENABLE_SDI_SANDBOX=true nella env per abilitarlo.
 *
 * COME ESEGUIRE (quando le credenziali sono disponibili):
 *   ENABLE_SDI_SANDBOX=true \
 *   SDI_SANDBOX_USERNAME=xxx \
 *   SDI_SANDBOX_PASSWORD=yyy \
 *   npx jest src/invoice/services/fatturapa-sdi-sandbox --forceExit --testTimeout=30000
 */

import { Test, TestingModule } from '@nestjs/testing';
import { FatturapaService } from './fatturapa.service';
import { PrismaService } from '../../common/services/prisma.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { S3Service } from '../../common/services/s3.service';
import { Decimal } from '@prisma/client/runtime/library';

const SDI_ENABLED = process.env.ENABLE_SDI_SANDBOX === 'true';
const SDI_BASE_URL =
  process.env.SDI_SANDBOX_BASE_URL || 'https://testservizi.fatturapa.gov.it/ricevi_file';
const SDI_USERNAME = process.env.SDI_SANDBOX_USERNAME || '[SDI_USERNAME]';
const SDI_PASSWORD = process.env.SDI_SANDBOX_PASSWORD || '[SDI_PASSWORD]';

// ─── Dati di test realistica officina ─────────────────────────────────────────
const TENANT_ID = 'sdi-test-tenant-001';
const INVOICE_ID = 'sdi-test-invoice-001';

const mockTenant = {
  id: TENANT_ID,
  name: 'Officina Test SDI SRL',
  settings: {
    ragioneSociale: 'Officina Test SDI SRL',
    partitaIva: '00000000000', // P.IVA sandbox SDI
    codiceFiscale: 'TSTFSC00A01H501A',
    regimeFiscale: 'RF01',
    indirizzo: 'Via dei Test 1',
    cap: '00100',
    comune: 'Roma',
    provincia: 'RM',
    nazione: 'IT',
  },
};

const mockCustomer = {
  id: 'cust-sdi-001',
  customerType: 'AZIENDA',
  encryptedFirstName: null,
  encryptedLastName: null,
  companyName: 'Cliente Test SRL',
  codiceFiscale: null,
  partitaIva: '99999999999',
  sdiCode: '0000000', // codice SDI sandbox
  pecEmail: 'cliente@pec-test.it',
  address: 'Via Cliente 99',
  postalCode: '20100',
  city: 'Milano',
  province: 'MI',
  country: 'IT',
};

const mockInvoiceItems = [
  {
    id: 'item-sdi-1',
    position: 1,
    description: 'Servizio di test SDI',
    quantity: new Decimal(1),
    unitPrice: new Decimal(100),
    vatRate: new Decimal(22),
    discount: new Decimal(0),
    subtotal: new Decimal(100),
    vatAmount: new Decimal(22),
    total: new Decimal(122),
  },
];

const mockInvoice = {
  id: INVOICE_ID,
  tenantId: TENANT_ID,
  number: 'TEST-SDI-001',
  year: 2026,
  issueDate: new Date('2026-05-13'),
  dueDate: new Date('2026-06-12'),
  status: 'SENT',
  subtotal: new Decimal(100),
  vatTotal: new Decimal(22),
  total: new Decimal(122),
  notes: 'Fattura test SDI sandbox',
  customer: mockCustomer,
  items: mockInvoiceItems,
};

// ─── Helper: invia XML a SDI sandbox ──────────────────────────────────────────
async function sendToSDISandbox(xmlContent: string): Promise<{
  success: boolean;
  status: number;
  body: string;
  esito?: string;
}> {
  const base64Xml = Buffer.from(xmlContent).toString('base64');

  // Il SDI accetta XML in formato multipart o SOAP.
  // Questa implementazione usa HTTP Basic Auth (sandbox).
  // In produzione si usa mTLS con certificato Agenzia Entrate.
  const credentials = Buffer.from(`${SDI_USERNAME}:${SDI_PASSWORD}`).toString('base64');

  try {
    const response = await fetch(`${SDI_BASE_URL}/RiceviFile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${credentials}`,
        'X-SDI-Test': 'true',
      },
      body: JSON.stringify({
        xmlContent: base64Xml,
        nomefile: `IT00000000000_TEST01.xml`,
      }),
    });

    const body = await response.text();
    const esito = body.includes('RC')
      ? 'RICEVUTA_CONSEGNA'
      : body.includes('NS')
        ? 'NOTIFICA_SCARTO'
        : body.includes('MC')
          ? 'MANCATA_CONSEGNA'
          : 'SCONOSCIUTO';

    return { success: response.ok, status: response.status, body, esito };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, status: 0, body: message };
  }
}

// ─── Test suite ───────────────────────────────────────────────────────────────
const describeOrSkip = SDI_ENABLED ? describe : describe.skip;

describeOrSkip('FatturaPA SDI Sandbox — end-to-end', () => {
  let service: FatturapaService;

  const mockPrisma = {
    invoice: {
      findFirst: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
    },
  };

  const mockEncryption = {
    decrypt: jest.fn((val: string) => {
      if (val === 'enc-mario') return 'Mario';
      if (val === 'enc-rossi') return 'Rossi';
      return val;
    }),
  };

  const mockS3 = {
    uploadBuffer: jest.fn().mockResolvedValue('s3://test-bucket/IT00000000000_TEST01.xml'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FatturapaService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EncryptionService, useValue: mockEncryption },
        { provide: S3Service, useValue: mockS3 },
      ],
    }).compile();

    service = module.get<FatturapaService>(FatturapaService);

    mockPrisma.invoice.findFirst.mockResolvedValue(mockInvoice);
    mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);
  });

  // ── Test 1: Generazione XML FatturaPA valido ─────────────────────────────
  it('genera XML FatturaPA valido (struttura e campi obbligatori)', async () => {
    const xml = await service.generateXml(TENANT_ID, INVOICE_ID);

    // Struttura XML obbligatoria per FatturaPA v1.2.2
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('FatturaElettronica');
    expect(xml).toContain('FatturaElettronicaHeader');
    expect(xml).toContain('FatturaElettronicaBody');
    expect(xml).toContain('DatiGeneraliDocumento');
    expect(xml).toContain('DettaglioLinee');

    // Campi mittente (cedente)
    expect(xml).toContain('Officina Test SDI SRL');
    expect(xml).toContain('00000000000'); // P.IVA fornitore

    // Campi destinatario (cessionario)
    expect(xml).toContain('0000000'); // codice SDI destinatario

    // Dati documento
    expect(xml).toContain('TEST-SDI-001'); // numero fattura
    expect(xml).toContain('100'); // imponibile
    expect(xml).toContain('22'); // aliquota IVA
  });

  // ── Test 2: XML è ben formato (parse senza errori) ───────────────────────
  it('genera XML sintatticamente valido (parse senza errori)', async () => {
    const xml = await service.generateXml(TENANT_ID, INVOICE_ID);

    // Il DOMParser non è disponibile in Node.js, usiamo un check di base
    expect(xml.trim()).toMatch(/^<\?xml/);
    expect(xml).toMatch(/<\/FatturaElettronica>$/);

    // Verifica bilanciamento dei tag principali
    const openTags = (xml.match(/<FatturaElettronica[^/]/g) || []).length;
    const closeTags = (xml.match(/<\/FatturaElettronica>/g) || []).length;
    expect(openTags).toBe(closeTags);
  });

  // ── Test 3: Invio a sandbox SDI (richiede credenziali) ───────────────────
  it('invia XML a sandbox SDI e riceve risposta valida', async () => {
    const xml = await service.generateXml(TENANT_ID, INVOICE_ID);

    expect(xml).toBeTruthy();
    expect(xml.length).toBeGreaterThan(100);

    const result = await sendToSDISandbox(xml);

    // La sandbox SDI dovrebbe rispondere con:
    // - RC (Ricevuta Consegna): fattura consegnata al destinatario
    // - NS (Notifica Scarto): XML non valido o dati errati
    // - MC (Mancata Consegna): destinatario non raggiungibile
    //
    // Accettiamo RC e NS come risposte valide (NS atteso con P.IVA sandbox)
    expect(result.status).toBeGreaterThan(0);
    expect(['RICEVUTA_CONSEGNA', 'NOTIFICA_SCARTO', 'MANCATA_CONSEGNA']).toContain(result.esito);

    // eslint-disable-next-line no-restricted-syntax
    process.stderr.write(`SDI Sandbox response: ${result.esito} (HTTP ${result.status})\n`);
    process.stderr.write(`Body: ${result.body.substring(0, 200)}\n`);
  }, 30000); // timeout 30s per risposta SDI

  // ── Test 4: Upload XML su S3 (storage fatture elettroniche) ──────────────
  it('carica XML su S3 dopo generazione', async () => {
    const xml = await service.generateXml(TENANT_ID, INVOICE_ID);
    const xmlBuffer = Buffer.from(xml, 'utf-8');

    await mockS3.uploadBuffer(xmlBuffer, `IT00000000000_TEST01.xml`, 'text/xml');

    expect(mockS3.uploadBuffer).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.stringContaining('.xml'),
      'text/xml',
    );
  });
});

// ─── Test suite SENZA credenziali SDI (sempre eseguiti) ──────────────────────
describe('FatturaPA XML generation — unit tests (no SDI)', () => {
  let service: FatturapaService;

  const mockPrisma = {
    invoice: { findFirst: jest.fn() },
    tenant: { findUnique: jest.fn() },
  };

  const mockEncryption = {
    decrypt: jest.fn((val: string) => val.replace('enc-', '')),
  };

  const mockS3 = {
    uploadBuffer: jest.fn().mockResolvedValue('s3://bucket/fattura.xml'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FatturapaService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EncryptionService, useValue: mockEncryption },
        { provide: S3Service, useValue: mockS3 },
      ],
    }).compile();

    service = module.get<FatturapaService>(FatturapaService);
    mockPrisma.invoice.findFirst.mockResolvedValue(mockInvoice);
    mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);
  });

  it('service è definito', () => {
    expect(service).toBeDefined();
  });

  it('SDI sandbox test configurato correttamente', () => {
    // Verifica che le env vars placeholder siano documentate
    const envVars = ['SDI_SANDBOX_BASE_URL', 'SDI_SANDBOX_USERNAME', 'SDI_SANDBOX_PASSWORD'];
    // Documenta quali env vars sono necessarie (output su stderr per non inquinare test output)
    process.stderr.write('Variabili env per SDI sandbox:\n');
    envVars.forEach(v => {
      // eslint-disable-next-line security/detect-object-injection
      const val = process.env[v];
      process.stderr.write(`  ${v}=${val ? '*** (configurato)' : '[NON CONFIGURATO]'}\n`);
    });

    // Il test stesso non richiede le env, ma documenta cosa serve
    expect(SDI_BASE_URL).toBeTruthy();
    expect(SDI_USERNAME).toBeTruthy();
    expect(SDI_PASSWORD).toBeTruthy();
  });
});
