/**
 * MechMind OS - Parts Catalog & Inventory Service
 * 
 * Manages parts catalog, inventory, and purchase orders:
 * - Part catalog with compatibility
 * - Stock tracking with reservations
 * - Automatic reorder suggestions
 * - Purchase order workflow
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import {
  CreatePartDto,
  UpdatePartDto,
  CreateSupplierDto,
  AdjustStockDto,
  TransferStockDto,
  CreatePurchaseOrderDto,
  ReceiveOrderDto,
  PartResponseDto,
  PurchaseOrderResponseDto,
  LowStockAlertDto,
  InventoryMovementResponseDto,
} from '../dto/parts.dto';
import { MovementType, OrderStatus, Prisma } from '@prisma/client';

@Injectable()
export class PartsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ============== PARTS ==============

  async createPart(tenantId: string, dto: CreatePartDto): Promise<PartResponseDto> {
    const existing = await this.prisma.part.findUnique({
      where: { sku: dto.sku },
    });
    
    if (existing) {
      throw new BadRequestException(`Part with SKU ${dto.sku} already exists`);
    }

    const part = await this.prisma.part.create({
      data: {
        tenantId,
        sku: dto.sku,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        subcategory: dto.subcategory,
        brand: dto.brand,
        manufacturer: dto.manufacturer,
        partNumber: dto.partNumber,
        compatibleMakes: dto.compatibleMakes || [],
        compatibleModels: dto.compatibleModels || [],
        yearFrom: dto.yearFrom,
        yearTo: dto.yearTo,
        costPrice: new Prisma.Decimal(dto.costPrice),
        retailPrice: new Prisma.Decimal(dto.retailPrice),
        minStockLevel: dto.minStockLevel ?? 5,
        reorderPoint: dto.reorderPoint ?? 10,
        supplierId: dto.supplierId,
      },
      include: { supplier: true, inventory: true },
    });

    // Create initial inventory record
    await this.prisma.inventoryItem.create({
      data: {
        tenantId,
        partId: part.id,
        quantity: 0,
        reserved: 0,
        available: 0,
      },
    });

    return this.mapPartToDto(part);
  }

  async getParts(
    tenantId: string,
    filters: { category?: string; supplierId?: string; lowStock?: boolean; search?: string },
  ): Promise<PartResponseDto[]> {
    const where: any = { tenantId, isActive: true };
    
    if (filters.category) {
      where.category = filters.category;
    }
    
    if (filters.supplierId) {
      where.supplierId = filters.supplierId;
    }
    
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const parts = await this.prisma.part.findMany({
      where,
      include: { supplier: true, inventory: true },
      orderBy: { name: 'asc' },
    });

    const dtos = parts.map(p => this.mapPartToDto(p));
    
    if (filters.lowStock) {
      return dtos.filter(p => p.isLowStock);
    }
    
    return dtos;
  }

  async getPart(tenantId: string, id: string): Promise<PartResponseDto> {
    const part = await this.prisma.part.findFirst({
      where: { id, tenantId },
      include: { supplier: true, inventory: true },
    });

    if (!part) {
      throw new NotFoundException('Part not found');
    }

    return this.mapPartToDto(part);
  }

  async updatePart(tenantId: string, id: string, dto: UpdatePartDto): Promise<PartResponseDto> {
    const part = await this.prisma.part.update({
      where: { id, tenantId },
      data: {
        name: dto.name,
        costPrice: dto.costPrice !== undefined ? new Prisma.Decimal(dto.costPrice) : undefined,
        retailPrice: dto.retailPrice !== undefined ? new Prisma.Decimal(dto.retailPrice) : undefined,
        isActive: dto.isActive,
      },
      include: { supplier: true, inventory: true },
    });

    return this.mapPartToDto(part);
  }

  // ============== SUPPLIERS ==============

  async createSupplier(tenantId: string, dto: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        contactName: dto.contactName,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        city: dto.city,
        paymentTerms: dto.paymentTerms,
      },
    });
  }

  async getSuppliers(tenantId: string) {
    return this.prisma.supplier.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  // ============== INVENTORY ==============

  async adjustStock(
    tenantId: string,
    partId: string,
    dto: AdjustStockDto,
    userId: string,
  ): Promise<void> {
    const part = await this.prisma.part.findFirst({
      where: { id: partId, tenantId },
      include: { inventory: true },
    });

    if (!part) {
      throw new NotFoundException('Part not found');
    }

    const inventoryItem = part.inventory[0];
    const newQuantity = (inventoryItem?.quantity || 0) + dto.quantity;

    if (newQuantity < 0) {
      throw new BadRequestException('Stock cannot be negative');
    }

    await this.prisma.$transaction([
      // Update inventory
      this.prisma.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: {
          quantity: newQuantity,
          available: newQuantity - (inventoryItem?.reserved || 0),
          lastCounted: new Date(),
        },
      }),
      // Record movement
      this.prisma.inventoryMovement.create({
        data: {
          tenantId,
          partId,
          type: dto.quantity >= 0 ? MovementType.ADJUSTMENT : MovementType.ADJUSTMENT,
          quantity: Math.abs(dto.quantity),
          notes: dto.reason,
          performedBy: userId,
        },
      }),
    ]);
  }

  async getInventoryHistory(
    tenantId: string,
    partId: string,
  ): Promise<InventoryMovementResponseDto[]> {
    const movements = await this.prisma.inventoryMovement.findMany({
      where: { partId, tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return movements.map(m => ({
      id: m.id,
      type: m.type,
      quantity: m.quantity,
      notes: m.notes ?? undefined,
      performedBy: m.performedBy,
      createdAt: m.createdAt,
    }));
  }

  // ============== PURCHASE ORDERS ==============

  async createPurchaseOrder(
    tenantId: string,
    dto: CreatePurchaseOrderDto,
    userId: string,
  ): Promise<PurchaseOrderResponseDto> {
    // Generate order number
    const count = await this.prisma.purchaseOrder.count({ where: { tenantId } });
    const orderNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // Calculate totals
    let subtotal = new Prisma.Decimal(0);
    const itemsWithPrices = [];

    for (const item of dto.items) {
      const part = await this.prisma.part.findFirst({
        where: { id: item.partId, tenantId },
      });

      if (!part) {
        throw new NotFoundException(`Part ${item.partId} not found`);
      }

      const unitPrice = item.unitPrice ? new Prisma.Decimal(item.unitPrice) : part.costPrice;
      const total = unitPrice.mul(item.quantity);
      subtotal = subtotal.add(total);

      itemsWithPrices.push({
        partId: item.partId,
        quantity: item.quantity,
        unitPrice,
        vatRate: part.vatRate,
        total,
      });
    }

    const vatAmount = subtotal.mul(0.22); // 22% VAT
    const total = subtotal.add(vatAmount);

    const order = await this.prisma.purchaseOrder.create({
      data: {
        tenantId,
        orderNumber,
        supplierId: dto.supplierId,
        subtotal,
        vatAmount,
        total,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
        notes: dto.notes,
        createdBy: userId,
        items: {
          create: itemsWithPrices,
        },
      },
      include: { supplier: true, items: { include: { part: true } } },
    });

    return this.mapOrderToDto(order);
  }

  async getPurchaseOrders(tenantId: string, status?: OrderStatus): Promise<PurchaseOrderResponseDto[]> {
    const orders = await this.prisma.purchaseOrder.findMany({
      where: { tenantId, ...(status && { status }) },
      include: { supplier: true, items: { include: { part: true } } },
      orderBy: { orderDate: 'desc' },
    });

    return orders.map(o => this.mapOrderToDto(o));
  }

  async receiveOrder(
    tenantId: string,
    orderId: string,
    items: ReceiveOrderDto[],
    userId: string,
  ): Promise<void> {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id: orderId, tenantId },
      include: { items: { include: { part: { include: { inventory: true } } } } },
    });

    if (!order) {
      throw new NotFoundException('Purchase order not found');
    }

    const transactions = [];

    for (const received of items) {
      const orderItem = order.items.find(i => i.id === received.itemId);
      if (!orderItem) continue;

      const inventoryItem = orderItem.part.inventory[0];
      const newQuantity = (inventoryItem?.quantity || 0) + received.quantity;

      // Update inventory
      transactions.push(
        this.prisma.inventoryItem.update({
          where: { id: inventoryItem.id },
          data: {
            quantity: newQuantity,
            available: newQuantity - (inventoryItem?.reserved || 0),
          },
        }),
        // Update order item
        this.prisma.purchaseOrderItem.update({
          where: { id: received.itemId },
          data: { receivedQty: { increment: received.quantity } },
        }),
        // Record movement
        this.prisma.inventoryMovement.create({
          data: {
            tenantId,
            partId: orderItem.partId,
            type: MovementType.IN,
            quantity: received.quantity,
            referenceId: orderId,
            referenceType: 'PURCHASE_ORDER',
            notes: `Received from PO ${order.orderNumber}`,
            performedBy: userId,
          },
        }),
      );
    }

    // Check if order fully received
    const allItems = await this.prisma.purchaseOrderItem.findMany({
      where: { orderId },
    });
    const fullyReceived = allItems.every(i => i.receivedQty >= i.quantity);
    const partiallyReceived = allItems.some(i => i.receivedQty > 0);

    transactions.push(
      this.prisma.purchaseOrder.update({
        where: { id: orderId },
        data: {
          status: fullyReceived ? OrderStatus.RECEIVED : partiallyReceived ? OrderStatus.PARTIALLY_RECEIVED : OrderStatus.SENT,
          receivedAt: fullyReceived ? new Date() : undefined,
        },
      }),
    );

    await this.prisma.$transaction(transactions);
  }

  // ============== LOW STOCK ALERTS ==============

  async getLowStockAlerts(tenantId: string): Promise<LowStockAlertDto[]> {
    const parts = await this.prisma.part.findMany({
      where: { tenantId, isActive: true },
      include: { supplier: true, inventory: true },
    });

    return parts
      .filter(part => {
        const inventory = part.inventory[0];
        return inventory && inventory.quantity <= part.reorderPoint;
      })
      .map(part => {
        const inventory = part.inventory[0];
        const suggestedQty = Math.max(part.minStockLevel * 2 - inventory.quantity, part.minStockLevel);

        return {
          partId: part.id,
          sku: part.sku,
          name: part.name,
          currentStock: inventory.quantity,
          minStockLevel: part.minStockLevel,
          reorderPoint: part.reorderPoint,
          suggestedOrderQty: suggestedQty,
          supplierName: part.supplier?.name,
        };
      });
  }

  // ============== PRIVATE METHODS ==============

  private mapPartToDto(part: any): PartResponseDto {
    const inventory = part.inventory?.[0];
    const stockQuantity = inventory?.quantity || 0;
    const reservedQuantity = inventory?.reserved || 0;
    const availableQuantity = inventory?.available || 0;

    return {
      id: part.id,
      sku: part.sku,
      name: part.name,
      description: part.description ?? undefined,
      category: part.category,
      brand: part.brand ?? undefined,
      costPrice: Number(part.costPrice),
      retailPrice: Number(part.retailPrice),
      stockQuantity,
      reservedQuantity,
      availableQuantity,
      isLowStock: stockQuantity <= part.minStockLevel,
      supplierName: part.supplier?.name,
    };
  }

  private mapOrderToDto(order: any): PurchaseOrderResponseDto {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      supplierName: order.supplier.name,
      status: order.status,
      total: Number(order.total),
      orderDate: order.orderDate,
      expectedDate: order.expectedDate ?? undefined,
      items: order.items.map((item: any) => ({
        partName: item.part.name,
        quantity: item.quantity,
        receivedQty: item.receivedQty,
        unitPrice: Number(item.unitPrice),
      })),
    };
  }
}
