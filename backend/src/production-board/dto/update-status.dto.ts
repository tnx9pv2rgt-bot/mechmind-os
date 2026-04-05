import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const VALID_STATUSES = [
  'PENDING',
  'CHECKED_IN',
  'IN_PROGRESS',
  'WAITING_PARTS',
  'QUALITY_CHECK',
  'COMPLETED',
  'READY',
  'INVOICED',
] as const;

export class UpdateJobStatusDto {
  @ApiProperty({
    description: "Nuovo stato dell'ordine di lavoro",
    enum: VALID_STATUSES,
    example: 'IN_PROGRESS',
  })
  @IsString()
  @IsIn([...VALID_STATUSES])
  status: string;
}
