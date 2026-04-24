/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { Decimal } from '@prisma/client/runtime/library';
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

    it('should parse page and limit from string query params', async () => {
      const expected = {
        data: [mockInvoice],
        meta: { total: 1, page: 2, limit: 10, pages: 1 },
      };
      service.findAll.mockResolvedValue(expected as never);

      const result = await controller.findAll(
        TENANT_ID,
        undefined,
        undefined,
        undefined,
        undefined,
        '2',
        '10',
      );

      expect(service.findAll).toHaveBeenCalledWith(
        TENANT_ID,
        {
          status: undefined,
          customerId: undefined,
          dateFrom: undefined,
          dateTo: undefined,
        },
        2,
        10,
      );
      expect(result.success).toBe(true);
    });

    it('should pass page without limit', async () => {
      service.findAll.mockResolvedValue({ data: [], meta: { total: 0 } } as never);

      await controller.findAll(TENANT_ID, undefined, undefined, undefined, undefined, '3');

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, expect.anything(), 3, undefined);
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

  describe('response wrapping', () => {
    it('should wrap all responses with success flag', async () => {
      service.findAll.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 20, pages: 0 },
      });

      const result = await controller.findAll(TENANT_ID);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
    });

    it('should wrap create response with success', async () => {
      const invoice = { id: 'inv-1', invoiceNumber: 'INV-0001' } as any;
      service.create.mockResolvedValue(invoice);

      const result = await controller.create(TENANT_ID, {
        customerId: 'cust-1',
        items: [],
      });

      expect(result).toEqual({ success: true, data: invoice });
    });

    it('should wrap getStats response', async () => {
      const stats = { byStatus: {}, monthlyRevenue: { total: new Decimal(1000), count: 5 } } as any;
      service.getStats.mockResolvedValue(stats);

      const result = await controller.getStats(TENANT_ID);

      expect(result).toEqual({ success: true, data: stats });
    });

    it('should send CSV response with proper headers', async () => {
      service.exportCsv.mockResolvedValue('col1,col2\nval1,val2');
      const res = {
        set: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      await controller.exportCsv(TENANT_ID, '2026-01-01', '2026-12-31', res as any);

      expect(res.set).toHaveBeenCalledWith({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': expect.stringContaining('attachment'),
      });
      expect(res.send).toHaveBeenCalledWith('col1,col2\nval1,val2');
    });
  });

  describe('Filtering combinations', () => {
    it('should support status filter alone', async () => {
      service.findAll.mockResolvedValue({
        data: [{ ...mockInvoice, status: 'SENT' }],
        meta: { total: 1, page: 1, limit: 20, pages: 1 },
      });

      await controller.findAll(TENANT_ID, 'SENT');

      expect(service.findAll).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({ status: 'SENT' }),
        undefined,
        undefined,
      );
    });

    it('should support customerId filter alone', async () => {
      service.findAll.mockResolvedValue({
        data: [mockInvoice],
        meta: { total: 1, page: 1, limit: 20, pages: 1 },
      });

      await controller.findAll(TENANT_ID, undefined, 'cust-001');

      expect(service.findAll).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({ customerId: 'cust-001' }),
        undefined,
        undefined,
      );
    });

    it('should support date range filter', async () => {
      service.findAll.mockResolvedValue({
        data: [mockInvoice],
        meta: { total: 1, page: 1, limit: 20, pages: 1 },
      });

      await controller.findAll(TENANT_ID, undefined, undefined, '2026-03-01', '2026-03-31');

      expect(service.findAll).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({ dateFrom: '2026-03-01', dateTo: '2026-03-31' }),
        undefined,
        undefined,
      );
    });

    it('should support pagination with page parameter', async () => {
      service.findAll.mockResolvedValue({
        data: [mockInvoice],
        meta: { total: 50, page: 2, limit: 20, pages: 3 },
      });

      await controller.findAll(TENANT_ID, undefined, undefined, undefined, undefined, '2');

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, expect.any(Object), 2, undefined);
    });

    it('should support pagination with limit parameter', async () => {
      service.findAll.mockResolvedValue({
        data: [mockInvoice],
        meta: { total: 50, page: 1, limit: 50, pages: 1 },
      });

      await controller.findAll(
        TENANT_ID,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        '50',
      );

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, expect.any(Object), undefined, 50);
    });

    it('should handle string page/limit conversion to integers', async () => {
      service.findAll.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 3, limit: 10, pages: 0 },
      });

      await controller.findAll(TENANT_ID, undefined, undefined, undefined, undefined, '3', '10');

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, expect.any(Object), 3, 10);
    });
  });

  describe('Error propagation', () => {
    it('should not catch service errors in findAll', async () => {
      const error = new Error('Database error');
      service.findAll.mockRejectedValue(error);

      await expect(controller.findAll(TENANT_ID)).rejects.toThrow('Database error');
    });

    it('should not catch service errors in create', async () => {
      const error = new Error('Validation error');
      service.create.mockRejectedValue(error);

      await expect(
        controller.create(TENANT_ID, { customerId: 'cust-1', items: [] }),
      ).rejects.toThrow('Validation error');
    });

    it('should not catch service errors in exportCsv', async () => {
      const error = new Error('CSV generation failed');
      service.exportCsv.mockRejectedValue(error);
      const res = { set: jest.fn(), send: jest.fn() };

      await expect(
        controller.exportCsv(TENANT_ID, '2026-01-01', '2026-12-31', res as any),
      ).rejects.toThrow('CSV generation failed');
    });
  });

  describe('Pagination edge cases', () => {
    it('should handle page=0 by passing 0 to service', async () => {
      service.findAll.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 0, limit: 20, pages: 0 },
      });

      await controller.findAll(TENANT_ID, undefined, undefined, undefined, undefined, '0');

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, expect.any(Object), 0, undefined);
    });

    it('should handle limit=1', async () => {
      service.findAll.mockResolvedValue({
        data: [mockInvoice],
        meta: { total: 100, page: 1, limit: 1, pages: 100 },
      });

      await controller.findAll(
        TENANT_ID,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        '1',
      );

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, expect.any(Object), undefined, 1);
    });
  });

  describe('CSV export edge cases', () => {
    it('should handle empty CSV response', async () => {
      service.exportCsv.mockResolvedValue('');
      const res = {
        set: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as unknown as import('express').Response;

      await controller.exportCsv(TENANT_ID, '2026-01-01', '2026-12-31', res);

      expect(res.send).toHaveBeenCalledWith('');
    });

    it('should set UTF-8 encoding for CSV', async () => {
      service.exportCsv.mockResolvedValue('header1,header2');
      const res = {
        set: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as unknown as import('express').Response;

      await controller.exportCsv(TENANT_ID, '2026-01-01', '2026-12-31', res);

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': expect.stringContaining('utf-8'),
        }),
      );
    });

    it('should include attachment filename in Content-Disposition', async () => {
      service.exportCsv.mockResolvedValue('data');
      const res = {
        set: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as unknown as import('express').Response;

      await controller.exportCsv(TENANT_ID, '2026-01-01', '2026-12-31', res);

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Disposition': expect.stringContaining('fatture'),
        }),
      );
    });
  });

  describe('Suite 2: Response Wrapping (3 new tests)', () => {
    it('should wrap remove response with success message', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove(TENANT_ID, 'inv-001');

      expect(result).toEqual({
        success: true,
        message: 'Invoice deleted successfully',
      });
      expect(result).not.toHaveProperty('data');
    });

    it('should wrap refund response with creditNoteId when full refund', async () => {
      const refundResult = {
        refundedAmount: 183,
        creditNoteId: 'credit-note-001',
      };
      service.refundInvoice.mockResolvedValue(refundResult as never);

      const result = await controller.refundInvoice(TENANT_ID, 'inv-001');

      expect(result).toEqual({ success: true, data: refundResult });
      expect(result.data).toHaveProperty('creditNoteId');
    });

    it('should wrap PDF response with correct headers', async () => {
      const buffer = Buffer.from('<html>test</html>');
      pdfService.generateInvoicePdf.mockResolvedValue(buffer);
      const res = {
        set: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as unknown as import('express').Response;

      await controller.generatePdf('inv-001', TENANT_ID, res);

      expect(res.set).toHaveBeenCalledWith({
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': expect.stringContaining('fattura-inv-001.html'),
      });
      expect(res.send).toHaveBeenCalledWith(buffer);
    });
  });
});
