import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '@common/services/prisma.service';

interface AuthRequest {
  user: { userId: string; tenantId: string };
}

@ApiTags('Billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'billing', version: '1' })
export class BillingController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('payment-method')
  @ApiOperation({ summary: 'Recupera metodo di pagamento corrente' })
  @ApiResponse({ status: 200 })
  async getPaymentMethod(@Req() req: AuthRequest): Promise<{ success: boolean; data: unknown }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId: req.user.tenantId },
      select: {
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        status: true,
        plan: true,
        currentPeriodEnd: true,
      },
    });

    return {
      success: true,
      data: {
        hasPaymentMethod: !!subscription?.stripeCustomerId,
        stripeCustomerId: subscription?.stripeCustomerId ?? null,
        subscriptionStatus: subscription?.status ?? null,
        plan: subscription?.plan ?? null,
        currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
      },
    };
  }

  @Post('payment-method')
  @ApiOperation({ summary: 'Aggiorna metodo di pagamento (Stripe setup intent)' })
  @ApiResponse({ status: 200 })
  async updatePaymentMethod(
    @Req() req: AuthRequest,
    @Body() body: { stripePaymentMethodId?: string },
  ): Promise<{ success: boolean; data: unknown }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId: req.user.tenantId },
      select: { id: true, stripeCustomerId: true },
    });

    return {
      success: true,
      data: {
        updated: false,
        message: 'Stripe non configurato in questo ambiente',
        stripeCustomerId: subscription?.stripeCustomerId ?? null,
        paymentMethodId: body.stripePaymentMethodId ?? null,
      },
    };
  }
}
