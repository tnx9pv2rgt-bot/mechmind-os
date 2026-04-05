import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { PublicTokenService } from './public-token.service';
import { ResolveTokenResponseDto } from './dto/resolve-token.dto';

@ApiTags('Public')
@Controller('public')
export class PublicTokenController {
  constructor(private readonly publicTokenService: PublicTokenService) {}

  @Get('resolve/:token')
  @ApiOperation({ summary: 'Risolvi un token pubblico' })
  @ApiOkResponse({ type: ResolveTokenResponseDto })
  @ApiNotFoundResponse({ description: 'Token non trovato' })
  @ApiBadRequestResponse({ description: 'Token scaduto o gi\u00e0 utilizzato' })
  async resolveToken(@Param('token') token: string): Promise<ResolveTokenResponseDto> {
    const record = await this.publicTokenService.validateToken(token);

    return {
      type: record.type,
      entityId: record.entityId,
      entityType: record.entityType,
      metadata: record.metadata as Record<string, unknown> | null,
    };
  }
}
