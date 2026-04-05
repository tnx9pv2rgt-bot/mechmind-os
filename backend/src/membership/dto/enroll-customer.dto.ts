import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const BILLING_CYCLES = ['MONTHLY', 'YEARLY'] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

export class EnrollCustomerDto {
  @ApiProperty({ description: 'ID del cliente da iscrivere', example: 'cust-uuid-001' })
  @IsString()
  customerId!: string;

  @ApiProperty({ description: 'ID del programma membership', example: 'prog-uuid-001' })
  @IsString()
  programId!: string;

  @ApiProperty({
    description: 'Ciclo di fatturazione',
    enum: BILLING_CYCLES,
    example: 'MONTHLY',
  })
  @IsEnum(BILLING_CYCLES, { message: 'billingCycle deve essere MONTHLY o YEARLY' })
  billingCycle!: BillingCycle;
}
