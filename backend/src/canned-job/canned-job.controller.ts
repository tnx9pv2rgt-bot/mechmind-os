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
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { CurrentTenant } from '@auth/decorators/current-user.decorator';
import { CannedJobService } from './canned-job.service';
import { CreateCannedJobDto, UpdateCannedJobDto } from './dto/canned-job.dto';

@ApiTags('Template Lavoro')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('canned-jobs')
export class CannedJobController {
  constructor(private readonly cannedJobService: CannedJobService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new canned job template' })
  @ApiResponse({ status: 201, description: 'Canned job created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateCannedJobDto,
  ): Promise<{ success: boolean; data: unknown }> {
    const cannedJob = await this.cannedJobService.create(tenantId, dto);
    return { success: true, data: cannedJob };
  }

  @Get()
  @ApiOperation({ summary: 'List canned job templates' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('category') category?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{
    success: boolean;
    data: unknown[];
    meta: { total: number; page: number; limit: number; pages: number };
  }> {
    const parsedIsActive = isActive === 'true' ? true : isActive === 'false' ? false : undefined;

    const result = await this.cannedJobService.findAll(tenantId, {
      category,
      isActive: parsedIsActive,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return {
      success: true,
      data: result.data,
      meta: { total: result.total, page: result.page, limit: result.limit, pages: result.pages },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get canned job by ID' })
  // eslint-disable-next-line sonarjs/no-duplicate-string
  @ApiParam({ name: 'id', description: 'Canned Job ID' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: unknown }> {
    const cannedJob = await this.cannedJobService.findById(tenantId, id);
    return { success: true, data: cannedJob };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update canned job template' })
  @ApiParam({ name: 'id', description: 'Canned Job ID' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCannedJobDto,
  ): Promise<{ success: boolean; data: unknown }> {
    const cannedJob = await this.cannedJobService.update(tenantId, id, dto);
    return { success: true, data: cannedJob };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete canned job (set isActive = false)' })
  @ApiParam({ name: 'id', description: 'Canned Job ID' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: unknown }> {
    const cannedJob = await this.cannedJobService.remove(tenantId, id);
    return { success: true, data: cannedJob };
  }

  @Post(':id/apply-to-estimate/:estimateId')
  @ApiOperation({ summary: 'Apply canned job lines to an estimate' })
  @ApiParam({ name: 'id', description: 'Canned Job ID' })
  @ApiParam({ name: 'estimateId', description: 'Estimate ID' })
  async applyToEstimate(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Param('estimateId') estimateId: string,
  ): Promise<{ success: boolean; data: { created: number } }> {
    const result = await this.cannedJobService.applyToEstimate(tenantId, id, estimateId);
    return { success: true, data: result };
  }

  @Post(':id/apply-to-work-order/:workOrderId')
  @ApiOperation({ summary: 'Apply canned job lines to a work order' })
  @ApiParam({ name: 'id', description: 'Canned Job ID' })
  @ApiParam({ name: 'workOrderId', description: 'Work Order ID' })
  async applyToWorkOrder(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Param('workOrderId') workOrderId: string,
  ): Promise<{ success: boolean; data: { updated: boolean } }> {
    const result = await this.cannedJobService.applyToWorkOrder(tenantId, id, workOrderId);
    return { success: true, data: result };
  }
}
