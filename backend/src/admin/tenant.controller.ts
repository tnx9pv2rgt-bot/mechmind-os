import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '@common/services/prisma.service';

@ApiTags('Tenant')
@Controller({ path: 'tenant', version: '1' })
export class TenantController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('resolve')
  @ApiOperation({ summary: 'Risolve tenant per slug, dominio o id' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  async resolve(
    @Query('slug') slug?: string,
    @Query('id') id?: string,
    @Query('domain') _domain?: string,
  ): Promise<{ success: boolean; data: unknown }> {
    const where: Record<string, unknown> = {};
    if (id) where.id = id;
    else if (slug) where.slug = slug;
    else return { success: false, data: null };

    const tenant = await this.prisma.tenant.findFirst({
      where: { ...where, isActive: true },
      select: { id: true, name: true, slug: true, isActive: true },
    });

    return { success: !!tenant, data: tenant ?? null };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('setup')
  @ApiOperation({ summary: 'Verifica completamento setup tenant' })
  @ApiResponse({ status: 200 })
  async getSetupStatus(
    @Query('tenantId') tenantId: string,
  ): Promise<{ success: boolean; data: unknown }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, settings: true },
    });

    const settings = (tenant?.settings as Record<string, unknown>) ?? {};

    return {
      success: true,
      data: {
        setupCompleted: settings.setupCompleted === true,
        steps: settings.setupSteps ?? {},
      },
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('setup')
  @ApiOperation({ summary: 'Completa setup tenant' })
  @ApiResponse({ status: 200 })
  async completeSetup(
    @Body() body: { tenantId: string; steps?: Record<string, boolean> },
  ): Promise<{ success: boolean; data: unknown }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: body.tenantId },
      select: { settings: true },
    });

    const current = (tenant?.settings as Record<string, unknown>) ?? {};
    const updated = await this.prisma.tenant.update({
      where: { id: body.tenantId },
      data: {
        settings: {
          ...current,
          setupCompleted: true,
          setupSteps: { ...((current.setupSteps as Record<string, boolean>) ?? {}), ...body.steps },
          setupCompletedAt: new Date().toISOString(),
        },
      },
      select: { id: true, settings: true },
    });

    return { success: true, data: updated };
  }
}
