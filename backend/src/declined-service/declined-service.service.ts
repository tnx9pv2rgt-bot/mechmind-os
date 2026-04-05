/**
 * MechMind OS - Declined Service Follow-Up Service
 *
 * Tracciamento servizi rifiutati dal cliente, follow-up e conversione.
 * Permette di recuperare clienti che hanno rifiutato interventi suggeriti.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { Prisma } from '@prisma/client';

export interface TrackDeclinedServiceInput {
  estimateId: string;
  estimateLineId: string;
  customerId: string;
  vehicleId?: string;
  serviceDescription: string;
  estimatedCostCents: number;
  severity?: string;
}

export interface DeclinedServiceFilters {
  customerId?: string;
  severity?: string;
  dateFrom?: string;
  dateTo?: string;
  followedUp?: boolean;
}

export interface DeclinedServicePaginated {
  data: unknown[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface DeclinedServiceStats {
  total: number;
  pendingFollowUp: number;
  converted: number;
  conversionRate: number;
}

@Injectable()
export class DeclinedServiceService {
  constructor(private readonly prisma: PrismaService) {}

  async trackDeclinedService(tenantId: string, input: TrackDeclinedServiceInput): Promise<unknown> {
    return this.prisma.declinedService.create({
      data: {
        tenantId,
        estimateId: input.estimateId,
        estimateLineId: input.estimateLineId,
        customerId: input.customerId,
        vehicleId: input.vehicleId,
        serviceDescription: input.serviceDescription,
        estimatedCostCents: new Prisma.Decimal(input.estimatedCostCents),
        severity: input.severity,
        declinedAt: new Date(),
      },
      include: { customer: true, estimate: true },
    });
  }

  async getDeclinedServices(
    tenantId: string,
    filters: DeclinedServiceFilters,
    page = 1,
    limit = 20,
  ): Promise<DeclinedServicePaginated> {
    const skip = (page - 1) * limit;

    const where: Prisma.DeclinedServiceWhereInput = { tenantId };

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }
    if (filters.severity) {
      where.severity = filters.severity;
    }
    if (filters.dateFrom || filters.dateTo) {
      where.declinedAt = {};
      if (filters.dateFrom) {
        where.declinedAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.declinedAt.lte = new Date(filters.dateTo);
      }
    }
    if (filters.followedUp === true) {
      where.followUpSentAt = { not: null };
    } else if (filters.followedUp === false) {
      where.followUpSentAt = null;
    }

    const [data, total] = await Promise.all([
      this.prisma.declinedService.findMany({
        where,
        include: { customer: true, estimate: true },
        orderBy: { declinedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.declinedService.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getFollowUpCandidates(tenantId: string, daysAgo = 30): Promise<unknown[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

    return this.prisma.declinedService.findMany({
      where: {
        tenantId,
        declinedAt: { lte: cutoffDate },
        followUpSentAt: null,
        convertedAt: null,
      },
      include: { customer: true, estimate: true },
      orderBy: { declinedAt: 'asc' },
    });
  }

  async markFollowUpSent(tenantId: string, id: string, campaignId?: string): Promise<unknown> {
    const record = await this.prisma.declinedService.findFirst({
      where: { id, tenantId },
    });

    if (!record) {
      throw new NotFoundException(`Servizio rifiutato con ID ${id} non trovato`);
    }

    return this.prisma.declinedService.update({
      where: { id },
      data: {
        followUpSentAt: new Date(),
        followUpCount: { increment: 1 },
        followUpCampaignId: campaignId ?? record.followUpCampaignId,
      },
      include: { customer: true, estimate: true },
    });
  }

  async markConverted(tenantId: string, id: string, bookingId: string): Promise<unknown> {
    const record = await this.prisma.declinedService.findFirst({
      where: { id, tenantId },
    });

    if (!record) {
      throw new NotFoundException(`Servizio rifiutato con ID ${id} non trovato`);
    }

    return this.prisma.declinedService.update({
      where: { id },
      data: {
        convertedAt: new Date(),
        convertedBookingId: bookingId,
      },
      include: { customer: true, estimate: true },
    });
  }

  async getStats(tenantId: string): Promise<DeclinedServiceStats> {
    const [total, pendingFollowUp, converted] = await Promise.all([
      this.prisma.declinedService.count({ where: { tenantId } }),
      this.prisma.declinedService.count({
        where: { tenantId, followUpSentAt: null, convertedAt: null },
      }),
      this.prisma.declinedService.count({
        where: { tenantId, convertedAt: { not: null } },
      }),
    ]);

    const conversionRate = total > 0 ? (converted / total) * 100 : 0;

    return {
      total,
      pendingFollowUp,
      converted,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };
  }
}
