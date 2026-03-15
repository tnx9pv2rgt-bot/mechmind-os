import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../auth/decorators/current-user.decorator';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@ApiTags('invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

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
  @ApiResponse({ status: 200, description: 'Invoices retrieved successfully' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const result = await this.invoiceService.findAll(tenantId, {
      status,
      customerId,
      dateFrom,
      dateTo,
    });

    return {
      success: true,
      data: result.invoices,
      meta: { total: result.total },
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

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice retrieved' })
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
}
