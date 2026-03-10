/**
 * MechMind OS - Parts Catalog DTOs
 */

import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsBoolean,
  IsEnum,
  IsUUID,
  IsArray,
  IsDecimal,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MovementType, OrderStatus } from '@prisma/client';

// ==========================================
// Part Management
// ==========================================

export class CreatePartDto {
  @ApiProperty()
  @IsString()
  sku: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsString()
  category: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  subcategory?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  partNumber?: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  compatibleMakes?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  compatibleModels?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  yearFrom?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  yearTo?: number;

  @ApiProperty()
  @IsNumber()
  costPrice: number;

  @ApiProperty()
  @IsNumber()
  retailPrice: number;

  @ApiProperty({ required: false, default: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minStockLevel?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  reorderPoint?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  supplierId?: string;
}

export class UpdatePartDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  costPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  retailPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ==========================================
// Supplier Management
// ==========================================

export class CreateSupplierDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  paymentTerms?: string;
}

// ==========================================
// Inventory
// ==========================================

export class AdjustStockDto {
  @ApiProperty()
  @IsInt()
  quantity: number;

  @ApiProperty()
  @IsString()
  reason: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  location?: string;
}

export class TransferStockDto {
  @ApiProperty()
  @IsString()
  fromLocation: string;

  @ApiProperty()
  @IsString()
  toLocation: string;

  @ApiProperty()
  @IsInt()
  quantity: number;
}

// ==========================================
// Purchase Orders
// ==========================================

export class CreateOrderItemDto {
  @ApiProperty()
  @IsUUID()
  partId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  unitPrice?: number;
}

export class CreatePurchaseOrderDto {
  @ApiProperty()
  @IsUUID()
  supplierId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  expectedDate?: string;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  items: CreateOrderItemDto[];
}

export class ReceiveOrderDto {
  @ApiProperty()
  @IsUUID()
  itemId: string;

  @ApiProperty()
  @IsInt()
  quantity: number;
}

// ==========================================
// Query Parameters
// ==========================================

export class PartQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  lowStock?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;
}

// ==========================================
// Response DTOs
// ==========================================

export class PartResponseDto {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: string;
  brand?: string;
  costPrice: number;
  retailPrice: number;
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  isLowStock: boolean;
  supplierName?: string;
}

export class InventoryMovementResponseDto {
  id: string;
  type: MovementType;
  quantity: number;
  notes?: string;
  performedBy: string;
  createdAt: Date;
}

export class PurchaseOrderResponseDto {
  id: string;
  orderNumber: string;
  supplierName: string;
  status: OrderStatus;
  total: number;
  orderDate: Date;
  expectedDate?: Date;
  items: {
    partName: string;
    quantity: number;
    receivedQty: number;
    unitPrice: number;
  }[];
}

export class LowStockAlertDto {
  partId: string;
  sku: string;
  name: string;
  currentStock: number;
  minStockLevel: number;
  reorderPoint: number;
  suggestedOrderQty: number;
  supplierName?: string;
}
