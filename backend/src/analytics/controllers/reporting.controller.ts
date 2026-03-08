/**
 * MechMind OS - Business Intelligence Reporting Controller
 */

import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ReportingService } from '../services/reporting.service';
import { UserRole } from '../../auth/guards/roles.guard';
import { Response } from 'express';

@ApiTags('Business Intelligence')
@Controller('v1/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  // ============== DASHBOARD ==============

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard summary KPIs' })
  @ApiResponse({ status: 200 })
  async getDashboardSummary(
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.reportingService.getDashboardSummary(tenantId);
  }

  @Get('kpis')
  @ApiOperation({ summary: 'Get custom KPIs' })
  @ApiResponse({ status: 200 })
  async getCustomKPIs(
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.reportingService.getCustomKPIs(tenantId);
  }

  // ============== BOOKING ANALYTICS ==============

  @Get('bookings/metrics')
  @ApiOperation({ summary: 'Get daily booking metrics' })
  @ApiQuery({ name: 'from', required: true, type: String })
  @ApiQuery({ name: 'to', required: true, type: String })
  async getBookingMetrics(
    @CurrentUser('tenantId') tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportingService.getBookingMetrics(
      tenantId,
      new Date(from),
      new Date(to),
    );
  }

  // ============== REVENUE ANALYTICS ==============

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue analytics' })
  @ApiQuery({ name: 'year', required: true, type: Number })
  @ApiQuery({ name: 'month', required: false, type: Number })
  async getRevenueAnalytics(
    @CurrentUser('tenantId') tenantId: string,
    @Query('year') year: string,
    @Query('month') month?: string,
  ) {
    return this.reportingService.getRevenueAnalytics(
      tenantId,
      parseInt(year),
      month ? parseInt(month) : undefined,
    );
  }

  // ============== CUSTOMER ANALYTICS ==============

  @Get('customers/retention')
  @ApiOperation({ summary: 'Get customer retention metrics' })
  async getCustomerRetention(
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.reportingService.getCustomerRetention(tenantId);
  }

  @Get('customers/top')
  @ApiOperation({ summary: 'Get top customers by revenue' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTopCustomers(
    @CurrentUser('tenantId') tenantId: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportingService.getTopCustomers(
      tenantId,
      limit ? parseInt(limit) : 10,
    );
  }

  // ============== SERVICE ANALYTICS ==============

  @Get('services/popularity')
  @ApiOperation({ summary: 'Get service popularity analytics' })
  @ApiQuery({ name: 'year', required: true, type: Number })
  async getServicePopularity(
    @CurrentUser('tenantId') tenantId: string,
    @Query('year') year: string,
  ) {
    return this.reportingService.getServicePopularity(tenantId, parseInt(year));
  }

  @Get('mechanics/performance')
  @ApiOperation({ summary: 'Get mechanic performance metrics' })
  @ApiQuery({ name: 'year', required: true, type: Number })
  @ApiQuery({ name: 'month', required: false, type: Number })
  async getMechanicPerformance(
    @CurrentUser('tenantId') tenantId: string,
    @Query('year') year: string,
    @Query('month') month?: string,
  ) {
    return this.reportingService.getMechanicPerformance(
      tenantId,
      parseInt(year),
      month ? parseInt(month) : undefined,
    );
  }

  // ============== INVENTORY REPORTS ==============

  @Get('inventory/status')
  @ApiOperation({ summary: 'Get inventory status' })
  @ApiQuery({ name: 'status', required: false, enum: ['OK', 'REORDER', 'LOW_STOCK'] })
  async getInventoryStatus(
    @CurrentUser('tenantId') tenantId: string,
    @Query('status') status?: string,
  ) {
    return this.reportingService.getInventoryStatus(tenantId, status);
  }

  @Get('inventory/valuation')
  @ApiOperation({ summary: 'Get inventory valuation by category' })
  async getInventoryValuation(
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.reportingService.getInventoryValuation(tenantId);
  }

  // ============== EXPORTS ==============

  @Get('export/bookings')
  @ApiOperation({ summary: 'Export bookings to CSV/JSON' })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'json'] })
  async exportBookings(
    @CurrentUser('tenantId') tenantId: string,
    @Res() res: Response,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('format') format: 'csv' | 'json' = 'csv',
  ) {
    const data = await this.reportingService.exportBookings(
      tenantId,
      new Date(from),
      new Date(to),
      format,
    );

    const filename = `bookings_${from}_${to}.${format}`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
    res.send(data);
  }

  @Get('export/inventory')
  @ApiOperation({ summary: 'Export inventory to CSV/JSON' })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'json'] })
  async exportInventory(
    @CurrentUser('tenantId') tenantId: string,
    @Res() res: Response,
    @Query('format') format: 'csv' | 'json' = 'csv',
  ) {
    const data = await this.reportingService.exportInventory(tenantId, format);

    const filename = `inventory_${new Date().toISOString().split('T')[0]}.${format}`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
    res.send(data);
  }

  @Get('export/revenue')
  @ApiOperation({ summary: 'Export revenue report to CSV/JSON' })
  @ApiQuery({ name: 'year', required: true, type: Number })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'json'] })
  async exportRevenue(
    @CurrentUser('tenantId') tenantId: string,
    @Res() res: Response,
    @Query('year') year: string,
    @Query('format') format: 'csv' | 'json' = 'csv',
  ) {
    const data = await this.reportingService.exportRevenue(tenantId, parseInt(year), format);

    const filename = `revenue_${year}.${format}`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
    res.send(data);
  }

  // ============== ADMIN ==============

  @Post('refresh')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Refresh analytics materialized views (Admin only)' })
  @ApiResponse({ status: 200 })
  async refreshViews() {
    await this.reportingService.refreshAnalyticsViews();
    return { message: 'Analytics views refreshed successfully' };
  }
}
