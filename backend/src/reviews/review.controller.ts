import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../auth/decorators/current-user.decorator';
import { ReviewService, ReviewStats, ReviewNotificationRecord } from './review.service';

@ApiTags('Reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post('request/:customerId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invia richiesta recensione SMS a un cliente' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Richiesta recensione inviata' })
  async requestReview(
    @CurrentTenant() tenantId: string,
    @Param('customerId') customerId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.reviewService.requestReview(customerId, tenantId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiche richieste di recensione' })
  @ApiResponse({ status: 200, description: 'Statistiche restituite' })
  async getStats(
    @CurrentTenant() tenantId: string,
  ): Promise<{ success: boolean; data: ReviewStats }> {
    const data = await this.reviewService.getStats(tenantId);
    return { success: true, data };
  }

  @Get()
  @ApiOperation({ summary: 'Lista richieste di recensione' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista restituita' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ data: ReviewNotificationRecord[]; total: number; page: number; limit: number }> {
    return this.reviewService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
