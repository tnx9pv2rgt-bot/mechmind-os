import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@common/services/prisma.service';
import { CreateProgramDto, UpdateProgramDto } from './dto/create-program.dto';
import { BillingCycle } from './dto/enroll-customer.dto';
import { MembershipStatus, Prisma } from '@prisma/client';

interface BenefitItem {
  type: string;
  description: string;
  maxPerMonth: number;
  discountPercent: number;
}

@Injectable()
export class MembershipService {
  private readonly logger = new Logger(MembershipService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createProgram(
    tenantId: string,
    dto: CreateProgramDto,
  ): Promise<ReturnType<typeof this.prisma.membershipProgram.create>> {
    const existing = await this.prisma.membershipProgram.findUnique({
      where: { tenantId_name: { tenantId, name: dto.name } },
    });

    if (existing) {
      throw new ConflictException(`Programma con nome "${dto.name}" esiste già`);
    }

    return this.prisma.membershipProgram.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description ?? null,
        priceMonthly: new Prisma.Decimal(dto.priceMonthly),
        priceYearly: dto.priceYearly != null ? new Prisma.Decimal(dto.priceYearly) : null,
        stripePriceMonthlyId: dto.stripePriceMonthlyId ?? null,
        stripePriceYearlyId: dto.stripePriceYearlyId ?? null,
        benefits: dto.benefits as unknown as Prisma.InputJsonValue,
        maxRedemptionsPerMonth: dto.maxRedemptionsPerMonth ?? 2,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateProgram(
    tenantId: string,
    programId: string,
    dto: UpdateProgramDto,
  ): Promise<ReturnType<typeof this.prisma.membershipProgram.update>> {
    const program = await this.prisma.membershipProgram.findFirst({
      where: { id: programId, tenantId },
    });

    if (!program) {
      throw new NotFoundException('Programma non trovato');
    }

    if (dto.name && dto.name !== program.name) {
      const duplicate = await this.prisma.membershipProgram.findUnique({
        where: { tenantId_name: { tenantId, name: dto.name } },
      });
      if (duplicate) {
        throw new ConflictException(`Programma con nome "${dto.name}" esiste già`);
      }
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.priceMonthly !== undefined) data.priceMonthly = new Prisma.Decimal(dto.priceMonthly);
    if (dto.priceYearly !== undefined) data.priceYearly = new Prisma.Decimal(dto.priceYearly);
    if (dto.stripePriceMonthlyId !== undefined)
      data.stripePriceMonthlyId = dto.stripePriceMonthlyId;
    if (dto.stripePriceYearlyId !== undefined) data.stripePriceYearlyId = dto.stripePriceYearlyId;
    if (dto.benefits !== undefined)
      data.benefits = dto.benefits as unknown as Prisma.InputJsonValue;
    if (dto.maxRedemptionsPerMonth !== undefined)
      data.maxRedemptionsPerMonth = dto.maxRedemptionsPerMonth;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.membershipProgram.update({
      where: { id: programId },
      data,
    });
  }

  async listPrograms(
    tenantId: string,
  ): Promise<ReturnType<typeof this.prisma.membershipProgram.findMany>> {
    return this.prisma.membershipProgram.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProgram(
    tenantId: string,
    programId: string,
  ): Promise<ReturnType<typeof this.prisma.membershipProgram.findFirst>> {
    const program = await this.prisma.membershipProgram.findFirst({
      where: { id: programId, tenantId },
    });

    if (!program) {
      throw new NotFoundException('Programma non trovato');
    }

    return program;
  }

  async deleteProgram(tenantId: string, programId: string): Promise<void> {
    const program = await this.prisma.membershipProgram.findFirst({
      where: { id: programId, tenantId },
    });

    if (!program) {
      throw new NotFoundException('Programma non trovato');
    }

    const activeCount = await this.prisma.customerMembership.count({
      where: { programId, tenantId, status: MembershipStatus.ACTIVE },
    });

    if (activeCount > 0) {
      throw new BadRequestException(`Impossibile eliminare: ${activeCount} iscrizione/i attiva/e`);
    }

    await this.prisma.membershipProgram.deleteMany({ where: { id: programId, tenantId } });
  }

  async enrollCustomer(
    tenantId: string,
    customerId: string,
    programId: string,
    billingCycle: BillingCycle,
  ): Promise<ReturnType<typeof this.prisma.customerMembership.create>> {
    const program = await this.prisma.membershipProgram.findFirst({
      where: { id: programId, tenantId, isActive: true },
    });

    if (!program) {
      throw new NotFoundException('Programma non trovato o non attivo');
    }

    const existing = await this.prisma.customerMembership.findFirst({
      where: {
        tenantId,
        customerId,
        programId,
        status: MembershipStatus.ACTIVE,
      },
    });

    if (existing) {
      throw new ConflictException('Il cliente è già iscritto a questo programma');
    }

    const now = new Date();
    const endDate = new Date(now);
    if (billingCycle === 'YEARLY') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    const stripeSubscriptionId: string | null = null;

    // If Stripe price IDs are configured, attempt to create a subscription
    const stripePriceId =
      billingCycle === 'YEARLY' ? program.stripePriceYearlyId : program.stripePriceMonthlyId;

    if (stripePriceId) {
      this.logger.log(
        `Stripe price ID configured (${stripePriceId}), subscription creation would happen here`,
      );
      // Stripe integration placeholder: create subscription via Stripe SDK
      // stripeSubscriptionId = subscription.id;
    }

    return this.prisma.customerMembership.create({
      data: {
        tenantId,
        customerId,
        programId,
        stripeSubscriptionId,
        status: MembershipStatus.ACTIVE,
        startDate: now,
        endDate,
      },
      include: { program: true },
    });
  }

  async cancelMembership(
    tenantId: string,
    membershipId: string,
  ): Promise<ReturnType<typeof this.prisma.customerMembership.update>> {
    const membership = await this.findMembershipOrThrow(tenantId, membershipId);

    if (membership.status === MembershipStatus.CANCELLED) {
      throw new BadRequestException('Iscrizione già cancellata');
    }

    return this.prisma.customerMembership.update({
      where: { id: membershipId },
      data: {
        status: MembershipStatus.CANCELLED,
        endDate: new Date(),
      },
      include: { program: true },
    });
  }

  async pauseMembership(
    tenantId: string,
    membershipId: string,
  ): Promise<ReturnType<typeof this.prisma.customerMembership.update>> {
    const membership = await this.findMembershipOrThrow(tenantId, membershipId);

    if (membership.status !== MembershipStatus.ACTIVE) {
      throw new BadRequestException('Solo le iscrizioni attive possono essere messe in pausa');
    }

    return this.prisma.customerMembership.update({
      where: { id: membershipId },
      data: { status: MembershipStatus.PAUSED },
      include: { program: true },
    });
  }

  async getCustomerMemberships(
    tenantId: string,
    customerId: string,
  ): Promise<ReturnType<typeof this.prisma.customerMembership.findMany>> {
    return this.prisma.customerMembership.findMany({
      where: { tenantId, customerId },
      include: { program: true, redemptions: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async checkBenefits(
    tenantId: string,
    customerId: string,
  ): Promise<
    Array<{
      membershipId: string;
      programName: string;
      benefits: Array<{
        type: string;
        description: string;
        maxPerMonth: number;
        discountPercent: number;
        usedThisMonth: number;
        remaining: number;
      }>;
    }>
  > {
    const memberships = await this.prisma.customerMembership.findMany({
      where: { tenantId, customerId, status: MembershipStatus.ACTIVE },
      include: { program: true, redemptions: true },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return memberships.map(m => {
      const benefits = (m.program.benefits as unknown as BenefitItem[]) || [];
      const monthRedemptions = m.redemptions.filter(r => new Date(r.redeemedAt) >= startOfMonth);

      return {
        membershipId: m.id,
        programName: m.program.name,
        benefits: benefits.map(b => {
          const usedThisMonth = monthRedemptions.filter(r => r.benefitType === b.type).length;
          return {
            type: b.type,
            description: b.description,
            maxPerMonth: b.maxPerMonth,
            discountPercent: b.discountPercent,
            usedThisMonth,
            remaining: Math.max(0, b.maxPerMonth - usedThisMonth),
          };
        }),
      };
    });
  }

  async redeemBenefit(
    tenantId: string,
    membershipId: string,
    benefitType: string,
    bookingId?: string,
    workOrderId?: string,
    valueCents?: number,
  ): Promise<ReturnType<typeof this.prisma.membershipRedemption.create>> {
    const membership = await this.prisma.customerMembership.findFirst({
      where: { id: membershipId, tenantId, status: MembershipStatus.ACTIVE },
      include: { program: true, redemptions: true },
    });

    if (!membership) {
      throw new NotFoundException('Iscrizione non trovata o non attiva');
    }

    const benefits = (membership.program.benefits as unknown as BenefitItem[]) || [];
    const benefit = benefits.find(b => b.type === benefitType);

    if (!benefit) {
      throw new BadRequestException(`Benefit "${benefitType}" non disponibile in questo programma`);
    }

    // Check monthly limit
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthRedemptions = membership.redemptions.filter(
      r => r.benefitType === benefitType && new Date(r.redeemedAt) >= startOfMonth,
    );

    if (monthRedemptions.length >= benefit.maxPerMonth) {
      throw new BadRequestException(
        `Limite mensile raggiunto per "${benefitType}" (${benefit.maxPerMonth}/${benefit.maxPerMonth})`,
      );
    }

    // Check global monthly limit
    const totalMonthRedemptions = membership.redemptions.filter(
      r => new Date(r.redeemedAt) >= startOfMonth,
    );

    if (totalMonthRedemptions.length >= membership.program.maxRedemptionsPerMonth) {
      throw new BadRequestException(
        `Limite mensile totale raggiunto (${membership.program.maxRedemptionsPerMonth} riscatti)`,
      );
    }

    return this.prisma.membershipRedemption.create({
      data: {
        membershipId,
        benefitType,
        bookingId: bookingId ?? null,
        workOrderId: workOrderId ?? null,
        redeemedAt: now,
        valueCents: new Prisma.Decimal(valueCents ?? 0),
      },
    });
  }

  async getRedemptionHistory(
    tenantId: string,
    membershipId: string,
  ): Promise<ReturnType<typeof this.prisma.membershipRedemption.findMany>> {
    const membership = await this.findMembershipOrThrow(tenantId, membershipId);

    return this.prisma.membershipRedemption.findMany({
      where: { membershipId: membership.id },
      orderBy: { redeemedAt: 'desc' },
    });
  }

  private async findMembershipOrThrow(
    tenantId: string,
    membershipId: string,
  ): Promise<NonNullable<Awaited<ReturnType<typeof this.prisma.customerMembership.findFirst>>>> {
    const membership = await this.prisma.customerMembership.findFirst({
      where: { id: membershipId, tenantId },
      include: { program: true },
    });

    if (!membership) {
      throw new NotFoundException('Iscrizione non trovata');
    }

    return membership;
  }
}
