/**
 * MechMind OS - Declined Service Follow-Up Controller
 *
 * Endpoint per gestione servizi rifiutati, follow-up e conversioni.
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../auth/decorators/current-user.decorator';
import { DeclinedServiceService } from './declined-service.service';
import {
  DeclinedServiceFilterDto,
  MarkFollowUpDto,
  MarkConvertedDto,
  FollowUpCandidatesQueryDto,
} from './dto/declined-service-filter.dto';

@ApiTags('Servizi Rifiutati - Follow-Up')
@Controller({ path: 'declined-services', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DeclinedServiceController {
  constructor(private readonly declinedServiceService: DeclinedServiceService) {}

  @Get()
  @ApiOperation({ summary: 'Elenco servizi rifiutati con filtri' })
  @ApiResponse({ status: 200, description: 'Lista servizi rifiutati con paginazione' })
  async getDeclinedServices(
    @CurrentTenant() tenantId: string,
    @Query() filters: DeclinedServiceFilterDto,
  ): Promise<unknown> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    return this.declinedServiceService.getDeclinedServices(
      tenantId,
      {
        customerId: filters.customerId,
        severity: filters.severity,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        followedUp: filters.followedUp,
      },
      page,
      limit,
    );
  }

  @Get('follow-up-candidates')
  @ApiOperation({
    summary: 'Candidati per follow-up (servizi rifiutati da X+ giorni senza follow-up)',
  })
  @ApiResponse({ status: 200, description: 'Lista candidati follow-up' })
  async getFollowUpCandidates(
    @CurrentTenant() tenantId: string,
    @Query() query: FollowUpCandidatesQueryDto,
  ): Promise<unknown[]> {
    return this.declinedServiceService.getFollowUpCandidates(tenantId, query.daysAgo);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Statistiche servizi rifiutati: totale, pending, convertiti, tasso conversione',
  })
  @ApiResponse({ status: 200, description: 'Statistiche servizi rifiutati' })
  async getStats(@CurrentTenant() tenantId: string): Promise<unknown> {
    return this.declinedServiceService.getStats(tenantId);
  }

  @Post(':id/follow-up')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Segna follow-up inviato per servizio rifiutato' })
  @ApiResponse({ status: 200, description: 'Follow-up segnato come inviato' })
  @ApiResponse({ status: 404, description: 'Servizio rifiutato non trovato' })
  async markFollowUpSent(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: MarkFollowUpDto,
  ): Promise<unknown> {
    return this.declinedServiceService.markFollowUpSent(tenantId, id, dto.campaignId);
  }

  @Post(':id/converted')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Segna servizio rifiutato come convertito in prenotazione' })
  @ApiResponse({ status: 200, description: 'Servizio segnato come convertito' })
  @ApiResponse({ status: 404, description: 'Servizio rifiutato non trovato' })
  async markConverted(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: MarkConvertedDto,
  ): Promise<unknown> {
    return this.declinedServiceService.markConverted(tenantId, id, dto.bookingId);
  }
}
