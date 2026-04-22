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
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ReportingService } from '../services/reporting.service';
import { SearchService } from '../services/search.service';
import { KpiService } from '../services/kpi.service';
import { UserRole } from '../../auth/guards/roles.guard';
import { Response } from 'express';
import {
  DateRangeQueryDto,
  YearMonthQueryDto,
  ExportQueryDto,
  PaginationQueryDto,
} from '../dto/reporting-query.dto';

/**
 * Sanitize a string for use in filenames by stripping path-traversal characters.
 */
function sanitizeFilenameSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '');
}

@ApiTags('Business Intelligence')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@ApiBearerAuth()
export class ReportingController {
  constructor(
    private readonly reportingService: ReportingService,
    private readonly searchService: SearchService,
    private readonly kpiService: KpiService,
  ) {}

  // ============== DASHBOARD ==============

  @Get('dashboard-kpis')
  @ApiOperation({ summary: 'Get real-time dashboard KPIs from live data' })
  @ApiResponse({ status: 200 })
  async getDashboardKpis(@CurrentUser('tenantId') tenantId: string) {
    return this.reportingService.getDashboardKpis(tenantId);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard summary KPIs' })
  @ApiResponse({ status: 200 })
  async getDashboardSummary(@CurrentUser('tenantId') tenantId: string) {
    return this.reportingService.getDashboardKpis(tenantId);
  }

  @Get('kpis')
  @ApiOperation({ summary: 'Get custom KPIs' })
  @ApiResponse({ status: 200 })
  async getCustomKPIs(@CurrentUser('tenantId') tenantId: string) {
    return this.reportingService.getCustomKPIs(tenantId);
  }

  // ============== BOOKING ANALYTICS ==============

  @Get('bookings/metrics')
  @ApiOperation({ summary: 'Get daily booking metrics' })
  async getBookingMetrics(
    @CurrentUser('tenantId') tenantId: string,
    @Query() dto: DateRangeQueryDto,
  ) {
    return this.reportingService.getBookingMetrics(tenantId, new Date(dto.from), new Date(dto.to));
  }

  // ============== REVENUE ANALYTICS ==============

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue analytics' })
  async getRevenueAnalytics(
    @CurrentUser('tenantId') tenantId: string,
    @Query() dto: YearMonthQueryDto,
  ) {
    return this.reportingService.getRevenueAnalytics(tenantId, dto.year, dto.month);
  }

  // ============== CUSTOMER ANALYTICS ==============

  @Get('customers/retention')
  @ApiOperation({ summary: 'Get customer retention metrics' })
  async getCustomerRetention(@CurrentUser('tenantId') tenantId: string) {
    return this.reportingService.getCustomerRetention(tenantId);
  }

  @Get('customers/top')
  @ApiOperation({ summary: 'Get top customers by revenue' })
  async getTopCustomers(
    @CurrentUser('tenantId') tenantId: string,
    @Query() dto: PaginationQueryDto,
  ) {
    return this.reportingService.getTopCustomers(tenantId, dto.limit);
  }

  // ============== SERVICE ANALYTICS ==============

  @Get('services/popularity')
  @ApiOperation({ summary: 'Get service popularity analytics' })
  async getServicePopularity(
    @CurrentUser('tenantId') tenantId: string,
    @Query() dto: YearMonthQueryDto,
  ) {
    return this.reportingService.getServicePopularity(tenantId, dto.year);
  }

  @Get('mechanics/performance')
  @ApiOperation({ summary: 'Get mechanic performance metrics' })
  async getMechanicPerformance(
    @CurrentUser('tenantId') tenantId: string,
    @Query() dto: YearMonthQueryDto,
  ) {
    return this.reportingService.getMechanicPerformance(tenantId, dto.year, dto.month);
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
  async getInventoryValuation(@CurrentUser('tenantId') tenantId: string) {
    return this.reportingService.getInventoryValuation(tenantId);
  }

  // ============== GLOBAL SEARCH ==============

  @Get('search')
  @ApiOperation({ summary: 'Global search across all entities' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  async search(@CurrentUser('tenantId') tenantId: string, @Query('q') q: string) {
    const result = await this.searchService.search(tenantId, q);
    return { success: true, data: result.results, meta: { total: result.total } };
  }

  // ============== KPI DASHBOARD ==============

  @Get('kpi')
  @ApiOperation({ summary: 'Get comprehensive KPI dashboard' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO)' })
  async getKpiDashboard(
    @CurrentUser('tenantId') tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const kpi = await this.kpiService.getDashboardKpi(tenantId, new Date(from), new Date(to));
    return { success: true, data: kpi };
  }

  // ============== EXPORTS ==============

  @Get('export/bookings')
  @ApiOperation({ summary: 'Export bookings to CSV/JSON' })
  async exportBookings(
    @CurrentUser('tenantId') tenantId: string,
    @Res() res: Response,
    @Query() dto: ExportQueryDto,
  ) {
    const data = await this.reportingService.exportBookings(
      tenantId,
      new Date(dto.from),
      new Date(dto.to),
      dto.format,
    );

    const safeFrom = sanitizeFilenameSegment(dto.from);
    const safeTo = sanitizeFilenameSegment(dto.to);
    const filename = `bookings_${safeFrom}_${safeTo}.${dto.format}`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', dto.format === 'csv' ? 'text/csv' : 'application/json');
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
  async exportRevenue(
    @CurrentUser('tenantId') tenantId: string,
    @Res() res: Response,
    @Query() dto: ExportQueryDto,
  ) {
    const year = new Date(dto.from).getFullYear();
    const data = await this.reportingService.exportRevenue(tenantId, year, dto.format);

    const safeYear = sanitizeFilenameSegment(String(year));
    const filename = `revenue_${safeYear}.${dto.format}`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', dto.format === 'csv' ? 'text/csv' : 'application/json');
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
