import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { FatturapaService } from './services/fatturapa.service';
import { PdfService } from './services/pdf.service';
import { PaymentLinkService } from './services/payment-link.service';
import { BnplService } from './services/bnpl.service';

describe('InvoiceController', () => {
  let controller: InvoiceController;
  let service: jest.Mocked<InvoiceService>;
  let fatturapaService: jest.Mocked<FatturapaService>;
  let pdfService: jest.Mocked<PdfService>;
  let paymentLinkService: jest.Mocked<PaymentLinkService>;
  let bnplService: jest.Mocked<BnplService>;

  const TENANT_ID = 'tenant-001';

  const mockInvoice = {
    id: 'inv-001',
    tenantId: TENANT_ID,
    invoiceNumber: 'INV-2026-0001',
    customerId: 'cust-001',
    status: 'DRAFT',
    subtotal: 100,
    taxRate: 22,
    taxAmount: 22,
    total: 122,
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoiceController],
      providers: [
        {
          provide: InvoiceService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            send: jest.fn(),
            markPaid: jest.fn(),
            getStats: jest.fn(),
            refundInvoice: jest.fn(),
            exportCsv: jest.fn(),
          },
        },
        {
          provide: FatturapaService,
          useValue: {
            generateXml: jest.fn(),
          },
        },
        {
          provide: PdfService,
          useValue: {
            generateInvoicePdf: jest.fn(),
          },
        },
        {
          provide: PaymentLinkService,
          useValue: {
            createPaymentLink: jest.fn(),
            sendPaymentSms: jest.fn(),
            handlePaymentWebhook: jest.fn(),
          },
        },
        {
          provide: BnplService,
          useValue: {
            createBnplOrder: jest.fn(),
            handleBnplWebhook: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<InvoiceController>(InvoiceController);
    service = module.get(InvoiceService) as jest.Mocked<InvoiceService>;
    fatturapaService = module.get(FatturapaService) as jest.Mocked<FatturapaService>;
    pdfService = module.get(PdfService) as jest.Mocked<PdfService>;
    paymentLinkService = module.get(PaymentLinkService) as jest.Mocked<PaymentLinkService>;
    bnplService = module.get(BnplService) as jest.Mocked<BnplService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should delegate to service and return wrapped response', async () => {
      const expected = {
        data: [mockInvoice],
        meta: { total: 1, page: 1, limit: 20, pages: 1 },
      };
      service.findAll.mockResolvedValue(expected as never);

      const result = await controller.findAll(
        TENANT_ID,
        'DRAFT',
        'cust-001',
        '2026-01-01',
        '2026-12-31',
      );

      expect(service.findAll).toHaveBeenCalledWith(
        TENANT_ID,
        {
          status: 'DRAFT',
          customerId: 'cust-001',
          dateFrom: '2026-01-01',
          dateTo: '2026-12-31',
        },
        undefined,
        undefined,
      );
      expect(result).toEqual({
        success: true,
        data: expected.data,
        meta: expected.meta,
      });
    });

    it('should pass undefined filters when not provided', async () => {
      const expected = {
        data: [],
        meta: { total: 0, page: 1, limit: 20, pages: 0 },
      };
      service.findAll.mockResolvedValue(expected as never);

      await controller.findAll(TENANT_ID);

      expect(service.findAll).toHaveBeenCalledWith(
        TENANT_ID,
        {
          status: undefined,
          customerId: undefined,
          dateFrom: undefined,
          dateTo: undefined,
        },
        undefined,
        undefined,
      );
    });
  });

  describe('create', () => {
    it('should delegate to service with tenantId and dto', async () => {
      service.create.mockResolvedValue(mockInvoice as never);
      const dto = {
        customerId: 'cust-001',
        items: [{ description: 'Oil change', qty: 1, price: 50 }],
      };

      const result = await controller.create(TENANT_ID, dto as never);

      expect(service.create).toHaveBeenCalledWith(TENANT_ID, dto);
      expect(result).toEqual({ success: true, data: mockInvoice });
    });
  });

  describe('getStats', () => {
    it('should delegate to service with tenantId', async () => {
      const stats = { byStatus: { DRAFT: 2, PAID: 5 }, monthlyRevenue: { total: 1000, count: 5 } };
      service.getStats.mockResolvedValue(stats as never);

      const result = await controller.getStats(TENANT_ID);

      expect(service.getStats).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual({ success: true, data: stats });
    });
  });

  describe('exportCsv', () => {
    it('should call exportCsv and send CSV response with proper headers', async () => {
      const csvContent = '\uFEFFNumero;Data;Cliente\nINV-2026-0001;2026-01-15;Mario Rossi';
      service.exportCsv.mockResolvedValue(csvContent);

      const res = {
        set: jest.fn(),
        send: jest.fn(),
      } as unknown as import('express').Response;

      await controller.exportCsv(TENANT_ID, '2026-01-01', '2026-03-31', res);

      expect(service.exportCsv).toHaveBeenCalledWith(
        TENANT_ID,
        new Date('2026-01-01'),
        new Date('2026-03-31'),
      );
      expect(res.set).toHaveBeenCalledWith({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="fatture-2026-01-01-2026-03-31.csv"',
      });
      expect(res.send).toHaveBeenCalledWith(csvContent);
    });
  });

  describe('findOne', () => {
    it('should delegate to service with tenantId and id', async () => {
      service.findOne.mockResolvedValue(mockInvoice as never);

      const result = await controller.findOne(TENANT_ID, 'inv-001');

      expect(service.findOne).toHaveBeenCalledWith(TENANT_ID, 'inv-001');
      expect(result).toEqual({ success: true, data: mockInvoice });
    });
  });

  describe('update', () => {
    it('should delegate to service with tenantId, id, and dto', async () => {
      const updated = { ...mockInvoice, notes: 'Updated' };
      service.update.mockResolvedValue(updated as never);
      const dto = { notes: 'Updated' };

      const result = await controller.update(TENANT_ID, 'inv-001', dto as never);

      expect(service.update).toHaveBeenCalledWith(TENANT_ID, 'inv-001', dto);
      expect(result).toEqual({ success: true, data: updated });
    });
  });

  describe('remove', () => {
    it('should delegate to service and return success message', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove(TENANT_ID, 'inv-001');

      expect(service.remove).toHaveBeenCalledWith(TENANT_ID, 'inv-001');
      expect(result).toEqual({ success: true, message: 'Invoice deleted successfully' });
    });
  });

  describe('send', () => {
    it('should delegate to service with tenantId and id', async () => {
      const sent = { ...mockInvoice, status: 'SENT' };
      service.send.mockResolvedValue(sent as never);

      const result = await controller.send(TENANT_ID, 'inv-001');

      expect(service.send).toHaveBeenCalledWith(TENANT_ID, 'inv-001');
      expect(result).toEqual({ success: true, data: sent });
    });
  });

  describe('markPaid', () => {
    it('should delegate to service with tenantId and id', async () => {
      const paid = { ...mockInvoice, status: 'PAID' };
      service.markPaid.mockResolvedValue(paid as never);

      const result = await controller.markPaid(TENANT_ID, 'inv-001');

      expect(service.markPaid).toHaveBeenCalledWith(TENANT_ID, 'inv-001');
      expect(result).toEqual({ success: true, data: paid });
    });
  });

  describe('generateFatturaPa', () => {
    it('should delegate to fatturapaService and return xml', async () => {
      const xml = '<xml>fattura</xml>';
      fatturapaService.generateXml.mockResolvedValue(xml);

      const result = await controller.generateFatturaPa('inv-001', TENANT_ID);

      expect(fatturapaService.generateXml).toHaveBeenCalledWith('inv-001', TENANT_ID);
      expect(result).toEqual({ success: true, data: { xml } });
    });
  });

  describe('generatePdf', () => {
    it('should delegate to pdfService and send buffer as response', async () => {
      const buf = Buffer.from('<html>invoice</html>');
      pdfService.generateInvoicePdf.mockResolvedValue(buf);

      const res = {
        set: jest.fn(),
        send: jest.fn(),
      } as unknown as import('express').Response;

      await controller.generatePdf('inv-001', TENANT_ID, res);

      expect(pdfService.generateInvoicePdf).toHaveBeenCalledWith('inv-001', TENANT_ID);
      expect(res.set).toHaveBeenCalledWith({
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': 'attachment; filename="fattura-inv-001.html"',
      });
      expect(res.send).toHaveBeenCalledWith(buf);
    });
  });

  describe('refundInvoice', () => {
    it('should delegate to service with tenantId, id, and amount', async () => {
      const refundResult = { ...mockInvoice, status: 'REFUNDED' };
      service.refundInvoice.mockResolvedValue(refundResult as never);

      const result = await controller.refundInvoice(TENANT_ID, 'inv-001', 50);

      expect(service.refundInvoice).toHaveBeenCalledWith(TENANT_ID, 'inv-001', 50);
      expect(result).toEqual({ success: true, data: refundResult });
    });

    it('should allow full refund when amount is not provided', async () => {
      const refundResult = { ...mockInvoice, status: 'REFUNDED' };
      service.refundInvoice.mockResolvedValue(refundResult as never);

      const result = await controller.refundInvoice(TENANT_ID, 'inv-001');

      expect(service.refundInvoice).toHaveBeenCalledWith(TENANT_ID, 'inv-001', undefined);
      expect(result).toEqual({ success: true, data: refundResult });
    });
  });

  describe('generatePaymentLink', () => {
    it('should delegate to paymentLinkService.createPaymentLink', async () => {
      const linkResult = {
        url: 'https://app.mechmind.io/portal/invoices/inv-001?pay=true',
        linkId: 'cs_test',
      };
      paymentLinkService.createPaymentLink.mockResolvedValue(linkResult);

      const result = await controller.generatePaymentLink(TENANT_ID, 'inv-001');

      expect(paymentLinkService.createPaymentLink).toHaveBeenCalledWith('inv-001', TENANT_ID);
      expect(result).toEqual({ success: true, data: linkResult });
    });
  });

  describe('sendPaymentSms', () => {
    it('should delegate to paymentLinkService.sendPaymentSms', async () => {
      const smsResult = {
        sent: true,
        paymentUrl: 'https://app.mechmind.io/portal/invoices/inv-001?pay=true',
      };
      paymentLinkService.sendPaymentSms.mockResolvedValue(smsResult);

      const result = await controller.sendPaymentSms(TENANT_ID, 'inv-001');

      expect(paymentLinkService.sendPaymentSms).toHaveBeenCalledWith('inv-001', TENANT_ID);
      expect(result).toEqual({ success: true, data: smsResult });
    });
  });

  describe('createBnplOrder', () => {
    it('should delegate to bnplService.createBnplOrder', async () => {
      const bnplResult = {
        redirectUrl: 'https://app.mechmind.io/portal/invoices/inv-001?bnpl=success',
        orderId: 'bnpl_test',
      };
      bnplService.createBnplOrder.mockResolvedValue(bnplResult);

      const result = await controller.createBnplOrder(TENANT_ID, 'inv-001');

      expect(bnplService.createBnplOrder).toHaveBeenCalledWith('inv-001', TENANT_ID);
      expect(result).toEqual({ success: true, data: bnplResult });
    });
  });
});
