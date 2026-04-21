import { Test, TestingModule } from '@nestjs/testing';
import { PeppolService } from './peppol.service';
import { LoggerService } from '../common/services/logger.service';
import { PeppolInvoice } from './peppol.types';

describe('PeppolService', () => {
  let service: PeppolService;
  let mockLogger: Partial<LoggerService>;

  beforeEach(async () => {
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PeppolService,
        {
          provide: LoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<PeppolService>(PeppolService);
  });

  const createSampleInvoice = (): PeppolInvoice => ({
    invoiceNumber: 'INV-2025-001',
    issueDate: '2025-01-15',
    dueDate: '2025-02-15',
    currency: 'EUR',
    seller: {
      name: 'Test Garage SRL',
      vatNumber: 'IT12345678901',
      address: 'Via Roma 1',
      city: 'Milan',
      country: 'IT',
      postalCode: '20100',
    },
    buyer: {
      name: 'ABC Manufacturing',
      vatNumber: 'IT98765432109',
      address: 'Via Verdi 5',
      city: 'Rome',
      country: 'IT',
      postalCode: '00100',
    },
    lines: [
      {
        id: '1',
        description: 'Labor - Engine diagnostics',
        quantity: 4,
        unitPrice: 50,
        vatRate: 22,
        lineTotal: 200,
      },
      {
        id: '2',
        description: 'Parts - Oil filter',
        quantity: 2,
        unitPrice: 15,
        vatRate: 22,
        lineTotal: 30,
      },
    ],
    taxableAmount: 230,
    vatAmount: 50.6,
    totalAmount: 280.6,
  });

  describe('generateUBL', () => {
    it('should generate valid UBL XML with correct namespace', () => {
      const invoice = createSampleInvoice();
      const result = service.generateUBL(invoice);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.xml).toContain('urn:oasis:names:specification:ubl:schema:xsd:Invoice-2');
      expect(result.xml).toContain('urn:fdc:peppol.eu:2017:poacc:billing:3.0');
    });

    it('should include all required EN 16931 elements', () => {
      const invoice = createSampleInvoice();
      const result = service.generateUBL(invoice);

      expect(result.xml).toContain('<cbc:ID>INV-2025-001</cbc:ID>');
      expect(result.xml).toContain('<cbc:IssueDate>2025-01-15</cbc:IssueDate>');
      expect(result.xml).toContain('<cbc:DueDate>2025-02-15</cbc:DueDate>');
      expect(result.xml).toContain('<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>');
      expect(result.xml).toContain('<cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>');
      expect(result.xml).toContain('<cac:AccountingSupplierParty>');
      expect(result.xml).toContain('<cac:AccountingCustomerParty>');
      expect(result.xml).toContain('<cac:InvoiceLine>');
      expect(result.xml).toContain('<cac:LegalMonetaryTotal>');
      expect(result.xml).toContain('<cac:TaxTotal>');
    });

    it('should map seller and buyer parties correctly', () => {
      const invoice = createSampleInvoice();
      const result = service.generateUBL(invoice);

      expect(result.xml).toContain('Test Garage SRL');
      expect(result.xml).toContain('IT12345678901');
      expect(result.xml).toContain('ABC Manufacturing');
      expect(result.xml).toContain('IT98765432109');
    });

    it('should include line items with correct amounts', () => {
      const invoice = createSampleInvoice();
      const result = service.generateUBL(invoice);

      expect(result.xml).toContain('Labor - Engine diagnostics');
      expect(result.xml).toContain('Parts - Oil filter');
      expect(result.xml).toContain('200.00');
      expect(result.xml).toContain('30.00');
    });

    it('should set correct VAT category for Italian standard rate', () => {
      const invoice = createSampleInvoice();
      const result = service.generateUBL(invoice);

      expect(result.xml).toContain('<cbc:ID>S</cbc:ID>');
      expect(result.xml).toContain('<cbc:Percent>22</cbc:Percent>');
    });

    it('should handle invoices with buyer reference (PO number)', () => {
      const invoice = createSampleInvoice();
      invoice.buyerReference = 'PO-12345';
      const result = service.generateUBL(invoice);

      expect(result.xml).toContain('<cbc:BuyerReference>PO-12345</cbc:BuyerReference>');
    });

    it('should handle invoices with notes', () => {
      const invoice = createSampleInvoice();
      invoice.note = 'Payment due within 30 days';
      const result = service.generateUBL(invoice);

      expect(result.xml).toContain('<cbc:Note>Payment due within 30 days</cbc:Note>');
    });

    it('should return errors for missing required fields', () => {
      const invoice = createSampleInvoice();
      invoice.invoiceNumber = '';

      const result = service.generateUBL(invoice);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('invoiceNumber required');
    });

    it('should return errors for missing line items', () => {
      const invoice = createSampleInvoice();
      invoice.lines = [];

      const result = service.generateUBL(invoice);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one line item required');
    });

    it('should escape XML special characters', () => {
      const invoice = createSampleInvoice();
      invoice.seller.name = 'Test & Co. <Special>';
      invoice.lines[0].description = 'Part with "quotes" & ampersand';

      const result = service.generateUBL(invoice);

      expect(result.xml).toContain('Test &amp; Co. &lt;Special&gt;');
      expect(result.xml).toContain('Part with &quot;quotes&quot; &amp; ampersand');
    });
  });

  describe('validateUBL', () => {
    it('should validate correct UBL XML', () => {
      const invoice = createSampleInvoice();
      const generatedResult = service.generateUBL(invoice);
      const validationResult = service.validateUBL(generatedResult.xml);

      expect(validationResult.valid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
    });

    it('should detect missing required elements', () => {
      const xml = `<?xml version="1.0"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <cbc:ID>INV-001</cbc:ID>
</Invoice>`;

      const result = service.validateUBL(xml);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('IssueDate'))).toBe(true);
    });

    it('should detect missing UBL namespace', () => {
      const xml = `<?xml version="1.0"?>
<Invoice>
  <ID>INV-001</ID>
</Invoice>`;

      const result = service.validateUBL(xml);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('UBL namespace'))).toBe(true);
    });

    it('should detect missing Peppol customization', () => {
      const xml = `<?xml version="1.0"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <ID>INV-001</ID>
</Invoice>`;

      const result = service.validateUBL(xml);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Peppol BIS 3.0'))).toBe(true);
    });

    it('should handle empty XML', () => {
      const result = service.validateUBL('');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('XML is empty');
    });
  });

  describe('generatePeppolId', () => {
    it('should format Peppol ID correctly for Italian VAT', () => {
      const peppolId = service.generatePeppolId('IT12345678901');

      expect(peppolId).toBe('0211:IT12345678901');
    });

    it('should work with VAT numbers without IT prefix', () => {
      const peppolId = service.generatePeppolId('12345678901');

      expect(peppolId).toBe('0211:12345678901');
    });

    it('should throw error for empty VAT number', () => {
      expect(() => service.generatePeppolId('')).toThrow();
    });
  });

  describe('convertFromFatturaPa', () => {
    it('should convert FatturaPA XML to Peppol UBL format', () => {
      const fatturaPaXml = `<?xml version="1.0"?>
<FatturaElettronica>
  <FatturaElettronicaHeader>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento>
        <Divisa>EUR</Divisa>
        <Data>2025-01-15</Data>
        <Numero>INV-2025-001</Numero>
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <CedentePrestatore>
      <DatiAnagrafici>
        <Denominazione>Test Garage SRL</Denominazione>
        <IdCodice>IT12345678901</IdCodice>
      </DatiAnagrafici>
      <Indirizzo>
        <Indirizzo>Via Roma 1</Indirizzo>
        <CAP>20100</CAP>
        <Comune>Milan</Comune>
        <Nazione>IT</Nazione>
      </Indirizzo>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>
        <Denominazione>ABC Manufacturing</Denominazione>
        <IdCodice>IT98765432109</IdCodice>
      </DatiAnagrafici>
      <Indirizzo>
        <Indirizzo>Via Verdi 5</Indirizzo>
        <CAP>00100</CAP>
        <Comune>Rome</Comune>
        <Nazione>IT</Nazione>
      </Indirizzo>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiBeniServizi>
      <DettaglioLinee>
        <NumeroLinea>1</NumeroLinea>
        <Descrizione>Labor - Engine diagnostics</Descrizione>
        <Quantita>4</Quantita>
        <PrezzoUnitario>50.00</PrezzoUnitario>
        <AliquotaIVA>22.00</AliquotaIVA>
      </DettaglioLinee>
      <DettaglioLinee>
        <NumeroLinea>2</NumeroLinea>
        <Descrizione>Parts - Oil filter</Descrizione>
        <Quantita>2</Quantita>
        <PrezzoUnitario>15.00</PrezzoUnitario>
        <AliquotaIVA>22.00</AliquotaIVA>
      </DettaglioLinee>
    </DatiBeniServizi>
  </FatturaElettronicaBody>
</FatturaElettronica>`;

      const result = service.convertFromFatturaPa(fatturaPaXml);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.xml).toContain('INV-2025-001');
      expect(result.xml).toContain('Test Garage SRL');
      expect(result.xml).toContain('ABC Manufacturing');
      expect(result.xml).toContain('Labor - Engine diagnostics');
      expect(result.xml).toContain('Parts - Oil filter');
    });

    it('should return error for FatturaPA without invoice data', () => {
      const fatturaPaXml = `<?xml version="1.0"?>
<FatturaElettronica>
  <FatturaElettronicaHeader>
    <DatiGenerali>
      <DatiGeneraliDocumento>
      </DatiGeneraliDocumento>
    </DatiGenerali>
  </FatturaElettronicaHeader>
</FatturaElettronica>`;

      const result = service.convertFromFatturaPa(fatturaPaXml);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('invoice number or issue date'))).toBe(true);
    });

    it('should return error for FatturaPA without line items', () => {
      const fatturaPaXml = `<?xml version="1.0"?>
<FatturaElettronica>
  <FatturaElettronicaHeader>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <Data>2025-01-15</Data>
        <Numero>INV-2025-001</Numero>
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <CedentePrestatore>
      <DatiAnagrafici>
        <Denominazione>Test Garage SRL</Denominazione>
        <IdCodice>IT12345678901</IdCodice>
      </DatiAnagrafici>
    </CedentePrestatore>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiBeniServizi>
    </DatiBeniServizi>
  </FatturaElettronicaBody>
</FatturaElettronica>`;

      const result = service.convertFromFatturaPa(fatturaPaXml);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('No line items'))).toBe(true);
    });
  });
});
