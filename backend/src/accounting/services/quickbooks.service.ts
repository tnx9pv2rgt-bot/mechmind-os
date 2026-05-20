import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { createObjectCsvStringifier } from 'csv-writer';
import { PrismaService } from '../../common/services/prisma.service';
import { QuickBooksExportRecord } from '../dto/quickbooks-export.dto';

const EXPORT_ROW_LIMIT = 5000;

@Injectable()
export class QuickBooksService {
  private readonly logger = new Logger(QuickBooksService.name);

  constructor(private readonly prisma: PrismaService) {}

  async exportInvoicesForQuickBooks(
    tenantId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<Buffer> {
    try {
      const invoices = await this.prisma.invoice.findMany({
        where: {
          tenantId,
          createdAt: { gte: dateFrom, lte: dateTo },
        },
        select: {
          createdAt: true,
          invoiceNumber: true,
          customerId: true,
          customer: { select: { searchName: true } },
          subtotal: true,
          taxAmount: true,
          total: true,
          status: true,
        },
        orderBy: { createdAt: 'asc' },
        take: EXPORT_ROW_LIMIT,
      });

      const csvStringifier = createObjectCsvStringifier({
        header: [
          { id: 'date', title: 'Date' },
          { id: 'invoiceNumber', title: 'Invoice#' },
          { id: 'customer', title: 'Customer' },
          { id: 'amount', title: 'Amount' },
          { id: 'tax', title: 'Tax' },
          { id: 'total', title: 'Total' },
          { id: 'status', title: 'Status' },
        ],
      });

      const records: QuickBooksExportRecord[] = invoices.map(invoice => ({
        date: invoice.createdAt.toISOString().split('T')[0],
        invoiceNumber: invoice.invoiceNumber,
        customer: invoice.customer?.searchName ?? invoice.customerId,
        amount: invoice.subtotal.toString(),
        tax: invoice.taxAmount.toString(),
        total: invoice.total.toString(),
        status: invoice.status,
      }));

      const csvContent =
        csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);

      return Buffer.from(csvContent, 'utf-8');
    } catch (error) {
      this.logger.error('QuickBooks export failed', error);
      throw new InternalServerErrorException('Esportazione QuickBooks fallita');
    }
  }
}
