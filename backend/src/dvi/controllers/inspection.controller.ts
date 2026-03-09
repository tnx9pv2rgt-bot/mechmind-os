/**
 * MechMind OS - Digital Vehicle Inspection Controller
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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { InspectionService } from '../services/inspection.service';
import { Throttle } from '@nestjs/throttler';
import {
  CreateInspectionDto,
  UpdateInspectionDto,
  CreateFindingDto,
  UpdateFindingDto,
  CustomerApprovalDto,
  InspectionQueryDto,
  InspectionResponseDto,
  InspectionSummaryDto,
} from '../dto/inspection.dto';
import { UserRole } from '../../auth/guards/roles.guard';

@ApiTags('Digital Vehicle Inspection')
@Controller('inspections')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InspectionController {
  constructor(private readonly inspectionService: InspectionService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MECHANIC)
  @ApiOperation({ summary: 'Create new inspection' })
  @ApiResponse({ status: 201, type: InspectionResponseDto })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateInspectionDto,
  ): Promise<InspectionResponseDto> {
    return this.inspectionService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List inspections' })
  @ApiResponse({ status: 200, type: [InspectionSummaryDto] })
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: InspectionQueryDto,
  ): Promise<InspectionSummaryDto[]> {
    return this.inspectionService.findAll(tenantId, {
      vehicleId: query.vehicleId,
      customerId: query.customerId,
      status: query.status,
      mechanicId: query.mechanicId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inspection by ID' })
  @ApiResponse({ status: 200, type: InspectionResponseDto })
  async findById(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<InspectionResponseDto> {
    return this.inspectionService.findById(tenantId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MECHANIC)
  @ApiOperation({ summary: 'Update inspection' })
  @ApiResponse({ status: 200, type: InspectionResponseDto })
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateInspectionDto,
  ): Promise<InspectionResponseDto> {
    return this.inspectionService.update(tenantId, id, dto, userId);
  }

  @Post(':id/findings')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MECHANIC)
  @ApiOperation({ summary: 'Add finding to inspection' })
  @ApiResponse({ status: 201 })
  async addFinding(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') inspectionId: string,
    @Body() dto: CreateFindingDto,
  ): Promise<void> {
    return this.inspectionService.addFinding(tenantId, inspectionId, dto);
  }

  @Patch('findings/:findingId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MECHANIC)
  @ApiOperation({ summary: 'Update finding status' })
  @ApiResponse({ status: 200 })
  async updateFinding(
    @CurrentUser('tenantId') tenantId: string,
    @Param('findingId') findingId: string,
    @Body() dto: UpdateFindingDto,
  ): Promise<void> {
    return this.inspectionService.updateFinding(tenantId, findingId, dto);
  }

  @Post(':id/photos')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MECHANIC)
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      if (file.mimetype.match(/image\/(jpg|jpeg|png|webp)/)) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Only image files allowed'), false);
      }
    },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload inspection photo' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        itemId: { type: 'string' },
        category: { type: 'string' },
        description: { type: 'string' },
      },
    },
  })
  async uploadPhoto(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') inspectionId: string,
    @UploadedFile() file: any,
    @Body('itemId') itemId?: string,
    @Body('category') category?: string,
    @Body('description') description?: string,
  ): Promise<{ id: string; url: string }> {
    if (!file) {
      throw new BadRequestException('Photo file is required');
    }

    return this.inspectionService.uploadPhoto(
      tenantId,
      inspectionId,
      file.buffer,
      file.mimetype,
      userId,
      itemId,
      category,
      description,
    );
  }

  @Post(':id/approve')
  @Throttle({ default: { ttl: 60000, limit: 5 } }) // Rate limit customer approvals
  @ApiOperation({ summary: 'Customer approval of inspection findings' })
  @ApiResponse({ status: 200 })
  async submitApproval(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') inspectionId: string,
    @Body() dto: CustomerApprovalDto,
  ): Promise<void> {
    return this.inspectionService.submitCustomerApproval(tenantId, inspectionId, dto);
  }

  @Get(':id/report')
  @ApiOperation({ summary: 'Generate PDF inspection report' })
  @ApiResponse({ status: 200, description: 'PDF report' })
  async generateReport(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<Buffer> {
    return this.inspectionService.generateReport(tenantId, id);
  }
}
