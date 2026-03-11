import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GoogleOAuthDto {
  @IsString()
  @IsNotEmpty()
  credential: string; // Google ID token from GSI

  @IsOptional()
  @IsString()
  tenantSlug?: string; // Optional: if user knows their tenant
}
