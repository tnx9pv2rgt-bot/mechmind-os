import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/services/prisma.service';
import { CreateCannedResponseDto, UpdateCannedResponseDto } from './dto/canned-response.dto';

@Injectable()
export class CannedResponseService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    dto: CreateCannedResponseDto,
  ): Promise<ReturnType<PrismaService['cannedResponse']['create']>> {
    return this.prisma.cannedResponse.create({
      data: {
        tenantId,
        category: dto.category,
        text: dto.text,
        severity: dto.severity ?? null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAll(
    tenantId: string,
    filters: { category?: string },
  ): Promise<Awaited<ReturnType<PrismaService['cannedResponse']['findMany']>>> {
    const where: Prisma.CannedResponseWhereInput = { tenantId };

    if (filters.category) {
      where.category = filters.category;
    }

    // Internal: bounded query — canned responses per tenant typically < 50
    return this.prisma.cannedResponse.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(
    tenantId: string,
    id: string,
  ): Promise<ReturnType<PrismaService['cannedResponse']['findFirst']>> {
    const response = await this.prisma.cannedResponse.findFirst({
      where: { id, tenantId },
    });

    if (!response) {
      throw new NotFoundException(`CannedResponse ${id} not found`);
    }

    return response;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateCannedResponseDto,
  ): Promise<ReturnType<PrismaService['cannedResponse']['update']>> {
    await this.findById(tenantId, id);

    return this.prisma.cannedResponse.update({
      where: { id },
      data: {
        category: dto.category,
        text: dto.text,
        severity: dto.severity,
        isActive: dto.isActive,
      },
    });
  }

  async remove(
    tenantId: string,
    id: string,
  ): Promise<ReturnType<PrismaService['cannedResponse']['update']>> {
    await this.findById(tenantId, id);

    return this.prisma.cannedResponse.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
