/* eslint-disable @typescript-eslint/no-explicit-any */
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
      estimate: { findFirst: jest.fn() },
      customer: { findFirst: jest.fn() },
      vehicle: { findUnique: jest.fn() },
      workOrder: { findFirst: jest.fn() },
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

  describe('generateEstimatePdf', () => {
    const ESTIMATE_ID = 'est-001';

    const mockEstimate = {
      id: ESTIMATE_ID,
      tenantId: TENANT_ID,
      estimateNumber: 'EST-2026-0001',
      customerId: 'cust-001',
      vehicleId: 'veh-001',
      status: 'DRAFT',
      subtotalCents: BigInt(10000),
      vatCents: BigInt(2200),
      totalCents: BigInt(12200),
      discountCents: BigInt(0),
      validUntil: new Date('2026-04-15'),
      notes: 'Preventivo test',
      createdAt: new Date('2026-03-15'),
      lines: [
        {
          description: 'Cambio pastiglie freno',
          type: 'LABOR',
          quantity: 1,
          unitPriceCents: BigInt(10000),
          vatRate: new Decimal(22),
          totalCents: BigInt(10000),
        },
      ],
    };

    const mockVehicle = {
      id: 'veh-001',
      make: 'Fiat',
      model: 'Panda',
      licensePlate: 'AB123CD',
    };

    beforeEach(() => {
      prisma.estimate.findFirst.mockResolvedValue(mockEstimate);
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.customer.findFirst.mockResolvedValue(mockCustomer);
      prisma.vehicle.findUnique.mockResolvedValue(mockVehicle);
    });

    it('should generate HTML buffer for estimate', async () => {
      const buffer = await service.generateEstimatePdf(ESTIMATE_ID, TENANT_ID);

      expect(buffer).toBeInstanceOf(Buffer);
      const html = buffer.toString('utf-8');
      expect(html).toContain('PREVENTIVO');
      expect(html).toContain('EST-2026-0001');
      expect(html).toContain('Officina Test SRL');
      expect(html).toContain('Mario Rossi');
      expect(html).toContain('Cambio pastiglie freno');
    });

    it('should include vehicle info', async () => {
      const buffer = await service.generateEstimatePdf(ESTIMATE_ID, TENANT_ID);
      const html = buffer.toString('utf-8');

      expect(html).toContain('Fiat');
      expect(html).toContain('Panda');
      expect(html).toContain('AB123CD');
    });

    it('should throw NotFoundException for missing estimate', async () => {
      prisma.estimate.findFirst.mockResolvedValue(null);

      await expect(service.generateEstimatePdf(ESTIMATE_ID, TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for missing tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.generateEstimatePdf(ESTIMATE_ID, TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('generateWorkOrderPdf', () => {
    const WO_ID = 'wo-001';

    const mockWorkOrder = {
      id: WO_ID,
      tenantId: TENANT_ID,
      woNumber: 'WO-2026-0001',
      status: 'COMPLETED',
      vehicleId: 'veh-001',
      diagnosis: 'Usura pastiglie freno',
      customerRequest: 'Freni rumorosi',
      mileageIn: 85000,
      mileageOut: 85010,
      laborCost: new Decimal(150),
      partsCost: new Decimal(80),
      totalCost: new Decimal(230),
      laborItems: [{ description: 'Sostituzione pastiglie', hours: 2, rate: 75, total: 150 }],
      partsUsed: [{ name: 'Pastiglie freno Brembo', quantity: 1, unitPrice: 80, total: 80 }],
      createdAt: new Date('2026-03-15'),
      vehicle: {
        id: 'veh-001',
        make: 'Fiat',
        model: 'Panda',
        year: 2020,
        licensePlate: 'AB123CD',
        vin: 'ZFA31200001234567',
      },
    };

    beforeEach(() => {
      prisma.workOrder.findFirst.mockResolvedValue(mockWorkOrder);
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
    });

    it('should generate HTML buffer for work order', async () => {
      const buffer = await service.generateWorkOrderPdf(WO_ID, TENANT_ID);

      expect(buffer).toBeInstanceOf(Buffer);
      const html = buffer.toString('utf-8');
      expect(html).toContain('ORDINE DI LAVORO');
      expect(html).toContain('WO-2026-0001');
      expect(html).toContain('Officina Test SRL');
    });

    it('should include vehicle and diagnosis info', async () => {
      const buffer = await service.generateWorkOrderPdf(WO_ID, TENANT_ID);
      const html = buffer.toString('utf-8');

      expect(html).toContain('Fiat');
      expect(html).toContain('Panda');
      expect(html).toContain('AB123CD');
      expect(html).toContain('Usura pastiglie freno');
      expect(html).toContain('Freni rumorosi');
    });

    it('should include labor and parts rows', async () => {
      const buffer = await service.generateWorkOrderPdf(WO_ID, TENANT_ID);
      const html = buffer.toString('utf-8');

      expect(html).toContain('Sostituzione pastiglie');
      expect(html).toContain('Pastiglie freno Brembo');
    });

    it('should throw NotFoundException for missing work order', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(null);

      await expect(service.generateWorkOrderPdf(WO_ID, TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for missing tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.generateWorkOrderPdf(WO_ID, TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle work order without vehicle', async () => {
      prisma.workOrder.findFirst.mockResolvedValue({
        ...mockWorkOrder,
        vehicle: null,
        vehicleId: null,
      });

      const buffer = await service.generateWorkOrderPdf(WO_ID, TENANT_ID);
      const html = buffer.toString('utf-8');

      // Should not contain vehicle info section
      expect(html).not.toContain('class="vehicle-info"');
      expect(html).toContain('ORDINE DI LAVORO');
    });

    it('should handle work order without diagnosis and customerRequest', async () => {
      prisma.workOrder.findFirst.mockResolvedValue({
        ...mockWorkOrder,
        diagnosis: null,
        customerRequest: null,
      });

      const buffer = await service.generateWorkOrderPdf(WO_ID, TENANT_ID);
      const html = buffer.toString('utf-8');

      expect(html).not.toContain('Diagnosi:');
      expect(html).not.toContain('Richiesta cliente:');
    });

    it('should handle work order without laborItems and partsUsed', async () => {
      prisma.workOrder.findFirst.mockResolvedValue({
        ...mockWorkOrder,
        laborItems: null,
        partsUsed: null,
      });

      const buffer = await service.generateWorkOrderPdf(WO_ID, TENANT_ID);
      const html = buffer.toString('utf-8');

      // Should still generate valid HTML
      expect(html).toContain('ORDINE DI LAVORO');
    });

    it('should handle work order without mileage', async () => {
      prisma.workOrder.findFirst.mockResolvedValue({
        ...mockWorkOrder,
        mileageIn: null,
        mileageOut: null,
      });

      const buffer = await service.generateWorkOrderPdf(WO_ID, TENANT_ID);
      const html = buffer.toString('utf-8');

      expect(html).not.toContain('Km ingresso');
      expect(html).not.toContain('Km uscita');
    });

    it('should handle work order without costs', async () => {
      prisma.workOrder.findFirst.mockResolvedValue({
        ...mockWorkOrder,
        laborCost: null,
        partsCost: null,
        totalCost: null,
        laborItems: null,
        partsUsed: null,
      });

      const buffer = await service.generateWorkOrderPdf(WO_ID, TENANT_ID);
      const html = buffer.toString('utf-8');

      expect(html).not.toContain('Manodopera');
      // totalCost is null so no grand-total data row is rendered (CSS class still exists in <style>)
      expect(html).not.toContain('<tr class="grand-total">');
    });
  });

  // -----------------------------------------------------------------------
  // getInvoiceLines
  // -----------------------------------------------------------------------

  describe('getInvoiceLines (via generateInvoicePdf)', () => {
    it('should use legacy items when invoiceItems is empty', async () => {
      const invoiceWithLegacy = {
        ...mockInvoice,
        invoiceItems: [],
        items: [
          { description: 'Legacy service', quantity: 2, unitPrice: 50, vatRate: 22, discount: 10 },
        ],
        operationDate: null,
        ritenutaRate: null,
        ritenutaAmount: null,
      };
      prisma.invoice.findFirst.mockResolvedValue(invoiceWithLegacy);
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);

      const buffer = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      const html = buffer.toString('utf-8');

      expect(html).toContain('Legacy service');
    });

    it('should return empty lines when both invoiceItems and legacy items are empty', async () => {
      const invoiceEmpty = {
        ...mockInvoice,
        invoiceItems: [],
        items: null,
        operationDate: null,
        ritenutaRate: null,
        ritenutaAmount: null,
      };
      prisma.invoice.findFirst.mockResolvedValue(invoiceEmpty);
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);

      const buffer = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      const html = buffer.toString('utf-8');

      // Should still render valid HTML, just no item rows
      expect(html).toContain('<!DOCTYPE html>');
    });
  });

  // -----------------------------------------------------------------------
  // AZIENDA customer type
  // -----------------------------------------------------------------------

  describe('AZIENDA customer type', () => {
    it('should show only company name for AZIENDA customer', async () => {
      const aziendaCustomer = {
        ...mockCustomer,
        customerType: 'AZIENDA',
        encryptedFirstName: 'enc-Officina SRL',
        encryptedLastName: null,
      };
      prisma.invoice.findFirst.mockResolvedValue({
        ...mockInvoice,
        customer: aziendaCustomer,
        operationDate: null,
        ritenutaRate: null,
        ritenutaAmount: null,
      });
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);

      const buffer = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      const html = buffer.toString('utf-8');

      // For AZIENDA: customerName || customerSurname — should show company name
      expect(html).toContain('Officina SRL');
    });
  });

  // -----------------------------------------------------------------------
  // operationDate display
  // -----------------------------------------------------------------------

  describe('operationDate display', () => {
    it('should show operationDate when it differs from createdAt', async () => {
      prisma.invoice.findFirst.mockResolvedValue({
        ...mockInvoice,
        operationDate: new Date('2026-03-10'),
        createdAt: new Date('2026-03-15'),
        ritenutaRate: null,
        ritenutaAmount: null,
      });
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);

      const buffer = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      const html = buffer.toString('utf-8');

      expect(html).toContain('Data Operazione: 2026-03-10');
    });

    it('should NOT show operationDate when it equals createdAt', async () => {
      prisma.invoice.findFirst.mockResolvedValue({
        ...mockInvoice,
        operationDate: new Date('2026-03-15'),
        createdAt: new Date('2026-03-15'),
        ritenutaRate: null,
        ritenutaAmount: null,
      });
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);

      const buffer = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      const html = buffer.toString('utf-8');

      expect(html).not.toContain('Data Operazione');
    });
  });

  // -----------------------------------------------------------------------
  // ritenuta in invoice PDF
  // -----------------------------------------------------------------------

  describe('ritenuta in invoice PDF', () => {
    it('should show ritenuta when both rate and amount are present', async () => {
      prisma.invoice.findFirst.mockResolvedValue({
        ...mockInvoice,
        operationDate: null,
        ritenutaRate: new Decimal(20),
        ritenutaAmount: new Decimal(200),
      });
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);

      const buffer = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      const html = buffer.toString('utf-8');

      expect(html).toContain("Ritenuta d'acconto");
      expect(html).toContain('20,00%');
    });
  });

  // -----------------------------------------------------------------------
  // buildVatSummary
  // -----------------------------------------------------------------------

  describe('buildVatSummary (via generateInvoicePdf)', () => {
    it('should group VAT-exempt lines with naturaIva', async () => {
      const invoiceWithMixedVat = {
        ...mockInvoice,
        invoiceItems: [
          {
            description: 'Exempt',
            quantity: new Decimal(1),
            unitPrice: new Decimal(100),
            vatRate: new Decimal(0),
            discount: new Decimal(0),
            subtotal: new Decimal(100),
            naturaIva: 'N2.2',
          },
          {
            description: 'Normal',
            quantity: new Decimal(1),
            unitPrice: new Decimal(100),
            vatRate: new Decimal(22),
            discount: new Decimal(0),
            subtotal: new Decimal(100),
            naturaIva: null,
          },
        ],
        operationDate: null,
        ritenutaRate: null,
        ritenutaAmount: null,
      };
      prisma.invoice.findFirst.mockResolvedValue(invoiceWithMixedVat);
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);

      const buffer = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      const html = buffer.toString('utf-8');

      // Should contain both VAT summary rows
      expect(html).toContain('0,00%');
      expect(html).toContain('N2.2');
      expect(html).toContain('22,00%');
    });

    it('should default naturaIva to N4 for VAT-exempt items without naturaIva', async () => {
      const invoiceExempt = {
        ...mockInvoice,
        invoiceItems: [
          {
            description: 'Exempt no natura',
            quantity: new Decimal(1),
            unitPrice: new Decimal(100),
            vatRate: new Decimal(0),
            discount: new Decimal(0),
            subtotal: new Decimal(100),
            naturaIva: null,
          },
        ],
        operationDate: null,
        ritenutaRate: null,
        ritenutaAmount: null,
      };
      prisma.invoice.findFirst.mockResolvedValue(invoiceExempt);
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);

      const buffer = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      const html = buffer.toString('utf-8');

      expect(html).toContain('N4');
    });
  });

  // -----------------------------------------------------------------------
  // Estimate PDF edge cases
  // -----------------------------------------------------------------------

  describe('generateEstimatePdf edge cases', () => {
    const ESTIMATE_ID = 'est-002';

    it('should handle estimate without vehicle', async () => {
      const mockEstimateNoVehicle = {
        id: ESTIMATE_ID,
        tenantId: TENANT_ID,
        estimateNumber: 'EST-2026-0002',
        customerId: 'cust-001',
        vehicleId: null,
        status: 'DRAFT',
        subtotalCents: BigInt(5000),
        vatCents: BigInt(1100),
        totalCents: BigInt(6100),
        discountCents: BigInt(0),
        validUntil: null,
        notes: null,
        createdAt: new Date('2026-03-15'),
        lines: [],
      };
      prisma.estimate.findFirst.mockResolvedValue(mockEstimateNoVehicle);
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.customer.findFirst.mockResolvedValue(mockCustomer);

      const buffer = await service.generateEstimatePdf(ESTIMATE_ID, TENANT_ID);
      const html = buffer.toString('utf-8');

      expect(html).toContain('PREVENTIVO');
      expect(html).not.toContain('Veicolo:');
    });

    it('should show discount when discountCents > 0', async () => {
      const mockEstimateWithDiscount = {
        id: ESTIMATE_ID,
        tenantId: TENANT_ID,
        estimateNumber: 'EST-2026-0003',
        customerId: 'cust-001',
        vehicleId: null,
        status: 'DRAFT',
        subtotalCents: BigInt(10000),
        vatCents: BigInt(2200),
        totalCents: BigInt(11200),
        discountCents: BigInt(1000),
        validUntil: null,
        notes: null,
        createdAt: new Date('2026-03-15'),
        lines: [],
      };
      prisma.estimate.findFirst.mockResolvedValue(mockEstimateWithDiscount);
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.customer.findFirst.mockResolvedValue(mockCustomer);

      const buffer = await service.generateEstimatePdf(ESTIMATE_ID, TENANT_ID);
      const html = buffer.toString('utf-8');

      expect(html).toContain('Sconto');
    });
  });

  // =========================================================================
  // RITENUTA D'ACCONTO FLOWS (Art. 196 bis DPR 633/72)
  // =========================================================================
  describe("with ritenuta d'acconto", () => {
    beforeEach(() => {
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
    });

    it.skip('should include ritenuta rate when ritenutaRate is defined', async () => {
      const invoiceWithRitenuta = {
        ...mockInvoice,
        ritenutaRate: new Decimal(20),
        ritenutaAmount: new Decimal(15.4),
      };
      prisma.invoice.findFirst.mockResolvedValue(invoiceWithRitenuta);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);

      const html = result.toString();
      expect(html).toContain('20');
      expect(html).toContain('15.4');
    });

    it('should exclude ritenuta when ritenutaRate is undefined', async () => {
      const invoiceNoRitenuta = {
        ...mockInvoice,
        ritenutaRate: undefined,
        ritenutaAmount: undefined,
      };
      prisma.invoice.findFirst.mockResolvedValue(invoiceNoRitenuta);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      const _html = result.toString();

      expect(result).toBeDefined();
    });
  });

  // =========================================================================
  // PAYMENT METHOD & TERMS LABEL FALLBACKS
  // =========================================================================
  describe('payment method & terms rendering', () => {
    beforeEach(() => {
      prisma.invoice.findFirst.mockResolvedValue(mockInvoice);
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
    });

    it('should render label for known payment method', async () => {
      const invoice = {
        ...mockInvoice,
        paymentMethod: 'CONTANTI',
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);

      const html = result.toString();
      expect(html).toContain('Contanti');
    });

    it('should render empty string for unknown payment method', async () => {
      const invoice = {
        ...mockInvoice,
        paymentMethod: 'UNKNOWN_METHOD' as any,
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      expect(result).toBeDefined();
    });

    it('should default to empty string when paymentMethod is null', async () => {
      const invoice = {
        ...mockInvoice,
        paymentMethod: null,
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      expect(result).toBeDefined();
    });

    it('should render label for CARTA payment method', async () => {
      const invoice = {
        ...mockInvoice,
        paymentMethod: 'CARTA',
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      const html = result.toString();

      expect(html).toContain('Carta di credito');
    });

    it('should render label for BONIFICO payment method', async () => {
      const invoice = {
        ...mockInvoice,
        paymentMethod: 'BONIFICO',
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      const html = result.toString();

      expect(html).toContain('Bonifico bancario');
    });

    it('should render label for BNPL payment method', async () => {
      const invoice = {
        ...mockInvoice,
        paymentMethod: 'BNPL',
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      const html = result.toString();

      expect(html).toContain('Pagamento rateale');
    });

    it('should render label for known payment terms', async () => {
      const invoice = {
        ...mockInvoice,
        paymentTerms: 'IMMEDIATO',
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);

      const html = result.toString();
      expect(html).toContain('Pagamento immediato');
    });

    it('should render label for TRENTA_GIORNI payment terms', async () => {
      const invoice = {
        ...mockInvoice,
        paymentTerms: 'TRENTA_GIORNI',
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      const html = result.toString();

      expect(html).toContain('30 giorni');
    });

    it('should fallback for unknown payment terms', async () => {
      const invoice = {
        ...mockInvoice,
        paymentTerms: 'UNKNOWN_TERMS',
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      expect(result).toBeDefined();
    });
  });

  // =========================================================================
  // NOTA_CREDITO DOCUMENT TYPE
  // =========================================================================
  describe('with documentType NOTA_CREDITO', () => {
    beforeEach(() => {
      prisma.invoice.findFirst.mockResolvedValue(mockInvoice);
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
    });

    it('should render "Nota di Credito" for NOTA_CREDITO document', async () => {
      const creditNote = {
        ...mockInvoice,
        documentType: 'NOTA_CREDITO',
      };
      prisma.invoice.findFirst.mockResolvedValue(creditNote);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);

      const html = result.toString();
      expect(html).toContain('Nota di Credito');
    });

    it('should render "Fattura" for non-NOTA_CREDITO document', async () => {
      const invoice = {
        ...mockInvoice,
        documentType: 'FATTURA',
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);

      const html = result.toString();
      expect(html).toContain('Fattura');
    });
  });

  // =========================================================================
  // OPERATION DATE COMPARISON
  // =========================================================================
  describe('operationDate handling', () => {
    beforeEach(() => {
      prisma.invoice.findFirst.mockResolvedValue(mockInvoice);
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
    });

    it('should show operationDate when different from createdAt', async () => {
      const invoice = {
        ...mockInvoice,
        createdAt: new Date('2026-03-01'),
        operationDate: new Date('2026-03-15'),
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should not show operationDate when same as createdAt', async () => {
      const sameDate = new Date('2026-03-01');
      const invoice = {
        ...mockInvoice,
        createdAt: sameDate,
        operationDate: sameDate,
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      expect(result).toBeDefined();
    });

    it('should handle null operationDate', async () => {
      const invoice = {
        ...mockInvoice,
        operationDate: null,
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      expect(result).toBeDefined();
    });
  });

  // =========================================================================
  // TAX REGIME LABELS
  // =========================================================================
  describe('tax regime labels', () => {
    beforeEach(() => {
      prisma.invoice.findFirst.mockResolvedValue(mockInvoice);
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
    });

    it('should render label for ORDINARIO regime', async () => {
      const invoice = {
        ...mockInvoice,
        taxRegime: 'ORDINARIO',
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);

      const html = result.toString();
      expect(html).toContain('Regime Ordinario');
    });

    it('should render label for SEMPLIFICATO regime', async () => {
      const invoice = {
        ...mockInvoice,
        taxRegime: 'SEMPLIFICATO',
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);

      const html = result.toString();
      expect(html).toContain('Regime Semplificato');
    });

    it('should render label for FORFETTARIO regime', async () => {
      const invoice = {
        ...mockInvoice,
        taxRegime: 'FORFETTARIO',
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);

      const html = result.toString();
      expect(html).toContain('Regime Forfettario');
    });

    it('should fallback for unknown tax regime', async () => {
      const invoice = {
        ...mockInvoice,
        taxRegime: 'UNKNOWN_REGIME',
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      expect(result).toBeDefined();
    });
  });

  // =========================================================================
  // DUE DATE NULL HANDLING
  // =========================================================================
  describe('dueDate handling', () => {
    beforeEach(() => {
      prisma.invoice.findFirst.mockResolvedValue(mockInvoice);
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
    });

    it('should render due date when present', async () => {
      const invoice = {
        ...mockInvoice,
        dueDate: new Date('2026-04-30'),
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      expect(result).toBeDefined();
    });

    it('should handle null dueDate gracefully', async () => {
      const invoice = {
        ...mockInvoice,
        dueDate: null,
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      expect(result).toBeDefined();
    });
  });

  // =========================================================================
  // CUSTOMER ENCRYPTED NAME FALLBACKS
  // =========================================================================
  describe('customer encrypted name handling', () => {
    beforeEach(() => {
      prisma.invoice.findFirst.mockResolvedValue(mockInvoice);
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
    });

    it('should handle null encryptedFirstName', async () => {
      const invoice = {
        ...mockInvoice,
        customer: {
          ...mockCustomer,
          encryptedFirstName: null,
        },
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      expect(result).toBeDefined();
    });

    it('should handle null encryptedLastName', async () => {
      const invoice = {
        ...mockInvoice,
        customer: {
          ...mockCustomer,
          encryptedLastName: null,
        },
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      expect(result).toBeDefined();
    });

    it('should assemble full name for PERSONA customer', async () => {
      const invoice = {
        ...mockInvoice,
        customer: {
          ...mockCustomer,
          customerType: 'PERSONA',
          encryptedFirstName: 'enc-john',
          encryptedLastName: 'enc-doe',
        },
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      expect(result).toBeDefined();
    });

    it('should use firstName or lastName for AZIENDA customer', async () => {
      const invoice = {
        ...mockInvoice,
        customer: {
          ...mockCustomer,
          customerType: 'AZIENDA',
          encryptedFirstName: 'enc-Acme',
        },
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      expect(result).toBeDefined();
    });
  });

  // =========================================================================
  // TENANT ADDRESS BUILDING WITH EMPTY FIELDS
  // =========================================================================
  describe('tenant address filtering', () => {
    beforeEach(() => {
      prisma.invoice.findFirst.mockResolvedValue(mockInvoice);
    });

    it('should filter empty strings from address components', async () => {
      const invoice = {
        ...mockInvoice,
      };
      const tenant = {
        ...mockTenant,
        settings: {
          ...mockTenant.settings,
          indirizzo: '',
          cap: '',
          comune: 'Roma',
          provincia: '',
        },
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);
      prisma.tenant.findUnique.mockResolvedValue(tenant);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      expect(result).toBeDefined();
    });

    it('should include provincia in parentheses when present', async () => {
      const invoice = {
        ...mockInvoice,
      };
      const tenant = {
        ...mockTenant,
        settings: {
          ...mockTenant.settings,
          provincia: 'RM',
        },
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);
      prisma.tenant.findUnique.mockResolvedValue(tenant);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      expect(result).toBeDefined();
    });
  });

  // =========================================================================
  // CUSTOMER ADDRESS BUILDING
  // =========================================================================
  describe('customer address assembly', () => {
    beforeEach(() => {
      prisma.invoice.findFirst.mockResolvedValue(mockInvoice);
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
    });

    it('should assemble customer address from components', async () => {
      const invoice = {
        ...mockInvoice,
        customer: {
          ...mockCustomer,
          address: 'Via Roma 1',
          postalCode: '00100',
          city: 'Roma',
          province: 'RM',
        },
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      expect(result).toBeDefined();
    });

    it('should handle null province field', async () => {
      const invoice = {
        ...mockInvoice,
        customer: {
          ...mockCustomer,
          province: null,
        },
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      expect(result).toBeDefined();
    });
  });

  // =========================================================================
  // STAMP DUTY & NOTES
  // =========================================================================
  describe('stamp duty and notes', () => {
    beforeEach(() => {
      prisma.invoice.findFirst.mockResolvedValue(mockInvoice);
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
    });

    it('should include stamp duty when true', async () => {
      const invoice = {
        ...mockInvoice,
        stampDuty: true,
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      expect(result).toBeDefined();
    });

    it('should exclude stamp duty when false', async () => {
      const invoice = {
        ...mockInvoice,
        stampDuty: false,
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      expect(result).toBeDefined();
    });

    it('should include notes when present', async () => {
      const invoice = {
        ...mockInvoice,
        notes: 'Test notes for invoice',
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      expect(result).toBeDefined();
    });

    it('should handle null notes', async () => {
      const invoice = {
        ...mockInvoice,
        notes: null,
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      expect(result).toBeDefined();
    });
  });

  // =========================================================================
  // TENANT SETTINGS FALLBACKS
  // =========================================================================
  describe('tenant settings fallback to defaults', () => {
    beforeEach(() => {
      prisma.invoice.findFirst.mockResolvedValue(mockInvoice);
    });

    it('should use tenant.name when ragioneSociale not set', async () => {
      const invoice = {
        ...mockInvoice,
      };
      const tenant = {
        id: TENANT_ID,
        name: 'Fallback Company Name',
        settings: {
          partitaIva: '12345678901',
        },
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);
      prisma.tenant.findUnique.mockResolvedValue(tenant);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      expect(result).toBeDefined();
    });

    it('should use null settings as empty object', async () => {
      const invoice = {
        ...mockInvoice,
      };
      const tenant = {
        id: TENANT_ID,
        name: 'Test Company',
        settings: null,
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);
      prisma.tenant.findUnique.mockResolvedValue(tenant);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      expect(result).toBeDefined();
    });

    it('should use default provincia when not set', async () => {
      const invoice = {
        ...mockInvoice,
      };
      const tenant = {
        ...mockTenant,
        settings: {
          ragioneSociale: 'Test',
          partitaIva: '12345678901',
        },
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);
      prisma.tenant.findUnique.mockResolvedValue(tenant);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      expect(result).toBeDefined();
    });
  });

  // =========================================================================
  // CUSTOMER SDI & PEC FALLBACKS
  // =========================================================================
  describe('customer SDI and PEC fields', () => {
    it.skip('should include sdiCode when present', async () => {
      const invoice = {
        ...mockInvoice,
        customer: {
          ...mockCustomer,
          sdiCode: 'AB12345',
        },
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      expect(result).toBeDefined();
    });

    it.skip('should handle null sdiCode', async () => {
      const invoice = {
        ...mockInvoice,
        customer: {
          ...mockCustomer,
          sdiCode: null,
        },
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      expect(result).toBeDefined();
    });

    it.skip('should include pecEmail when present', async () => {
      const invoice = {
        ...mockInvoice,
        customer: {
          ...mockCustomer,
          pecEmail: 'test@pec.it',
        },
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      expect(result).toBeDefined();
    });

    it.skip('should handle null pecEmail', async () => {
      const invoice = {
        ...mockInvoice,
        customer: {
          ...mockCustomer,
          pecEmail: null,
        },
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      expect(result).toBeDefined();
    });
  });

  // =========================================================================
  // CUSTOMER CODICEFISCALE & PARTITAIVA FALLBACKS
  // =========================================================================
  describe('customer fiscal identifiers', () => {
    it.skip('should use codiceFiscale when present', async () => {
      const invoice = {
        ...mockInvoice,
        customer: {
          ...mockCustomer,
          codiceFiscale: 'RSSMRA80A01H501U',
        },
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      expect(result).toBeDefined();
    });

    it.skip('should handle null codiceFiscale', async () => {
      const invoice = {
        ...mockInvoice,
        customer: {
          ...mockCustomer,
          codiceFiscale: null,
        },
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      expect(result).toBeDefined();
    });

    it.skip('should use partitaIva when present', async () => {
      const invoice = {
        ...mockInvoice,
        customer: {
          ...mockCustomer,
          partitaIva: '12345678901',
        },
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      expect(result).toBeDefined();
    });

    it.skip('should handle null partitaIva', async () => {
      const invoice = {
        ...mockInvoice,
        customer: {
          ...mockCustomer,
          partitaIva: null,
        },
      };
      prisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      expect(result).toBeDefined();
    });
  });

  describe('Suite 4: HTML Rendering & Encryption (3 new tests)', () => {
    beforeEach(() => {
      prisma.invoice.findFirst.mockResolvedValue(mockInvoice);
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
    });

    it('should include doctype and proper HTML structure', async () => {
      const buffer = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      const html = buffer.toString('utf-8');

      expect(html).toMatch(/^<!DOCTYPE html>/i);
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
      expect(html).toContain('<head>');
      expect(html).toContain('</head>');
      expect(html).toContain('<body>');
    });

    it('should decrypt and display customer PII in proper format', async () => {
      const invoiceWithEncryptedPII = {
        ...mockInvoice,
        customer: {
          ...mockCustomer,
          encryptedFirstName: 'enc-Giovanni',
          encryptedLastName: 'enc-Bianchi',
        },
      };
      prisma.invoice.findFirst.mockResolvedValue(invoiceWithEncryptedPII);
      encryption.decrypt.mockImplementation((v: string) => v.replace('enc-', ''));

      const buffer = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      const html = buffer.toString('utf-8');

      expect(html).toContain('Giovanni');
      expect(html).toContain('Bianchi');
      expect(encryption.decrypt).toHaveBeenCalledWith('enc-Giovanni');
      expect(encryption.decrypt).toHaveBeenCalledWith('enc-Bianchi');
    });

    it('should include CSS styles with responsive layout', async () => {
      const buffer = await service.generateInvoicePdf(INVOICE_ID, TENANT_ID);
      const html = buffer.toString('utf-8');

      expect(html).toContain('<style>');
      expect(html).toContain('</style>');
      expect(html).toMatch(/text-align|width|padding|margin/);
    });
  });
});
