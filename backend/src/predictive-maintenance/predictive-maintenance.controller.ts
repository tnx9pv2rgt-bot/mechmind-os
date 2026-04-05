import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { CurrentTenant } from '@auth/decorators/current-user.decorator';
import { PredictiveMaintenanceService } from './predictive-maintenance.service';
import { PredictionFilterDto } from './dto/prediction-filter.dto';

@ApiTags('Predictive Maintenance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'predictive-maintenance', version: '1' })
export class PredictiveMaintenanceController {
  constructor(private readonly predictiveMaintenanceService: PredictiveMaintenanceService) {}

  @Get('vehicle/:vehicleId')
  @ApiOperation({ summary: 'Previsioni manutenzione per veicolo' })
  @ApiParam({ name: 'vehicleId', description: 'ID del veicolo' })
  @ApiResponse({ status: 200, description: 'Previsioni calcolate' })
  @ApiResponse({ status: 404, description: 'Veicolo non trovato' })
  async predictForVehicle(
    @CurrentTenant() tenantId: string,
    @Param('vehicleId') vehicleId: string,
  ): Promise<{ success: boolean; data: unknown[] }> {
    const predictions = await this.predictiveMaintenanceService.predictForVehicle(
      tenantId,
      vehicleId,
    );
    return { success: true, data: predictions };
  }

  @Get('schedule/:vehicleId')
  @ApiOperation({ summary: 'Piano manutenzione programmata vs effettuata' })
  @ApiParam({ name: 'vehicleId', description: 'ID del veicolo' })
  @ApiResponse({ status: 200, description: 'Piano manutenzione' })
  @ApiResponse({ status: 404, description: 'Veicolo non trovato' })
  async getMaintenanceSchedule(
    @CurrentTenant() tenantId: string,
    @Param('vehicleId') vehicleId: string,
  ): Promise<{ success: boolean; data: unknown[] }> {
    const schedule = await this.predictiveMaintenanceService.getMaintenanceSchedule(
      tenantId,
      vehicleId,
    );
    return { success: true, data: schedule };
  }

  @Get()
  @ApiOperation({ summary: 'Lista tutte le previsioni con filtri' })
  @ApiResponse({ status: 200, description: 'Lista previsioni' })
  async getPredictions(
    @CurrentTenant() tenantId: string,
    @Query() filters: PredictionFilterDto,
  ): Promise<{ success: boolean; data: unknown[]; meta: { total: number } }> {
    const { predictions, total } = await this.predictiveMaintenanceService.getPredictions(
      tenantId,
      filters,
    );
    return { success: true, data: predictions, meta: { total } };
  }

  @Post(':id/book')
  @ApiOperation({ summary: 'Crea prenotazione da previsione' })
  @ApiParam({ name: 'id', description: 'ID della previsione' })
  @ApiResponse({ status: 201, description: 'Prenotazione creata' })
  @ApiResponse({ status: 404, description: 'Previsione non trovata' })
  @ApiResponse({ status: 400, description: 'Previsione gia prenotata' })
  async createBookingFromPrediction(
    @CurrentTenant() tenantId: string,
    @Param('id') predictionId: string,
  ): Promise<{ success: boolean; data: unknown }> {
    const result = await this.predictiveMaintenanceService.createBookingFromPrediction(
      tenantId,
      predictionId,
    );
    return { success: true, data: result };
  }

  @Post('send-reminders')
  @ApiOperation({ summary: 'Invia promemoria per manutenzioni in scadenza' })
  @ApiResponse({ status: 200, description: 'Promemoria inviati' })
  async sendReminders(
    @CurrentTenant() tenantId: string,
  ): Promise<{ success: boolean; data: { sent: number } }> {
    const result = await this.predictiveMaintenanceService.sendMaintenanceReminders(tenantId);
    return { success: true, data: result };
  }
}
