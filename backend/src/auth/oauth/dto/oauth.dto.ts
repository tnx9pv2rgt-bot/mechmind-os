import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleOAuthDto {
  @ApiProperty({
    description: 'Token ID Google da GSI',
    example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6...',
  })
  @IsString()
  @IsNotEmpty()
  credential: string; // Google ID token from GSI

  @ApiProperty({
    description: 'Slug del tenant per isolamento multi-tenancy',
    example: 'officina-rossi',
  })
  @IsString()
  @IsNotEmpty()
  tenantSlug: string; // Required: tenant isolation
}
