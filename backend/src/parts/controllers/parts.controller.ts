/**
 * MechMind OS - Parts Catalog Controller
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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { PartsService } from '../services/parts.service';
import {
  CreatePartDto,
  UpdatePartDto,
  CreateSupplierDto,
  AdjustStockDto,
  CreatePurchaseOrderDto,
  ReceiveOrderDto,
  PartQueryDto,
  PartResponseDto,
  PurchaseOrderResponseDto,
  LowStockAlertDto,
  InventoryMovementResponseDto,
} from '../dto/parts.dto';
import { UserRole, OrderStatus } from '@prisma/client';

@ApiTags('Parts Catalog')
@Controller('v1/parts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PartsController {
  constructor(private readonly partsService: PartsService) {}

  // ============== PARTS ==============

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create new part' })
  @ApiResponse({ status: 201, type: PartResponseDto })
  async createPart(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreatePartDto,
  ): Promise<PartResponseDto> {
    return this.partsService.createPart(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List parts' })
  @ApiResponse({ status: 200, type: [PartResponseDto] })
  async getParts(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: PartQueryDto,
  ): Promise<PartResponseDto[]> {
    return this.partsService.getParts(tenantId, {
      category: query.category,
      supplierId: query.supplierId,
      lowStock: query.lowStock,
      search: query.search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get part details' })
  @ApiResponse({ status: 200, type: PartResponseDto })
  async getPart(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<PartResponseDto> {
    return this.partsService.getPart(tenantId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update part' })
  @ApiResponse({ status: 200, type: PartResponseDto })
  async updatePart(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePartDto,
  ): Promise<PartResponseDto> {
    return this.partsService.updatePart(tenantId, id, dto);
  }

  // ============== SUPPLIERS ==============

  @Post('suppliers')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create supplier' })
  async createSupplier(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateSupplierDto,
  ) {
    return this.partsService.createSupplier(tenantId, dto);
  }

  @Get('suppliers/list')
  @ApiOperation({ summary: 'List suppliers' })
  async getSuppliers(@CurrentUser('tenantId') tenantId: string) {
    return this.partsService.getSuppliers(tenantId);
  }

  // ============== INVENTORY ==============

  @Post(':id/stock/adjust')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Adjust stock level' })
  async adjustStock(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') partId: string,
    @Body() dto: AdjustStockDto,
  ): Promise<void> {
    return this.partsService.adjustStock(tenantId, partId, dto, userId);
  }

  @Get(':id/stock/history')
  @ApiOperation({ summary: 'Get inventory movement history' })
  @ApiResponse({ status: 200, type: [InventoryMovementResponseDto] })
  async getInventoryHistory(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') partId: string,
  ): Promise<InventoryMovementResponseDto[]> {
    return this.partsService.getInventoryHistory(tenantId, partId);
  }

  @Get('alerts/low-stock')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get low stock alerts' })
  @ApiResponse({ status: 200, type: [LowStockAlertDto] })
  async getLowStockAlerts(
    @CurrentUser('tenantId') tenantId: string,
  ): Promise<LowStockAlertDto[]> {
    return this.partsService.getLowStockAlerts(tenantId);
  }

  // ============== PURCHASE ORDERS ==============

  @Post('purchase-orders')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create purchase order' })
  @ApiResponse({ status: 201, type: PurchaseOrderResponseDto })
  async createPurchaseOrder(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreatePurchaseOrderDto,
  ): Promise<PurchaseOrderResponseDto> {
    return this.partsService.createPurchaseOrder(tenantId, dto, userId);
  }

  @Get('purchase-orders/list')
  @ApiOperation({ summary: 'List purchase orders' })
  @ApiResponse({ status: 200, type: [PurchaseOrderResponseDto] })
  async getPurchaseOrders(
    @CurrentUser('tenantId') tenantId: string,
    @Query('status') status?: OrderStatus,
  ): Promise<PurchaseOrderResponseDto[]> {
    return this.partsService.getPurchaseOrders(tenantId, status);
  }

  @Post('purchase-orders/:id/receive')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Receive purchase order items' })
  async receiveOrder(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') orderId: string,
    @Body() items: ReceiveOrderDto[],
  ): Promise<void> {
    return this.partsService.receiveOrder(tenantId, orderId, items, userId);
  }
}
