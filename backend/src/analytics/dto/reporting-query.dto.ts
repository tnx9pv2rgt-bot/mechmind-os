import { IsDateString, IsInt, IsIn, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DateRangeQueryDto {
  @ApiProperty({ description: 'Start date (ISO 8601)', example: '2026-01-01' })
  @IsDateString()
  from: string;

  @ApiProperty({ description: 'End date (ISO 8601)', example: '2026-01-31' })
  @IsDateString()
  to: string;
}

export class YearMonthQueryDto {
  @ApiProperty({ description: 'Year', example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  year: number;

  @ApiPropertyOptional({ description: 'Month (1-12)', example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;
}

export class ExportQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({ description: 'Export format', enum: ['csv', 'json'], default: 'csv' })
  @IsOptional()
  @IsIn(['csv', 'json'])
  format: 'csv' | 'json' = 'csv';
}

export class PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Number of results', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit: number = 10;
}
