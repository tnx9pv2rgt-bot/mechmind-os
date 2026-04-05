import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/services/prisma.service';
import { PublicToken, PublicTokenType, Prisma } from '@prisma/client';
import * as crypto from 'crypto';

const DEFAULT_EXPIRY_HOURS = 72;

@Injectable()
export class PublicTokenService {
  constructor(private readonly prisma: PrismaService) {}

  async generateToken(
    tenantId: string,
    type: PublicTokenType,
    entityId: string,
    entityType: string,
    expiresInHours: number = DEFAULT_EXPIRY_HOURS,
    metadata?: Prisma.JsonValue,
  ): Promise<PublicToken> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    return this.prisma.publicToken.create({
      data: {
        tenantId,
        token,
        type,
        entityId,
        entityType,
        expiresAt,
        metadata: metadata ?? undefined,
      },
    });
  }

  async validateToken(token: string): Promise<PublicToken> {
    const record = await this.prisma.publicToken.findUnique({
      where: { token },
    });

    if (!record) {
      throw new NotFoundException('Token non trovato');
    }

    if (record.usedAt) {
      throw new BadRequestException('Token gi\u00e0 utilizzato');
    }

    if (record.expiresAt < new Date()) {
      throw new BadRequestException('Token scaduto');
    }

    return record;
  }

  async consumeToken(token: string): Promise<PublicToken> {
    const record = await this.validateToken(token);

    return this.prisma.publicToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
  }

  async revokeTokensForEntity(
    tenantId: string,
    entityType: string,
    entityId: string,
  ): Promise<number> {
    const result = await this.prisma.publicToken.updateMany({
      where: {
        tenantId,
        entityType,
        entityId,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    return result.count;
  }
}
