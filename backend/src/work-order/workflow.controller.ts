import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../auth/decorators/current-user.decorator';
import { WorkOrderService } from './work-order.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';

@ApiTags('Workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'workflows', version: '1' })
export class WorkflowController {
  constructor(private readonly workOrderService: WorkOrderService) {}

  @Get()
  @ApiOperation({ summary: 'Lista workflow (work order attivi)' })
  @ApiResponse({ status: 200 })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.workOrderService.findAll(tenantId, {
      page: parseInt(page || '1', 10),
      limit: parseInt(limit || '20', 10),
      status,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Crea workflow (work order)' })
  @ApiResponse({ status: 201 })
  async create(@CurrentTenant() tenantId: string, @Body() dto: CreateWorkOrderDto) {
    return this.workOrderService.create(tenantId, dto);
  }
}
