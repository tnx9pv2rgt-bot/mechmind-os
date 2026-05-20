import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../common/services/prisma.service';
import { EncryptionService } from '../../common/services/encryption.service';

@Injectable()
export class PaymentLinkService {
  private readonly logger = new Logger(PaymentLinkService.name);
  private readonly stripe: Stripe | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly encryption: EncryptionService,
  ) {
    const stripeKey = this.config.get<string>('STRIPE_SECRET_KEY');
    this.stripe = stripeKey
      ? new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion })
      : null;
  }

  async createPaymentLink(
    invoiceId: string,
    tenantId: string,
  ): Promise<{ url: string; linkId: string }> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { invoiceItems: true, customer: true },
    });

    if (!invoice) {
      throw new NotFoundException('Fattura non trovata');
    }

    if (invoice.status === 'PAID') {
      throw new BadRequestException('Fattura già pagata');
    }

    if (invoice.status === 'CANCELLED') {
      throw new BadRequestException('Fattura annullata');
    }

    if (!this.stripe) {
      throw new BadRequestException('Stripe non configurato: STRIPE_SECRET_KEY mancante');
    }

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'https://app.mechmind.io');
    const amountCents = Math.round(Number(invoice.total) * 100);

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            unit_amount: amountCents,
            product_data: { name: `Fattura ${invoice.invoiceNumber}` },
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${frontendUrl}/portal/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/portal/payments/cancel`,
      metadata: { invoiceId: invoice.id, tenantId },
    });

    const paymentUrl = session.url ?? '';
    const sessionId = session.id;

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paymentLinkUrl: paymentUrl,
        paymentLinkId: sessionId,
      },
    });

    this.logger.log(
      `Payment link created for invoice ${invoice.invoiceNumber} (tenant ${tenantId})`,
    );

    return { url: paymentUrl, linkId: sessionId };
  }

  async sendPaymentSms(
    invoiceId: string,
    tenantId: string,
  ): Promise<{ sent: boolean; paymentUrl: string }> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { customer: true },
    });

    if (!invoice) {
      throw new NotFoundException('Fattura non trovata');
    }

    if (invoice.status === 'PAID') {
      throw new BadRequestException('Fattura già pagata');
    }

    let paymentUrl = invoice.paymentLinkUrl;
    if (!paymentUrl) {
      const result = await this.createPaymentLink(invoiceId, tenantId);
      paymentUrl = result.url;
    }

    // Decrypt customer name for SMS personalization
    const customerName = invoice.customer.encryptedFirstName
      ? this.encryption.decrypt(invoice.customer.encryptedFirstName)
      : 'Cliente';

    this.logger.log(
      `Payment SMS queued for invoice ${invoice.invoiceNumber} to ${customerName} (${invoice.customerId})`,
    );

    return { sent: true, paymentUrl };
  }

  async handlePaymentWebhook(
    invoiceId: string,
    stripeSessionId: string,
    stripeEventId: string,
  ): Promise<void> {
    // Idempotency check: skip if this Stripe event was already processed
    const alreadyProcessed = await this.prisma.invoice.findFirst({
      where: { stripeEventId },
    });
    if (alreadyProcessed) {
      this.logger.warn(`Stripe event ${stripeEventId} already processed, skipping`);
      return;
    }

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      this.logger.warn(`Webhook: invoice ${invoiceId} not found`);
      return;
    }

    if (invoice.status === 'PAID') {
      this.logger.log(`Webhook: invoice ${invoiceId} already paid`);
      return;
    }

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paymentMethod: 'CARTA',
        paymentLinkId: stripeSessionId,
        stripeEventId,
      },
    });

    this.logger.log(`Invoice ${invoice.invoiceNumber} marked PAID via webhook`);
  }
}
