import { Controller, Get, Post, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwksService, JwksResponse } from '../services/jwks.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AuthenticatedUser } from '../strategies/jwt.strategy';

@ApiTags('JWKS')
@Controller()
export class JwksController {
  constructor(private readonly jwksService: JwksService) {}

  /**
   * JWKS discovery endpoint — RFC 7517.
   * Public (no auth required). Serves all active public keys.
   * Clients and resource servers use this to verify JWT signatures.
   *
   * Cache-Control: public, max-age=3600 (1 hour)
   * Standard path: /.well-known/jwks.json
   */
  @Get('.well-known/jwks.json')
  @ApiOperation({
    summary: 'JSON Web Key Set (JWKS) — public keys per verifica JWT',
    description:
      'Endpoint pubblico RFC 7517. Serve le chiavi pubbliche ES256 per verificare i JWT firmati dal server.',
  })
  @ApiResponse({
    status: 200,
    description: 'JWKS con chiavi pubbliche',
    schema: {
      type: 'object',
      properties: {
        keys: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              kty: { type: 'string', example: 'EC' },
              crv: { type: 'string', example: 'P-256' },
              x: { type: 'string' },
              y: { type: 'string' },
              kid: { type: 'string' },
              use: { type: 'string', example: 'sig' },
              alg: { type: 'string', example: 'ES256' },
            },
          },
        },
      },
    },
  })
  getJwks(): JwksResponse {
    return this.jwksService.getJwks();
  }

  /**
   * Key rotation endpoint — admin only.
   * Generates new signing key, demotes old key to verification-only.
   */
  @Post('auth/keys/rotate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Ruota le chiavi JWT (solo admin)' })
  @ApiResponse({ status: 200, description: 'Chiave ruotata con successo' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  rotateKeys(@CurrentUser() user: AuthenticatedUser): { success: boolean; message: string } {
    // Only admins can rotate keys
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return { success: false, message: 'Solo gli admin possono ruotare le chiavi' };
    }

    this.jwksService.rotateKeys();
    return { success: true, message: 'Chiavi ruotate con successo' };
  }

  /**
   * Key info endpoint — shows current signing algorithm and key count.
   */
  @Get('auth/keys/info')
  @ApiOperation({ summary: 'Info sulle chiavi JWT attive' })
  @ApiResponse({ status: 200, description: 'Info chiavi' })
  getKeyInfo(): {
    algorithm: string;
    asymmetricEnabled: boolean;
    keyCount: number;
  } {
    const jwks = this.jwksService.getJwks();
    return {
      algorithm: this.jwksService.isAsymmetricEnabled() ? 'ES256' : 'HS256',
      asymmetricEnabled: this.jwksService.isAsymmetricEnabled(),
      keyCount: jwks.keys.length,
    };
  }
}
