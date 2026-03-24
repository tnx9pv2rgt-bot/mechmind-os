import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendSmsDto {
  @ApiProperty({ description: 'SMS message body' })
  @IsString()
  @IsNotEmpty()
  body!: string;
}

export class InboundSmsDto {
  @ApiProperty({ description: 'Phone hash to identify the thread' })
  @IsString()
  @IsNotEmpty()
  phoneHash!: string;

  @ApiProperty({ description: 'SMS message body' })
  @IsString()
  @IsNotEmpty()
  body!: string;

  @ApiPropertyOptional({ description: 'Twilio message SID' })
  @IsString()
  @IsOptional()
  twilioSid?: string;
}

export class SmsThreadResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() customerId!: string;
  @ApiProperty() phoneHash!: string;
  @ApiProperty() unreadCount!: number;
  @ApiProperty({ required: false, nullable: true }) lastMessageAt!: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class SmsMessageResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() threadId!: string;
  @ApiProperty() direction!: string;
  @ApiProperty() body!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ required: false, nullable: true }) twilioSid!: string | null;
  @ApiProperty() createdAt!: Date;
}
