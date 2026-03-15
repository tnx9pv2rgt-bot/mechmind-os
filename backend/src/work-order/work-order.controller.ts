import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
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
import { WorkOrderService } from './work-order.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';

@ApiTags('work-orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('work-orders')
export class WorkOrderController {
  constructor(private readonly workOrderService: WorkOrderService) {}

  @Get()
  @ApiOperation({ summary: 'List all work orders' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'vehicleId', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiResponse({ status: 200, description: 'Work orders listed' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('customerId') customerId?: string,
  ) {
    const result = await this.workOrderService.findAll(tenantId, {
      status,
      vehicleId,
      customerId,
    });
    return {
      success: true,
      data: result.workOrders,
      meta: { total: result.total },
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new work order' })
  @ApiResponse({ status: 201, description: 'Work order created' })
  async create(@CurrentTenant() tenantId: string, @Body() dto: CreateWorkOrderDto) {
    const workOrder = await this.workOrderService.create(tenantId, dto);
    return { success: true, data: workOrder };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a work order by ID' })
  @ApiParam({ name: 'id', description: 'Work order ID' })
  @ApiResponse({ status: 200, description: 'Work order found' })
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
  @ApiOperation({ summary: 'Create an invoice from a work order' })
  @ApiParam({ name: 'id', description: 'Work order ID' })
  @ApiResponse({ status: 201, description: 'Invoice created from work order' })
  @ApiResponse({ status: 400, description: 'Invalid status for invoicing' })
  @ApiResponse({ status: 404, description: 'Work order not found' })
  async createInvoice(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const result = await this.workOrderService.createInvoiceFromWo(tenantId, id);
    return { success: true, data: result };
  }
}
