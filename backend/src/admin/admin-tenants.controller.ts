import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '@common/services/prisma.service';

interface AuthRequest {
  user: { userId: string; tenantId: string; role: string };
}

@ApiTags('Admin Tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/tenants')
export class AdminTenantsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Lista tenant (solo tenant corrente)' })
  @ApiResponse({ status: 200, description: 'Dati tenant corrente' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async findAll(@Req() req: AuthRequest): Promise<{ success: boolean; data: unknown[] }> {
    // Only return the current tenant info (multi-tenant isolation)
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        createdAt: true,
      },
    });

    return { success: true, data: tenant ? [tenant] : [] };
  }
}
