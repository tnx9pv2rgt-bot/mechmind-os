import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '@common/services/prisma.service';

interface AuthRequest {
  user: { userId: string; tenantId: string };
}

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Lista audit log del tenant' })
  @ApiResponse({ status: 200, description: 'Log paginati con filtri' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async findAll(
    @Req() req: AuthRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('tableName') tableName?: string,
  ): Promise<{ success: boolean; data: unknown[]; total: number }> {
    const tenantId = req.user.tenantId;
    const where: Record<string, unknown> = { tenantId };
    if (action) where.action = action;
    if (tableName) where.tableName = tableName;

    const take = Math.min(parseInt(limit || '50', 10), 100);
    const skip = (Math.max(parseInt(page || '1', 10), 1) - 1) * take;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { success: true, data: logs, total };
  }
}
