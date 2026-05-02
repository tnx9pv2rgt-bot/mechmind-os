import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignBayDto {
  @ApiProperty({ description: "ID dell'ordine di lavoro da assegnare", example: 'uuid' })
  @IsString()
  @IsUUID()
  workOrderId!: string;

  @ApiProperty({ description: 'ID della postazione di lavoro', example: 'uuid' })
  @IsString()
  @IsUUID()
  bayId!: string;

  @ApiProperty({ description: 'ID del tecnico assegnato', example: 'uuid' })
  @IsString()
  @IsUUID()
  technicianId!: string;
}
