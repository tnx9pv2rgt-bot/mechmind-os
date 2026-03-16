import { Injectable } from '@nestjs/common';
import { createObjectCsvStringifier } from 'csv-writer';
import { PrismaService } from '../../common/services/prisma.service';

interface InvoiceRecord {
  date: string;
  invoiceNumber: string;
  customer: string;
  amount: string;
  tax: string;
  total: string;
  status: string;
}

@Injectable()
export class QuickBooksService {
  constructor(private readonly prisma: PrismaService) {}

  async exportInvoicesForQuickBooks(
    tenantId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<Buffer> {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        createdAt: { gte: dateFrom, lte: dateTo },
      },
      include: {
        customer: true,
      },
      orderBy: { createdAt: 'asc' },
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

    const records: InvoiceRecord[] = invoices.map(invoice => ({
      date: invoice.createdAt.toISOString().split('T')[0],
      invoiceNumber: invoice.invoiceNumber,
      customer: invoice.customerId,
      amount: invoice.subtotal.toString(),
      tax: invoice.taxAmount.toString(),
      total: invoice.total.toString(),
      status: invoice.status,
    }));

    const csvContent = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);

    return Buffer.from(csvContent, 'utf-8');
  }
}
