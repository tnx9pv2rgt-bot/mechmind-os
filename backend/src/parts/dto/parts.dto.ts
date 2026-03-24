/**
 * MechMind OS - Parts Catalog DTOs
 */

import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsBoolean,
  IsUUID,
  IsArray,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MovementType, OrderStatus } from '@prisma/client';

// ==========================================
// Part Management
// ==========================================

export class CreatePartDto {
  @ApiProperty({ description: 'Codice SKU univoco del ricambio', example: 'FLT-OIL-5W30-1L' })
  @IsString()
  sku: string;

  @ApiProperty({ description: 'Nome del ricambio', example: 'Filtro olio motore' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Descrizione dettagliata',
    example: 'Filtro olio compatibile Fiat/Alfa Romeo',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Categoria merceologica', example: 'Filtri' })
  @IsString()
  category: string;

  @ApiPropertyOptional({ description: 'Sottocategoria', example: 'Olio' })
  @IsOptional()
  @IsString()
  subcategory?: string;

  @ApiPropertyOptional({ description: 'Marca del ricambio', example: 'MANN-FILTER' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ description: 'Produttore', example: 'Mann+Hummel' })
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiPropertyOptional({ description: 'Codice ricambio del produttore', example: 'W 712/95' })
  @IsOptional()
  @IsString()
  partNumber?: string;

  @ApiPropertyOptional({
    description: 'Marche compatibili',
    type: [String],
    example: ['Fiat', 'Alfa Romeo'],
  })
  @IsOptional()
  @IsArray()
  compatibleMakes?: string[];

  @ApiPropertyOptional({
    description: 'Modelli compatibili',
    type: [String],
    example: ['500', 'Panda', 'Giulietta'],
  })
  @IsOptional()
  @IsArray()
  compatibleModels?: string[];

  @ApiPropertyOptional({ description: 'Anno di inizio compatibilità', example: 2010 })
  @IsOptional()
  @IsInt()
  yearFrom?: number;

  @ApiPropertyOptional({ description: 'Anno di fine compatibilità', example: 2024 })
  @IsOptional()
  @IsInt()
  yearTo?: number;

  @ApiProperty({ description: 'Prezzo di acquisto (costo)', example: 8.5 })
  @IsNumber()
  costPrice: number;

  @ApiProperty({ description: 'Prezzo di vendita al pubblico', example: 15.0 })
  @IsNumber()
  retailPrice: number;

  @ApiPropertyOptional({ description: 'Livello minimo di scorta', example: 5, default: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minStockLevel?: number;

  @ApiPropertyOptional({ description: 'Punto di riordino automatico', example: 10 })
  @IsOptional()
  @IsInt()
  reorderPoint?: number;

  @ApiPropertyOptional({
    description: 'ID del fornitore associato',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID()
  supplierId?: string;
}

export class UpdatePartDto {
  @ApiPropertyOptional({
    description: 'Nome del ricambio',
    example: 'Filtro olio motore aggiornato',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Prezzo di acquisto', example: 9.0 })
  @IsOptional()
  @IsNumber()
  costPrice?: number;

  @ApiPropertyOptional({ description: 'Prezzo di vendita', example: 16.5 })
  @IsOptional()
  @IsNumber()
  retailPrice?: number;

  @ApiPropertyOptional({ description: 'Ricambio attivo nel catalogo', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ==========================================
// Supplier Management
// ==========================================

export class CreateSupplierDto {
  @ApiProperty({
    description: 'Ragione sociale del fornitore',
    example: 'Autoricambi Bianchi S.r.l.',
  })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Codice fornitore', example: 'FORN-001' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: 'Nome del referente', example: 'Mario Bianchi' })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({ description: 'Email del fornitore', example: 'ordini@autoricambi.it' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Telefono del fornitore', example: '+39 02 1234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Indirizzo', example: 'Via Industriale 42' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Città', example: 'Milano' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Termini di pagamento', example: '30 giorni DFFM' })
  @IsOptional()
  @IsString()
  paymentTerms?: string;
}

// ==========================================
// Inventory
// ==========================================

export class AdjustStockDto {
  @ApiProperty({
    description: 'Quantità da aggiungere (positivo) o rimuovere (negativo)',
    example: 10,
  })
  @IsInt()
  quantity: number;

  @ApiProperty({ description: 'Motivo della rettifica', example: 'Inventario fisico di fine mese' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'Ubicazione di magazzino', example: 'Scaffale A3' })
  @IsOptional()
  @IsString()
  location?: string;
}

export class TransferStockDto {
  @ApiProperty({ description: 'Ubicazione di origine', example: 'Magazzino principale' })
  @IsString()
  fromLocation: string;

  @ApiProperty({ description: 'Ubicazione di destinazione', example: 'Officina' })
  @IsString()
  toLocation: string;

  @ApiProperty({ description: 'Quantità da trasferire', example: 5 })
  @IsInt()
  quantity: number;
}

// ==========================================
// Purchase Orders
// ==========================================

export class CreateOrderItemDto {
  @ApiProperty({
    description: 'ID del ricambio da ordinare',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  partId: string;

  @ApiProperty({ description: 'Quantità da ordinare', example: 20 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Prezzo unitario concordato (opzionale, altrimenti usa il costo di listino)',
    example: 7.5,
  })
  @IsOptional()
  @IsNumber()
  unitPrice?: number;
}

export class CreatePurchaseOrderDto {
  @ApiProperty({ description: 'ID del fornitore', example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' })
  @IsUUID()
  supplierId: string;

  @ApiPropertyOptional({ description: 'Note aggiuntive', example: 'Consegna urgente richiesta' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Data prevista di consegna (ISO 8601)',
    example: '2026-03-25T00:00:00Z',
  })
  @IsOptional()
  @IsString()
  expectedDate?: string;

  @ApiProperty({ description: 'Articoli da ordinare', type: [CreateOrderItemDto] })
  @IsArray()
  items: CreateOrderItemDto[];
}

export class ReceiveOrderDto {
  @ApiProperty({
    description: "ID dell'articolo dell'ordine",
    example: 'c3d4e5f6-a7b8-9012-cdef-234567890abc',
  })
  @IsUUID()
  itemId: string;

  @ApiProperty({ description: 'Quantità ricevuta', example: 15 })
  @IsInt()
  quantity: number;
}

// ==========================================
// Query Parameters
// ==========================================

export class PartQueryDto {
  @ApiPropertyOptional({ description: 'Filtra per categoria', example: 'Filtri' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Filtra per fornitore',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'Mostra solo ricambi sotto scorta minima', example: true })
  @IsOptional()
  @IsBoolean()
  lowStock?: boolean;

  @ApiPropertyOptional({
    description: 'Ricerca testuale per nome, SKU o descrizione',
    example: 'filtro olio',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

// ==========================================
// Response DTOs
// ==========================================

export class PartResponseDto {
  @ApiProperty({ description: 'ID del ricambio', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ description: 'Codice SKU', example: 'FLT-OIL-5W30-1L' })
  sku: string;

  @ApiProperty({ description: 'Nome del ricambio', example: 'Filtro olio motore' })
  name: string;

  @ApiPropertyOptional({
    description: 'Descrizione',
    example: 'Filtro olio compatibile Fiat/Alfa Romeo',
  })
  description?: string;

  @ApiProperty({ description: 'Categoria', example: 'Filtri' })
  category: string;

  @ApiPropertyOptional({ description: 'Marca', example: 'MANN-FILTER' })
  brand?: string;

  @ApiProperty({ description: 'Prezzo di acquisto', example: 8.5 })
  costPrice: number;

  @ApiProperty({ description: 'Prezzo di vendita', example: 15.0 })
  retailPrice: number;

  @ApiProperty({ description: 'Quantità in magazzino', example: 25 })
  stockQuantity: number;

  @ApiProperty({ description: 'Quantità riservata', example: 3 })
  reservedQuantity: number;

  @ApiProperty({ description: 'Quantità disponibile', example: 22 })
  availableQuantity: number;

  @ApiProperty({ description: 'Scorta sotto il livello minimo', example: false })
  isLowStock: boolean;

  @ApiPropertyOptional({ description: 'Nome del fornitore', example: 'Autoricambi Bianchi S.r.l.' })
  supplierName?: string;
}

export class InventoryMovementResponseDto {
  @ApiProperty({ description: 'ID del movimento', example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' })
  id: string;

  @ApiProperty({
    description: 'Tipo di movimento',
    enum: ['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER', 'RETURN'],
  })
  type: MovementType;

  @ApiProperty({ description: 'Quantità movimentata', example: 10 })
  quantity: number;

  @ApiPropertyOptional({ description: 'Note', example: 'Rifornimento settimanale' })
  notes?: string;

  @ApiProperty({ description: 'Operatore che ha eseguito il movimento', example: 'Luigi Verdi' })
  performedBy: string;

  @ApiProperty({ description: 'Data del movimento', example: '2026-03-16T10:00:00Z' })
  createdAt: Date;
}

export class PurchaseOrderResponseDto {
  @ApiProperty({ description: "ID dell'ordine", example: 'c3d4e5f6-a7b8-9012-cdef-234567890abc' })
  id: string;

  @ApiProperty({ description: 'Numero ordine', example: 'PO-2026-0042' })
  orderNumber: string;

  @ApiProperty({ description: 'Nome del fornitore', example: 'Autoricambi Bianchi S.r.l.' })
  supplierName: string;

  @ApiProperty({
    description: "Stato dell'ordine",
    enum: ['DRAFT', 'SUBMITTED', 'CONFIRMED', 'SHIPPED', 'RECEIVED', 'CANCELLED'],
  })
  status: OrderStatus;

  @ApiProperty({ description: 'Totale ordine', example: 450.0 })
  total: number;

  @ApiProperty({ description: 'Data ordine', example: '2026-03-10T08:00:00Z' })
  orderDate: Date;

  @ApiPropertyOptional({
    description: 'Data prevista di consegna',
    example: '2026-03-17T08:00:00Z',
  })
  expectedDate?: Date;

  @ApiProperty({ description: "Articoli dell'ordine", type: 'array' })
  items: {
    partName: string;
    quantity: number;
    receivedQty: number;
    unitPrice: number;
  }[];
}

export class LowStockAlertDto {
  @ApiProperty({ description: 'ID del ricambio', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  partId: string;

  @ApiProperty({ description: 'Codice SKU', example: 'FLT-OIL-5W30-1L' })
  sku: string;

  @ApiProperty({ description: 'Nome del ricambio', example: 'Filtro olio motore' })
  name: string;

  @ApiProperty({ description: 'Scorta attuale', example: 2 })
  currentStock: number;

  @ApiProperty({ description: 'Livello minimo di scorta', example: 5 })
  minStockLevel: number;

  @ApiProperty({ description: 'Punto di riordino', example: 10 })
  reorderPoint: number;

  @ApiProperty({ description: 'Quantità suggerita per il riordino', example: 20 })
  suggestedOrderQty: number;

  @ApiPropertyOptional({ description: 'Nome del fornitore', example: 'Autoricambi Bianchi S.r.l.' })
  supplierName?: string;
}
