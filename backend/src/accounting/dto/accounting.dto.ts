import { IsString, IsEnum, IsOptional, IsUUID, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AccountingProvider, AccountingSyncStatus } from '@prisma/client';

// ==================== REQUEST DTOs ====================

export class SyncInvoiceDto {
  @ApiProperty({ description: 'Invoice ID to sync' })
  @IsUUID()
  invoiceId: string;

  @ApiProperty({ enum: AccountingProvider, description: 'Accounting provider' })
  @IsEnum(AccountingProvider)
  provider: AccountingProvider;
}

export class SyncCustomerDto {
  @ApiProperty({ description: 'Customer ID to sync' })
  @IsUUID()
  customerId: string;

  @ApiProperty({ enum: AccountingProvider, description: 'Accounting provider' })
  @IsEnum(AccountingProvider)
  provider: AccountingProvider;
}

export class AccountingSyncFilterDto {
  @ApiPropertyOptional({ enum: AccountingProvider })
  @IsOptional()
  @IsEnum(AccountingProvider)
  provider?: AccountingProvider;

  @ApiPropertyOptional({ enum: AccountingSyncStatus })
  @IsOptional()
  @IsEnum(AccountingSyncStatus)
  status?: AccountingSyncStatus;

  @ApiPropertyOptional({ description: 'Entity type (INVOICE, CUSTOMER, PAYMENT)' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ description: 'Number of records to return', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: 'Number of records to skip', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

// ==================== RESPONSE DTOs ====================

export class AccountingSyncResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty({ enum: AccountingProvider })
  provider: AccountingProvider;

  @ApiPropertyOptional()
  externalId: string | null;

  @ApiProperty()
  entityType: string;

  @ApiProperty()
  entityId: string;

  @ApiProperty({ enum: AccountingSyncStatus })
  status: AccountingSyncStatus;

  @ApiProperty()
  direction: string;

  @ApiPropertyOptional()
  syncedAt: Date | null;

  @ApiPropertyOptional()
  error: string | null;

  @ApiProperty()
  retryCount: number;

  @ApiPropertyOptional()
  lastRetryAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
