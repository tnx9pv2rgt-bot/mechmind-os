/**
 * MechMind OS - Payroll Controller
 *
 * Endpoint per gestione buste paga tecnici.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PayrollService, PayrollCalculation, PayrollSummary } from './payroll.service';
import { CreatePayConfigDto } from './dto/pay-config.dto';
import { PayrollPeriodQueryDto, ApprovePayrollDto } from './dto/payroll-query.dto';

@ApiTags('Payroll - Buste Paga')
@Controller('payroll')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Riepilogo buste paga per periodo' })
  @ApiResponse({ status: 200, description: 'Riepilogo payroll' })
  async getSummary(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: PayrollPeriodQueryDto,
  ): Promise<PayrollSummary> {
    return this.payrollService.getPayrollSummary(tenantId, query.period);
  }

  @Get('calculate/:technicianId')
  @ApiOperation({ summary: 'Calcola busta paga per un tecnico' })
  @ApiResponse({ status: 200, description: 'Calcolo payroll singolo tecnico' })
  async calculateForTechnician(
    @CurrentUser('tenantId') tenantId: string,
    @Param('technicianId') technicianId: string,
    @Query() query: PayrollPeriodQueryDto,
  ): Promise<PayrollCalculation> {
    return this.payrollService.calculatePayroll(tenantId, technicianId, query.period);
  }

  @Post('calculate-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calcola buste paga per tutti i tecnici' })
  @ApiResponse({ status: 200, description: 'Calcolo payroll tutti i tecnici' })
  async calculateAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: PayrollPeriodQueryDto,
  ): Promise<PayrollCalculation[]> {
    return this.payrollService.calculateAllPayroll(tenantId, query.period);
  }

  @Post('config/:technicianId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Configura retribuzione tecnico' })
  @ApiResponse({ status: 201, description: 'Configurazione creata' })
  async configurePayRate(
    @CurrentUser('tenantId') tenantId: string,
    @Param('technicianId') technicianId: string,
    @Body() dto: CreatePayConfigDto,
  ): Promise<unknown> {
    return this.payrollService.configurePayRate(tenantId, technicianId, dto);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approva record payroll' })
  @ApiResponse({ status: 200, description: 'Record approvato' })
  async approve(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: ApprovePayrollDto,
  ): Promise<unknown> {
    return this.payrollService.approvePayroll(tenantId, id, dto.approvedBy);
  }

  @Get('export')
  @ApiOperation({ summary: 'Esporta payroll in CSV' })
  @ApiResponse({ status: 200, description: 'File CSV' })
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename=payroll.csv')
  async exportCsv(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: PayrollPeriodQueryDto,
  ): Promise<string> {
    return this.payrollService.exportPayroll(tenantId, query.period);
  }
}
