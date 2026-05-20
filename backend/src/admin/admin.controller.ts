import { Controller, Post, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdminSetupService } from './admin-setup.service';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly setupService: AdminSetupService) {}

  @Post('setup')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Seed dati demo (richiede chiave di setup)' })
  @ApiResponse({ status: 201, description: 'Dati demo creati con successo' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  @ApiResponse({ status: 429, description: 'Troppi tentativi — riprovare dopo 60 secondi' })
  @ApiResponse({ status: 500, description: 'Errore configurazione server' })
  async setup(
    @Headers('x-setup-key') setupKey: string,
  ): Promise<{ message: string; data: Awaited<ReturnType<AdminSetupService['seedDemoData']>> }> {
    const expectedKey = process.env.SETUP_SECRET;

    if (!expectedKey) {
      throw new HttpException('Server misconfiguration', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (setupKey !== expectedKey) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const data = await this.setupService.seedDemoData();

    return {
      message: 'Demo data seeded successfully',
      data,
    };
  }
}
