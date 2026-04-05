import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { CurrentTenant } from '@auth/decorators/current-user.decorator';
import { VehicleHistoryService } from './vehicle-history.service';
import { ImportHistoryDto } from './dto/import-history.dto';
import { ManualRecordDto } from './dto/manual-record.dto';

@ApiTags('Vehicle History')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'vehicle-history', version: '1' })
export class VehicleHistoryController {
  constructor(private readonly vehicleHistoryService: VehicleHistoryService) {}

  @Get(':vehicleId')
  @ApiOperation({ summary: 'Cronologia completa del veicolo (locale + importata)' })
  @ApiParam({ name: 'vehicleId', description: 'ID del veicolo' })
  @ApiResponse({ status: 200, description: 'Cronologia veicolo' })
  @ApiResponse({ status: 404, description: 'Veicolo non trovato' })
  async getFullHistory(
    @CurrentTenant() tenantId: string,
    @Param('vehicleId') vehicleId: string,
  ): Promise<{ success: boolean; data: unknown[] }> {
    const history = await this.vehicleHistoryService.getFullHistory(tenantId, vehicleId);
    return { success: true, data: history };
  }

  @Post(':vehicleId/import')
  @ApiOperation({ summary: 'Importa cronologia da sorgente esterna' })
  @ApiParam({ name: 'vehicleId', description: 'ID del veicolo' })
  @ApiResponse({ status: 201, description: 'Record importati' })
  @ApiResponse({ status: 404, description: 'Veicolo non trovato' })
  async importHistory(
    @CurrentTenant() tenantId: string,
    @Param('vehicleId') vehicleId: string,
    @Body() dto: ImportHistoryDto,
  ): Promise<{ success: boolean; data: { imported: number } }> {
    const result = await this.vehicleHistoryService.importExternalHistory(tenantId, vehicleId, dto);
    return { success: true, data: result };
  }

  @Post(':vehicleId/manual')
  @ApiOperation({ summary: 'Aggiungi record manuale alla cronologia' })
  @ApiParam({ name: 'vehicleId', description: 'ID del veicolo' })
  @ApiResponse({ status: 201, description: 'Record aggiunto' })
  @ApiResponse({ status: 404, description: 'Veicolo non trovato' })
  async addManualRecord(
    @CurrentTenant() tenantId: string,
    @Param('vehicleId') vehicleId: string,
    @Body() dto: ManualRecordDto,
  ): Promise<{ success: boolean; data: unknown }> {
    const record = await this.vehicleHistoryService.addManualRecord(tenantId, vehicleId, dto);
    return { success: true, data: record };
  }
}
