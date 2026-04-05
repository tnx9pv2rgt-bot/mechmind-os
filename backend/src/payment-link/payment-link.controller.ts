/**
 * MechMind OS - Payment Link Controller (Authenticated)
 *
 * Endpoint autenticati per invio link di pagamento e verifica stato.
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../auth/decorators/current-user.decorator';
import { PaymentLinkService } from './payment-link.service';
import { SendPaymentLinkDto } from './dto/send-payment-link.dto';

@ApiTags('Payment Link - Text-to-Pay')
@Controller({ path: 'invoices', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentLinkController {
  constructor(private readonly paymentLinkService: PaymentLinkService) {}

  @Post(':id/send-payment-link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Crea e invia link di pagamento per fattura' })
  @ApiParam({ name: 'id', description: 'ID fattura' })
  @ApiResponse({ status: 200, description: 'Link di pagamento creato e inviato' })
  @ApiResponse({
    status: 400,
    description: 'Fattura già pagata o annullata / Stripe non configurato',
  })
  @ApiResponse({ status: 404, description: 'Fattura non trovata' })
  async sendPaymentLink(
    @CurrentTenant() tenantId: string,
    @Param('id') invoiceId: string,
    @Body() dto: SendPaymentLinkDto,
  ): Promise<unknown> {
    return this.paymentLinkService.createPaymentLink(tenantId, invoiceId, dto.channel);
  }

  @Get(':id/payment-status')
  @ApiOperation({ summary: 'Verifica stato pagamento fattura' })
  @ApiParam({ name: 'id', description: 'ID fattura' })
  @ApiResponse({ status: 200, description: 'Stato pagamento' })
  @ApiResponse({ status: 404, description: 'Fattura non trovata' })
  async getPaymentStatus(
    @CurrentTenant() tenantId: string,
    @Param('id') invoiceId: string,
  ): Promise<unknown> {
    return this.paymentLinkService.getPaymentStatus(tenantId, invoiceId);
  }
}
