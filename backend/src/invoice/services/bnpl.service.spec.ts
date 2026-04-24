import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BnplService } from './bnpl.service';
import { PrismaService } from '../../common/services/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

const TENANT_ID = 'tenant-001';
const INVOICE_ID = 'invoice-001';

function makeMockInvoice(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: INVOICE_ID,
    tenantId: TENANT_ID,
    customerId: 'customer-001',
    invoiceNumber: 'INV-2026-0001',
    status: 'SENT',
    total: new Decimal('300.00'),
    bnplProvider: null,
    bnplOrderId: null,
    bnplStatus: null,
    customer: { id: 'customer-001' },
    invoiceItems: [],
    ...overrides,
  };
}

describe('BnplService', () => {
  let service: BnplService;
  let prisma: { invoice: { findFirst: jest.Mock; update: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      invoice: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BnplService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('https://app.mechmind.io'),
          },
        },
      ],
    }).compile();

    service = module.get<BnplService>(BnplService);
  });

  describe('createBnplOrder', () => {
    it('should create Scalapay order for valid invoice', async () => {
      const invoice = makeMockInvoice();
      prisma.invoice.findFirst.mockResolvedValue(invoice);
      prisma.invoice.update.mockResolvedValue(invoice);

      const result = await service.createBnplOrder(INVOICE_ID, TENANT_ID);

      expect(result.redirectUrl).toContain('/portal/invoices/');
      expect(result.orderId).toContain('bnpl_');
      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bnplProvider: 'scalapay',
            bnplStatus: 'PENDING',
          }),
        }),
      );
    });

    it('should throw NotFoundException if invoice not found', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);
      await expect(service.createBnplOrder(INVOICE_ID, TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if invoice already paid', async () => {
      prisma.invoice.findFirst.mockResolvedValue(makeMockInvoice({ status: 'PAID' }));
      await expect(service.createBnplOrder(INVOICE_ID, TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if invoice cancelled', async () => {
      prisma.invoice.findFirst.mockResolvedValue(makeMockInvoice({ status: 'CANCELLED' }));
      await expect(service.createBnplOrder(INVOICE_ID, TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('handleBnplWebhook', () => {
    it('should mark invoice PAID on APPROVED status', async () => {
      prisma.invoice.findFirst.mockResolvedValue(makeMockInvoice({ bnplOrderId: 'bnpl_test' }));
      prisma.invoice.update.mockResolvedValue({});

      await service.handleBnplWebhook('bnpl_test', 'APPROVED');

      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PAID',
            paidAt: expect.any(Date),
            paymentMethod: 'BNPL',
            bnplStatus: 'APPROVED',
          }),
        }),
      );
    });

    it('should mark invoice PAID on COMPLETED status', async () => {
      prisma.invoice.findFirst.mockResolvedValue(makeMockInvoice({ bnplOrderId: 'bnpl_test' }));
      prisma.invoice.update.mockResolvedValue({});

      await service.handleBnplWebhook('bnpl_test', 'COMPLETED');

      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PAID',
            bnplStatus: 'COMPLETED',
          }),
        }),
      );
    });

    it('should update bnplStatus DECLINED without marking PAID', async () => {
      prisma.invoice.findFirst.mockResolvedValue(makeMockInvoice({ bnplOrderId: 'bnpl_test' }));
      prisma.invoice.update.mockResolvedValue({});

      await service.handleBnplWebhook('bnpl_test', 'DECLINED');

      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { bnplStatus: 'DECLINED' },
        }),
      );
    });

    it('should skip if order not found', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);
      await service.handleBnplWebhook('bnpl_unknown', 'APPROVED');
      expect(prisma.invoice.update).not.toHaveBeenCalled();
    });
  });

  describe('BNPL edge cases', () => {
    it('should handle DECLINED status without marking PAID', async () => {
      const invoice = makeMockInvoice({ bnplOrderId: 'order-123' });
      prisma.invoice.findFirst.mockResolvedValue(invoice);
      prisma.invoice.update.mockResolvedValue(invoice);
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.handleBnplWebhook('order-123', 'DECLINED');

      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: invoice.id },
        data: expect.objectContaining({ bnplStatus: 'DECLINED' }),
      });
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('DECLINED')
      );
    });

    it('should log BNPL order creation', async () => {
      const invoice = makeMockInvoice({ status: 'SENT' });
      prisma.invoice.findFirst.mockResolvedValue(invoice);
      prisma.invoice.update.mockResolvedValue(invoice);
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.createBnplOrder(INVOICE_ID, TENANT_ID);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('BNPL order created')
      );
    });

    it('should warn when BNPL webhook receives unknown order', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      await service.handleBnplWebhook('unknown-order', 'APPROVED');

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('not found')
      );
    });

    it('should set bnplProvider to scalapay', async () => {
      const invoice = makeMockInvoice({ status: 'SENT' });
      prisma.invoice.findFirst.mockResolvedValue(invoice);
      prisma.invoice.update.mockResolvedValue(invoice);

      await service.createBnplOrder(INVOICE_ID, TENANT_ID);

      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: INVOICE_ID },
        data: expect.objectContaining({
          bnplProvider: 'scalapay',
          bnplStatus: 'PENDING',
        }),
      });
    });
  });

});
