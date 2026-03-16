import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { PrismaService } from '../../common/services/prisma.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { Decimal } from '@prisma/client/runtime/library';

describe('PdfService', () => {
  let service: PdfService;
  let prisma: Record<string, Record<string, jest.Mock>>;
  let encryption: { decrypt: jest.Mock };

  const TENANT_ID = 'tenant-001';
  const INVOICE_ID = 'inv-001';

  const mockTenant = {
    id: TENANT_ID,
    name: 'Officina Test SRL',
    settings: {
      ragioneSociale: 'Officina Test SRL',
      partitaIva: '12345678901',
      codiceFiscale: 'ABCDE12345F',
      indirizzo: 'Via Roma 1',
      cap: '00100',
      comune: 'Roma',
      provincia: 'RM',
    },
  };

  const mockCustomer = {
    id: 'cust-001',
    customerType: 'PERSONA',
    encryptedFirstName: 'enc-Mario',
    encryptedLastName: 'enc-Rossi',
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

  const mockInvoice = {
    id: INVOICE_ID,
    tenantId: TENANT_ID,
    invoiceNumber: 'INV-2026-0001',
    documentType: 'FATTURA',
    paymentMethod: 'BONIFICO',
    paymentTerms: 'TRENTA_GIORNI',
    taxRegime: 'ORDINARIO',
    stampDuty: false,
    subtotal: new Decimal(100),
    taxRate: new Decimal(22),
    taxAmount: new Decimal(22),
    total: new Decimal(122),
    notes: 'Test note',
    dueDate: new Date('2026-04-15'),
    createdAt: new Date('2026-03-15'),
    customer: mockCustomer,
    invoiceItems: [
      {
        description: 'Cambio olio',
        quantity: new Decimal(1),
        unitPrice: new Decimal(100),
        vatRate: new Decimal(22),
        discount: new Decimal(0),
        subtotal: new Decimal(100),
      },
    ],
    items: null,
  };

  beforeEach(async () => {
    prisma = {
      invoice: { findFirst: jest.fn() },
      tenant: { findUnique: jest.fn() },
    };
    encryption = {
      decrypt: jest.fn((val: string) => val.replace('enc-', '')),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfService,
        { provide: PrismaService, useValue: prisma },
        { provide: EncryptionService, useValue: encryption },
      ],
    }).compile();

    service = module.get<PdfService>(PdfService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateInvoicePdf', () => {
    beforeEach(() => {
      prisma.invoice.findFirst.mockResolvedValue(mockInvoice);
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
    });

    it('should generate HTML buffer for invoice', async () => {
      const buffer = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);

      expect(buffer).toBeInstanceOf(Buffer);
      const html = buffer.toString('utf-8');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('INV-2026-0001');
      expect(html).toContain('Officina Test SRL');
      expect(html).toContain('Mario Rossi');
      expect(html).toContain('Cambio olio');
    });

    it('should include fiscal data in the output', async () => {
      const buffer = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      const html = buffer.toString('utf-8');

      expect(html).toContain('12345678901');
      expect(html).toContain('RSSMRA80A01H501U');
      expect(html).toContain('SDI: 0000000');
    });

    it('should include payment info', async () => {
      const buffer = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      const html = buffer.toString('utf-8');

      expect(html).toContain('Bonifico bancario');
      expect(html).toContain('30 giorni data fattura');
    });

    it('should include VAT summary', async () => {
      const buffer = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      const html = buffer.toString('utf-8');

      expect(html).toContain('Riepilogo IVA');
      expect(html).toContain('22,00%');
    });

    it('should include stamp duty when applicable', async () => {
      prisma.invoice.findFirst.mockResolvedValue({ ...mockInvoice, stampDuty: true });

      const buffer = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      const html = buffer.toString('utf-8');

      expect(html).toContain('Bollo virtuale');
    });

    it('should handle nota di credito label', async () => {
      prisma.invoice.findFirst.mockResolvedValue({
        ...mockInvoice,
        documentType: 'NOTA_CREDITO',
      });

      const buffer = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      const html = buffer.toString('utf-8');

      expect(html).toContain('Nota di Credito');
    });

    it('should throw NotFoundException for missing invoice', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);

      await expect(service.generateInvoicePdf(INVOICE_ID, TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for missing tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.generateInvoicePdf(INVOICE_ID, TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include tax regime footer', async () => {
      const buffer = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      const html = buffer.toString('utf-8');

      expect(html).toContain('Regime Ordinario');
    });

    it('should decrypt customer PII via EncryptionService', async () => {
      await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);

      expect(encryption.decrypt).toHaveBeenCalledWith('enc-Mario');
      expect(encryption.decrypt).toHaveBeenCalledWith('enc-Rossi');
    });
  });
});
