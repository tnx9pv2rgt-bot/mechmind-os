/**
 * MechMind OS - AI Compliance DTOs (EU AI Act)
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LogAiDecisionDto {
  @ApiProperty({ description: 'AI feature name', example: 'damage_analysis' })
  @IsString()
  featureName: string;

  @ApiProperty({ description: 'AI model used', example: 'gpt-4-vision' })
  @IsString()
  modelUsed: string;

  @ApiProperty({ description: 'Sanitized input summary (no PII)' })
  @IsString()
  inputSummary: string;

  @ApiProperty({ description: 'AI output summary' })
  @IsString()
  outputSummary: string;

  @ApiPropertyOptional({ description: 'Confidence score 0-1', example: 0.87 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @ApiPropertyOptional({ description: 'Related entity type', example: 'inspection' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ description: 'Related entity ID' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ description: 'User who triggered the AI' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Processing time in milliseconds' })
  @IsOptional()
  @IsInt()
  @Min(0)
  processingTimeMs?: number;
}

export class HumanReviewDto {
  @ApiProperty({ description: 'Whether the human overrode the AI decision' })
  @IsBoolean()
  humanOverridden: boolean;

  @ApiPropertyOptional({ description: 'Human decision text (if overridden)' })
  @IsOptional()
  @IsString()
  humanDecision?: string;
}

export class AiDecisionQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Filter by AI feature name' })
  @IsOptional()
  @IsString()
  featureName?: string;

  @ApiPropertyOptional({ description: 'Filter from date (ISO)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter to date (ISO)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Filter by human review status' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  humanReviewed?: boolean;
}

export class AiComplianceDashboardDto {
  @ApiProperty()
  totalDecisions: number;

  @ApiProperty()
  overrideRate: number;

  @ApiProperty()
  avgConfidence: number;

  @ApiProperty()
  pendingReview: number;

  @ApiProperty()
  byFeature: Record<string, number>;
}
