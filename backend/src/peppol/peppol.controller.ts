import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard, UserRole } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';
import { PeppolService } from './peppol.service';
import { PeppolConversionResult, PeppolInvoice } from './peppol.types';

@ApiTags('Peppol BIS 3.0')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/peppol')
export class PeppolController {
  constructor(private readonly peppolService: PeppolService) {}

  /**
   * POST /v1/peppol/convert-fatturapa
   * Convert FatturaPA XML to Peppol UBL 2.1 format
   */
  @Post('convert-fatturapa')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Convert FatturaPA to Peppol UBL 2.1',
    description:
      'Converts Italian FatturaPA XML to Peppol BIS 3.0 compliant UBL 2.1 format for cross-border EU invoicing',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversion successful',
    schema: {
      type: 'object',
      properties: {
        xml: { type: 'string', description: 'Generated UBL XML' },
        valid: { type: 'boolean' },
        errors: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async convertFromFatturaPa(@Body('xml') xml: string): Promise<PeppolConversionResult> {
    return this.peppolService.convertFromFatturaPa(xml);
  }

  /**
   * POST /v1/peppol/validate-ubl
   * Validate UBL XML against EN 16931 and Peppol BIS 3.0 rules
   */
  @Post('validate-ubl')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Validate Peppol UBL XML',
    description: 'Validates UBL 2.1 XML against EN 16931 and Peppol BIS 3.0 specification',
  })
  @ApiResponse({
    status: 200,
    description: 'Validation result',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean' },
        errors: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async validateUbl(@Body('xml') xml: string): Promise<{ valid: boolean; errors: string[] }> {
    return this.peppolService.validateUBL(xml);
  }

  /**
   * POST /v1/peppol/generate-invoice
   * Generate Peppol UBL 2.1 XML from invoice data
   */
  @Post('generate-invoice')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Generate Peppol UBL from invoice data',
    description:
      'Generates a Peppol BIS 3.0 compliant UBL 2.1 invoice XML from structured invoice data',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice generated successfully',
    schema: {
      type: 'object',
      properties: {
        xml: { type: 'string', description: 'Generated UBL XML' },
        valid: { type: 'boolean' },
        errors: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async generateInvoice(@Body() invoice: PeppolInvoice): Promise<PeppolConversionResult> {
    return this.peppolService.generateUBL(invoice);
  }
}
