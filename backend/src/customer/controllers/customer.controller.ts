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
import { CustomerService } from '../services/customer.service';
import { VehicleService } from '../services/vehicle.service';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard, UserRole } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';
import { CurrentTenant } from '@auth/decorators/current-user.decorator';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerResponseDto,
  CustomerSearchDto,
  CustomerWithBookingsDto,
} from '../dto/customer.dto';
import { CreateVehicleDto, UpdateVehicleDto, VehicleResponseDto } from '../dto/vehicle.dto';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomerController {
  constructor(
    private readonly customerService: CustomerService,
    private readonly vehicleService: VehicleService,
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
  async getCustomers(
    @CurrentTenant() tenantId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.customerService.findAll(tenantId, {
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
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

  @Get('vehicles/:vehicleId')
  @Roles(UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get vehicle by ID' })
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
