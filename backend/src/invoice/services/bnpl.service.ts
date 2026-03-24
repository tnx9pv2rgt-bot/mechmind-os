import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/services/prisma.service';

@Injectable()
export class BnplService {
  private readonly logger = new Logger(BnplService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async createBnplOrder(
    invoiceId: string,
    tenantId: string,
  ): Promise<{ redirectUrl: string; orderId: string }> {
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

    // Generate BNPL order reference
    const orderId = `bnpl_${invoiceId.replace(/-/g, '').slice(0, 20)}`;
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'https://app.mechmind.io');
    const redirectUrl = `${frontendUrl}/portal/invoices/${invoice.id}?bnpl=success`;

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        bnplProvider: 'scalapay',
        bnplOrderId: orderId,
        bnplStatus: 'PENDING',
      },
    });

    this.logger.log(`BNPL order created for invoice ${invoice.invoiceNumber} (tenant ${tenantId})`);

    return { redirectUrl, orderId };
  }

  async handleBnplWebhook(
    orderId: string,
    status: 'APPROVED' | 'DECLINED' | 'COMPLETED',
  ): Promise<void> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { bnplOrderId: orderId },
    });

    if (!invoice) {
      this.logger.warn(`BNPL webhook: order ${orderId} not found`);
      return;
    }

    const updateData: Record<string, unknown> = { bnplStatus: status };

    if (status === 'APPROVED' || status === 'COMPLETED') {
      updateData.status = 'PAID';
      updateData.paidAt = new Date();
      updateData.paymentMethod = 'BNPL';
    }

    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: updateData,
    });

    this.logger.log(`BNPL webhook processed: invoice ${invoice.invoiceNumber}, status ${status}`);
  }
}
