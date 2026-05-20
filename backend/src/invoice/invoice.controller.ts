import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/guards/roles.guard';
import { CurrentTenant } from '../auth/decorators/current-user.decorator';
import { InvoiceService } from './invoice.service';
import { FatturapaService } from './services/fatturapa.service';
import { PdfService } from './services/pdf.service';
import { PaymentLinkService } from './services/payment-link.service';
import { BnplService } from './services/bnpl.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@ApiTags('invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('invoices')
export class InvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly fatturapaService: FatturapaService,
    private readonly pdfService: PdfService,
    private readonly paymentLinkService: PaymentLinkService,
    private readonly bnplService: BnplService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all invoices' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'],
  })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20)',
  })
  @ApiResponse({ status: 200, description: 'Invoices retrieved successfully' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.invoiceService.findAll(
      tenantId,
      { status, customerId, dateFrom, dateTo },
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );

    return {
      success: true,
      data: result.data,
      meta: result.meta,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new invoice' })
  @ApiResponse({ status: 201, description: 'Invoice created successfully' })
  async create(@CurrentTenant() tenantId: string, @Body() dto: CreateInvoiceDto) {
    const invoice = await this.invoiceService.create(tenantId, dto);
    return {
      success: true,
      data: invoice,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get invoice statistics' })
  @ApiResponse({ status: 200, description: 'Invoice stats retrieved' })
  async getStats(@CurrentTenant() tenantId: string) {
    const stats = await this.invoiceService.getStats(tenantId);
    return {
      success: true,
      data: stats,
    };
  }

  @Get('export/csv')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Esporta fatture in formato CSV per commercialista' })
  @ApiQuery({ name: 'from', required: true, description: 'Data inizio (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: true, description: 'Data fine (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'CSV generato' })
  async exportCsv(
    @CurrentTenant() tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ): Promise<void> {
    const csv = await this.invoiceService.exportCsv(tenantId, new Date(from), new Date(to));
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="fatture-${from}-${to}.csv"`,
    });
    res.send(csv);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  // eslint-disable-next-line sonarjs/no-duplicate-string
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice retrieved' })
  // eslint-disable-next-line sonarjs/no-duplicate-string
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const invoice = await this.invoiceService.findOne(tenantId, id);
    return {
      success: true,
      data: invoice,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an invoice' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice updated' })
  @ApiResponse({ status: 400, description: 'Only DRAFT invoices can be edited' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    const invoice = await this.invoiceService.update(tenantId, id, dto);
    return {
      success: true,
      data: invoice,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an invoice' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice deleted' })
  @ApiResponse({ status: 400, description: 'Only DRAFT invoices can be deleted' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.invoiceService.remove(tenantId, id);
    return {
      success: true,
      message: 'Invoice deleted successfully',
    };
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Send an invoice' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice sent' })
  @ApiResponse({ status: 400, description: 'Only DRAFT invoices can be sent' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async send(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const invoice = await this.invoiceService.send(tenantId, id);
    return {
      success: true,
      data: invoice,
    };
  }

  @Post(':id/pay')
  @ApiOperation({ summary: 'Mark invoice as paid' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice marked as paid' })
  @ApiResponse({ status: 400, description: 'Invoice cannot be marked as paid' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async markPaid(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const invoice = await this.invoiceService.markPaid(tenantId, id);
    return {
      success: true,
      data: invoice,
    };
  }

  @Post(':id/refund')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Refund an invoice (full or partial)' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice refunded' })
  @ApiResponse({ status: 400, description: 'Only PAID invoices can be refunded' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async refundInvoice(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body('amount') amount?: number,
  ) {
    const result = await this.invoiceService.refundInvoice(tenantId, id, amount);
    return { success: true, data: result };
  }

  @Post(':id/fatturapa')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Generate FatturaPA XML' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: 201, description: 'FatturaPA XML generated' })
  @ApiResponse({ status: 400, description: 'Missing fiscal data' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async generateFatturaPa(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    const xml = await this.fatturapaService.generateXml(id, tenantId);
    return {
      success: true,
      data: { xml },
    };
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download invoice PDF' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice PDF generated' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async generatePdf(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Res() res: Response,
  ): Promise<void> {
    const pdfBuffer = await this.pdfService.generateInvoicePdf(id, tenantId);
    res.set({
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="fattura-${id}.html"`,
    });
    res.send(pdfBuffer);
  }

  @Post(':id/payment-link')
  @ApiOperation({ summary: 'Genera link di pagamento Stripe per la fattura' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: 201, description: 'Link di pagamento generato' })
  // eslint-disable-next-line sonarjs/no-duplicate-string
  @ApiResponse({ status: 404, description: 'Fattura non trovata' })
  // eslint-disable-next-line sonarjs/no-duplicate-string
  @ApiResponse({ status: 400, description: 'Fattura già pagata' })
  async generatePaymentLink(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const result = await this.paymentLinkService.createPaymentLink(id, tenantId);
    return { success: true, data: result };
  }

  @Post(':id/send-payment-sms')
  @ApiOperation({ summary: 'Invia link di pagamento via SMS al cliente' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'SMS con link di pagamento inviato' })
  @ApiResponse({ status: 404, description: 'Fattura non trovata' })
  @ApiResponse({ status: 400, description: 'Fattura già pagata' })
  async sendPaymentSms(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const result = await this.paymentLinkService.sendPaymentSms(id, tenantId);
    return { success: true, data: result };
  }

  @Post(':id/bnpl')
  @ApiOperation({ summary: 'Crea ordine BNPL (Scalapay) per la fattura' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: 201, description: 'Ordine BNPL creato, redirect URL incluso' })
  @ApiResponse({ status: 404, description: 'Fattura non trovata' })
  @ApiResponse({ status: 400, description: 'Fattura già pagata' })
  async createBnplOrder(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const result = await this.bnplService.createBnplOrder(id, tenantId);
    return { success: true, data: result };
  }
}
