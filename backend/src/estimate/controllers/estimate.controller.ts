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
  ApiProduces,
} from '@nestjs/swagger';
import { Response } from 'express';
import { EstimateService } from '../services/estimate.service';
import { PdfService } from '../../invoice/services/pdf.service';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard, UserRole } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';
import { CurrentTenant } from '@auth/decorators/current-user.decorator';
import {
  CreateEstimateDto,
  UpdateEstimateDto,
  CreateEstimateLineDto,
  EstimateResponseDto,
} from '../dto/estimate.dto';
import { EstimateStatus } from '@prisma/client';

@ApiTags('Estimates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('estimates')
export class EstimateController {
  constructor(
    private readonly estimateService: EstimateService,
    private readonly pdfService: PdfService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new estimate' })
  @ApiResponse({ status: 201, description: 'Estimate created', type: EstimateResponseDto })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateEstimateDto,
  ): Promise<{ success: boolean; data: EstimateResponseDto }> {
    const estimate = await this.estimateService.create(tenantId, dto);
    return { success: true, data: estimate as unknown as EstimateResponseDto };
  }

  @Get()
  @Roles(UserRole.MECHANIC, UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'List estimates' })
  @ApiQuery({ name: 'status', required: false, enum: EstimateStatus })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<{
    success: boolean;
    data: EstimateResponseDto[];
    meta: { total: number; limit: number; offset: number };
  }> {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;

    const result = await this.estimateService.findAll(tenantId, {
      status: status as EstimateStatus | undefined,
      customerId,
      limit: Number.isNaN(parsedLimit) ? 50 : parsedLimit,
      offset: Number.isNaN(parsedOffset) ? 0 : parsedOffset,
    });

    return {
      success: true,
      data: result.estimates as unknown as EstimateResponseDto[],
      meta: {
        total: result.total,
        limit: Number.isNaN(parsedLimit) ? 50 : parsedLimit,
        offset: Number.isNaN(parsedOffset) ? 0 : parsedOffset,
      },
    };
  }

  @Get(':id')
  @Roles(UserRole.MECHANIC, UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get estimate by ID' })
  @ApiParam({ name: 'id', description: 'Estimate ID' })
  @ApiResponse({ status: 200, type: EstimateResponseDto })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: EstimateResponseDto }> {
    const estimate = await this.estimateService.findById(tenantId, id);
    return { success: true, data: estimate as unknown as EstimateResponseDto };
  }

  @Patch(':id')
  @Roles(UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update estimate' })
  @ApiParam({ name: 'id', description: 'Estimate ID' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEstimateDto,
  ): Promise<{ success: boolean; data: EstimateResponseDto }> {
    const estimate = await this.estimateService.update(tenantId, id, dto);
    return { success: true, data: estimate as unknown as EstimateResponseDto };
  }

  @Post(':id/lines')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Add a line to an estimate' })
  @ApiParam({ name: 'id', description: 'Estimate ID' })
  async addLine(
    @CurrentTenant() tenantId: string,
    @Param('id') estimateId: string,
    @Body() dto: CreateEstimateLineDto,
  ): Promise<{ success: boolean; data: EstimateResponseDto }> {
    const estimate = await this.estimateService.addLine(tenantId, estimateId, dto);
    return { success: true, data: estimate as unknown as EstimateResponseDto };
  }

  @Delete('lines/:lineId')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove a line from an estimate' })
  @ApiParam({ name: 'lineId', description: 'Estimate Line ID' })
  async removeLine(
    @CurrentTenant() tenantId: string,
    @Param('lineId') lineId: string,
  ): Promise<{ success: boolean; data: EstimateResponseDto }> {
    const estimate = await this.estimateService.removeLine(tenantId, lineId);
    return { success: true, data: estimate as unknown as EstimateResponseDto };
  }

  @Patch(':id/send')
  @Roles(UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Send estimate to customer' })
  @ApiParam({ name: 'id', description: 'Estimate ID' })
  async send(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: EstimateResponseDto; message: string }> {
    const estimate = await this.estimateService.send(tenantId, id);
    return {
      success: true,
      data: estimate as unknown as EstimateResponseDto,
      message: 'Estimate sent successfully',
    };
  }

  @Patch(':id/accept')
  @Roles(UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Accept an estimate' })
  @ApiParam({ name: 'id', description: 'Estimate ID' })
  async accept(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: EstimateResponseDto; message: string }> {
    const estimate = await this.estimateService.accept(tenantId, id);
    return {
      success: true,
      data: estimate as unknown as EstimateResponseDto,
      message: 'Estimate accepted',
    };
  }

  @Patch(':id/reject')
  @Roles(UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Reject an estimate' })
  @ApiParam({ name: 'id', description: 'Estimate ID' })
  async reject(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: EstimateResponseDto; message: string }> {
    const estimate = await this.estimateService.reject(tenantId, id);
    return {
      success: true,
      data: estimate as unknown as EstimateResponseDto,
      message: 'Estimate rejected',
    };
  }

  @Patch(':id/convert')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Convert estimate to booking' })
  @ApiParam({ name: 'id', description: 'Estimate ID' })
  async convertToBooking(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body('bookingId') bookingId: string,
  ): Promise<{ success: boolean; data: EstimateResponseDto; message: string }> {
    const estimate = await this.estimateService.convertToBooking(tenantId, id, bookingId);
    return {
      success: true,
      data: estimate as unknown as EstimateResponseDto,
      message: 'Estimate converted to booking',
    };
  }

  @Post(':id/convert-to-work-order')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Convert accepted estimate to work order' })
  @ApiParam({ name: 'id', description: 'Estimate ID' })
  @ApiResponse({ status: 201, description: 'Work order created from estimate' })
  async convertToWorkOrder(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: unknown; message: string }> {
    const workOrder = await this.estimateService.convertToWorkOrder(id, tenantId);
    return {
      success: true,
      data: workOrder,
      message: 'Estimate converted to work order',
    };
  }

  @Get(':id/pdf')
  @Roles(UserRole.MECHANIC, UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Download estimate as PDF (HTML)' })
  @ApiParam({ name: 'id', description: 'Estimate ID' })
  @ApiProduces('text/html')
  @ApiResponse({ status: 200, description: 'PDF HTML generated' })
  async downloadPdf(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.pdfService.generateEstimatePdf(id, tenantId);
    res.set({
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="preventivo-${id}.html"`,
    });
    res.send(buffer);
  }
}
