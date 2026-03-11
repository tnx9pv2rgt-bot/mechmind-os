import { Controller, Post, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { AdminSetupService } from './admin-setup.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly setupService: AdminSetupService) {}

  @Post('setup')
  async setup(
    @Headers('x-setup-key') setupKey: string,
  ): Promise<{ message: string; data: Awaited<ReturnType<AdminSetupService['seedDemoData']>> }> {
    const expectedKey = process.env.SETUP_SECRET || 'mechmind-setup-2026';

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
