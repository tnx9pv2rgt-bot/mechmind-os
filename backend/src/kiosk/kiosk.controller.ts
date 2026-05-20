import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { KioskService } from './kiosk.service';
import { KioskLookupDto } from './dto/kiosk-lookup.dto';
import { KioskCheckinDto } from './dto/kiosk-checkin.dto';

@ApiTags('Kiosk (Public)')
@Controller('public/kiosk')
export class KioskController {
  constructor(private readonly kioskService: KioskService) {}

  @Post('lookup')
  @ApiOperation({ summary: 'Cerca prenotazione per telefono o targa' })
  // eslint-disable-next-line sonarjs/no-duplicate-string
  @ApiHeader({ name: 'x-kiosk-key', required: true, description: 'Chiave API kiosk' })
  @ApiResponse({ status: 200, description: 'Prenotazioni trovate' })
  // eslint-disable-next-line sonarjs/no-duplicate-string
  @ApiResponse({ status: 401, description: 'Chiave kiosk non valida' })
  @ApiResponse({ status: 400, description: 'Specificare phoneHash o licensePlate' })
  async lookup(
    @Headers('x-kiosk-key') kioskKey: string,
    @Body() dto: KioskLookupDto,
  ): Promise<{ success: boolean; data: unknown[] }> {
    const tenantId = await this.validateKey(kioskKey);

    if (!dto.phoneHash && !dto.licensePlate) {
      throw new BadRequestException('Specificare phoneHash o licensePlate');
    }

    let bookings;
    if (dto.phoneHash) {
      bookings = await this.kioskService.findBookingByPhone(tenantId, dto.phoneHash);
    } else {
      bookings = await this.kioskService.findBookingByPlate(tenantId, dto.licensePlate!);
    }

    return { success: true, data: bookings };
  }

  @Post('check-in')
  @ApiOperation({ summary: 'Check-in cliente al kiosk' })
  @ApiHeader({ name: 'x-kiosk-key', required: true, description: 'Chiave API kiosk' })
  @ApiResponse({ status: 200, description: 'Check-in effettuato' })
  @ApiResponse({ status: 401, description: 'Chiave kiosk non valida' })
  @ApiResponse({ status: 404, description: 'Prenotazione non trovata' })
  async checkIn(
    @Headers('x-kiosk-key') kioskKey: string,
    @Body() dto: KioskCheckinDto,
  ): Promise<{ success: boolean; data: unknown }> {
    const tenantId = await this.validateKey(kioskKey);

    if (tenantId !== dto.tenantId) {
      throw new UnauthorizedException('Chiave kiosk non autorizzata per questo tenant');
    }

    const booking = await this.kioskService.checkIn(tenantId, dto.bookingId, dto.customerNotes);
    return { success: true, data: booking };
  }

  @Get('status/:tenantId')
  @ApiOperation({ summary: 'Stato corrente officina (coda, bay, attesa)' })
  @ApiHeader({ name: 'x-kiosk-key', required: true, description: 'Chiave API kiosk' })
  @ApiResponse({ status: 200, description: 'Stato officina' })
  @ApiResponse({ status: 401, description: 'Chiave kiosk non valida' })
  async getShopStatus(
    @Headers('x-kiosk-key') kioskKey: string,
    @Param('tenantId') tenantId: string,
  ): Promise<{ success: boolean; data: unknown }> {
    const resolvedTenantId = await this.validateKey(kioskKey);

    if (resolvedTenantId !== tenantId) {
      throw new UnauthorizedException('Chiave kiosk non autorizzata per questo tenant');
    }

    const status = await this.kioskService.getShopStatus(tenantId);
    return { success: true, data: status };
  }

  private async validateKey(kioskKey: string): Promise<string> {
    if (!kioskKey) {
      throw new UnauthorizedException('Header X-Kiosk-Key richiesto');
    }

    const tenantId = await this.kioskService.validateKioskKey(kioskKey);
    if (!tenantId) {
      throw new UnauthorizedException('Chiave kiosk non valida');
    }

    return tenantId;
  }
}
