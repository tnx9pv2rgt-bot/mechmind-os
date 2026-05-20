/**
 * MechMind OS - MUD (Modello Unico di Dichiarazione ambientale) Service
 *
 * Genera anteprima ed export CSV per la dichiarazione annuale MUD.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';

export interface MudCerRow {
  cerCode: string;
  cerDescription: string;
  totalKg: number;
  operationCount: number;
  mainDestination: string | null;
}

export interface MudPreview {
  year: number;
  rows: MudCerRow[];
  totalKg: number;
  totalEntries: number;
  totalFirs: number;
}

@Injectable()
export class MudService {
  constructor(private readonly prisma: PrismaService) {}

  async getPreview(tenantId: string, year: number): Promise<MudPreview> {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);

    const entries = await this.prisma.wasteEntry.findMany({
      where: {
        tenantId,
        entryDate: { gte: yearStart, lte: yearEnd },
      },
      include: { destination: true },
    });

    const firs = await this.prisma.wasteFir.count({
      where: {
        tenantId,
        scheduledDate: { gte: yearStart, lte: yearEnd },
      },
    });

    // Group by CER code
    const cerMap = new Map<
      string,
      {
        cerDescription: string;
        totalKg: number;
        operationCount: number;
        destinations: Map<string, number>;
      }
    >();

    for (const entry of entries) {
      const existing = cerMap.get(entry.cerCode);
      if (existing) {
        existing.totalKg += Number(entry.quantityKg);
        existing.operationCount += 1;
        if (entry.destination) {
          const destCount = existing.destinations.get(entry.destination.name) || 0;
          existing.destinations.set(entry.destination.name, destCount + 1);
        }
      } else {
        const destinations = new Map<string, number>();
        if (entry.destination) {
          destinations.set(entry.destination.name, 1);
        }
        cerMap.set(entry.cerCode, {
          cerDescription: entry.cerDescription,
          totalKg: Number(entry.quantityKg),
          operationCount: 1,
          destinations,
        });
      }
    }

    const rows: MudCerRow[] = Array.from(cerMap.entries()).map(([cerCode, data]) => {
      let mainDestination: string | null = null;
      let maxCount = 0;
      for (const [dest, count] of data.destinations.entries()) {
        if (count > maxCount) {
          maxCount = count;
          mainDestination = dest;
        }
      }

      return {
        cerCode,
        cerDescription: data.cerDescription,
        totalKg: data.totalKg,
        operationCount: data.operationCount,
        mainDestination,
      };
    });

    return {
      year,
      rows,
      totalKg: entries.reduce(
        (sum: number, e: { quantityKg: unknown }) => sum + Number(e.quantityKg),
        0,
      ),
      totalEntries: entries.length,
      totalFirs: firs,
    };
  }

  async exportCsv(tenantId: string, year: number): Promise<string> {
    const preview = await this.getPreview(tenantId, year);

    const header = 'CER,Descrizione,Quantita kg,Nr. Operazioni,Destinazione principale';
    const lines = preview.rows.map(
      row =>
        `"${row.cerCode}","${row.cerDescription}",${row.totalKg.toFixed(3)},${row.operationCount},"${row.mainDestination || ''}"`,
    );

    return [header, ...lines].join('\n');
  }
}
