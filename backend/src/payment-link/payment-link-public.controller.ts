/**
 * MechMind OS - Public Payment Link Controller
 *
 * Endpoint pubblico (senza autenticazione) per risolvere un token
 * di pagamento e mostrare il riepilogo fattura al cliente.
 */

import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PaymentLinkService } from './payment-link.service';

@ApiTags('Payment Link - Pubblico')
@Controller('public/pay')
export class PaymentLinkPublicController {
  constructor(private readonly paymentLinkService: PaymentLinkService) {}

  @Get(':token')
  @ApiOperation({ summary: 'Risolvi token di pagamento e mostra riepilogo fattura' })
  @ApiParam({ name: 'token', description: 'Token univoco del link di pagamento' })
  @ApiResponse({ status: 200, description: 'Riepilogo fattura con link al checkout' })
  @ApiResponse({ status: 404, description: 'Link di pagamento non valido o scaduto' })
  async resolvePaymentToken(@Param('token') token: string): Promise<unknown> {
    return this.paymentLinkService.resolvePaymentToken(token);
  }
}
