import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';

export interface SearchResult {
  type: 'customer' | 'vehicle' | 'booking' | 'workOrder' | 'invoice';
  id: string;
  title: string;
  subtitle: string;
  score: number;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(
    tenantId: string,
    query: string,
  ): Promise<{ results: SearchResult[]; total: number }> {
    if (!query || query.trim().length < 2) {
      return { results: [], total: 0 };
    }

    const q = query.trim();
    const results: SearchResult[] = [];

    // Search in parallel — no customer search (PII encrypted), use vehicles as proxy
    const [vehicles, workOrders, invoices, bookings] = await Promise.all([
      // Vehicles: search by licensePlate, make, model, vin
      this.prisma.vehicle.findMany({
        where: {
          customer: { tenantId },
          OR: [
            { licensePlate: { contains: q, mode: 'insensitive' } },
            { make: { contains: q, mode: 'insensitive' } },
            { model: { contains: q, mode: 'insensitive' } },
            { vin: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 10,
      }),

      // WorkOrders: search by woNumber or diagnosis
      this.prisma.workOrder.findMany({
        where: {
          tenantId,
          OR: [
            { woNumber: { contains: q, mode: 'insensitive' } },
            { diagnosis: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 10,
        include: { vehicle: { select: { licensePlate: true } } },
      }),

      // Invoices: search by invoiceNumber
      this.prisma.invoice.findMany({
        where: {
          tenantId,
          invoiceNumber: { contains: q, mode: 'insensitive' },
        },
        take: 10,
      }),

      // Bookings: search by notes
      this.prisma.booking.findMany({
        where: {
          tenantId,
          notes: { contains: q, mode: 'insensitive' },
        },
        take: 5,
      }),
    ]);

    // Map results with relevance scores
    for (const v of vehicles) {
      const exactMatch = v.licensePlate.toLowerCase() === q.toLowerCase();
      results.push({
        type: 'vehicle',
        id: v.id,
        title: `${v.make} ${v.model}`,
        subtitle: v.licensePlate,
        score: exactMatch ? 100 : 80,
      });
    }

    for (const wo of workOrders) {
      const vehicle = wo.vehicle as { licensePlate: string } | null;
      results.push({
        type: 'workOrder',
        id: wo.id,
        title: wo.woNumber,
        subtitle: `${wo.status} — ${vehicle?.licensePlate ?? ''}`,
        score: 70,
      });
    }

    for (const inv of invoices) {
      results.push({
        type: 'invoice',
        id: inv.id,
        title: inv.invoiceNumber,
        subtitle: `${String(inv.total)} — ${inv.status}`,
        score: 70,
      });
    }

    for (const b of bookings) {
      results.push({
        type: 'booking',
        id: b.id,
        title: `Booking ${b.id.slice(0, 8)}`,
        subtitle: `${b.status} — ${b.scheduledDate.toISOString().split('T')[0]}`,
        score: 50,
      });
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return { results, total: results.length };
  }
}
