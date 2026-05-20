/**
 * MechMind OS - RENTRI Controller
 *
 * Endpoint per la gestione rifiuti, FIR, trasportatori,
 * destinazioni e dichiarazione MUD.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RentriService } from '../services/rentri.service';
import { FirService } from '../services/fir.service';
import { MudService } from '../services/mud.service';
import { CreateWasteEntryDto, WasteEntryQueryDto } from '../dto/waste-entry.dto';
import {
  CreateFirDto,
  UpdateFirStatusDto,
  VidimateFirDto,
  FirQueryDto,
} from '../dto/waste-fir.dto';
import { CreateTransporterDto, UpdateTransporterDto } from '../dto/waste-transporter.dto';
import { CreateDestinationDto, UpdateDestinationDto } from '../dto/waste-destination.dto';

@ApiTags('RENTRI - Gestione Rifiuti')
@Controller('rentri')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RentriController {
  constructor(
    private readonly rentriService: RentriService,
    private readonly firService: FirService,
    private readonly mudService: MudService,
  ) {}

  // ============== WASTE ENTRIES ==============

  @Get('entries')
  @ApiOperation({ summary: 'Elenco movimenti registro rifiuti' })
  @ApiResponse({ status: 200, description: 'Lista movimenti con paginazione' })
  async getEntries(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: WasteEntryQueryDto,
  ): Promise<unknown> {
    return this.rentriService.findAllEntries(tenantId, query);
  }

  @Get('entries/:id')
  @ApiOperation({ summary: 'Dettaglio singolo movimento rifiuto' })
  @ApiResponse({ status: 200, description: 'Dettaglio movimento' })
  @ApiResponse({ status: 404, description: 'Movimento non trovato' })
  async getEntry(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<unknown> {
    return this.rentriService.findOneEntry(tenantId, id);
  }

  @Post('entries')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crea nuovo movimento nel registro rifiuti' })
  @ApiResponse({ status: 201, description: 'Movimento creato' })
  async createEntry(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateWasteEntryDto,
  ): Promise<unknown> {
    return this.rentriService.createEntry(tenantId, dto, userId);
  }

  @Patch('entries/:id')
  @ApiOperation({ summary: 'Modifica movimento nel registro rifiuti' })
  @ApiResponse({ status: 200, description: 'Movimento aggiornato' })
  @ApiResponse({ status: 404, description: 'Movimento non trovato' })
  async updateEntry(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateWasteEntryDto>,
  ): Promise<unknown> {
    return this.rentriService.updateEntry(tenantId, id, dto);
  }

  // ============== CER CODES ==============

  @Get('cer-codes')
  @ApiOperation({ summary: 'Catalogo codici CER per autofficina' })
  @ApiResponse({ status: 200, description: 'Lista codici CER' })
  getCerCodes(): unknown[] {
    return this.rentriService.getCerCodes();
  }

  @Get('cer-codes/search')
  @ApiOperation({ summary: 'Ricerca codici CER per testo' })
  @ApiResponse({ status: 200, description: 'Risultati ricerca CER' })
  searchCerCodes(@Query('q') q: string): unknown[] {
    return this.rentriService.searchCerCodes(q || '');
  }

  // ============== FIR ==============

  @Get('fir')
  @ApiOperation({ summary: 'Elenco formulari FIR' })
  @ApiResponse({ status: 200, description: 'Lista FIR con paginazione' })
  async getFirs(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: FirQueryDto,
  ): Promise<unknown> {
    return this.firService.findAllFirs(tenantId, query);
  }

  @Get('fir/:id')
  @ApiOperation({ summary: 'Dettaglio singolo FIR' })
  @ApiResponse({ status: 200, description: 'Dettaglio FIR' })
  // eslint-disable-next-line sonarjs/no-duplicate-string
  @ApiResponse({ status: 404, description: 'FIR non trovato' })
  async getFir(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ): Promise<unknown> {
    return this.firService.findOneFir(tenantId, id);
  }

  @Post('fir')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crea nuovo formulario FIR' })
  @ApiResponse({ status: 201, description: 'FIR creato' })
  async createFir(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateFirDto,
  ): Promise<unknown> {
    return this.firService.createFir(tenantId, dto, userId);
  }

  @Patch('fir/:id/status')
  @ApiOperation({ summary: 'Aggiorna stato del FIR' })
  @ApiResponse({ status: 200, description: 'Stato FIR aggiornato' })
  @ApiResponse({ status: 400, description: 'Transizione di stato non valida' })
  @ApiResponse({ status: 404, description: 'FIR non trovato' })
  async updateFirStatus(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFirStatusDto,
  ): Promise<unknown> {
    return this.firService.updateStatus(tenantId, id, dto.status);
  }

  @Post('fir/:id/vidimate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vidima FIR con codice ViViFIR' })
  @ApiResponse({ status: 200, description: 'FIR vidimato' })
  @ApiResponse({ status: 400, description: 'Transizione di stato non valida' })
  @ApiResponse({ status: 404, description: 'FIR non trovato' })
  async vidimateFir(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: VidimateFirDto,
  ): Promise<unknown> {
    return this.firService.vidimateFir(tenantId, id, dto.vivifirCode);
  }

  // ============== TRANSPORTERS ==============

  @Get('transporters')
  @ApiOperation({ summary: 'Elenco trasportatori rifiuti' })
  @ApiResponse({ status: 200, description: 'Lista trasportatori' })
  async getTransporters(@CurrentUser('tenantId') tenantId: string): Promise<unknown[]> {
    return this.rentriService.findAllTransporters(tenantId);
  }

  @Post('transporters')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crea nuovo trasportatore' })
  @ApiResponse({ status: 201, description: 'Trasportatore creato' })
  @ApiResponse({ status: 409, description: 'Trasportatore con codice fiscale gia esistente' })
  async createTransporter(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateTransporterDto,
  ): Promise<unknown> {
    return this.rentriService.createTransporter(tenantId, dto);
  }

  @Patch('transporters/:id')
  @ApiOperation({ summary: 'Modifica trasportatore' })
  @ApiResponse({ status: 200, description: 'Trasportatore aggiornato' })
  @ApiResponse({ status: 404, description: 'Trasportatore non trovato' })
  async updateTransporter(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTransporterDto,
  ): Promise<unknown> {
    return this.rentriService.updateTransporter(tenantId, id, dto);
  }

  // ============== DESTINATIONS ==============

  @Get('destinations')
  @ApiOperation({ summary: 'Elenco impianti di destinazione' })
  @ApiResponse({ status: 200, description: 'Lista destinazioni' })
  async getDestinations(@CurrentUser('tenantId') tenantId: string): Promise<unknown[]> {
    return this.rentriService.findAllDestinations(tenantId);
  }

  @Post('destinations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crea nuovo impianto di destinazione' })
  @ApiResponse({ status: 201, description: 'Destinazione creata' })
  @ApiResponse({ status: 409, description: 'Destinazione con codice fiscale gia esistente' })
  async createDestination(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateDestinationDto,
  ): Promise<unknown> {
    return this.rentriService.createDestination(tenantId, dto);
  }

  @Patch('destinations/:id')
  @ApiOperation({ summary: 'Modifica impianto di destinazione' })
  @ApiResponse({ status: 200, description: 'Destinazione aggiornata' })
  @ApiResponse({ status: 404, description: 'Destinazione non trovata' })
  async updateDestination(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDestinationDto,
  ): Promise<unknown> {
    return this.rentriService.updateDestination(tenantId, id, dto);
  }

  // ============== DASHBOARD & ALERTS ==============

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard riepilogativa gestione rifiuti' })
  @ApiResponse({ status: 200, description: 'Dati dashboard rifiuti' })
  async getDashboard(@CurrentUser('tenantId') tenantId: string): Promise<unknown> {
    return this.rentriService.getDashboard(tenantId);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Avvisi e scadenze gestione rifiuti' })
  @ApiResponse({ status: 200, description: 'Lista avvisi' })
  async getAlerts(@CurrentUser('tenantId') tenantId: string): Promise<unknown[]> {
    return this.rentriService.getAlerts(tenantId);
  }

  // ============== MUD ==============

  @Get('mud/preview')
  @ApiOperation({ summary: 'Anteprima dichiarazione MUD annuale' })
  @ApiResponse({ status: 200, description: 'Anteprima MUD' })
  async getMudPreview(
    @CurrentUser('tenantId') tenantId: string,
    @Query('year') year: string,
  ): Promise<unknown> {
    const y = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.mudService.getPreview(tenantId, y);
  }

  @Post('mud/export')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="mud-export.csv"')
  @ApiOperation({ summary: 'Esporta dichiarazione MUD in formato CSV' })
  @ApiResponse({ status: 200, description: 'File CSV MUD' })
  async exportMud(
    @CurrentUser('tenantId') tenantId: string,
    @Query('year') year: string,
  ): Promise<string> {
    const y = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.mudService.exportCsv(tenantId, y);
  }
}
