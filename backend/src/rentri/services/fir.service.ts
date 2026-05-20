/**
 * MechMind OS - FIR (Formulario Identificazione Rifiuti) Service
 *
 * Gestione formulari di trasporto rifiuti con state machine
 * per transizioni di stato conformi alla normativa RENTRI.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { CreateFirDto } from '../dto/waste-fir.dto';
import { WasteFirStatus, Prisma } from '@prisma/client';
import { validateTransition, TransitionMap } from '../../common/utils/state-machine';

const FIR_TRANSITIONS: TransitionMap = {
  DRAFT: ['VIDIMATED', 'CANCELLED'],
  VIDIMATED: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['CONFIRMED'],
  CONFIRMED: [],
  CANCELLED: [],
};

@Injectable()
export class FirService {
  constructor(private readonly prisma: PrismaService) {}

  async createFir(tenantId: string, dto: CreateFirDto, userId?: string): Promise<unknown> {
    const firNumber = await this.generateFirNumber(tenantId);

    // Fetch tenant info for producer fields
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    return this.prisma.wasteFir.create({
      data: {
        tenantId,
        firNumber,
        status: WasteFirStatus.DRAFT,
        cerCode: dto.cerCode,
        cerDescription: dto.cerDescription,
        hazardClass: dto.hazardClass,
        physicalState: dto.physicalState,
        quantityKg: new Prisma.Decimal(dto.quantityKg),
        quantityUnits: dto.quantityUnits,
        unitType: dto.unitType,
        producerName: tenant?.name || '',
        producerFiscalCode: '',
        producerAddress: '',
        transporterId: dto.transporterId,
        destinationId: dto.destinationId,
        scheduledDate: new Date(dto.scheduledDate),
        adrClass: dto.adrClass,
        adrUnNumber: dto.adrUnNumber,
        vehiclePlate: dto.vehiclePlate,
        notes: dto.notes,
        createdBy: userId,
      },
      include: { transporter: true, destination: true, entries: true },
    });
  }

  async findAllFirs(
    tenantId: string,
    query: { page?: number; limit?: number; status?: string },
  ): Promise<{ data: unknown[]; total: number; page: number; limit: number; pages: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.WasteFirWhereInput = { tenantId };
    if (query.status) {
      where.status = query.status as WasteFirStatus;
    }

    const [data, total] = await Promise.all([
      this.prisma.wasteFir.findMany({
        where,
        include: { transporter: true, destination: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.wasteFir.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOneFir(tenantId: string, id: string): Promise<unknown> {
    const fir = await this.prisma.wasteFir.findFirst({
      where: { id, tenantId },
      include: { transporter: true, destination: true, entries: true },
    });

    if (!fir) {
      throw new NotFoundException(`FIR con ID ${id} non trovato`);
    }

    return fir;
  }

  async updateStatus(tenantId: string, id: string, newStatus: WasteFirStatus): Promise<unknown> {
    const fir = await this.prisma.wasteFir.findFirst({
      where: { id, tenantId },
    });

    if (!fir) {
      throw new NotFoundException(`FIR con ID ${id} non trovato`);
    }

    validateTransition(fir.status, newStatus, FIR_TRANSITIONS, 'FIR');

    const updateData: Prisma.WasteFirUpdateInput = { status: newStatus };

    if (newStatus === WasteFirStatus.IN_TRANSIT) {
      updateData.pickupDate = new Date();
    }
    if (newStatus === WasteFirStatus.DELIVERED) {
      updateData.deliveryDate = new Date();
    }
    if (newStatus === WasteFirStatus.CONFIRMED) {
      updateData.confirmationDate = new Date();
    }

    return this.prisma.wasteFir.update({
      where: { id },
      data: updateData,
      include: { transporter: true, destination: true },
    });
  }

  async vidimateFir(tenantId: string, id: string, vivifirCode: string): Promise<unknown> {
    const fir = await this.prisma.wasteFir.findFirst({
      where: { id, tenantId },
    });

    if (!fir) {
      throw new NotFoundException(`FIR con ID ${id} non trovato`);
    }

    validateTransition(fir.status, WasteFirStatus.VIDIMATED, FIR_TRANSITIONS, 'FIR');

    return this.prisma.wasteFir.update({
      where: { id },
      data: {
        status: WasteFirStatus.VIDIMATED,
        vivifirCode,
      },
      include: { transporter: true, destination: true },
    });
  }

  private async generateFirNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();

    const lastFir = await this.prisma.wasteFir.findFirst({
      where: {
        tenantId,
        firNumber: { startsWith: `FIR-${year}-` },
      },
      orderBy: { firNumber: 'desc' },
    });

    let nextNum = 1;
    if (lastFir) {
      const parts = lastFir.firNumber.split('-');
      nextNum = parseInt(parts[2], 10) + 1;
    }

    return `FIR-${year}-${String(nextNum).padStart(4, '0')}`;
  }
}
