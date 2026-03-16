import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FatturapaService } from './fatturapa.service';
import { PrismaService } from '../../common/services/prisma.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { S3Service } from '../../common/services/s3.service';
import { Decimal } from '@prisma/client/runtime/library';

describe('FatturapaService', () => {
  let service: FatturapaService;
  let prisma: Record<string, Record<string, jest.Mock>>;
  let encryption: { decrypt: jest.Mock };
  let s3: { uploadBuffer: jest.Mock };

  const TENANT_ID = 'tenant-001';
  const INVOICE_ID = 'inv-001';

  const mockTenant = {
    id: TENANT_ID,
    name: 'Officina Test SRL',
    settings: {
      ragioneSociale: 'Officina Test SRL',
      partitaIva: '12345678901',
      codiceFiscale: 'ABCDE12345F',
      regimeFiscale: 'RF01',
      indirizzo: 'Via Roma 1',
      cap: '00100',
      comune: 'Roma',
      provincia: 'RM',
      nazione: 'IT',
    },
  };

  const mockCustomer = {
    id: 'cust-001',
    customerType: 'PERSONA',
    encryptedFirstName: 'enc-mario',
    encryptedLastName: 'enc-rossi',
    codiceFiscale: 'RSSMRA80A01H501U',
    partitaIva: null,
    sdiCode: '0000000',
    pecEmail: null,
    address: 'Via Verdi 5',
    postalCode: '20100',
    city: 'Milano',
    province: 'MI',
    country: 'IT',
  };

  const mockInvoiceItems = [
    {
      id: 'item-1',
      position: 1,
      description: 'Cambio olio',
      quantity: new Decimal(1),
      unitPrice: new Decimal(50),
      vatRate: new Decimal(22),
      discount: new Decimal(0),
      subtotal: new Decimal(50),
      vatAmount: new Decimal(11),
      total: new Decimal(61),
    },
    {
      id: 'item-2',
      position: 2,
      description: 'Filtro olio',
      quantity: new Decimal(2),
      unitPrice: new Decimal(15),
      vatRate: new Decimal(22),
      discount: new Decimal(10),
      subtotal: new Decimal(27),
      vatAmount: new Decimal(5.94),
      total: new Decimal(32.94),
    },
  ];

  const mockInvoice = {
    id: INVOICE_ID,
    tenantId: TENANT_ID,
    invoiceNumber: 'INV-2026-0001',
    status: 'SENT',
    documentType: 'FATTURA',
    paymentMethod: 'BONIFICO',
    paymentTerms: 'TRENTA_GIORNI',
    taxRegime: 'ORDINARIO',
    stampDuty: false,
    subtotal: new Decimal(77),
    taxRate: new Decimal(22),
    taxAmount: new Decimal(16.94),
    total: new Decimal(93.94),
    notes: 'Manutenzione ordinaria',
    dueDate: new Date('2026-04-15'),
    createdAt: new Date('2026-03-15'),
    customer: mockCustomer,
    invoiceItems: mockInvoiceItems,
    items: null,
  };

  beforeEach(async () => {
    prisma = {
      invoice: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      tenant: {
        findUnique: jest.fn(),
      },
    };

    encryption = {
      decrypt: jest.fn((val: string) => val.replace('enc-', '')),
    };

    s3 = {
      uploadBuffer: jest.fn().mockResolvedValue({ Location: 'https://s3.example.com/fattura.xml' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FatturapaService,
        { provide: PrismaService, useValue: prisma },
        { provide: EncryptionService, useValue: encryption },
        { provide: S3Service, useValue: s3 },
      ],
    }).compile();

    service = module.get<FatturapaService>(FatturapaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateXml', () => {
    beforeEach(() => {
      prisma.invoice.findFirst.mockResolvedValue(mockInvoice);
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.invoice.update.mockResolvedValue(mockInvoice);
    });

    it('should generate valid FatturaPA XML', async () => {
      const xml = await service.generateXml(INVOICE_ID, TENANT_ID);

      expect(xml).toContain('FatturaElettronica');
      expect(xml).toContain('FatturaElettronicaHeader');
      expect(xml).toContain('DatiBeniServizi');
      expect(xml).toContain('DatiPagamento');
      expect(xml).toContain('FPR12');
      expect(xml).toContain('12345678901');
      expect(xml).toContain('RSSMRA80A01H501U');
      expect(xml).toContain('Cambio olio');
      expect(xml).toContain('Filtro olio');
      expect(xml).toContain('TD01');
    });

    it('should include customer name/cognome for PERSONA', async () => {
      const xml = await service.generateXml(INVOICE_ID, TENANT_ID);

      expect(xml).toContain('<Nome>mario</Nome>');
      expect(xml).toContain('<Cognome>rossi</Cognome>');
      // CessionarioCommittente should NOT have Denominazione for PERSONA
      const cessionario = xml.split('CessionarioCommittente')[1];
      expect(cessionario).not.toContain('<Denominazione>');
    });

    it('should include Denominazione for AZIENDA', async () => {
      const aziendaInvoice = {
        ...mockInvoice,
        customer: { ...mockCustomer, customerType: 'AZIENDA', partitaIva: '98765432109' },
      };
      prisma.invoice.findFirst.mockResolvedValue(aziendaInvoice);

      const xml = await service.generateXml(INVOICE_ID, TENANT_ID);

      const cessionario = xml.split('CessionarioCommittente')[1];
      expect(cessionario).toContain('<Denominazione>');
      expect(cessionario).not.toContain('<Nome>');
    });

    it('should include PEC when present', async () => {
      const pecInvoice = {
        ...mockInvoice,
        customer: { ...mockCustomer, pecEmail: 'test@pec.it' },
      };
      prisma.invoice.findFirst.mockResolvedValue(pecInvoice);

      const xml = await service.generateXml(INVOICE_ID, TENANT_ID);

      expect(xml).toContain('<PECDestinatario>test@pec.it</PECDestinatario>');
    });

    it('should upload XML to S3 and update invoice', async () => {
      await service.generateXml(INVOICE_ID, TENANT_ID);

      expect(s3.uploadBuffer).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.stringContaining('fatturapa/'),
        'application/xml',
        TENANT_ID,
      );
      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: INVOICE_ID },
        data: { xmlUrl: 'https://s3.example.com/fattura.xml' },
      });
    });

    it('should throw NotFoundException for missing invoice', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);

      await expect(service.generateXml(INVOICE_ID, TENANT_ID)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if customer has no fiscal data', async () => {
      const noFiscalInvoice = {
        ...mockInvoice,
        customer: { ...mockCustomer, codiceFiscale: null, partitaIva: null },
      };
      prisma.invoice.findFirst.mockResolvedValue(noFiscalInvoice);

      await expect(service.generateXml(INVOICE_ID, TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('should handle nota di credito (TD04)', async () => {
      const creditNote = {
        ...mockInvoice,
        documentType: 'NOTA_CREDITO',
      };
      prisma.invoice.findFirst.mockResolvedValue(creditNote);

      const xml = await service.generateXml(INVOICE_ID, TENANT_ID);

      expect(xml).toContain('<TipoDocumento>TD04</TipoDocumento>');
    });

    it('should include bollo virtuale when stampDuty is true', async () => {
      const bolloInvoice = { ...mockInvoice, stampDuty: true };
      prisma.invoice.findFirst.mockResolvedValue(bolloInvoice);

      const xml = await service.generateXml(INVOICE_ID, TENANT_ID);

      expect(xml).toContain('<BolloVirtuale>SI</BolloVirtuale>');
      expect(xml).toContain('<ImportoBollo>2.00</ImportoBollo>');
    });

    it('should include DatiRiepilogo grouped by VAT rate', async () => {
      const xml = await service.generateXml(INVOICE_ID, TENANT_ID);

      expect(xml).toContain('<DatiRiepilogo>');
      expect(xml).toContain('<AliquotaIVA>22.00</AliquotaIVA>');
      expect(xml).toContain('<EsigibilitaIVA>I</EsigibilitaIVA>');
    });
  });

  describe('buildXml', () => {
    it('should escape XML special characters', () => {
      const xml = service.buildXml({
        tenant: {
          ragioneSociale: 'Test & Sons <SRL>',
          partitaIva: '12345678901',
          codiceFiscale: 'CF123',
          regimeFiscale: 'RF01',
          indirizzo: 'Via "Test"',
          cap: '00100',
          comune: 'Roma',
          provincia: 'RM',
          nazione: 'IT',
        },
        customer: {
          tipo: 'PERSONA',
          nome: 'Mario',
          cognome: 'Rossi',
          codiceFiscale: 'CF456',
          indirizzo: 'Via Test',
          cap: '20100',
          comune: 'Milano',
          provincia: 'MI',
          nazione: 'IT',
        },
        invoice: {
          tipoDocumento: 'TD01',
          numero: 'INV-001',
          data: '2026-03-15',
          divisa: 'EUR',
        },
        items: [
          {
            numero: 1,
            descrizione: 'Service',
            quantita: 1,
            prezzoUnitario: 100,
            prezzoTotale: 100,
            aliquotaIva: 22,
          },
        ],
        riepilogoIva: [{ aliquotaIva: 22, imponibile: 100, imposta: 22 }],
        pagamento: {
          condizioniPagamento: 'TP02',
          modalitaPagamento: 'MP05',
          importoPagamento: 122,
        },
      });

      expect(xml).toContain('Test &amp; Sons &lt;SRL&gt;');
      expect(xml).toContain('Via &quot;Test&quot;');
    });
  });
});
