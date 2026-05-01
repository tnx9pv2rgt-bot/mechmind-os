import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PublicTokenType } from '@prisma/client';

export class ResolveTokenResponseDto {
  @ApiProperty({ example: 'ESTIMATE_APPROVAL', enum: PublicTokenType })
  declare type: PublicTokenType;

  @ApiProperty({ example: 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6' })
  declare entityId: string;

  @ApiProperty({ example: 'Estimate' })
  declare entityType: string;

  @ApiPropertyOptional({ example: { estimateNumber: 'EST-001' } })
  declare metadata: Record<string, unknown> | null;
}
