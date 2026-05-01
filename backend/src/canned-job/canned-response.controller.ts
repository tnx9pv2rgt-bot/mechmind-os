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
import { CannedResponseService } from './canned-response.service';
import { CreateCannedResponseDto, UpdateCannedResponseDto } from './dto/canned-response.dto';

@ApiTags('Risposte Predefinite')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('canned-responses')
export class CannedResponseController {
  constructor(private readonly cannedResponseService: CannedResponseService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new canned response' })
  @ApiResponse({ status: 201, description: 'Canned response created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateCannedResponseDto,
  ): Promise<{ success: boolean; data: unknown }> {
    const response = await this.cannedResponseService.create(tenantId, dto);
    return { success: true, data: response };
  }

  @Get()
  @ApiOperation({ summary: 'List canned responses' })
  @ApiQuery({ name: 'category', required: false })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('category') category?: string,
  ): Promise<{ success: boolean; data: unknown[] }> {
    const responses = await this.cannedResponseService.findAll(tenantId, { category });
    return { success: true, data: responses };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get canned response by ID' })
  // eslint-disable-next-line sonarjs/no-duplicate-string
  @ApiParam({ name: 'id', description: 'Canned Response ID' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: unknown }> {
    const response = await this.cannedResponseService.findById(tenantId, id);
    return { success: true, data: response };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update canned response' })
  @ApiParam({ name: 'id', description: 'Canned Response ID' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCannedResponseDto,
  ): Promise<{ success: boolean; data: unknown }> {
    const response = await this.cannedResponseService.update(tenantId, id, dto);
    return { success: true, data: response };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete canned response (set isActive = false)' })
  @ApiParam({ name: 'id', description: 'Canned Response ID' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: unknown }> {
    const response = await this.cannedResponseService.remove(tenantId, id);
    return { success: true, data: response };
  }
}
