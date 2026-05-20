/**
 * MechMind OS - Metabase Embedding Controller
 *
 * Provides secure signed URLs for Metabase dashboard embedding.
 * Uses JWT signing for embedding authentication with tenant isolation.
 *
 * @see https://www.metabase.com/docs/latest/embedding/introduction
 */

import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';
import { sign } from 'jsonwebtoken';

interface MetabaseEmbedPayload {
  resource: { dashboard?: number; question?: number };
  params: Record<string, string | string[]>;
  exp: number;
}

interface DashboardUrlResponse {
  success: boolean;
  data: {
    url: string;
    expiresAt: string;
    dashboardId: number;
  };
}

@ApiTags('Analytics - Metabase BI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Throttle({ default: { limit: 10, ttl: 60000 } })
@Controller('analytics/metabase')
export class MetabaseController {
  private readonly logger = new Logger(MetabaseController.name);
  private readonly metabaseUrl: string;
  private readonly secretKey: string;
  private readonly embeddingEnabled: boolean;

  // Dashboard IDs mapping - configured per tenant or global
  private readonly dashboardIds = {
    overview: 1, // Booking Overview Dashboard
    revenue: 2, // Revenue Analytics Dashboard
    customers: 3, // Customer Insights Dashboard
    mechanics: 4, // Mechanic Performance Dashboard
    vehicles: 5, // Vehicle Analytics Dashboard
    executive: 6, // Executive Summary Dashboard
  };

  constructor(private readonly configService: ConfigService) {
    this.metabaseUrl = this.configService.get<string>('METABASE_URL', 'http://localhost:3001');
    this.secretKey = this.configService.get<string>('METABASE_SECRET_KEY', '');
    this.embeddingEnabled = this.configService.get<boolean>('METABASE_EMBEDDING_ENABLED', true);

    if (!this.secretKey && this.embeddingEnabled) {
      this.logger.debug('METABASE_SECRET_KEY not configured. Embedding will fail.');
    }
  }

  /**
   * GET /analytics/metabase/dashboard-url
   * Generate a signed embed URL for a Metabase dashboard
   */
  @Get('dashboard-url')
  @ApiOperation({
    summary: 'Get signed Metabase dashboard embed URL',
    description: `
Generates a JWT-signed URL for embedding a Metabase dashboard.
The URL includes tenant isolation parameters for row-level security.

Available dashboards:
- overview: Booking metrics and completion rates
- revenue: Revenue analytics and trends
- customers: Customer insights and retention
- mechanics: Mechanic performance metrics
- vehicles: Vehicle service analytics
- executive: Executive summary KPIs

The returned URL expires in 10 minutes by default.
    `,
  })
  @ApiQuery({
    name: 'dashboard',
    required: true,
    description: 'Dashboard type (overview, revenue, customers, mechanics, vehicles, executive)',
    example: 'overview',
  })
  @ApiQuery({
    name: 'expiryMinutes',
    required: false,
    description: 'URL expiry time in minutes (default: 10, max: 60)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Signed embed URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              example: 'http://localhost:3001/embed/dashboard/eyJhbGciOiJIUzI1NiIs...',
            },
            expiresAt: { type: 'string', format: 'date-time' },
            dashboardId: { type: 'number', example: 1 },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid dashboard type' })
  @ApiResponse({ status: 403, description: 'Embedding not enabled or access denied' })
  @ApiResponse({ status: 503, description: 'Metabase not configured' })
  async getDashboardUrl(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Query('dashboard') dashboardType: string,
    @Query('expiryMinutes') expiryMinutes?: string,
  ): Promise<DashboardUrlResponse> {
    // Validate embedding is enabled
    if (!this.embeddingEnabled) {
      throw new HttpException('Metabase embedding is disabled', HttpStatus.SERVICE_UNAVAILABLE);
    }

    // Validate secret key is configured
    if (!this.secretKey) {
      this.logger.error('METABASE_SECRET_KEY not configured');
      throw new HttpException(
        'Metabase embedding not properly configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    // Validate dashboard type
    const dashboardId = this.dashboardIds[dashboardType as keyof typeof this.dashboardIds];
    if (!dashboardId) {
      const validTypes = Object.keys(this.dashboardIds).join(', ');
      throw new HttpException(
        `Invalid dashboard type. Valid types: ${validTypes}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Parse and validate expiry
    const expiry = Math.min(
      parseInt(expiryMinutes || '10', 10),
      60, // Max 60 minutes
    );
    if (isNaN(expiry) || expiry < 1) {
      throw new HttpException('Invalid expiryMinutes parameter', HttpStatus.BAD_REQUEST);
    }

    try {
      // Build the embed payload
      const payload: MetabaseEmbedPayload = {
        resource: { dashboard: dashboardId },
        params: {
          // Tenant isolation parameter - Metabase uses this for RLS
          tenant_id: tenantId,
          // Optional: filter by user for audit trails
          user_id: userId,
        },
        exp: Math.round(Date.now() / 1000) + expiry * 60,
      };

      // Sign the payload with HS256
      const token = sign(payload, this.secretKey, { algorithm: 'HS256' });

      // Construct the embed URL
      const embedUrl = `${this.metabaseUrl}/embed/dashboard/${token}#bordered=true&titled=true`;

      this.logger.debug(`Generated embed URL for tenant ${tenantId}, dashboard ${dashboardType}`);

      return {
        success: true,
        data: {
          url: embedUrl,
          expiresAt: new Date(Date.now() + expiry * 60 * 1000).toISOString(),
          dashboardId,
        },
      };
    } catch (error) {
      this.logger.error('Failed to generate embed URL:', error);
      throw new HttpException('Failed to generate dashboard URL', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /analytics/metabase/question-url
   * Generate a signed embed URL for a Metabase question/card
   */
  @Get('question-url')
  @ApiOperation({
    summary: 'Get signed Metabase question embed URL',
    description: 'Generates a JWT-signed URL for embedding a single Metabase question/card',
  })
  @ApiQuery({
    name: 'questionId',
    required: true,
    description: 'Metabase question/card ID',
    example: 1,
  })
  @ApiQuery({
    name: 'expiryMinutes',
    required: false,
    description: 'URL expiry time in minutes',
    example: 10,
  })
  @ApiResponse({ status: 200, description: 'Signed embed URL generated' })
  @ApiResponse({ status: 400, description: 'Invalid question ID' })
  async getQuestionUrl(
    @CurrentUser('tenantId') tenantId: string,
    @Query('questionId') questionId: string,
    @Query('expiryMinutes') expiryMinutes?: string,
  ): Promise<DashboardUrlResponse> {
    if (!this.embeddingEnabled || !this.secretKey) {
      throw new HttpException('Metabase embedding not configured', HttpStatus.SERVICE_UNAVAILABLE);
    }

    const qId = parseInt(questionId, 10);
    if (isNaN(qId) || qId < 1) {
      throw new HttpException('Invalid questionId', HttpStatus.BAD_REQUEST);
    }

    const expiry = Math.min(parseInt(expiryMinutes || '10', 10), 60);
    if (isNaN(expiry) || expiry < 1) {
      throw new HttpException('Invalid expiryMinutes parameter', HttpStatus.BAD_REQUEST);
    }

    try {
      const payload: MetabaseEmbedPayload = {
        resource: { question: qId },
        params: { tenant_id: tenantId },
        exp: Math.round(Date.now() / 1000) + expiry * 60,
      };

      const token = sign(payload, this.secretKey, { algorithm: 'HS256' });
      const embedUrl = `${this.metabaseUrl}/embed/question/${token}#bordered=true`;

      return {
        success: true,
        data: {
          url: embedUrl,
          expiresAt: new Date(Date.now() + expiry * 60 * 1000).toISOString(),
          dashboardId: qId,
        },
      };
    } catch (error) {
      this.logger.error('Failed to generate question URL:', error);
      throw new HttpException('Failed to generate question URL', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /analytics/metabase/config
   * Get Metabase configuration for frontend
   */
  @Get('config')
  @ApiOperation({
    summary: 'Get Metabase configuration',
    description: 'Returns Metabase configuration settings for frontend integration',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuration retrieved',
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        url: { type: 'string' },
        dashboards: {
          type: 'object',
          properties: {
            overview: { type: 'number' },
            revenue: { type: 'number' },
            customers: { type: 'number' },
            mechanics: { type: 'number' },
            vehicles: { type: 'number' },
            executive: { type: 'number' },
          },
        },
      },
    },
  })
  async getConfig(): Promise<{
    success: boolean;
    data: {
      enabled: boolean;
      url: string;
      dashboards: Record<string, number>;
    };
  }> {
    return {
      success: true,
      data: {
        enabled: this.embeddingEnabled && !!this.secretKey,
        url: this.metabaseUrl,
        dashboards: this.dashboardIds,
      },
    };
  }

  /**
   * GET /analytics/metabase/health
   * Health check for Metabase connection
   */
  @Get('health')
  @ApiOperation({
    summary: 'Check Metabase health',
    description: 'Verifies Metabase connectivity and configuration',
  })
  @ApiResponse({ status: 200, description: 'Health check result' })
  async healthCheck(): Promise<{
    success: boolean;
    data: {
      configured: boolean;
      embeddingEnabled: boolean;
      url: string;
      status: 'healthy' | 'unconfigured' | 'error';
    };
  }> {
    const configured = !!this.secretKey && !!this.metabaseUrl;

    return {
      success: true,
      data: {
        configured,
        embeddingEnabled: this.embeddingEnabled,
        url: this.metabaseUrl,
        status: configured ? 'healthy' : 'unconfigured',
      },
    };
  }
}
