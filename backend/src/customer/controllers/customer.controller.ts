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
} from '@nestjs/swagger';
import { Response } from 'express';
import { CustomerService } from '../services/customer.service';
import { VehicleService } from '../services/vehicle.service';
import { CsvImportExportService } from '../services/csv-import-export.service';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard, UserRole } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';
import { CurrentTenant } from '@auth/decorators/current-user.decorator';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerResponseDto,
  CustomerSearchDto,
} from '../dto/customer.dto';
import { CreateVehicleDto, UpdateVehicleDto } from '../dto/vehicle.dto';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomerController {
  constructor(
    private readonly customerService: CustomerService,
    private readonly vehicleService: VehicleService,
    private readonly csvService: CsvImportExportService,
  ) {}

  // ==================== CUSTOMER ENDPOINTS ====================

  @Post()
  @Roles(UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new customer' })
  @ApiResponse({
    status: 201,
    description: 'Customer created successfully',
    type: CustomerResponseDto,
  })
  async createCustomer(@CurrentTenant() tenantId: string, @Body() dto: CreateCustomerDto) {
    const customer = await this.customerService.create(tenantId, dto);
    return {
      success: true,
      data: customer,
    };
  }

  @Get()
  @Roles(UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all customers' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getCustomers(
    @CurrentTenant() tenantId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.customerService.findAll(tenantId, {
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
      search: search || undefined,
    });

    return {
      success: true,
      data: result.customers,
      meta: {
        total: result.total,
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0,
      },
    };
  }

  @Get('search')
  @Roles(UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Search customers' })
  async searchCustomers(@CurrentTenant() tenantId: string, @Query() query: CustomerSearchDto) {
    const result = await this.customerService.search(tenantId, {
      name: query.name,
      email: query.email,
      limit: query.limit,
      offset: query.offset,
    });

    return {
      success: true,
      data: result.customers,
      meta: {
        total: result.total,
      },
    };
  }

  @Get(':id')
  @Roles(UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get customer by ID' })
  // eslint-disable-next-line sonarjs/no-duplicate-string
  @ApiParam({ name: 'id', description: 'Customer ID' })
  async getCustomer(@CurrentTenant() tenantId: string, @Param('id') customerId: string) {
    const customer = await this.customerService.findById(tenantId, customerId);
    return {
      success: true,
      data: customer,
    };
  }

  @Patch(':id')
  @Roles(UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update customer' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  async updateCustomer(
    @CurrentTenant() tenantId: string,
    @Param('id') customerId: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    const customer = await this.customerService.update(tenantId, customerId, dto);
    return {
      success: true,
      data: customer,
    };
  }

  // ==================== CSV IMPORT / EXPORT ====================

  @Get('export')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Export customers as CSV' })
  async exportCustomers(@CurrentTenant() tenantId: string, @Res() res: Response): Promise<void> {
    const csv = await this.csvService.exportCustomers(tenantId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="customers.csv"');
    res.send(csv);
  }

  @Post('import')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Import customers from CSV' })
  async importCustomers(
    @CurrentTenant() tenantId: string,
    @Body('csv') csvContent: string,
  ): Promise<{
    success: boolean;
    data: { imported: number; errors: Array<{ row: number; error: string }> };
  }> {
    const result = await this.csvService.importCustomers(tenantId, csvContent);
    return { success: true, data: result };
  }

  @Get('vehicles/export')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Export vehicles as CSV' })
  async exportVehicles(@CurrentTenant() tenantId: string, @Res() res: Response): Promise<void> {
    const csv = await this.csvService.exportVehicles(tenantId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="vehicles.csv"');
    res.send(csv);
  }

  // ==================== VEHICLE ENDPOINTS ====================

  @Post(':id/vehicles')
  @Roles(UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Add vehicle to customer' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  async addVehicle(
    @CurrentTenant() tenantId: string,
    @Param('id') customerId: string,
    @Body() dto: CreateVehicleDto,
  ) {
    const vehicle = await this.vehicleService.create(tenantId, customerId, dto);
    return {
      success: true,
      data: vehicle,
    };
  }

  @Get(':id/vehicles')
  @Roles(UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get customer vehicles' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  async getCustomerVehicles(@CurrentTenant() tenantId: string, @Param('id') customerId: string) {
    const vehicles = await this.vehicleService.findByCustomer(tenantId, customerId);
    return {
      success: true,
      data: vehicles,
    };
  }

  // eslint-disable-next-line sonarjs/no-duplicate-string
  @Get('vehicles/:vehicleId')
  @Roles(UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get vehicle by ID' })
  // eslint-disable-next-line sonarjs/no-duplicate-string
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID' })
  async getVehicle(@CurrentTenant() tenantId: string, @Param('vehicleId') vehicleId: string) {
    const vehicle = await this.vehicleService.findById(tenantId, vehicleId);
    return {
      success: true,
      data: vehicle,
    };
  }

  @Patch('vehicles/:vehicleId')
  @Roles(UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update vehicle' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID' })
  async updateVehicle(
    @CurrentTenant() tenantId: string,
    @Param('vehicleId') vehicleId: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    const vehicle = await this.vehicleService.update(tenantId, vehicleId, dto);
    return {
      success: true,
      data: vehicle,
    };
  }

  @Delete('vehicles/:vehicleId')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete vehicle' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID' })
  async deleteVehicle(@CurrentTenant() tenantId: string, @Param('vehicleId') vehicleId: string) {
    await this.vehicleService.delete(tenantId, vehicleId);
    return {
      success: true,
      message: 'Vehicle deleted successfully',
    };
  }
}
