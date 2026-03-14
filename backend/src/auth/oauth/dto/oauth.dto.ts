import { IsString, IsNotEmpty } from 'class-validator';

export class GoogleOAuthDto {
  @IsString()
  @IsNotEmpty()
  credential: string; // Google ID token from GSI

  @IsString()
  @IsNotEmpty()
  tenantSlug: string; // Required: tenant isolation
}
