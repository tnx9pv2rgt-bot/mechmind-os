import { Controller, Get, Post, Body, Param, Query, Res, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { AccountingService } from '../services/accounting.service';
import { QuickBooksService } from '../services/quickbooks.service';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard, UserRole } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';
import { CurrentTenant } from '@auth/decorators/current-user.decorator';
import {
  SyncInvoiceDto,
  SyncCustomerDto,
  AccountingSyncFilterDto,
  AccountingSyncResponseDto,
} from '../dto/accounting.dto';

@ApiTags('Accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('accounting')
export class AccountingController {
  constructor(
    private readonly accountingService: AccountingService,
    private readonly quickBooksService: QuickBooksService,
  ) {}

  @Post('sync/invoice')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Sync an invoice to external accounting provider',
    description: 'Queues an invoice for synchronization with the specified accounting provider',
  })
  @ApiResponse({
    status: 201,
    description: 'Sync record created',
    type: AccountingSyncResponseDto,
  })
  async syncInvoice(
    @CurrentTenant() tenantId: string,
    @Body() dto: SyncInvoiceDto,
  ): Promise<{ success: boolean; data: AccountingSyncResponseDto }> {
    const record = await this.accountingService.syncInvoice(tenantId, dto.invoiceId, dto.provider);
    return { success: true, data: record };
  }

  @Post('sync/customer')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Sync a customer to external accounting provider',
    description: 'Queues a customer for synchronization with the specified accounting provider',
  })
  @ApiResponse({
    status: 201,
    description: 'Sync record created',
    type: AccountingSyncResponseDto,
  })
  async syncCustomer(
    @CurrentTenant() tenantId: string,
    @Body() dto: SyncCustomerDto,
  ): Promise<{ success: boolean; data: AccountingSyncResponseDto }> {
    const record = await this.accountingService.syncCustomer(
      tenantId,
      dto.customerId,
      dto.provider,
    );
    return { success: true, data: record };
  }

  @Get('sync')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'List accounting sync records' })
  @ApiResponse({
    status: 200,
    description: 'Sync records retrieved',
    type: [AccountingSyncResponseDto],
  })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query() filters: AccountingSyncFilterDto,
  ): Promise<{
    success: boolean;
    data: AccountingSyncResponseDto[];
    meta: { total: number; limit: number; offset: number };
  }> {
    const { records, total } = await this.accountingService.findAll(tenantId, filters);
    return {
      success: true,
      data: records,
      meta: {
        total,
        limit: filters.limit ?? 50,
        offset: filters.offset ?? 0,
      },
    };
  }

  @Get('sync/:id')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get sync record by ID' })
  @ApiParam({ name: 'id', description: 'Sync record ID' })
  @ApiResponse({
    status: 200,
    description: 'Sync record retrieved',
    type: AccountingSyncResponseDto,
  })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: AccountingSyncResponseDto }> {
    const record = await this.accountingService.findById(tenantId, id);
    return { success: true, data: record };
  }

  @Post('sync/:id/retry')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Retry a failed sync record',
    description: 'Retries synchronization for a record in FAILED status',
  })
  @ApiParam({ name: 'id', description: 'Sync record ID' })
  @ApiResponse({
    status: 200,
    description: 'Sync retried',
    type: AccountingSyncResponseDto,
  })
  async retry(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: AccountingSyncResponseDto }> {
    const record = await this.accountingService.retry(tenantId, id);
    return { success: true, data: record };
  }

  @Get('sync/status/:entityType/:entityId')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get sync status for an entity',
    description: 'Returns all sync records for a specific entity across providers',
  })
  @ApiParam({ name: 'entityType', description: 'Entity type (INVOICE, CUSTOMER, PAYMENT)' })
  @ApiParam({ name: 'entityId', description: 'Entity ID' })
  async getStatus(
    @CurrentTenant() tenantId: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ): Promise<{ success: boolean; data: AccountingSyncResponseDto[] }> {
    const records = await this.accountingService.getStatus(tenantId, entityType, entityId);
    return { success: true, data: records };
  }

  // ==================== QUICKBOOKS EXPORT ====================

  @Get('export/quickbooks')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Export invoices in QuickBooks-compatible CSV format' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO)' })
  async exportQuickBooks(
    @CurrentTenant() tenantId: string,
    @Res() res: Response,
    @Query('from') from: string,
    @Query('to') to: string,
  ): Promise<void> {
    const csv = await this.quickBooksService.exportInvoicesForQuickBooks(
      tenantId,
      new Date(from),
      new Date(to),
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="quickbooks-export-${from}-${to}.csv"`,
    );
    res.send(csv);
  }
}
