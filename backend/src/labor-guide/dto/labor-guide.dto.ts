import { IsString, IsOptional, IsBoolean, IsInt, Min, Max, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateLaborGuideDto {
  @ApiProperty({ description: 'Guide name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Guide description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Source (e.g. MANUFACTURER, CUSTOM, AUTODATA)' })
  @IsOptional()
  @IsString()
  source?: string;
}

export class UpdateLaborGuideDto {
  @ApiPropertyOptional({ description: 'Guide name' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ description: 'Guide description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Source' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: 'Active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateLaborGuideEntryDto {
  @ApiProperty({ description: 'Vehicle make' })
  @IsString()
  @IsNotEmpty()
  make: string;

  @ApiPropertyOptional({ description: 'Vehicle model' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ description: 'Year from' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  yearFrom?: number;

  @ApiPropertyOptional({ description: 'Year to' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  yearTo?: number;

  @ApiProperty({ description: 'Operation code' })
  @IsString()
  @IsNotEmpty()
  operationCode: string;

  @ApiProperty({ description: 'Operation name' })
  @IsString()
  @IsNotEmpty()
  operationName: string;

  @ApiProperty({ description: 'Category (e.g. ENGINE, BRAKES, ELECTRICAL)' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ description: 'Labor time in minutes' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  laborTimeMinutes: number;

  @ApiPropertyOptional({ description: 'Difficulty level (1-5)', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  difficultyLevel?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateLaborGuideEntryDto {
  @ApiPropertyOptional({ description: 'Vehicle make' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  make?: string;

  @ApiPropertyOptional({ description: 'Vehicle model' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ description: 'Year from' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  yearFrom?: number;

  @ApiPropertyOptional({ description: 'Year to' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  yearTo?: number;

  @ApiPropertyOptional({ description: 'Operation code' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  operationCode?: string;

  @ApiPropertyOptional({ description: 'Operation name' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  operationName?: string;

  @ApiPropertyOptional({ description: 'Category' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  category?: string;

  @ApiPropertyOptional({ description: 'Labor time in minutes' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  laborTimeMinutes?: number;

  @ApiPropertyOptional({ description: 'Difficulty level (1-5)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  difficultyLevel?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class SearchLaborGuideDto {
  @ApiProperty({ description: 'Vehicle make' })
  @IsString()
  @IsNotEmpty()
  make: string;

  @ApiPropertyOptional({ description: 'Vehicle model' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ description: 'Operation category' })
  @IsOptional()
  @IsString()
  category?: string;
}
