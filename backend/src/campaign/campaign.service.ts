import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto';
import { validateTransition, TransitionMap } from '../common/utils/state-machine';

const CAMPAIGN_TRANSITIONS: TransitionMap = {
  DRAFT: ['SCHEDULED', 'SENDING', 'CANCELLED'],
  SCHEDULED: ['SENDING', 'CANCELLED'],
  SENDING: ['SENT'],
  SENT: [],
  CANCELLED: [],
};

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateCampaignDto): Promise<Record<string, unknown>> {
    const campaign = await this.prisma.campaign.create({
      data: {
        tenantId,
        name: dto.name,
        type: dto.type as 'EMAIL' | 'SMS' | 'BOTH',
        template: dto.template,
        subject: dto.subject ?? null,
        segmentType: dto.segmentType ?? null,
        segmentFilters: dto.segmentFilters
          ? JSON.parse(JSON.stringify(dto.segmentFilters))
          : undefined,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      },
    });

    this.logger.log(`Campaign ${campaign.id} created for tenant ${tenantId}`);
    return campaign as unknown as Record<string, unknown>;
  }

  async findAll(
    tenantId: string,
    status?: string,
    page = 1,
    limit = 20,
  ): Promise<{
    data: unknown[];
    meta: { total: number; page: number; limit: number; pages: number };
  }> {
    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, tenantId: string): Promise<Record<string, unknown>> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, tenantId },
      include: {
        recipients: {
          take: 100,
          orderBy: { sentAt: 'desc' },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campagna non trovata');
    }

    return campaign as unknown as Record<string, unknown>;
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateCampaignDto,
  ): Promise<Record<string, unknown>> {
    const existing = await this.findOne(id, tenantId);

    if ((existing as Record<string, unknown>).status !== 'DRAFT') {
      throw new BadRequestException('Solo le campagne in bozza possono essere modificate');
    }

    const data: Record<string, unknown> = {};
    if (dto.name) data.name = dto.name;
    if (dto.template) data.template = dto.template;
    if (dto.subject !== undefined) data.subject = dto.subject ?? null;
    if (dto.segmentType !== undefined) data.segmentType = dto.segmentType ?? null;
    if (dto.segmentFilters !== undefined) data.segmentFilters = dto.segmentFilters ?? undefined;

    await this.prisma.campaign.updateMany({
      where: { id, tenantId },
      data,
    });

    const updated = await this.prisma.campaign.findFirst({
      where: { id, tenantId },
    });

    return updated as unknown as Record<string, unknown>;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const existing = await this.findOne(id, tenantId);

    if ((existing as Record<string, unknown>).status !== 'DRAFT') {
      throw new BadRequestException('Solo le campagne in bozza possono essere eliminate');
    }

    await this.prisma.campaign.deleteMany({ where: { id, tenantId } });
    this.logger.log(`Campaign ${id} deleted for tenant ${tenantId}`);
  }

  async schedule(
    id: string,
    tenantId: string,
    scheduledAt: Date,
  ): Promise<Record<string, unknown>> {
    const existing = await this.findOne(id, tenantId);
    const currentStatus = (existing as Record<string, unknown>).status as string;

    validateTransition(currentStatus, 'SCHEDULED', CAMPAIGN_TRANSITIONS, 'campaign');

    if (scheduledAt <= new Date()) {
      throw new BadRequestException('La data di programmazione deve essere nel futuro');
    }

    await this.prisma.campaign.updateMany({
      where: { id, tenantId },
      data: { status: 'SCHEDULED', scheduledAt },
    });

    const updated = await this.prisma.campaign.findFirst({
      where: { id, tenantId },
    });

    this.logger.log(`Campaign ${id} scheduled for ${scheduledAt.toISOString()}`);
    return updated as unknown as Record<string, unknown>;
  }

  async send(id: string, tenantId: string): Promise<Record<string, unknown>> {
    const existing = await this.findOne(id, tenantId);
    const currentStatus = (existing as Record<string, unknown>).status as string;

    validateTransition(currentStatus, 'SENDING', CAMPAIGN_TRANSITIONS, 'campaign');

    // Count recipients based on segment
    const recipientCount = await this.resolveRecipientCount(tenantId, existing);

    await this.prisma.campaign.updateMany({
      where: { id, tenantId },
      data: {
        status: 'SENDING',
        totalRecipients: recipientCount,
        sentAt: new Date(),
      },
    });

    const updated = await this.prisma.campaign.findFirst({
      where: { id, tenantId },
    });

    // In production: queue bulk send via BullMQ
    // For now, mark as SENT after initiating
    await this.prisma.campaign.updateMany({
      where: { id, tenantId },
      data: {
        status: 'SENT',
        totalSent: recipientCount,
      },
    });

    this.logger.log(`Campaign ${id} sent to ${recipientCount} recipients`);
    return updated as unknown as Record<string, unknown>;
  }

  async previewRecipients(
    tenantId: string,
    segmentType?: string,
  ): Promise<{ count: number; sample: unknown[] }> {
    const where: Record<string, unknown> = { tenantId, marketingConsent: true };

    if (segmentType === 'INACTIVE_6M') {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);
      where.updatedAt = { lt: sixMonthsAgo };
    }

    const [count, sample] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        take: 5,
        select: { id: true, encryptedFirstName: true, encryptedLastName: true },
      }),
    ]);

    return { count, sample };
  }

  async getStats(
    id: string,
    tenantId: string,
  ): Promise<{
    totalRecipients: number;
    totalSent: number;
    totalOpened: number;
    totalClicked: number;
    openRate: number;
    clickRate: number;
  }> {
    const campaign = await this.findOne(id, tenantId);
    const c = campaign as Record<string, unknown>;
    const totalSent = (c.totalSent as number) || 0;
    const totalOpened = (c.totalOpened as number) || 0;
    const totalClicked = (c.totalClicked as number) || 0;

    return {
      totalRecipients: (c.totalRecipients as number) || 0,
      totalSent,
      totalOpened,
      totalClicked,
      openRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
      clickRate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
    };
  }

  private async resolveRecipientCount(
    tenantId: string,
    campaign: Record<string, unknown>,
  ): Promise<number> {
    const segmentType = campaign.segmentType as string | null;
    const where: Record<string, unknown> = { tenantId, marketingConsent: true };

    if (segmentType === 'INACTIVE_6M') {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);
      where.updatedAt = { lt: sixMonthsAgo };
    }

    return this.prisma.customer.count({ where });
  }
}
