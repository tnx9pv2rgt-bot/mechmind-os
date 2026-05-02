import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MoveJobDto {
  @ApiProperty({ description: "ID dell'ordine di lavoro da spostare", example: 'uuid' })
  @IsString()
  @IsUUID()
  workOrderId!: string;

  @ApiProperty({ description: 'ID della postazione di origine', example: 'uuid' })
  @IsString()
  @IsUUID()
  fromBayId!: string;

  @ApiProperty({ description: 'ID della postazione di destinazione', example: 'uuid' })
  @IsString()
  @IsUUID()
  toBayId!: string;
}
