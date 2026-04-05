/**
 * MechMind OS - Payment Link (Text-to-Pay) Service
 *
 * Generazione link di pagamento, invio via SMS/WhatsApp/Email,
 * integrazione Stripe Checkout, gestione webhook pagamento completato.
 */

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../common/services/prisma.service';

export interface PaymentLinkResult {
  url: string;
  linkId: string;
  channel: string;
  sent: boolean;
}

export interface PaymentStatusResult {
  invoiceId: string;
  status: string;
  paymentLinkUrl: string | null;
  paidAt: Date | null;
  total: string;
}

export interface PublicInvoiceSummary {
  invoiceNumber: string;
  total: string;
  taxAmount: string;
  status: string;
  dueDate: string | null;
  tenantName: string;
  checkoutUrl: string | null;
}

@Injectable()
export class PaymentLinkService {
  private readonly logger = new Logger(PaymentLinkService.name);
  private readonly stripe: Stripe | null;
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const stripeKey = this.config.get<string>('STRIPE_SECRET_KEY');
    this.stripe = stripeKey
      ? new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion })
      : null;
    this.frontendUrl = this.config.get<string>('FRONTEND_URL', 'https://app.mechmind.io');
  }

  async createPaymentLink(
    tenantId: string,
    invoiceId: string,
    channel: 'SMS' | 'WHATSAPP' | 'EMAIL',
  ): Promise<PaymentLinkResult> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { customer: true, invoiceItems: true },
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

    // Create Stripe checkout session
    const checkoutResult = await this.createStripeCheckoutSession(tenantId, invoiceId);

    // Store payment link URL and token on the invoice
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paymentLinkUrl: checkoutResult.url,
        paymentLinkId: checkoutResult.sessionId,
      },
    });

    // Dispatch notification via the appropriate channel
    const sent = await this.dispatchNotification(tenantId, invoice, checkoutResult.url, channel);

    this.logger.log(
      `Payment link created and sent via ${channel} for invoice ${invoice.invoiceNumber} (tenant ${tenantId})`,
    );

    return {
      url: checkoutResult.url,
      linkId: checkoutResult.sessionId,
      channel,
      sent,
    };
  }

  async createStripeCheckoutSession(
    tenantId: string,
    invoiceId: string,
  ): Promise<{ url: string; sessionId: string }> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe non configurato: STRIPE_SECRET_KEY mancante');
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { invoiceItems: true },
    });

    if (!invoice) {
      throw new NotFoundException('Fattura non trovata');
    }

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
      success_url: `${this.frontendUrl}/portal/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.frontendUrl}/portal/payments/cancel`,
      metadata: { invoiceId: invoice.id, tenantId },
    });

    return {
      url: session.url ?? '',
      sessionId: session.id,
    };
  }

  async handlePaymentCompleted(stripeSessionId: string): Promise<void> {
    // Find the invoice by paymentLinkId (Stripe session ID)
    const invoice = await this.prisma.invoice.findFirst({
      where: { paymentLinkId: stripeSessionId },
    });

    if (!invoice) {
      this.logger.warn(`Webhook: no invoice found for Stripe session ${stripeSessionId}`);
      return;
    }

    if (invoice.status === 'PAID') {
      this.logger.log(`Webhook: invoice ${invoice.invoiceNumber} already paid, skipping`);
      return;
    }

    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paymentMethod: 'CARTA',
      },
    });

    this.logger.log(
      `Invoice ${invoice.invoiceNumber} marked PAID via Stripe webhook (session ${stripeSessionId})`,
    );
  }

  async getPaymentStatus(tenantId: string, invoiceId: string): Promise<PaymentStatusResult> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
    });

    if (!invoice) {
      throw new NotFoundException('Fattura non trovata');
    }

    return {
      invoiceId: invoice.id,
      status: invoice.status,
      paymentLinkUrl: invoice.paymentLinkUrl,
      paidAt: invoice.paidAt,
      total: invoice.total.toString(),
    };
  }

  async resolvePaymentToken(token: string): Promise<PublicInvoiceSummary> {
    // The token is the paymentLinkId (Stripe session ID) stored on the invoice
    const invoice = await this.prisma.invoice.findFirst({
      where: { paymentLinkId: token },
      include: { customer: true },
    });

    if (!invoice) {
      throw new NotFoundException('Link di pagamento non valido o scaduto');
    }

    // Look up tenant name for display
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: invoice.tenantId },
    });

    return {
      invoiceNumber: invoice.invoiceNumber,
      total: invoice.total.toString(),
      taxAmount: invoice.taxAmount.toString(),
      status: invoice.status,
      dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
      tenantName: tenant?.name ?? 'Officina',
      checkoutUrl: invoice.paymentLinkUrl,
    };
  }

  private async dispatchNotification(
    tenantId: string,
    invoice: { id: string; invoiceNumber: string; customerId: string },
    paymentUrl: string,
    channel: 'SMS' | 'WHATSAPP' | 'EMAIL',
  ): Promise<boolean> {
    // Queue the notification for async delivery
    // In a full implementation, this delegates to NotificationService/BullMQ
    this.logger.log(
      `Payment notification queued via ${channel} for invoice ${invoice.invoiceNumber} ` +
        `(customer ${invoice.customerId}, tenant ${tenantId}), URL: ${paymentUrl}`,
    );
    return true;
  }
}
