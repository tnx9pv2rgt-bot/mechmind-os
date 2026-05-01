import {
  Controller,
  Get,
  Post,
  Patch,
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
  ApiProduces,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant, CurrentUser } from '../auth/decorators/current-user.decorator';
import { WorkOrderService } from './work-order.service';
import { PdfService } from '../invoice/services/pdf.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { VehicleCheckInDto } from './dto/check-in.dto';
import { VehicleCheckOutDto } from './dto/check-out.dto';

@ApiTags('work-orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('work-orders')
export class WorkOrderController {
  constructor(
    private readonly workOrderService: WorkOrderService,
    private readonly pdfService: PdfService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all work orders' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'vehicleId', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Work orders listed' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('customerId') customerId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.workOrderService.findAll(tenantId, {
      status,
      vehicleId,
      customerId,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return {
      success: true,
      data: result.workOrders,
      meta: { total: result.total, page: result.page, limit: result.limit, pages: result.pages },
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new work order' })
  @ApiResponse({ status: 201, description: 'Work order created' })
  async create(@CurrentTenant() tenantId: string, @Body() dto: CreateWorkOrderDto) {
    const workOrder = await this.workOrderService.create(tenantId, dto);
    return { success: true, data: workOrder };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a work order by ID' })
  // eslint-disable-next-line sonarjs/no-duplicate-string
  @ApiParam({ name: 'id', description: 'Work order ID' })
  @ApiResponse({ status: 200, description: 'Work order found' })
  // eslint-disable-next-line sonarjs/no-duplicate-string
  @ApiResponse({ status: 404, description: 'Work order not found' })
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const workOrder = await this.workOrderService.findOne(tenantId, id);
    return { success: true, data: workOrder };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a work order' })
  @ApiParam({ name: 'id', description: 'Work order ID' })
  @ApiResponse({ status: 200, description: 'Work order updated' })
  @ApiResponse({ status: 404, description: 'Work order not found' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWorkOrderDto,
  ) {
    const workOrder = await this.workOrderService.update(tenantId, id, dto);
    return { success: true, data: workOrder };
  }

  @Patch(':id/transition')
  @ApiOperation({ summary: 'Transition work order status' })
  @ApiParam({ name: 'id', description: 'Work order ID' })
  @ApiResponse({ status: 200, description: 'Work order transitioned' })
  // eslint-disable-next-line sonarjs/no-duplicate-string
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Work order not found' })
  async transition(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    const workOrder = await this.workOrderService.transition(tenantId, id, body.status);
    return { success: true, data: workOrder };
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start a work order' })
  @ApiParam({ name: 'id', description: 'Work order ID' })
  @ApiResponse({ status: 200, description: 'Work order started' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Work order not found' })
  async start(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const workOrder = await this.workOrderService.start(tenantId, id);
    return { success: true, data: workOrder };
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete a work order' })
  @ApiParam({ name: 'id', description: 'Work order ID' })
  @ApiResponse({ status: 200, description: 'Work order completed' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Work order not found' })
  async complete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const workOrder = await this.workOrderService.complete(tenantId, id);
    return { success: true, data: workOrder };
  }

  @Post(':id/invoice')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an invoice from a work order' })
  @ApiParam({ name: 'id', description: 'Work order ID' })
  @ApiResponse({ status: 201, description: 'Invoice created from work order' })
  @ApiResponse({ status: 400, description: 'Invalid status for invoicing' })
  @ApiResponse({ status: 404, description: 'Work order not found' })
  async createInvoice(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const result = await this.workOrderService.createInvoiceFromWo(tenantId, id);
    return { success: true, data: result };
  }

  // ==================== CHECK-IN / CHECK-OUT ====================

  @Post(':id/check-in')
  @ApiOperation({ summary: 'Vehicle check-in for a work order' })
  @ApiParam({ name: 'id', description: 'Work order ID' })
  @ApiResponse({ status: 200, description: 'Vehicle checked in' })
  async checkIn(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: VehicleCheckInDto,
  ) {
    const workOrder = await this.workOrderService.checkIn(tenantId, id, dto);
    return { success: true, data: workOrder };
  }

  @Post(':id/check-out')
  @ApiOperation({ summary: 'Vehicle check-out for a work order' })
  @ApiParam({ name: 'id', description: 'Work order ID' })
  @ApiResponse({ status: 200, description: 'Vehicle checked out' })
  async checkOut(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: VehicleCheckOutDto,
  ) {
    const workOrder = await this.workOrderService.checkOut(tenantId, id, dto);
    return { success: true, data: workOrder };
  }

  // ==================== TECHNICIAN TIMER ====================

  @Post(':id/timer/start')
  @ApiOperation({ summary: 'Start technician timer on a work order' })
  @ApiParam({ name: 'id', description: 'Work order ID' })
  @ApiResponse({ status: 200, description: 'Timer started' })
  async startTimer(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('userId') technicianId: string,
  ) {
    const log = await this.workOrderService.startTimer(tenantId, id, technicianId);
    return { success: true, data: log };
  }

  @Post(':id/timer/stop')
  @ApiOperation({ summary: 'Stop technician timer on a work order' })
  @ApiParam({ name: 'id', description: 'Work order ID' })
  @ApiResponse({ status: 200, description: 'Timer stopped' })
  async stopTimer(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('userId') technicianId: string,
  ) {
    const log = await this.workOrderService.stopTimer(tenantId, id, technicianId);
    return { success: true, data: log };
  }

  @Get(':id/timer')
  @ApiOperation({ summary: 'Get timer status for a work order' })
  @ApiParam({ name: 'id', description: 'Work order ID' })
  @ApiResponse({ status: 200, description: 'Timer status retrieved' })
  async getTimer(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const result = await this.workOrderService.getTimer(tenantId, id);
    return { success: true, data: result };
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download work order as PDF (HTML)' })
  @ApiParam({ name: 'id', description: 'Work order ID' })
  @ApiProduces('text/html')
  @ApiResponse({ status: 200, description: 'PDF HTML generated' })
  async downloadPdf(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.pdfService.generateWorkOrderPdf(id, tenantId);
    res.set({
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="ordine-lavoro-${id}.html"`,
    });
    res.send(buffer);
  }
}
