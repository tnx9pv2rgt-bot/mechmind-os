import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Req,
  Res,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PortalService } from './portal.service';

@ApiTags('Portal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'portal', version: '1' })
export class PortalController {
  private readonly logger = new Logger(PortalController.name);

  constructor(private readonly portalService: PortalService) {}

  private extractAuth(req: { user: { userId: string; tenantId: string } }): {
    customerId: string;
    tenantId: string;
  } {
    return { customerId: req.user.userId, tenantId: req.user.tenantId };
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard cliente portale' })
  @ApiResponse({ status: 200, description: 'Riepilogo veicoli, prenotazioni, fatture' })
  // eslint-disable-next-line sonarjs/no-duplicate-string
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async getDashboard(@Req() req: { user: { userId: string; tenantId: string } }): Promise<{
    data: Record<string, unknown>;
  }> {
    const { customerId, tenantId } = this.extractAuth(req);
    this.logger.log(`Dashboard requested for customer ${customerId}`);
    return this.portalService.getDashboard(customerId, tenantId);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Profilo cliente portale' })
  @ApiResponse({ status: 200, description: 'Dati profilo cliente' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async getProfile(@Req() req: { user: { userId: string; tenantId: string } }): Promise<{
    data: Record<string, unknown>;
  }> {
    const { customerId, tenantId } = this.extractAuth(req);
    return this.portalService.getProfile(customerId, tenantId);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Aggiorna profilo cliente portale' })
  @ApiResponse({ status: 200, description: 'Profilo aggiornato' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async updateProfile(
    @Req() req: { user: { userId: string; tenantId: string } },
    @Body() body: { firstName?: string; lastName?: string; phone?: string },
  ): Promise<{ data: Record<string, unknown> }> {
    const { customerId, tenantId } = this.extractAuth(req);
    return this.portalService.updateProfile(customerId, tenantId, body);
  }

  @Get('vehicles')
  @ApiOperation({ summary: 'Veicoli del cliente' })
  @ApiResponse({ status: 200, description: 'Lista veicoli associati' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async getVehicles(@Req() req: { user: { userId: string; tenantId: string } }): Promise<{
    data: unknown[];
  }> {
    const { customerId, tenantId } = this.extractAuth(req);
    return this.portalService.getVehicles(customerId, tenantId);
  }

  @Get('bookings')
  @ApiOperation({ summary: 'Prenotazioni del cliente' })
  @ApiResponse({ status: 200, description: 'Lista prenotazioni' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async getBookings(@Req() req: { user: { userId: string; tenantId: string } }): Promise<{
    data: unknown[];
  }> {
    const { customerId, tenantId } = this.extractAuth(req);
    return this.portalService.getBookings(customerId, tenantId);
  }

  @Get('bookings/slots')
  @ApiOperation({ summary: 'Slot disponibili per prenotazione' })
  @ApiResponse({ status: 200, description: 'Slot orari disponibili' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async getAvailableSlots(
    @Req() req: { user: { userId: string; tenantId: string } },
    @Query('date') date: string,
    @Query('serviceType') serviceType?: string,
  ): Promise<{ data: unknown[] }> {
    const { tenantId } = this.extractAuth(req);
    return this.portalService.getAvailableSlots(tenantId, date, serviceType);
  }

  @Post('bookings')
  @ApiOperation({ summary: 'Crea prenotazione da portale cliente' })
  @ApiResponse({ status: 201, description: 'Prenotazione creata' })
  @ApiResponse({ status: 400, description: 'Dati non validi' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async createBooking(
    @Req() req: { user: { userId: string; tenantId: string } },
    @Body()
    body: {
      vehicleId: string;
      slotId: string;
      notes?: string;
      serviceType?: string;
    },
  ): Promise<{ data: Record<string, unknown> }> {
    const { customerId, tenantId } = this.extractAuth(req);
    return this.portalService.createBooking(customerId, tenantId, body);
  }

  @Get('inspections')
  @ApiOperation({ summary: 'Ispezioni veicoli del cliente' })
  @ApiResponse({ status: 200, description: 'Lista ispezioni' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async getInspections(@Req() req: { user: { userId: string; tenantId: string } }): Promise<{
    data: unknown[];
  }> {
    const { customerId, tenantId } = this.extractAuth(req);
    return this.portalService.getInspections(customerId, tenantId);
  }

  @Get('maintenance')
  @ApiOperation({ summary: 'Piano manutenzione veicoli del cliente' })
  @ApiResponse({ status: 200, description: 'Scadenze manutenzione' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async getMaintenanceSchedule(
    @Req() req: { user: { userId: string; tenantId: string } },
  ): Promise<{
    data: unknown[];
  }> {
    const { customerId, tenantId } = this.extractAuth(req);
    return this.portalService.getMaintenanceSchedule(customerId, tenantId);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'Lista fatture del cliente' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Filtra per anno (es. 2025)',
  })
  @ApiQuery({ name: 'from', required: false, description: 'Data inizio (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: false, description: 'Data fine (YYYY-MM-DD)' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Stato fattura (PAID, SENT, OVERDUE, etc.)',
  })
  @ApiResponse({ status: 200, description: 'Lista fatture' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async getInvoices(
    @Req() req: { user: { userId: string; tenantId: string } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('year') year?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
  ): Promise<{ data: unknown[]; meta: { total: number; page: number; limit: number } }> {
    const { customerId, tenantId } = this.extractAuth(req);
    return this.portalService.getInvoices(customerId, tenantId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      year: year ? parseInt(year) : undefined,
      from,
      to,
      status,
    });
  }

  @Get('invoices/:id/pdf')
  @ApiOperation({ summary: 'Scarica PDF fattura' })
  @ApiResponse({ status: 200, description: 'PDF della fattura' })
  @ApiResponse({ status: 404, description: 'Fattura non trovata' })
  async getInvoicePdf(
    @Req() req: { user: { userId: string; tenantId: string } },
    @Param('id') invoiceId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { customerId, tenantId } = this.extractAuth(req);
    const { buffer, filename } = await this.portalService.getInvoicePdf(
      invoiceId,
      customerId,
      tenantId,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Dettaglio fattura del cliente' })
  @ApiResponse({ status: 200, description: 'Dati fattura con righe' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  @ApiResponse({ status: 404, description: 'Fattura non trovata' })
  async getInvoice(
    @Req() req: { user: { userId: string; tenantId: string } },
    @Param('id') invoiceId: string,
  ): Promise<{ data: Record<string, unknown> }> {
    const { customerId, tenantId } = this.extractAuth(req);
    return this.portalService.getInvoice(invoiceId, customerId, tenantId);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Notifiche del cliente' })
  @ApiResponse({ status: 200, description: 'Lista notifiche' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async getNotifications(@Req() req: { user: { userId: string; tenantId: string } }): Promise<{
    data: unknown[];
  }> {
    const { customerId, tenantId } = this.extractAuth(req);
    return this.portalService.getNotifications(customerId, tenantId);
  }

  @Patch('notifications')
  @ApiOperation({ summary: 'Segna notifiche come lette' })
  @ApiResponse({ status: 200, description: 'Notifiche aggiornate' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async markNotificationsRead(
    @Req() req: { user: { userId: string; tenantId: string } },
    @Body() body: { ids: string[] },
  ): Promise<{ data: { updated: number } }> {
    const { customerId, tenantId } = this.extractAuth(req);
    return this.portalService.markNotificationsRead(customerId, tenantId, body.ids);
  }

  @Get('documents')
  @ApiOperation({ summary: 'Documenti del cliente (fatture, preventivi, ispezioni)' })
  @ApiResponse({ status: 200, description: 'Lista documenti' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async getDocuments(
    @Req() req: { user: { userId: string; tenantId: string } },
    @Query('type') type?: string,
  ): Promise<{ data: unknown[] }> {
    const { customerId, tenantId } = this.extractAuth(req);
    return this.portalService.getDocuments(customerId, tenantId, type);
  }

  @Get('warranties')
  @ApiOperation({ summary: 'Garanzie attive del cliente' })
  @ApiResponse({ status: 200, description: 'Lista garanzie' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async getWarranties(@Req() req: { user: { userId: string; tenantId: string } }): Promise<{
    data: unknown[];
  }> {
    const { customerId, tenantId } = this.extractAuth(req);
    return this.portalService.getWarranties(customerId, tenantId);
  }

  @Get('payments')
  @ApiOperation({ summary: 'Storico pagamenti del cliente' })
  @ApiResponse({ status: 200, description: 'Lista pagamenti' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async getPayments(@Req() req: { user: { userId: string; tenantId: string } }): Promise<{
    data: unknown[];
  }> {
    const { customerId, tenantId } = this.extractAuth(req);
    return this.portalService.getPayments(customerId, tenantId);
  }

  @Get('payments/:id')
  @ApiOperation({ summary: 'Dettaglio pagamento' })
  @ApiResponse({ status: 200, description: 'Dati pagamento' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  @ApiResponse({ status: 404, description: 'Pagamento non trovato' })
  async getPayment(
    @Req() req: { user: { userId: string; tenantId: string } },
    @Param('id') paymentId: string,
  ): Promise<{ data: Record<string, unknown> }> {
    const { customerId, tenantId } = this.extractAuth(req);
    return this.portalService.getPayment(paymentId, customerId, tenantId);
  }

  @Get('account')
  @ApiOperation({ summary: 'Dati account cliente' })
  @ApiResponse({ status: 200, description: 'Dati account' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async getAccount(@Req() req: { user: { userId: string; tenantId: string } }): Promise<{
    data: Record<string, unknown>;
  }> {
    const { customerId, tenantId } = this.extractAuth(req);
    return this.portalService.getAccount(customerId, tenantId);
  }

  @Put('account')
  @ApiOperation({ summary: 'Aggiorna dati account cliente' })
  @ApiResponse({ status: 200, description: 'Account aggiornato' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async updateAccount(
    @Req() req: { user: { userId: string; tenantId: string } },
    @Body() body: { firstName?: string; lastName?: string; phone?: string },
  ): Promise<{ data: Record<string, unknown> }> {
    const { customerId, tenantId } = this.extractAuth(req);
    return this.portalService.updateAccount(customerId, tenantId, body);
  }

  @Get('estimates')
  @ApiOperation({ summary: 'Preventivi del cliente' })
  @ApiResponse({ status: 200, description: 'Lista preventivi' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async getEstimates(@Req() req: { user: { userId: string; tenantId: string } }): Promise<{
    data: unknown[];
  }> {
    const { customerId, tenantId } = this.extractAuth(req);
    return this.portalService.getEstimates(customerId, tenantId);
  }

  @Get('estimates/:id')
  @ApiOperation({ summary: 'Dettaglio preventivo' })
  @ApiResponse({ status: 200, description: 'Dati preventivo con righe' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  // eslint-disable-next-line sonarjs/no-duplicate-string
  @ApiResponse({ status: 404, description: 'Preventivo non trovato' })
  async getEstimate(
    @Req() req: { user: { userId: string; tenantId: string } },
    @Param('id') estimateId: string,
  ): Promise<{ data: Record<string, unknown> }> {
    const { customerId, tenantId } = this.extractAuth(req);
    return this.portalService.getEstimate(estimateId, customerId, tenantId);
  }

  @Post('estimates/:id/accept')
  @ApiOperation({ summary: 'Accetta preventivo' })
  @ApiResponse({ status: 200, description: 'Preventivo accettato' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  @ApiResponse({ status: 404, description: 'Preventivo non trovato' })
  async acceptEstimate(
    @Req() req: { user: { userId: string; tenantId: string } },
    @Param('id') estimateId: string,
  ): Promise<{ data: Record<string, unknown> }> {
    const { customerId, tenantId } = this.extractAuth(req);
    return this.portalService.acceptEstimate(estimateId, customerId, tenantId);
  }

  @Post('estimates/:id/reject')
  @ApiOperation({ summary: 'Rifiuta preventivo con motivazione' })
  @ApiResponse({ status: 200, description: 'Preventivo rifiutato' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  @ApiResponse({ status: 404, description: 'Preventivo non trovato' })
  async rejectEstimate(
    @Req() req: { user: { userId: string; tenantId: string } },
    @Param('id') estimateId: string,
    @Body() body: { reason?: string },
  ): Promise<{ data: Record<string, unknown> }> {
    const { customerId, tenantId } = this.extractAuth(req);
    return this.portalService.rejectEstimate(estimateId, customerId, tenantId, body.reason);
  }

  @Get('tracking')
  @ApiOperation({ summary: 'Stato lavorazioni in corso' })
  @ApiResponse({ status: 200, description: 'Tracking ordini di lavoro attivi' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async getTracking(@Req() req: { user: { userId: string; tenantId: string } }): Promise<{
    data: unknown[];
  }> {
    const { customerId, tenantId } = this.extractAuth(req);
    return this.portalService.getTracking(customerId, tenantId);
  }

  @Get('notification-preferences')
  @ApiOperation({ summary: 'Preferenze notifiche cliente' })
  @ApiResponse({ status: 200, description: 'Preferenze per canale' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async getNotificationPreferences(
    @Req() req: { user: { userId: string; tenantId: string } },
  ): Promise<{
    data: unknown[];
  }> {
    const { customerId, tenantId } = this.extractAuth(req);
    return this.portalService.getNotificationPreferences(customerId, tenantId);
  }

  @Put('notification-preferences')
  @ApiOperation({ summary: 'Aggiorna preferenze notifiche' })
  @ApiResponse({ status: 200, description: 'Preferenze aggiornate' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async updateNotificationPreferences(
    @Req() req: { user: { userId: string; tenantId: string } },
    @Body() body: Record<string, boolean>,
  ): Promise<{ data: unknown[] }> {
    const { customerId, tenantId } = this.extractAuth(req);
    return this.portalService.updateNotificationPreferences(customerId, tenantId, body);
  }

  @Get('messages')
  @ApiOperation({ summary: 'Messaggi del cliente' })
  @ApiResponse({ status: 200, description: 'Lista messaggi' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async getMessages(@Req() req: { user: { userId: string; tenantId: string } }): Promise<{
    data: unknown[];
  }> {
    const { customerId, tenantId } = this.extractAuth(req);
    return this.portalService.getMessages(customerId, tenantId);
  }

  @Post('messages')
  @ApiOperation({ summary: 'Invia messaggio al officina' })
  @ApiResponse({ status: 201, description: 'Messaggio inviato' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async sendMessage(
    @Req() req: { user: { userId: string; tenantId: string } },
    @Body() body: { body: string },
  ): Promise<{ data: Record<string, unknown> }> {
    const { customerId, tenantId } = this.extractAuth(req);
    return this.portalService.sendMessage(customerId, tenantId, body.body);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cambia password portale cliente' })
  @ApiResponse({ status: 200, description: 'Password aggiornata' })
  @ApiResponse({ status: 401, description: 'Password corrente errata' })
  @ApiResponse({ status: 400, description: 'Nuova password non valida' })
  async changePassword(
    @Req() req: { user: { userId: string; tenantId: string } },
    @Body() body: { currentPassword: string; newPassword: string },
  ): Promise<{ success: boolean; message: string }> {
    const { customerId, tenantId } = this.extractAuth(req);

    if (!body.newPassword || body.newPassword.length < 8) {
      throw new BadRequestException('La nuova password deve avere almeno 8 caratteri');
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(body.newPassword)) {
      throw new BadRequestException(
        'La password deve contenere almeno una maiuscola, una minuscola e un numero',
      );
    }

    return this.portalService.changePassword(
      customerId,
      tenantId,
      body.currentPassword,
      body.newPassword,
    );
  }

  @Get('vehicles/:id/history')
  @ApiOperation({ summary: 'Storico veicolo aggregato (timeline)' })
  @ApiResponse({
    status: 200,
    description: 'Timeline veicolo con manutenzioni, fatture, ispezioni',
  })
  @ApiResponse({ status: 404, description: 'Veicolo non trovato' })
  async getVehicleHistory(
    @Req() req: { user: { userId: string; tenantId: string } },
    @Param('id') vehicleId: string,
  ): Promise<{ data: { vehicle: Record<string, unknown>; timeline: Record<string, unknown>[] } }> {
    const { customerId, tenantId } = this.extractAuth(req);
    return this.portalService.getVehicleHistory(vehicleId, customerId, tenantId);
  }
}
